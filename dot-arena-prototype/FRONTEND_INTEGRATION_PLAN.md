# Frontend Integration Plan - Detailed Implementation

## Overview

This document provides the exact code changes needed to transform your Phaser game from single-player to multiplayer, integrating with the Socket.IO server.

---

## Architecture Changes Summary

```
BEFORE (Current):
┌─────────────────────────────────────────┐
│  GameScene.js                           │
│  ├─ Player (local, controllable)       │
│  ├─ Enemies (AI, local simulation)     │
│  ├─ Bullets (local)                    │
│  └─ Weapon Pickups (local)             │
└─────────────────────────────────────────┘

AFTER (Multiplayer):
┌──────────────────────────────────────────────────────┐
│  GameScene.js                                        │
│  ├─ LocalPlayer (predicted, send inputs)            │
│  ├─ RemotePlayers (interpolated from server)        │
│  ├─ Bullets (rendered from server state)            │
│  ├─ Weapon Pickups (synchronized with server)       │
│  └─ NetworkManager (Socket.IO communication)        │
└──────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────┐
│  Server (server/index.js)                            │
│  ├─ Authoritative game state                        │
│  ├─ Physics simulation                              │
│  ├─ Collision detection                             │
│  ├─ Kill tracking → Smart Contract                  │
│  └─ Broadcasting state updates                      │
└──────────────────────────────────────────────────────┘
```

---

## Step-by-Step Implementation

### STEP 1: Create Network-Aware Player Classes

#### 1.1 Create LocalPlayer.js

```javascript
// src/entities/LocalPlayer.js
import Player from './Player.js';

export default class LocalPlayer extends Player {
  constructor(scene, x, y, playerId, networkManager) {
    super(scene, x, y);
    this.playerId = playerId;
    this.network = networkManager;

    // Prediction
    this.inputSequence = 0;
    this.pendingInputs = [];

    // Server reconciliation
    this.lastServerState = null;
    this.reconciliationThreshold = 5; // pixels
  }

  update() {
    // Capture input
    const input = this.captureInput();

    // Send to server
    if (input) {
      this.network.sendInput({
        sequence: this.inputSequence++,
        timestamp: Date.now(),
        movement: input.movement,
        aim: input.aim,
        shoot: input.shoot,
        dash: input.dash
      });

      // Store for reconciliation
      this.pendingInputs.push(input);

      // Apply immediately (prediction)
      this.applyInput(input);
    }

    // Call parent update for animations, etc.
    super.update();
  }

  captureInput() {
    const input = {
      sequence: this.inputSequence,
      timestamp: Date.now(),
      movement: { x: 0, y: 0 },
      aim: 0,
      shoot: false,
      dash: false
    };

    // Movement (WASD)
    if (this.keys.W.isDown || this.cursors.up.isDown) input.movement.y = -1;
    if (this.keys.S.isDown || this.cursors.down.isDown) input.movement.y = 1;
    if (this.keys.A.isDown || this.cursors.left.isDown) input.movement.x = -1;
    if (this.keys.D.isDown || this.cursors.right.isDown) input.movement.x = 1;

    // Normalize diagonal movement
    const length = Math.sqrt(input.movement.x ** 2 + input.movement.y ** 2);
    if (length > 0) {
      input.movement.x /= length;
      input.movement.y /= length;
    }

    // Aim (mouse position)
    const pointer = this.scene.input.activePointer;
    const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    input.aim = Math.atan2(
      worldPoint.y - this.sprite.y,
      worldPoint.x - this.sprite.x
    );

    // Actions
    input.shoot = pointer.leftButtonDown();
    input.dash = pointer.rightButtonDown();

    return input;
  }

  applyInput(input) {
    // Apply movement immediately for responsiveness
    const deltaTime = 1/60; // Assume 60fps
    const speed = 250;

    this.sprite.x += input.movement.x * speed * deltaTime;
    this.sprite.y += input.movement.y * speed * deltaTime;

    // Clamp to world bounds
    this.sprite.x = Phaser.Math.Clamp(this.sprite.x, -1450, 1450);
    this.sprite.y = Phaser.Math.Clamp(this.sprite.y, -1450, 1450);
  }

  reconcileWithServer(serverState) {
    // Server state includes last processed input sequence
    const lastProcessedSeq = serverState.lastProcessedInput;

    // Calculate position error
    const error = Phaser.Math.Distance.Between(
      this.sprite.x, this.sprite.y,
      serverState.x, serverState.y
    );

    if (error > this.reconciliationThreshold) {
      console.log(`Reconciling: error=${error.toFixed(2)}px`);

      // Reset to server position
      this.sprite.x = serverState.x;
      this.sprite.y = serverState.y;

      // Replay unprocessed inputs
      const unprocessed = this.pendingInputs.filter(
        input => input.sequence > lastProcessedSeq
      );

      unprocessed.forEach(input => this.applyInput(input));
    }

    // Clean up old inputs
    this.pendingInputs = this.pendingInputs.filter(
      input => input.sequence > lastProcessedSeq
    );
  }

  onServerUpdate(state) {
    this.reconcileWithServer(state);

    // Update HP (server authoritative)
    if (this.hp !== state.hp) {
      const damage = this.hp - state.hp;
      if (damage > 0) {
        this.takeDamage(damage);
      }
    }
  }
}
```

