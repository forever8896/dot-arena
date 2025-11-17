# GameScene Migration Guide

## Overview

This file shows EXACTLY what to change in `GameScene.js` to enable multiplayer.

## Required Changes Summary

1. ✅ **Import** new player classes
2. ✅ **Replace** AI enemies with remote players
3. ✅ **Add** NetworkManager initialization
4. ✅ **Setup** event handlers for network events
5. ✅ **Update** `update()` loop

---

## Step 1: Update Imports

**At the top of GameScene.js, REPLACE:**
```javascript
import Player from '../entities/Player.js';
import Enemy from '../entities/Enemy.js';
```

**WITH:**
```javascript
import LocalPlayer from '../entities/LocalPlayer.js';
import RemotePlayer from '../entities/RemotePlayer.js';
import NetworkManager from '../network/NetworkManager.js';
// Keep Enemy.js import if you want single-player mode toggle
```

---

## Step 2: Update Constructor

**In `constructor()`, ADD:**
```javascript
constructor() {
  super({ key: 'GameScene' });

  // Existing properties...
  this.dotEarned = 0;
  this.kills = 0;
  this.survivalTime = 0;

  // NEW: Multiplayer properties
  this.isMultiplayer = true; // Toggle for testing
  this.network = null;
  this.myPlayerId = null;
  this.localPlayer = null;
  this.remotePlayers = new Map(); // playerId -> RemotePlayer
  this.weaponPickups = [];
}
```

---

## Step 3: Replace create() Method

**REPLACE the current create() method with:**

```javascript
async create() {
  console.log('🎮 GameScene starting...');

  // Initialize sound system
  this.initializeSoundSystem();

  // Create background
  this.createBackground();

  // Create character animations
  this.createCharacterAnimations();

  // Create bullet textures
  this.createBulletTextures();

  // Create walls
  this.createWalls();

  if (this.isMultiplayer) {
    // MULTIPLAYER MODE
    await this.setupMultiplayer();
  } else {
    // SINGLE-PLAYER MODE (original code)
    this.setupSinglePlayer();
  }

  // Common UI
  this.createUI();
  this.createMinimap();

  // Session tracking
  this.sessionStartTime = this.time.now;

  // Effects
  this.screenEffects = new ScreenEffects(this);

  console.log('✅ GameScene ready');
}
```

---

## Step 4: Add Multiplayer Setup Method

**ADD this new method:**

```javascript
async setupMultiplayer() {
  console.log('🌐 Setting up multiplayer...');

  try {
    // Create network manager
    this.network = new NetworkManager('http://localhost:3001');

    // Setup event handlers BEFORE connecting
    this.setupNetworkHandlers();

    // Connect to server
    const initData = await this.network.connect();
    console.log('✅ Connected! My player ID:', initData.playerId);

    this.myPlayerId = initData.playerId;

    // Create local player (me)
    this.localPlayer = new LocalPlayer(
      this,
      initData.player.x,
      initData.player.y,
      this.myPlayerId,
      this.network
    );

    // Backward compatibility - some code still uses this.player
    this.player = this.localPlayer;

    // Create remote players (others already in game)
    const otherPlayers = Object.values(initData.gameState.players).filter(
      p => p.id !== this.myPlayerId
    );

    otherPlayers.forEach(playerData => {
      this.addRemotePlayer({ ...playerData, id: playerData.id || this.myPlayerId });
    });

    // Initialize weapon pickups from server
    this.weaponPickups = [];
    if (initData.weaponPickups) {
      initData.weaponPickups.forEach((pickup, index) => {
        const weaponPickup = new WeaponPickup(
          this,
          pickup.x,
          pickup.y,
          pickup.type
        );
        weaponPickup.id = index;
        weaponPickup.isAvailable = pickup.available;

        if (!pickup.available) {
          weaponPickup.sprite.setVisible(false);
          weaponPickup.shadow.setVisible(false);
          weaponPickup.glowCircle.setVisible(false);
          weaponPickup.ring.setVisible(false);
        }

        this.weaponPickups.push(weaponPickup);
      });
    }

    // Camera follows local player
    this.cameras.main.startFollow(this.localPlayer.sprite, true, 0.08, 0.08);

    // Create bullets group (server creates bullets, client renders)
    this.bullets = this.physics.add.group({
      defaultKey: 'bullet',
      maxSize: 100
    });

    console.log('✅ Multiplayer setup complete');

  } catch (error) {
    console.error('❌ Failed to setup multiplayer:', error);

    // Show error to user
    this.add.text(400, 300, 'Failed to connect to server\nPlease check if server is running', {
      fontSize: '20px',
      color: '#ff0000',
      align: 'center'
    }).setOrigin(0.5);
  }
}
```

