# DOT Arena Multiplayer Architecture - Deep Dive

## Executive Summary

This document outlines the comprehensive architecture for transforming DOT Arena from a single-player game with AI enemies into a real-time multiplayer battle royale using Socket.IO, integrating with the Polkadot smart contract for tokenized gameplay.

## Current State Analysis

### What You Have
1. **Phaser Frontend** (~1700 LOC GameScene.js)
   - Complete player movement, shooting, weapon system
   - AI enemies with pathfinding and combat
   - Weapon pickups with respawn mechanics
   - Kill tracking and DOT earnings (currently simulated)
   - Visual effects, sound system, minimap

2. **Basic Socket.IO Server** (server/index.js)
   - Player connection/disconnection handling
   - Basic game state synchronization
   - Weapon pickup management
   - Bullet creation and collision detection
   - Player respawn system

3. **ink! Smart Contract** (dot_arena/lib.rs)
   - Match lifecycle management (start/end)
   - Entry fee collection (1 DOT)
   - Kill reward tracking (0.5 DOT per kill)
   - Prize pool distribution
   - Player statistics per match

4. **Network Manager** (NetworkManager.js)
   - Socket.IO client wrapper
   - Event callback system
   - Connection management

### Critical Gaps to Address

1. **Authority Model**: No clear separation of client/server authority
2. **State Reconciliation**: No client-side prediction or server reconciliation
3. **Cheat Prevention**: Clients can manipulate their own state
4. **Blockchain Integration**: No connection between game server and smart contract
5. **Lag Compensation**: No interpolation or extrapolation for smooth movement
6. **Match Lifecycle**: No integration with smart contract match system
7. **Scalability**: Single server, no room system
8. **Player Authentication**: No wallet-based identity

---

## Proposed Architecture

### 1. Network Authority Model

#### Server-Authoritative Design (CRITICAL)

```
┌─────────────────────────────────────────────────────────────┐
│                     AUTHORITY HIERARCHY                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────────┐          ┌──────────────────┐            │
│  │  Smart        │ ◄────────┤  Game Server     │            │
│  │  Contract     │          │  (Authoritative) │            │
│  │  (Source of   │          │                  │            │
│  │   Truth for   │          │  • Player HP     │            │
│  │   Kills/DOT)  │          │  • Positions     │            │
│  └───────────────┘          │  • Bullets       │            │
│                             │  • Collisions    │            │
│                             │  • Weapon Pickups│            │
│                             └────────┬─────────┘            │
│                                      │                       │
│                                      ▼                       │
│                             ┌──────────────────┐            │
│                             │  Clients         │            │
│                             │  (Predict &      │            │
│                             │   Render Only)   │            │
│                             │                  │            │
│                             │  • Send Inputs   │            │
│                             │  • Predict       │            │
│                             │  • Interpolate   │            │
│                             │  • Render        │            │
│                             └──────────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

**Why Server-Authoritative?**
- Prevents cheating (teleporting, instant kills, etc.)
- Ensures fair gameplay for prize pool distribution
- Required for blockchain integration (verifiable kills)
- Industry standard for competitive shooters

**Client Responsibilities:**
- Send input commands (move, shoot, dash)
- Predict local player movement (reduce perceived lag)
- Interpolate other players' positions (smooth movement)
- Render game state received from server

**Server Responsibilities:**
- Process all inputs
- Simulate physics and collisions
- Detect hits and kills
- Broadcast authoritative state
- Communicate with smart contract

---

### 2. State Synchronization Strategy

#### Hybrid Update Model

```javascript
// SERVER TICK LOOP (20Hz = 50ms per tick)
┌─────────────────────────────────────────────────┐
│  1. Process Input Queue                         │
│     - Movement inputs from all players          │
│     - Shoot commands with timestamps            │
│     - Dash abilities                            │
├─────────────────────────────────────────────────┤
│  2. Simulate Game World                         │
│     - Update player positions (physics)         │
│     - Update bullet trajectories                │
│     - Check collisions (bullets vs players)     │
│     - Check weapon pickups                      │
│     - Update cooldowns                          │
├─────────────────────────────────────────────────┤
│  3. Generate State Updates                      │
│     - Full state: Players, bullets, pickups     │
│     - Delta compression: Only changed data      │
│     - Priority: Important events first          │
├─────────────────────────────────────────────────┤
│  4. Broadcast to Clients                        │
│     - gameState (full snapshot every 5 ticks)   │
│     - stateUpdate (delta updates)               │
│     - criticalEvents (kills, pickups)           │
└─────────────────────────────────────────────────┘