#### 1.2 Create RemotePlayer.js

```javascript
// src/entities/RemotePlayer.js
import Phaser from 'phaser';

export default class RemotePlayer {
  constructor(scene, playerData) {
    this.scene = scene;
    this.playerId = playerData.id;

    // Create sprite
    this.sprite = scene.physics.add.sprite(
      playerData.x,
      playerData.y,
      'character-idle-frame64'
    );
    this.sprite.setScale(0.08);
    this.sprite.setDepth(10);
    this.sprite.play('idle');

    // Shadow
    this.shadow = scene.add.sprite(playerData.x, playerData.y, 'character-idle-frame64');
    this.shadow.setScale(0.08);
    this.shadow.setDepth(9);
    this.shadow.setTint(0x000000);
    this.shadow.setAlpha(0.4);

    // Interpolation
    this.snapshots = [];
    this.renderDelay = 100; // ms

    // Player state
    this.hp = playerData.hp;
    this.weapon = playerData.weapon;
    this.username = playerData.username || 'Player';

    // Create name tag
    this.nameText = scene.add.text(playerData.x, playerData.y - 50, this.username, {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 4, y: 2 }
    }).setOrigin(0.5).setDepth(15);
  }

  addSnapshot(state) {
    this.snapshots.push({
      timestamp: Date.now(),
      x: state.x,
      y: state.y,
      rotation: state.rotation,
      hp: state.hp,
      weapon: state.weapon,
      animation: state.animation
    });

    // Keep only last 3 snapshots
    if (this.snapshots.length > 3) {
      this.snapshots.shift();
    }
  }

  update() {
    if (this.snapshots.length < 2) return;

    const now = Date.now();
    const renderTime = now - this.renderDelay;

    // Find snapshots to interpolate between
    let from = this.snapshots[0];
    let to = this.snapshots[1];

    for (let i = 0; i < this.snapshots.length - 1; i++) {
      if (this.snapshots[i].timestamp <= renderTime &&
          renderTime <= this.snapshots[i + 1].timestamp) {
        from = this.snapshots[i];
        to = this.snapshots[i + 1];
        break;
      }
    }

    // Calculate interpolation factor
    const duration = to.timestamp - from.timestamp;
    const elapsed = renderTime - from.timestamp;
    const t = duration > 0 ? Phaser.Math.Clamp(elapsed / duration, 0, 1) : 1;

    // Interpolate position
    const x = Phaser.Math.Linear(from.x, to.x, t);
    const y = Phaser.Math.Linear(from.y, to.y, t);

    this.sprite.setPosition(x, y);

    // Update shadow
    this.shadow.setPosition(x + 4, y + 6);
    this.shadow.setTexture(this.sprite.texture.key);
    this.shadow.setFrame(this.sprite.frame.name);
    this.shadow.setFlipX(this.sprite.flipX);

    // Update name tag
    this.nameText.setPosition(x, y - 50);

    // Update animation based on movement
    const isMoving = Math.abs(to.x - from.x) > 1 || Math.abs(to.y - from.y) > 1;
    if (isMoving) {
      if (this.sprite.anims.currentAnim?.key !== 'run') {
        this.sprite.play('run');
      }

      // Flip sprite based on direction
      if (to.x < from.x) {
        this.sprite.setFlipX(true);
      } else if (to.x > from.x) {
        this.sprite.setFlipX(false);
      }
    } else {
      if (this.sprite.anims.currentAnim?.key !== 'idle') {
        this.sprite.play('idle');
      }
    }

    // Update HP if changed
    if (this.hp !== to.hp) {
      this.hp = to.hp;
      this.flashDamage();
    }
  }

  flashDamage() {
    // Red flash on damage
    this.sprite.setTint(0xff0000);
    this.scene.time.delayedCall(100, () => {
      this.sprite.clearTint();
    });
  }

  destroy() {
    if (this.sprite) this.sprite.destroy();
    if (this.shadow) this.shadow.destroy();
    if (this.nameText) this.nameText.destroy();
  }
}
```