---

## Step 5: Add Network Event Handlers

**ADD this new method:**

```javascript
setupNetworkHandlers() {
  // Game state updates (20 times per second)
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

  // Player hit
  this.network.on('playerHit', (data) => {
    if (data.playerId === this.myPlayerId) {
      // I got hit
      this.localPlayer.takeDamage(data.damage);
    } else {
      // Another player got hit
      const remotePlayer = this.remotePlayers.get(data.playerId);
      if (remotePlayer) {
        remotePlayer.onHit();
      }
    }
  });

  // Player killed
  this.network.on('playerKilled', (data) => {
    if (data.victimId === this.myPlayerId) {
      // I died
      this.localPlayer.onDeath();
      this.kills = 0; // Reset kills on death
    } else if (data.killerId === this.myPlayerId) {
      // I got a kill
      this.kills = data.killerKills;
      this.localPlayer.onKill();
      this.awardDOT(0.5);
    }
  });

  // Player respawned
  this.network.on('playerRespawned', (data) => {
    if (data.playerId === this.myPlayerId) {
      this.localPlayer.onRespawn(data.x, data.y);
    } else {
      const remotePlayer = this.remotePlayers.get(data.playerId);
      if (remotePlayer) {
        remotePlayer.onRespawn(data.x, data.y);
      }
    }
  });

  // Weapon picked up
  this.network.on('weaponPickedUp', (data) => {
    const pickup = this.weaponPickups[data.pickupId];
    if (pickup) {
      pickup.isAvailable = false;
      pickup.sprite.setVisible(false);
      pickup.shadow.setVisible(false);
      pickup.glowCircle.setVisible(false);
      pickup.ring.setVisible(false);

      if (data.playerId === this.myPlayerId) {
        this.playSoundSafe('pickup-sound', { volume: 0.5 });
      }
    }
  });

  // Weapon respawned
  this.network.on('weaponRespawned', (pickupId) => {
    const pickup = this.weaponPickups[pickupId];
    if (pickup) {
      pickup.respawn();
    }
  });

  // Latency updates
  this.network.on('latencyUpdate', (latency) => {
    // Update latency display if you have one
    // console.log(`Ping: ${latency}ms`);
  });
}
```

---

## Step 6: Add Helper Methods

**ADD these methods:**

```javascript
onGameState(state) {
  // Update local player with server reconciliation
  if (state.players[this.myPlayerId]) {
    this.localPlayer.reconcileWithServer(state.players[this.myPlayerId]);
  }

  // Update remote players with new snapshots
  Object.keys(state.players).forEach(playerId => {
    if (playerId !== this.myPlayerId) {
      const remotePlayer = this.remotePlayers.get(playerId);
      if (remotePlayer) {
        remotePlayer.addSnapshot(state.players[playerId]);
      }
    }
  });

  // Update bullets (server-authoritative)
  // For now, bullets are visual only, server handles collisions
}

addRemotePlayer(playerData) {
  if (this.remotePlayers.has(playerData.id)) return;

  const remotePlayer = new RemotePlayer(this, playerData);
  this.remotePlayers.set(playerData.id, remotePlayer);

  console.log(`✅ Added remote player: ${playerData.id}`);
}

removeRemotePlayer(playerId) {
  const remotePlayer = this.remotePlayers.get(playerId);
  if (remotePlayer) {
    remotePlayer.destroy();
    this.remotePlayers.delete(playerId);
    console.log(`🗑️  Removed remote player: ${playerId}`);
  }
}
```