// CLIENT UPDATE LOOP (60Hz = 16.67ms per frame)
┌─────────────────────────────────────────────────┐
│  1. Send Inputs to Server                       │
│     - Movement direction (normalized vector)    │
│     - Aim angle                                 │
│     - Action (shoot/dash) with client timestamp│
├─────────────────────────────────────────────────┤
│  2. Client-Side Prediction (Local Player)       │
│     - Apply input immediately to local player   │
│     - Simulate movement/physics locally         │
│     - Store prediction history                  │
├─────────────────────────────────────────────────┤
│  3. Server Reconciliation                       │
│     - Receive authoritative position from server│
│     - Compare with predicted position           │
│     - Smooth correction if mismatch detected    │
│     - Replay inputs since server update         │
├─────────────────────────────────────────────────┤
│  4. Entity Interpolation (Other Players)        │
│     - Interpolate between last 2 server updates │
│     - Render slightly in the past (~100ms)      │
│     - Smooth movement, reduce jitter            │
├─────────────────────────────────────────────────┤
│  5. Render Frame                                │
│     - Draw local player (predicted position)    │
│     - Draw other players (interpolated)         │
│     - Draw bullets, effects, UI                 │
└─────────────────────────────────────────────────┘
```

#### State Update Types

**1. Full State Snapshot** (Every 250ms or on demand)
```javascript
{
  type: 'fullState',
  tick: 1234,
  timestamp: 1678900000,
  players: {
    'socket-id-1': { x: 100, y: 200, hp: 3, weapon: 'sniper', ... },
    'socket-id-2': { x: 500, y: 600, hp: 2, weapon: 'shotgun', ... }
  },
  bullets: [
    { id: 'b1', x: 300, y: 400, vx: 500, vy: 0, ownerId: 'socket-id-1' }
  ],
  weaponPickups: [
    { id: 0, available: true },
    { id: 1, available: false, respawnAt: 1678900030 }
  ]
}
```

**2. Delta Updates** (Every 50ms - 20Hz)
```javascript
{
  type: 'deltaUpdate',
  tick: 1235,
  timestamp: 1678900050,
  players: {
    'socket-id-1': { x: 105, y: 202 },  // Only changed fields
    'socket-id-2': { hp: 1 }            // HP changed from hit
  },
  bullets: {
    added: [{ id: 'b2', ... }],
    removed: ['b1'],
    updated: []
  }
}
```

**3. Critical Events** (Immediate)
```javascript
{
  type: 'playerKilled',
  victimId: 'socket-id-2',
  killerId: 'socket-id-1',
  timestamp: 1678900075,
  killerKills: 3,
  rewardDOT: 0.5
}
```

---

### 3. Latency Compensation Techniques

#### Client-Side Prediction

**Problem**: Network delay makes game feel unresponsive

**Solution**: Immediately apply player's own inputs locally, then reconcile with server

```javascript
// CLIENT-SIDE
class PredictionBuffer {
  constructor() {
    this.inputs = []; // Store last N inputs
    this.maxSize = 60; // 1 second of inputs at 60fps
  }

  addInput(input) {
    input.clientTick = this.currentTick++;
    input.timestamp = Date.now();
    this.inputs.push(input);

    // Apply input immediately (prediction)
    this.applyInput(input);

    // Keep buffer size manageable
    if (this.inputs.length > this.maxSize) {
      this.inputs.shift();
    }
  }