---

### STEP 2: Modify GameScene.js for Multiplayer

#### 2.1 Add Network Initialization

```javascript
// In GameScene.js - add to imports
import NetworkManager from '../network/NetworkManager.js';
import LocalPlayer from '../entities/LocalPlayer.js';
import RemotePlayer from '../entities/RemotePlayer.js';

// In constructor
constructor() {
  super({ key: 'GameScene' });
  this.network = null;
  this.isMultiplayer = true; // Toggle for testing
  this.localPlayer = null;
  this.remotePlayers = new Map();
  this.myPlayerId = null;
}

// Replace create() method
async create() {
  // Initialize sound system
  this.initializeSoundSystem();

  // Create background
  this.createBackground();

  // Create animations
  this.createCharacterAnimations();

  if (this.isMultiplayer) {
    // Connect to server
    await this.setupMultiplayer();
  } else {
    // Original single-player setup
    this.setupSinglePlayer();
  }

  // Common setup
  this.createWalls();
  this.createBulletTextures();
  this.bullets = this.physics.add.group({ maxSize: 100 });
  this.createUI();
  this.createMinimap();
  this.sessionStartTime = this.time.now;
  this.screenEffects = new ScreenEffects(this);
}

async setupMultiplayer() {
  console.log('🌐 Connecting to multiplayer server...');

  // Create network manager
  this.network = new NetworkManager('http://localhost:3001');

  // Set up event handlers BEFORE connecting
  this.setupNetworkHandlers();

  // Connect to server
  try {
    const initData = await this.network.connect();
    console.log('✅ Connected! Player ID:', initData.playerId);

    this.myPlayerId = initData.playerId;

    // Create local player
    const myData = initData.players.find(p => p.id === this.myPlayerId);
    this.localPlayer = new LocalPlayer(
      this,
      myData.x,
      myData.y,
      this.myPlayerId,
      this.network
    );
    this.player = this.localPlayer; // Compatibility

    // Create other players
    initData.players.forEach(playerData => {
      if (playerData.id !== this.myPlayerId) {
        this.addRemotePlayer(playerData);
      }
    });

    // Initialize weapon pickups from server
    this.weaponPickups = [];
    initData.weaponPickups.forEach((pickup, index) => {
      const weaponPickup = new WeaponPickup(
        this,
        pickup.x,
        pickup.y,
        pickup.type
      );
      weaponPickup.isAvailable = pickup.available;
      this.weaponPickups[index] = weaponPickup;
    });

    // Camera follows local player
    this.cameras.main.startFollow(this.localPlayer.sprite, true, 0.08, 0.08);

  } catch (error) {
    console.error('❌ Failed to connect:', error);
    // Fall back to single player or show error screen
    this.showConnectionError();
  }
}

setupNetworkHandlers() {
  // Game state updates
  this.network.on('gameState', (state) => {
    this.onGameState(state);
  });

  // Player joined
  this.network.on('playerJoined', (playerData) => {
    console.log('👋 Player joined:', playerData.id);
    this.addRemotePlayer(playerData);
  });

  // Player left
  this.network.on('playerLeft', (playerId) => {
    console.log('👋 Player left:', playerId);
    this.removeRemotePlayer(playerId);
  });

  // Bullet created
  this.network.on('bulletCreated', (bulletData) => {
    this.createBulletFromServer(bulletData);
  });

  // Player hit
  this.network.on('playerHit', (data) => {
    if (data.playerId === this.myPlayerId) {
      // We got hit
      this.localPlayer.hp = data.hp;
      this.cameras.main.shake(200, 0.005);
      this.playSoundSafe('dodge-sound', { volume: 0.5 });
    } else {
      // Another player got hit
      const remotePlayer = this.remotePlayers.get(data.playerId);
      if (remotePlayer) {
        remotePlayer.hp = data.hp;
        remotePlayer.flashDamage();
      }
    }
  });

  // Player killed
  this.network.on('playerKilled', (data) => {
    console.log(`💀 ${data.victimId} killed by ${data.killerId}`);

    if (data.victimId === this.myPlayerId) {
      // We died
      this.onLocalPlayerDeath(data);
    } else if (data.killerId === this.myPlayerId) {
      // We got a kill
      this.onLocalPlayerKill(data);
    } else {
      // Other players killed each other
      this.onRemoteKill(data);
    }
  });

  // Player respawned
  this.network.on('playerRespawned', (data) => {
    if (data.playerId === this.myPlayerId) {
      this.localPlayer.sprite.setPosition(data.x, data.y);
      this.localPlayer.hp = 3;
    } else {
      const remotePlayer = this.remotePlayers.get(data.playerId);
      if (remotePlayer) {
        remotePlayer.sprite.setPosition(data.x, data.y);
        remotePlayer.hp = 3;
      }
    }
  });

  // Weapon pickup
  this.network.on('weaponPickedUp', (data) => {
    const pickup = this.weaponPickups[data.pickupId];
    if (pickup) {
      pickup.isAvailable = false;
      pickup.sprite.setVisible(false);
      pickup.shadow.setVisible(false);
      pickup.glowCircle.setVisible(false);
      pickup.ring.setVisible(false);
    }

    if (data.playerId === this.myPlayerId) {
      this.localPlayer.switchWeapon(data.weaponType);
      this.playSoundSafe('pickup-sound', { volume: 0.5 });
    }
  });

  // Weapon respawned
  this.network.on('weaponRespawned', (pickupId) => {
    const pickup = this.weaponPickups[pickupId];
    if (pickup) {
      pickup.respawn();
    }
  });
}

onGameState(state) {
  // Update local player with server state
  if (state.players[this.myPlayerId]) {
    this.localPlayer.onServerUpdate(state.players[this.myPlayerId]);
  }

  // Update remote players
  Object.keys(state.players).forEach(playerId => {
    if (playerId !== this.myPlayerId) {
      const remotePlayer = this.remotePlayers.get(playerId);
      if (remotePlayer) {
        remotePlayer.addSnapshot(state.players[playerId]);
      }
    }
  });

  // Update bullets (server authoritative)
  this.updateBulletsFromServer(state.bullets);
}

addRemotePlayer(playerData) {
  const remotePlayer = new RemotePlayer(this, playerData);
  this.remotePlayers.set(playerData.id, remotePlayer);
}

removeRemotePlayer(playerId) {
  const remotePlayer = this.remotePlayers.get(playerId);
  if (remotePlayer) {
    remotePlayer.destroy();
    this.remotePlayers.delete(playerId);
  }
}

createBulletFromServer(bulletData) {
  const bullet = this.bullets.get(bulletData.x, bulletData.y);
  if (bullet) {
    bullet.setActive(true);
    bullet.setVisible(true);
    bullet.setDepth(5);
    bullet.setVelocity(bulletData.velocityX, bulletData.velocityY);
    bullet.serverId = bulletData.id;
    bullet.ownerId = bulletData.ownerId;

    // Visual setup based on weapon type
    // ... (similar to existing bullet creation)
  }
}

updateBulletsFromServer(serverBullets) {
  // Remove bullets not in server state
  const serverIds = new Set(serverBullets.map(b => b.id));
  this.bullets.children.entries.forEach(bullet => {
    if (bullet.active && !serverIds.has(bullet.serverId)) {
      bullet.setActive(false);
      bullet.setVisible(false);
    }
  });
}

// Replace update() method
update(time, delta) {
  if (this.isMultiplayer) {
    // Update local player (sends inputs, prediction)
    if (this.localPlayer) {
      this.localPlayer.update();
    }

    // Update remote players (interpolation)
    this.remotePlayers.forEach(player => player.update());

  } else {
    // Original single-player update
    if (this.player) {
      this.player.update();
    }
    this.enemies.forEach(enemy => enemy.update());
  }

  // Common updates
  this.updateMinimap();
  this.survivalTime = Math.floor((this.time.now - this.sessionStartTime) / 1000);
}
```