---

## Step 7: Update the update() Method

**REPLACE the current update() method:**

```javascript
update(time, delta) {
  if (this.isMultiplayer) {
    // MULTIPLAYER MODE

    // Update local player (prediction + input sending)
    if (this.localPlayer) {
      this.localPlayer.update();

      // Check weapon pickups
      this.checkWeaponPickups();
    }

    // Update remote players (interpolation)
    this.remotePlayers.forEach(player => {
      player.update();
    });

  } else {
    // SINGLE-PLAYER MODE (original code)

    if (this.player) {
      this.player.update();
      this.checkWeaponPickups();
    }

    this.enemies.forEach(enemy => {
      if (enemy.sprite && enemy.sprite.active) {
        enemy.update();
      }
    });
  }

  // Common updates
  this.updateMinimap();

  // Update survival time
  if (this.player && this.player.hp > 0) {
    this.survivalTime = Math.floor((this.time.now - this.sessionStartTime) / 1000);
  }
}
```

---

## Step 8: Update Weapon Pickup Check

**REPLACE checkWeaponPickups() method:**

```javascript
checkWeaponPickups() {
  if (!this.localPlayer || !this.localPlayer.sprite) return;

  this.weaponPickups.forEach((pickup, index) => {
    if (!pickup.isAvailable) return;

    const distance = Phaser.Math.Distance.Between(
      this.localPlayer.sprite.x,
      this.localPlayer.sprite.y,
      pickup.sprite.x,
      pickup.sprite.y
    );

    // Auto-pickup when close
    if (distance < 40) {
      // Tell server we want to pick this up
      this.network.pickupWeapon(index);

      // Server will broadcast weaponPickedUp event to all players
    }
  });
}
```

---

## Step 9: Remove Enemy-Related Code

**Comment out or remove:**
- `startEnemySpawning()` method
- `spawnEnemy()` method
- Enemy collision detection
- Any enemy-specific references

---

## Step 10: Update UI

**In createUI(), update kills display:**

```javascript
// Update UI every frame
this.events.on('update', () => {
  if (this.player) {
    // HP hearts
    const hearts = '❤️'.repeat(this.player.hp);
    this.hpText.setText(hearts);

    // DOT counter
    this.dotText.setText(`◎ ${this.dotEarned.toFixed(2)}`);

    // Kills counter - use this.kills (updated from server)
    this.killsText.setText(`☠️ ${this.kills}`);
  }
});
```

---

## Testing Checklist

After making these changes, test:

1. **Start server**: `cd server && node index.js`
2. **Start client**: `npm run dev`
3. **Open 2 browser windows**: Both at `localhost:5173`
4. **Verify:**
   - [ ] Both players spawn
   - [ ] Movement syncs between windows
   - [ ] Shooting works
   - [ ] HP decreases when hit
   - [ ] Kill tracking works
   - [ ] Respawning works
   - [ ] Weapon pickups sync

---

## Debugging Tips

### Player not syncing?
Check browser console for:
```
✅ Connected! My player ID: abc123
```

### Can't shoot?
Check if:
- Another player is visible (auto-aim requires target)
- Cooldown bar is green (weapon ready)

### Lag?
Check network latency:
```javascript
console.log('Ping:', this.network.getLatency(), 'ms');
```

---

## Next: Full GameScene Refactor

This is a **minimal integration** to get multiplayer working.

For production, you'll want to:
1. Remove ALL enemy code
2. Simplify bullet rendering (server creates, client displays)
3. Add player names/avatars
4. Add chat system
5. Add match timer
6. Add lobby system

But this gets you **playable multiplayer in ~30 minutes**! 🚀