  reconcile(serverState) {
    const serverTick = serverState.lastProcessedInput;

    // Find position mismatch
    const error = distance(this.player.position, serverState.position);

    if (error > THRESHOLD) {
      // Reset to server position
      this.player.position = serverState.position;

      // Replay inputs that server hasn't processed yet
      const unprocessed = this.inputs.filter(i => i.clientTick > serverTick);
      unprocessed.forEach(input => this.applyInput(input));
    }

    // Clean up old inputs
    this.inputs = this.inputs.filter(i => i.clientTick > serverTick);
  }
}
```

#### Entity Interpolation

**Problem**: Other players appear jittery due to network updates

**Solution**: Render entities slightly in the past, interpolating between snapshots

```javascript
// CLIENT-SIDE
class EntityInterpolation {
  constructor() {
    this.snapshots = []; // Last 3 server updates
    this.renderDelay = 100; // ms in the past
  }

  addSnapshot(snapshot) {
    this.snapshots.push({
      timestamp: snapshot.timestamp,
      entities: snapshot.players
    });

    // Keep last 3 snapshots
    if (this.snapshots.length > 3) {
      this.snapshots.shift();
    }
  }

  getRenderState() {
    const now = Date.now();
    const renderTime = now - this.renderDelay;

    // Find two snapshots to interpolate between
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
    const t = (renderTime - from.timestamp) / (to.timestamp - from.timestamp);

    // Interpolate each entity
    const interpolated = {};
    Object.keys(to.entities).forEach(id => {
      interpolated[id] = {
        x: lerp(from.entities[id].x, to.entities[id].x, t),
        y: lerp(from.entities[id].y, to.entities[id].y, t),
        // Rotation interpolation with shortest path
        rotation: lerpAngle(from.entities[id].rotation, to.entities[id].rotation, t)
      };
    });

    return interpolated;
  }
}
```

#### Lag Compensation for Shooting

**Problem**: Player aims at enemy, shoots, but bullet misses because enemy already moved on server

**Solution**: Server rewinds time to where enemy was when player fired (hit scan)

```javascript
// SERVER-SIDE
class LagCompensation {
  constructor() {
    this.history = new Map(); // playerId -> position history
    this.historyDuration = 1000; // 1 second
  }

  recordPosition(playerId, position, timestamp) {
    if (!this.history.has(playerId)) {
      this.history.set(playerId, []);
    }

    this.history.get(playerId).push({
      position,
      timestamp
    });

    // Clean old history
    this.cleanHistory(playerId, timestamp);
  }

  processShot(shooterId, targetId, shootTimestamp, aimAngle) {
    const shooterPing = this.getPing(shooterId);
    const rewindTime = shootTimestamp - shooterPing / 2;

    // Get target's position at time of shot (accounting for latency)
    const targetHistory = this.history.get(targetId);
    const targetPosition = this.getPositionAt(targetHistory, rewindTime);

    // Check if shot hit at that historical position
    return this.raycast(shooterId, aimAngle, targetPosition);
  }

  getPositionAt(history, timestamp) {
    // Find two history points around timestamp
    for (let i = 0; i < history.length - 1; i++) {
      if (history[i].timestamp <= timestamp &&
          timestamp <= history[i + 1].timestamp) {
        // Interpolate between them
        const t = (timestamp - history[i].timestamp) /
                  (history[i + 1].timestamp - history[i].timestamp);
        return lerp(history[i].position, history[i + 1].position, t);
      }
    }
    return history[history.length - 1].position;
  }
}
```

---

### 4. Smart Contract Integration

#### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Integration Flow                          │
└─────────────────────────────────────────────────────────────┘

1. MATCH START
   Client → Server: "Join Match 123"
   Server → Smart Contract: Query match_exists(123)
   Server → Client: "Connect to Polkadot wallet"
   Client → Smart Contract: enter_arena(123) [pays 1 DOT]
   Smart Contract → Event: PlayerEntered
   Server (listening) → Add player to game

2. GAMEPLAY
   Server: Track kills in memory (real-time)
   Server: Batch kill events every 30s or on threshold

3. KILL RECORDED
   Server → Smart Contract: record_kill(match_id, killer, victim)
   Smart Contract → Update killer.kills++
   Smart Contract → Add pending_rewards += 0.5 DOT
   Smart Contract → Event: KillRecorded

4. MATCH END
   Server → Smart Contract: end_match(match_id)
   Client → Smart Contract: claim_rewards(match_id)
   Smart Contract → Transfer DOT to player
```