#### 2.2 Modify Shooting System

```javascript
// In GameScene.js preload()
preload() {
  // ... existing code ...

  // Remove click handler from here, move to create()
}

// In create() - remove old shooting setup
// OLD CODE (remove):
// this.input.on('pointerdown', (pointer) => {
//   if (pointer.leftButtonDown()) {
//     this.player.shoot(this.bullets);
//   }
// });

// Shooting is now handled in LocalPlayer.js via input capture
// Server creates bullets and broadcasts to all clients
```

---

### STEP 3: Update NetworkManager

```javascript
// src/network/NetworkManager.js - ENHANCED VERSION
import { io } from 'socket.io-client';

export default class NetworkManager {
  constructor(serverUrl = 'http://localhost:3001') {
    this.socket = io(serverUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });
    this.playerId = null;
    this.isConnected = false;
    this.callbacks = {};
    this.pingInterval = null;
    this.latency = 0;
  }

  connect() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 5000);

      this.socket.on('connect', () => {
        console.log('🌐 Connected to server');
        this.isConnected = true;
        this.startPingMeasurement();
        clearTimeout(timeout);
      });

      this.socket.on('init', (data) => {
        console.log('🎮 Initialized game state', data);
        this.playerId = data.playerId;
        this.trigger('init', data);
        resolve(data);
      });

      this.socket.on('gameState', (data) => {
        this.trigger('gameState', data);
      });

      this.socket.on('playerJoined', (player) => {
        this.trigger('playerJoined', player);
      });

      this.socket.on('playerLeft', (playerId) => {
        this.trigger('playerLeft', playerId);
      });

      this.socket.on('bulletCreated', (bullet) => {
        this.trigger('bulletCreated', bullet);
      });

      this.socket.on('playerHit', (data) => {
        this.trigger('playerHit', data);
      });

      this.socket.on('playerKilled', (data) => {
        this.trigger('playerKilled', data);
      });

      this.socket.on('playerRespawned', (data) => {
        this.trigger('playerRespawned', data);
      });

      this.socket.on('weaponPickedUp', (data) => {
        this.trigger('weaponPickedUp', data);
      });

      this.socket.on('weaponRespawned', (pickupId) => {
        this.trigger('weaponRespawned', pickupId);
      });

      this.socket.on('disconnect', () => {
        console.log('🔌 Disconnected from server');
        this.isConnected = false;
        this.stopPingMeasurement();
        this.trigger('disconnect');
      });

      this.socket.on('reconnect', () => {
        console.log('🔄 Reconnected to server');
        this.trigger('reconnect');
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Connection error:', error);
        clearTimeout(timeout);
        reject(error);
      });

      // Pong for latency measurement
      this.socket.on('pong', (timestamp) => {
        this.latency = Date.now() - timestamp;
      });
    });
  }

  sendInput(inputData) {
    if (!this.isConnected) return;
    this.socket.emit('input', inputData);
  }

  pickupWeapon(pickupId) {
    if (!this.isConnected) return;
    this.socket.emit('pickupWeapon', pickupId);
  }

  startPingMeasurement() {
    this.pingInterval = setInterval(() => {
      this.socket.emit('ping', Date.now());
    }, 1000);
  }

  stopPingMeasurement() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  getLatency() {
    return this.latency;
  }

  on(event, callback) {
    if (!this.callbacks[event]) {
      this.callbacks[event] = [];
    }
    this.callbacks[event].push(callback);
  }

  off(event, callback) {
    if (!this.callbacks[event]) return;
    this.callbacks[event] = this.callbacks[event].filter(cb => cb !== callback);
  }

  trigger(event, data) {
    if (!this.callbacks[event]) return;
    this.callbacks[event].forEach(callback => callback(data));
  }

  disconnect() {
    if (this.socket) {
      this.stopPingMeasurement();
      this.socket.disconnect();
    }
  }
}
```

