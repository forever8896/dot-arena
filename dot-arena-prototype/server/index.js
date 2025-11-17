import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import GameState from './GameState.js';

const app = express();
app.use(cors());

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// Server-authoritative game state
const gameState = new GameState({
  worldWidth: 3000,
  worldHeight: 3000,
  tickRate: 20 // 20 Hz (50ms per tick)
});

// Player socket mapping
const playerSockets = new Map(); // playerId -> socket
const socketPlayers = new Map(); // socketId -> playerId

// Input buffer (process inputs in game loop)
const inputBuffer = new Map(); // playerId -> input queue

// Event log for important events
const events = [];

// Player connection
io.on('connection', (socket) => {
  const playerId = socket.id;
  console.log(`🎮 Player connected: ${playerId}`);

  // Random spawn position
  const spawnX = Math.random() * 2800 - 1400;
  const spawnY = Math.random() * 2800 - 1400;

  // Add player to game state
  const player = gameState.addPlayer(playerId, spawnX, spawnY);

  // Store socket mapping
  playerSockets.set(playerId, socket);
  socketPlayers.set(socket.id, playerId);
  inputBuffer.set(playerId, []);

  // Send initial state to new player
  socket.emit('init', {
    playerId: playerId,
    player: player,
    gameState: gameState.getState(),
    weaponPickups: gameState.weaponPickups
  });

  // Broadcast new player to others
  socket.broadcast.emit('playerJoined', player);

  console.log(`✅ Player ${playerId} spawned at (${Math.round(spawnX)}, ${Math.round(spawnY)})`);

  // Handle player input
  socket.on('input', (inputData) => {
    if (!inputBuffer.has(playerId)) return;

    // Add to input buffer for processing in game loop
    inputBuffer.get(playerId).push({
      ...inputData,
      receivedAt: Date.now()
    });

    // Prevent buffer overflow (max 120 inputs = 2 seconds at 60fps)
    const buffer = inputBuffer.get(playerId);
    if (buffer.length > 120) {
      buffer.shift();
    }
  });

  // Handle weapon pickup attempt
  socket.on('pickupWeapon', (pickupId) => {
    const result = gameState.tryPickupWeapon(playerId, pickupId);

    if (result) {
      // Broadcast to all players
      io.emit('weaponPickedUp', {
        playerId,
        pickupId: result.pickupId,
        oldWeapon: result.oldWeapon,
        newWeapon: result.newWeapon
      });

      console.log(`🔫 ${playerId} picked up ${result.newWeapon}`);
    }
  });

  // Handle ping for latency measurement
  socket.on('ping', (timestamp) => {
    socket.emit('pong', timestamp);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`👋 Player disconnected: ${playerId}`);

    // Remove from game state
    gameState.removePlayer(playerId);

    // Clean up mappings
    playerSockets.delete(playerId);
    socketPlayers.delete(socket.id);
    inputBuffer.delete(playerId);

    // Broadcast to others
    io.emit('playerLeft', playerId);
  });
});

// Server-authoritative game loop (20 Hz)
const TICK_RATE = 20;
const TICK_INTERVAL = 1000 / TICK_RATE;
let lastFullStateTime = Date.now();
const FULL_STATE_INTERVAL = 1000; // Send full state every 1 second

function gameLoop() {
  const loopStart = Date.now();

  // 1. Process all queued inputs
  inputBuffer.forEach((inputs, playerId) => {
    inputs.forEach(input => {
      gameState.processInput(playerId, input);
    });
    // Clear processed inputs
    inputs.length = 0;
  });

  // 2. Update game state
  gameState.update();

  // 3. Check for important events (kills, hits)
  const collisionEvents = gameState.checkCollisions();

  // Handle kills and hits
  if (collisionEvents) {
    if (collisionEvents.type === 'kill') {
      handlePlayerKill(collisionEvents.victimId, collisionEvents.killerId);
    } else if (collisionEvents.type === 'hit') {
      handlePlayerHit(collisionEvents.playerId, collisionEvents.damage);
    }
  }

  // 4. Broadcast state to clients
  const now = Date.now();
  const sendFullState = now - lastFullStateTime >= FULL_STATE_INTERVAL;

  if (sendFullState) {
    // Send full snapshot
    const fullState = gameState.getState();
    io.emit('gameState', fullState);
    lastFullStateTime = now;
  } else {
    // Send delta update (only changed data)
    const deltaState = gameState.getDeltaState();
    io.emit('gameState', deltaState);
  }

  // 5. Measure tick time for performance monitoring
  const tickDuration = Date.now() - loopStart;
  if (tickDuration > TICK_INTERVAL) {
    console.warn(`⚠️  Tick took ${tickDuration}ms (target: ${TICK_INTERVAL}ms)`);
  }
}

function handlePlayerHit(playerId, damage) {
  const player = gameState.players.get(playerId);
  if (!player) return;

  io.emit('playerHit', {
    playerId,
    damage,
    hp: player.hp
  });

  console.log(`💥 ${playerId} hit for ${damage} damage (HP: ${player.hp})`);
}

function handlePlayerKill(victimId, killerId) {
  const victim = gameState.players.get(victimId);
  const killer = gameState.players.get(killerId);

  if (!killer || !victim) return;

  console.log(`💀 ${killerId} eliminated ${victimId} (killer kills: ${killer.kills})`);

  // Broadcast kill event
  io.emit('playerKilled', {
    victimId,
    killerId,
    killerKills: killer.kills
  });

  // Award DOT (for now just log, blockchain integration later)
  console.log(`💰 ${killerId} earned 0.5 DOT (pending blockchain integration)`);

  // Respawn victim after delay
  setTimeout(() => {
    if (gameState.players.has(victimId)) {
      gameState.respawnPlayer(victimId);

      const respawnedPlayer = gameState.players.get(victimId);

      io.emit('playerRespawned', {
        playerId: victimId,
        x: respawnedPlayer.x,
        y: respawnedPlayer.y
      });

      console.log(`♻️  ${victimId} respawned`);
    }
  }, 3000); // 3 second respawn delay
}

// Start game loop
setInterval(gameLoop, TICK_INTERVAL);
console.log(`🎮 Game loop running at ${TICK_RATE} Hz (${TICK_INTERVAL}ms per tick)`);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    players: gameState.players.size,
    bullets: gameState.bullets.size,
    tick: gameState.currentTick,
    uptime: process.uptime()
  });
});

// Stats endpoint
app.get('/stats', (req, res) => {
  const players = Array.from(gameState.players.values()).map(p => ({
    id: p.id,
    kills: p.kills,
    hp: p.hp
  }));

  res.json({
    players,
    totalPlayers: gameState.players.size,
    activeBullets: gameState.bullets.size,
    tick: gameState.currentTick
  });
});

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║     🎮 DOT ARENA SERVER RUNNING       ║
╠═══════════════════════════════════════╣
║  Port: ${PORT}
║  Tick Rate: ${TICK_RATE} Hz
║  World Size: ${gameState.WORLD_WIDTH}x${gameState.WORLD_HEIGHT}
║  Status: ✅ READY
╚═══════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