#### Server-Side Contract Integration

```javascript
// server/blockchain/ContractManager.js
import { ApiPromise, WsProvider } from '@polkadot/api';
import { ContractPromise } from '@polkadot/api-contract';
import { Keyring } from '@polkadot/keyring';

class ContractManager {
  constructor(config) {
    this.wsProvider = new WsProvider(config.rpcUrl);
    this.contractAddress = config.contractAddress;
    this.serverKeyring = new Keyring({ type: 'sr25519' });
    this.serverAccount = this.serverKeyring.addFromUri(config.serverSeed);
  }

  async init() {
    this.api = await ApiPromise.create({ provider: this.wsProvider });
    this.contract = new ContractPromise(
      this.api,
      contractMetadata,
      this.contractAddress
    );

    // Listen to contract events
    this.subscribeToEvents();
  }

  async startMatch() {
    const gasLimit = this.api.registry.createType('WeightV2', {
      refTime: 1000000000,
      proofSize: 1000000
    });

    const { result, output } = await this.contract.tx
      .startMatch({ gasLimit })
      .signAndSend(this.serverAccount);

    const matchId = output.toHuman();
    console.log(`✅ Match ${matchId} started on-chain`);
    return matchId;
  }

  async recordKill(matchId, killerAddress, victimAddress) {
    try {
      await this.contract.tx
        .recordKill(
          { gasLimit: this.getGasLimit() },
          matchId,
          killerAddress,
          victimAddress
        )
        .signAndSend(this.serverAccount);

      console.log(`📝 Kill recorded: ${killerAddress} → ${victimAddress}`);
    } catch (error) {
      console.error('Failed to record kill:', error);
      // Queue for retry
      this.killQueue.push({ matchId, killerAddress, victimAddress });
    }
  }

  async endMatch(matchId) {
    await this.contract.tx
      .endMatch({ gasLimit: this.getGasLimit() }, matchId)
      .signAndSend(this.serverAccount);

    console.log(`🏁 Match ${matchId} ended on-chain`);
  }

  subscribeToEvents() {
    this.contract.events.PlayerEntered((event) => {
      const { player, match_id } = event.args;
      this.emit('playerPaid', { player, matchId: match_id });
    });

    this.contract.events.KillRecorded((event) => {
      const { killer, victim, match_id, reward } = event.args;
      this.emit('killConfirmed', { killer, victim, matchId: match_id, reward });
    });
  }

  async verifyPlayerPaid(matchId, playerAddress) {
    const { output } = await this.contract.query.getPlayerStats(
      this.serverAccount.address,
      { gasLimit: -1 },
      matchId,
      playerAddress
    );

    const [kills, hasEntered, pendingRewards, hasClaimed] = output.toHuman();
    return hasEntered;
  }
}
```

#### Client-Side Wallet Integration

```javascript
// client/src/blockchain/WalletManager.js
import { web3Accounts, web3Enable, web3FromAddress } from '@polkadot/extension-dapp';

class WalletManager {
  async connectWallet() {
    // Enable Polkadot extension
    const extensions = await web3Enable('DOT Arena');
    if (extensions.length === 0) {
      throw new Error('No Polkadot extension found');
    }

    // Get accounts
    const accounts = await web3Accounts();
    if (accounts.length === 0) {
      throw new Error('No accounts found');
    }

    this.selectedAccount = accounts[0];
    return this.selectedAccount;
  }

  async payEntryFee(matchId, entryFee) {
    const injector = await web3FromAddress(this.selectedAccount.address);

    const tx = this.contract.tx.enterArena(
      { value: entryFee, gasLimit: this.getGasLimit() },
      matchId
    );

    return new Promise((resolve, reject) => {
      tx.signAndSend(
        this.selectedAccount.address,
        { signer: injector.signer },
        ({ status, events }) => {
          if (status.isFinalized) {
            console.log('✅ Entry fee paid!');
            resolve(status.asFinalized.toHex());
          }
        }
      ).catch(reject);
    });
  }

  async claimRewards(matchId) {
    const injector = await web3FromAddress(this.selectedAccount.address);

    return this.contract.tx.claimRewards(
      { gasLimit: this.getGasLimit() },
      matchId
    ).signAndSend(this.selectedAccount.address, { signer: injector.signer });
  }
}
```