---

### STEP 4: Server Improvements

#### 4.1 Enhanced Input Processing

```javascript
// server/index.js - ADD THIS
const inputBuffers = new Map(); // socketId => input queue

socket.on('input', (inputData) => {
  if (!inputBuffers.has(socket.id)) {
    inputBuffers.set(socket.id, []);
  }

  // Add timestamp and validate
  inputData.serverTimestamp = Date.now();
  inputData.playerId = socket.id;

  inputBuffers.get(socket.id).push(inputData);
});

// In game loop, process all inputs
function processInputs() {
  inputBuffers.forEach((inputs, playerId) => {
    const player = players.get(playerId);
    if (!player) return;

    inputs.forEach(input => {
      // Validate input
      if (!validateInput(input)) {
        console.warn(`Invalid input from ${playerId}`);
        return;
      }

      // Apply movement
      if (input.movement) {
        const deltaTime = 1/TICK_RATE;
        player.x += input.movement.x * 250 * deltaTime;
        player.y += input.movement.y * 250 * deltaTime;

        // Clamp to bounds
        player.x = Math.max(-1450, Math.min(1450, player.x));
        player.y = Math.max(-1450, Math.min(1450, player.y));
      }

      // Handle shooting
      if (input.shoot) {
        handlePlayerShoot(player, input);
      }

      // Handle dash
      if (input.dash && canDash(player)) {
        handleDash(player, input);
      }

      // Store last processed sequence
      player.lastProcessedInput = input.sequence;
    });

    // Clear processed inputs
    inputs.length = 0;
  });
}

function validateInput(input) {
  // Check movement magnitude
  const movementMag = Math.sqrt(
    input.movement.x ** 2 + input.movement.y ** 2
  );
  if (movementMag > 1.1) return false; // 10% tolerance

  // Check timestamp is recent
  const age = Date.now() - input.timestamp;
  if (age > 1000) return false; // Too old

  return true;
}
```