---

### 5. Security Considerations

#### Threat Model

**Client-Side Exploits**
1. **Position Manipulation** - Player teleports around map
   - ✅ Solution: Server validates movement distance per tick

2. **Speed Hacking** - Player moves faster than allowed
   - ✅ Solution: Server enforces max velocity, rejects impossible movements

3. **Wallhacking** - Player shoots through walls
   - ✅ Solution: Server performs raycast collision checks

4. **Aimbot** - Perfect accuracy
   - ✅ Solution: Server-side hit detection, can add spread/recoil

5. **Invulnerability** - Player doesn't take damage
   - ✅ Solution: Server authoritative HP, clients can't modify

6. **Infinite Ammo/No Cooldown** - Spam abilities
   - ✅ Solution: Server tracks cooldowns, enforces fire rates

**Server-Side Protections**

```javascript
// server/validation/InputValidator.js
class InputValidator {
  validateMovement(player, newPosition, deltaTime) {
    const maxDistance = player.speed * deltaTime * 1.1; // 10% tolerance
    const actualDistance = distance(player.position, newPosition);

    if (actualDistance > maxDistance) {
      console.warn(`⚠️  Suspicious movement from ${player.id}: ${actualDistance}px in ${deltaTime}ms`);
      return false; // Reject movement
    }

    return true;
  }

  validateShoot(player, timestamp) {
    const timeSinceLastShot = timestamp - player.lastShot;
    const minFireRate = player.weapon.fireRate * 0.9; // 10% tolerance for lag

    if (timeSinceLastShot < minFireRate) {
      console.warn(`⚠️  Rapid fire detected from ${player.id}`);
      return false;
    }

    return true;
  }

  validateLineOfSight(shooter, target, walls) {
    // Raycast from shooter to target
    return !this.rayIntersectsWalls(shooter.position, target.position, walls);
  }
}
```

#### Rate Limiting

```javascript
// Prevent spam/DDoS
class RateLimiter {
  constructor() {
    this.limits = new Map();
  }

  checkLimit(socketId, action, maxPerSecond) {
    const key = `${socketId}:${action}`;
    const now = Date.now();

    if (!this.limits.has(key)) {
      this.limits.set(key, { count: 1, resetAt: now + 1000 });
      return true;
    }

    const limit = this.limits.get(key);

    if (now > limit.resetAt) {
      limit.count = 1;
      limit.resetAt = now + 1000;
      return true;
    }

    if (limit.count >= maxPerSecond) {
      console.warn(`⚠️  Rate limit exceeded for ${socketId} on ${action}`);
      return false;
    }

    limit.count++;
    return true;
  }
}

// Usage
io.on('connection', (socket) => {
  socket.on('input', (data) => {
    if (!rateLimiter.checkLimit(socket.id, 'input', 60)) {
      return; // Drop excessive inputs
    }
    // Process input...
  });
});
```

---

### 6. Performance Optimization

#### Network Bandwidth Optimization

**1. Delta Compression**
```javascript
// Only send what changed
function createDeltaUpdate(previousState, currentState) {
  const delta = { players: {}, bullets: {} };

  Object.keys(currentState.players).forEach(id => {
    const prev = previousState.players[id];
    const curr = currentState.players[id];

    const changes = {};
    if (prev.x !== curr.x) changes.x = curr.x;
    if (prev.y !== curr.y) changes.y = curr.y;
    if (prev.hp !== curr.hp) changes.hp = curr.hp;

    if (Object.keys(changes).length > 0) {
      delta.players[id] = changes;
    }
  });

  return delta;
}
```

**2. Message Batching**
```javascript
// Batch multiple events into single packet
class MessageBatcher {
  constructor(flushInterval = 50) {
    this.queue = [];
    setInterval(() => this.flush(), flushInterval);
  }

  add(message) {
    this.queue.push(message);
  }

  flush() {
    if (this.queue.length === 0) return;

    io.emit('batch', {
      messages: this.queue,
      timestamp: Date.now()
    });

    this.queue = [];
  }
}
```

**3. Binary Protocol** (Advanced)
```javascript
// Use binary instead of JSON for ~50% bandwidth reduction
import msgpack from 'msgpack-lite';

// Server
const encoded = msgpack.encode(gameState);
socket.emit('gameState', encoded);

// Client
socket.on('gameState', (data) => {
  const state = msgpack.decode(data);
});
```

#### Server Optimization

```javascript
// Object pooling for bullets
class BulletPool {
  constructor(size = 1000) {
    this.pool = [];
    this.active = [];

    for (let i = 0; i < size; i++) {
      this.pool.push(this.createBullet());
    }
  }

  get() {
    const bullet = this.pool.pop() || this.createBullet();
    this.active.push(bullet);
    return bullet;
  }

  release(bullet) {
    bullet.reset();
    const index = this.active.indexOf(bullet);
    if (index > -1) {
      this.active.splice(index, 1);
      this.pool.push(bullet);
    }
  }
}

// Spatial hashing for collision detection
class SpatialHash {
  constructor(cellSize = 100) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }

  insert(entity) {
    const cellX = Math.floor(entity.x / this.cellSize);
    const cellY = Math.floor(entity.y / this.cellSize);
    const key = `${cellX},${cellY}`;

    if (!this.cells.has(key)) {
      this.cells.set(key, []);
    }
    this.cells.get(key).push(entity);
  }

  getNearby(x, y, radius) {
    const nearby = [];
    const cellRadius = Math.ceil(radius / this.cellSize);
    const centerX = Math.floor(x / this.cellSize);
    const centerY = Math.floor(y / this.cellSize);

    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        const key = `${centerX + dx},${centerY + dy}`;
        if (this.cells.has(key)) {
          nearby.push(...this.cells.get(key));
        }
      }
    }

    return nearby;
  }
}
```

---

### 7. Implementation Roadmap

#### Phase 1: Foundation (Week 1)
- [ ] Set up server-authoritative architecture
- [ ] Implement input validation
- [ ] Basic state synchronization (full snapshots only)
- [ ] Remove AI enemies, replace with multiplayer players
- [ ] Test with 2-4 players locally

#### Phase 2: Latency Compensation (Week 2)
- [ ] Client-side prediction for local player
- [ ] Server reconciliation
- [ ] Entity interpolation for remote players
- [ ] Lag compensation for shooting

#### Phase 3: Smart Contract Integration (Week 3)
- [ ] Polkadot.js integration on server
- [ ] Wallet connection on client
- [ ] Entry fee payment flow
- [ ] Kill recording to blockchain
- [ ] Reward claiming

#### Phase 4: Polish & Security (Week 4)
- [ ] Rate limiting
- [ ] Anti-cheat validation
- [ ] Match lifecycle management
- [ ] Reconnection handling
- [ ] Spectator mode

#### Phase 5: Scalability (Week 5+)
- [ ] Room system (multiple concurrent matches)
- [ ] Matchmaking
- [ ] Load balancing
- [ ] Database for persistent stats
- [ ] Leaderboards

---

## Next Steps

1. **Review this document** - Understand the architecture
2. **Decide on scope** - Which phases to implement first?
3. **Set up development** - Local testnet, multiple clients for testing
4. **Start coding** - I can help implement any of these systems

**Questions to Answer:**
- Do you want to implement all phases or start with Phase 1-2?
- What's your timeline?
- Do you have a Polkadot testnet node running?
- How many concurrent players do you want to support initially?

Ready to start implementing?