---

### STEP 5: Testing Plan

#### 5.1 Local Testing Setup

```bash
# Terminal 1: Start server
cd server
node index.js

# Terminal 2: Start Vite dev server
npm run dev

# Open multiple browser windows
# - http://localhost:5173 (Player 1)
# - http://localhost:5173 (Player 2)
```

#### 5.2 Test Checklist

- [ ] Both players connect and see each other
- [ ] Movement syncs smoothly between clients
- [ ] Shooting creates bullets visible to all players
- [ ] Bullets hit players and reduce HP
- [ ] Kill tracking works correctly
- [ ] Weapon pickups sync across clients
- [ ] Respawning works
- [ ] Disconnect/reconnect handled gracefully
- [ ] No visible lag on local network
- [ ] Client-side prediction feels responsive

---

## Summary of Changes

### Files to Create
1. `src/entities/LocalPlayer.js` - Client-side prediction
2. `src/entities/RemotePlayer.js` - Interpolation for others
3. `MULTIPLAYER_ARCHITECTURE.md` - This doc

### Files to Modify
1. `src/scenes/GameScene.js` - Major refactor for multiplayer
2. `src/network/NetworkManager.js` - Enhanced events
3. `server/index.js` - Input validation, better physics

### Files to Remove/Deprecate
1. `src/entities/Enemy.js` - No longer needed (replaced by real players)

### Estimated Implementation Time
- **Phase 1 (Basic Multiplayer)**: 2-3 days
- **Phase 2 (Prediction/Interpolation)**: 2-3 days
- **Phase 3 (Polish)**: 1-2 days

**Total**: 5-8 days for full implementation

---

## Common Issues & Solutions

### Issue 1: Players Appear Jittery
**Cause**: Not enough snapshots for interpolation
**Solution**: Increase server tick rate or render delay

### Issue 2: Shots Don't Register
**Cause**: Latency compensation not working
**Solution**: Implement server-side lag compensation

### Issue 3: Position Desyncs
**Cause**: Client-side prediction drift
**Solution**: Lower reconciliation threshold or increase correction

### Issue 4: High CPU on Server
**Cause**: Too many players or inefficient collision detection
**Solution**: Implement spatial hashing

---

Ready to start implementing? Let me know which phase you want to tackle first!
