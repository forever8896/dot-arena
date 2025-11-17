// Server-side authoritative game state
export default class GameState {
  constructor(config) {
    this.WORLD_WIDTH = config.worldWidth || 3000;
    this.WORLD_HEIGHT = config.worldHeight || 3000;
    this.TICK_RATE = config.tickRate || 20; // 20 Hz
    this.PLAYER_SPEED = 250;
    this.DASH_SPEED = 750;
    this.DASH_DURATION = 200;
    this.DASH_COOLDOWN = 5000;

    this.players = new Map(); // playerId -> player state
    this.bullets = new Map(); // bulletId -> bullet state
    this.weaponPickups = [];
    this.walls = []; // Will be populated from client wall config

    this.currentTick = 0;
    this.lastTickTime = Date.now();

    // Delta compression - store last sent state
    this.lastSentState = null;

    this.initWeaponPickups();
    this.initWalls();
  }

  initWeaponPickups() {
    const weaponSpawnPoints = [
      // Center area
      { x: 0, y: 400, type: 'sniper' },
      { x: 0, y: -400, type: 'shotgun' },
      { x: 400, y: 0, type: 'burst' },
      { x: -400, y: 0, type: 'sniper' },
      // Corners
      { x: 700, y: 700, type: 'sniper' },
      { x: -700, y: 700, type: 'shotgun' },
      { x: 700, y: -700, type: 'burst' },
      { x: -700, y: -700, type: 'shotgun' },
      // Mid positions
      { x: 500, y: 500, type: 'shotgun' },
      { x: -500, y: -500, type: 'sniper' },
      { x: 500, y: -500, type: 'burst' },
      { x: -500, y: 500, type: 'burst' }
    ];

    this.weaponPickups = weaponSpawnPoints.map((spawn, index) => ({
      id: index,
      x: spawn.x,
      y: spawn.y,
      type: spawn.type,
      available: true,
      respawnAt: 0
    }));
  }

  initWalls() {
    // Wall collision boxes matching GameScene.js client-side walls
    this.walls = [
      // CENTER AREA
      { x: 0, y: 200, width: 150, height: 40 },
      { x: 0, y: -200, width: 150, height: 40 },
      { x: 200, y: 0, width: 40, height: 150 },
      { x: -200, y: 0, width: 40, height: 150 },

      // INNER QUADRANTS
      { x: 400, y: 300, width: 300, height: 40 },
      { x: -400, y: 300, width: 300, height: 40 },
      { x: 400, y: -300, width: 300, height: 40 },
      { x: -400, y: -300, width: 300, height: 40 },
      { x: 600, y: 100, width: 40, height: 300 },
      { x: -600, y: 100, width: 40, height: 300 },
      { x: 600, y: -100, width: 40, height: 300 },
      { x: -600, y: -100, width: 40, height: 300 },

      // MID RANGE - L-shaped corners
      { x: 200, y: 600, width: 200, height: 40 },
      { x: 300, y: 500, width: 40, height: 200 },
      { x: -200, y: 600, width: 200, height: 40 },
      { x: -300, y: 500, width: 40, height: 200 },
      { x: 200, y: -600, width: 200, height: 40 },
      { x: 300, y: -500, width: 40, height: 200 },
      { x: -200, y: -600, width: 200, height: 40 },
      { x: -300, y: -500, width: 40, height: 200 },

      // OUTER QUADRANTS
      { x: 900, y: 900, width: 250, height: 40 },
      { x: 1100, y: 700, width: 40, height: 250 },
      { x: 800, y: 1100, width: 200, height: 40 },
      { x: -900, y: 900, width: 250, height: 40 },
      { x: -1100, y: 700, width: 40, height: 250 },
      { x: -800, y: 1100, width: 200, height: 40 },
      { x: 900, y: -900, width: 250, height: 40 },
      { x: 1100, y: -700, width: 40, height: 250 },
      { x: 800, y: -1100, width: 200, height: 40 },
      { x: -900, y: -900, width: 250, height: 40 },
      { x: -1100, y: -700, width: 40, height: 250 },
      { x: -800, y: -1100, width: 200, height: 40 },

      // MID-OUTER RING
      { x: 0, y: 750, width: 200, height: 40 },
      { x: 0, y: -750, width: 200, height: 40 },
      { x: 750, y: 0, width: 40, height: 200 },
      { x: -750, y: 0, width: 40, height: 200 },

      // DIAGONAL AREA WALLS
      { x: 500, y: 800, width: 180, height: 40 },
      { x: 800, y: 500, width: 40, height: 180 },
      { x: -500, y: 800, width: 180, height: 40 },
      { x: -800, y: 500, width: 40, height: 180 },
      { x: 500, y: -800, width: 180, height: 40 },
      { x: 800, y: -500, width: 40, height: 180 },
      { x: -500, y: -800, width: 180, height: 40 },
      { x: -800, y: -500, width: 40, height: 180 },

      // FAR CORNERS
      { x: 1200, y: 1200, width: 150, height: 40 },
      { x: 1200, y: 1100, width: 40, height: 150 },
      { x: -1200, y: 1200, width: 150, height: 40 },
      { x: -1200, y: 1100, width: 40, height: 150 },
      { x: 1200, y: -1200, width: 150, height: 40 },
      { x: 1200, y: -1100, width: 40, height: 150 },
      { x: -1200, y: -1200, width: 150, height: 40 },
      { x: -1200, y: -1100, width: 40, height: 150 }
    ];
  }

  addPlayer(playerId, spawnX, spawnY) {
    const player = {
      id: playerId,
      x: spawnX,
      y: spawnY,
      velocityX: 0,
      velocityY: 0,
      rotation: 0, // Aim angle
      hp: 3,
      maxHp: 3,
      weapon: 'rapid',
      kills: 0,
      isDashing: false,
      isInvulnerable: false,
      lastShot: 0,
      lastDash: 0,
      dashEndTime: 0,
      invulnerableUntil: 0,
      lastProcessedInput: 0, // For client reconciliation
      // Animation state
      isMoving: false,
      facingLeft: false
    };

    this.players.set(playerId, player);
    return player;
  }

  removePlayer(playerId) {
    this.players.delete(playerId);
  }

  processInput(playerId, input) {
    const player = this.players.get(playerId);
    if (!player || player.hp <= 0) return;

    const now = Date.now();
    const deltaTime = 1 / this.TICK_RATE; // Fixed timestep

    // Validate input (basic anti-cheat)
    if (!this.validateInput(input)) {
      console.warn(`⚠️  Invalid input from ${playerId}`);
      return;
    }

    // Movement
    if (input.movement && !player.isDashing) {
      const { x, y } = input.movement;

      // Normalize movement vector
      const mag = Math.sqrt(x * x + y * y);
      const normalizedX = mag > 0 ? x / mag : 0;
      const normalizedY = mag > 0 ? y / mag : 0;

      // Apply velocity
      player.velocityX = normalizedX * this.PLAYER_SPEED;
      player.velocityY = normalizedY * this.PLAYER_SPEED;

      // Update animation state
      player.isMoving = mag > 0.1;
      if (normalizedX < 0) player.facingLeft = true;
      if (normalizedX > 0) player.facingLeft = false;
    } else if (!player.isDashing) {
      player.velocityX = 0;
      player.velocityY = 0;
      player.isMoving = false;
    }

    // Aim
    if (input.aim !== undefined) {
      player.rotation = input.aim;
    }

    // Dash
    if (input.dash && this.canDash(player, now)) {
      this.executeDash(player, now);
    }

    // Shoot (only if there's a valid target in range)
    if (input.shoot && this.canShoot(player, now) && this.hasValidTarget(player)) {
      this.executeShoot(player, now);
    }

    // Store last processed input for client reconciliation
    player.lastProcessedInput = input.sequence || 0;
  }

  validateInput(input) {
    if (!input) return false;

    // Check movement magnitude
    if (input.movement) {
      const mag = Math.sqrt(input.movement.x ** 2 + input.movement.y ** 2);
      if (mag > 1.2) return false; // 20% tolerance for network jitter
    }

    // Check timestamp freshness (prevent replay attacks)
    if (input.timestamp) {
      const age = Date.now() - input.timestamp;
      if (age > 2000 || age < -100) return false; // Max 2s old, not from future
    }

    return true;
  }

  canDash(player, now) {
    return now - player.lastDash >= this.DASH_COOLDOWN && !player.isDashing;
  }

  executeDash(player, now) {
    player.isDashing = true;
    player.isInvulnerable = true;
    player.lastDash = now;
    player.dashEndTime = now + this.DASH_DURATION;
    player.invulnerableUntil = now + this.DASH_DURATION;

    // Calculate dash direction from current velocity or rotation
    let dashAngle = player.rotation;
    if (player.velocityX !== 0 || player.velocityY !== 0) {
      dashAngle = Math.atan2(player.velocityY, player.velocityX);
    }

    player.velocityX = Math.cos(dashAngle) * this.DASH_SPEED;
    player.velocityY = Math.sin(dashAngle) * this.DASH_SPEED;
  }

  canShoot(player, now) {
    const weaponConfig = this.getWeaponConfig(player.weapon);
    return now - player.lastShot >= weaponConfig.fireRate;
  }

  hasValidTarget(player) {
    // Check if there's at least one other player in range
    const weaponConfig = this.getWeaponConfig(player.weapon);
    const maxRange = weaponConfig.range;

    for (const [targetId, target] of this.players) {
      // Skip self
      if (targetId === player.id) continue;

      // Skip dead players
      if (target.hp <= 0) continue;

      // Check distance
      const dx = target.x - player.x;
      const dy = target.y - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // If any player is in weapon range, return true
      if (distance <= maxRange) {
        return true;
      }
    }

    return false;
  }

  executeShoot(player, now) {
    const weaponConfig = this.getWeaponConfig(player.weapon);
    player.lastShot = now;

    if (weaponConfig.pellets > 1) {
      // Shotgun
      const spreadRad = (weaponConfig.spread * Math.PI) / 180;
      for (let i = 0; i < weaponConfig.pellets; i++) {
        const offset = (i - (weaponConfig.pellets - 1) / 2) * (spreadRad / weaponConfig.pellets);
        this.createBullet(player, player.rotation + offset, weaponConfig);
      }
    } else if (weaponConfig.burstCount > 1) {
      // Burst fire - create all bullets immediately
      for (let i = 0; i < weaponConfig.burstCount; i++) {
        this.createBullet(player, player.rotation, weaponConfig, i * weaponConfig.burstDelay);
      }
    } else {
      // Single shot
      this.createBullet(player, player.rotation, weaponConfig);
    }
  }

  createBullet(player, angle, weaponConfig, delay = 0) {
    const bulletId = `${player.id}-${Date.now()}-${Math.random()}`;

    const bullet = {
      id: bulletId,
      x: player.x,
      y: player.y,
      velocityX: Math.cos(angle) * weaponConfig.bulletSpeed,
      velocityY: Math.sin(angle) * weaponConfig.bulletSpeed,
      ownerId: player.id,
      damage: weaponConfig.damage,
      range: weaponConfig.range,
      distanceTraveled: 0,
      weaponType: player.weapon,
      createdAt: Date.now() + delay
    };

    this.bullets.set(bulletId, bullet);
    return bullet;
  }

  getWeaponConfig(type) {
    const configs = {
      rapid: { damage: 1, range: 500, bulletSpeed: 500, fireRate: 800, pellets: 1, spread: 0, burstCount: 1, burstDelay: 0 },
      sniper: { damage: 2, range: 900, bulletSpeed: 800, fireRate: 2000, pellets: 1, spread: 0, burstCount: 1, burstDelay: 0 },
      shotgun: { damage: 1, range: 350, bulletSpeed: 350, fireRate: 1500, pellets: 5, spread: 15, burstCount: 1, burstDelay: 0 },
      burst: { damage: 1, range: 600, bulletSpeed: 600, fireRate: 1200, pellets: 1, spread: 0, burstCount: 3, burstDelay: 100 }
    };
    return configs[type] || configs.rapid;
  }

  update() {
    const now = Date.now();
    const deltaTime = (now - this.lastTickTime) / 1000; // Convert to seconds
    this.lastTickTime = now;
    this.currentTick++;

    // Update players
    this.players.forEach((player) => {
      this.updatePlayer(player, deltaTime, now);
    });

    // Update bullets
    this.updateBullets(deltaTime, now);

    // Update weapon pickups
    this.updateWeaponPickups(now);

    // Check collisions
    this.checkCollisions();
  }

  updatePlayer(player, deltaTime, now) {
    if (player.hp <= 0) return;

    // End dash if duration expired
    if (player.isDashing && now >= player.dashEndTime) {
      player.isDashing = false;
      player.velocityX = 0;
      player.velocityY = 0;
    }

    // End invulnerability
    if (player.isInvulnerable && now >= player.invulnerableUntil) {
      player.isInvulnerable = false;
    }

    // Update position
    const newX = player.x + player.velocityX * deltaTime;
    const newY = player.y + player.velocityY * deltaTime;

    // Check wall collisions
    if (!this.collidesWithWalls(newX, newY, 20)) { // 20 = player radius
      player.x = newX;
      player.y = newY;
    } else {
      // Stop movement if hit wall
      player.velocityX = 0;
      player.velocityY = 0;
    }

    // Clamp to world bounds
    player.x = Math.max(-1450, Math.min(1450, player.x));
    player.y = Math.max(-1450, Math.min(1450, player.y));
  }

  updateBullets(deltaTime, now) {
    const bulletsToRemove = [];

    this.bullets.forEach((bullet, bulletId) => {
      // Check if bullet should exist yet (for burst delay)
      if (now < bullet.createdAt) return;

      // Update position
      bullet.x += bullet.velocityX * deltaTime;
      bullet.y += bullet.velocityY * deltaTime;

      // Track distance
      const distance = Math.sqrt(bullet.velocityX ** 2 + bullet.velocityY ** 2) * deltaTime;
      bullet.distanceTraveled += distance;

      // Remove if out of range
      if (bullet.distanceTraveled > bullet.range) {
        bulletsToRemove.push(bulletId);
        return;
      }

      // Remove if hit wall
      if (this.collidesWithWalls(bullet.x, bullet.y, 2)) {
        bulletsToRemove.push(bulletId);
        return;
      }

      // Remove if out of world bounds
      if (Math.abs(bullet.x) > 1500 || Math.abs(bullet.y) > 1500) {
        bulletsToRemove.push(bulletId);
      }
    });

    bulletsToRemove.forEach(id => this.bullets.delete(id));
  }

  updateWeaponPickups(now) {
    this.weaponPickups.forEach(pickup => {
      if (!pickup.available && now >= pickup.respawnAt) {
        pickup.available = true;
      }
    });
  }

  checkCollisions() {
    // Bullet-player collisions
    this.bullets.forEach((bullet, bulletId) => {
      this.players.forEach((player) => {
        if (player.id === bullet.ownerId) return; // Can't hit self
        if (player.hp <= 0) return; // Already dead
        if (player.isInvulnerable) return; // I-frames

        const dx = player.x - bullet.x;
        const dy = player.y - bullet.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 25) { // Hit radius
          player.hp -= bullet.damage;
          this.bullets.delete(bulletId);

          // Check if killed
          if (player.hp <= 0) {
            const killer = this.players.get(bullet.ownerId);
            if (killer) {
              killer.kills += 1;
            }
            return { type: 'kill', victimId: player.id, killerId: bullet.ownerId };
          }

          return { type: 'hit', playerId: player.id, damage: bullet.damage };
        }
      });
    });
  }

  collidesWithWalls(x, y, radius) {
    for (const wall of this.walls) {
      // AABB collision with circle
      const closestX = Math.max(wall.x - wall.width / 2, Math.min(x, wall.x + wall.width / 2));
      const closestY = Math.max(wall.y - wall.height / 2, Math.min(y, wall.y + wall.height / 2));

      const dx = x - closestX;
      const dy = y - closestY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < radius) {
        return true;
      }
    }
    return false;
  }

  tryPickupWeapon(playerId, pickupId) {
    const player = this.players.get(playerId);
    const pickup = this.weaponPickups[pickupId];

    if (!player || !pickup || !pickup.available) return null;

    const dx = player.x - pickup.x;
    const dy = player.y - pickup.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 40) { // Pickup range
      const oldWeapon = player.weapon;
      player.weapon = pickup.type;
      pickup.available = false;
      pickup.respawnAt = Date.now() + 30000; // 30s respawn

      return { oldWeapon, newWeapon: pickup.type, pickupId };
    }

    return null;
  }

  getState() {
    // Full state snapshot
    const playerStates = {};
    this.players.forEach((player, id) => {
      playerStates[id] = {
        id: id, // Include player ID in the data
        x: Math.round(player.x * 10) / 10, // Round to 0.1 precision
        y: Math.round(player.y * 10) / 10,
        rotation: Math.round(player.rotation * 100) / 100,
        hp: player.hp,
        weapon: player.weapon,
        kills: player.kills,
        isDashing: player.isDashing,
        isInvulnerable: player.isInvulnerable,
        lastProcessedInput: player.lastProcessedInput,
        isMoving: player.isMoving,
        facingLeft: player.facingLeft
      };
    });

    const bulletStates = [];
    this.bullets.forEach((bullet) => {
      if (Date.now() >= bullet.createdAt) { // Only send bullets that should exist
        bulletStates.push({
          id: bullet.id,
          x: Math.round(bullet.x * 10) / 10,
          y: Math.round(bullet.y * 10) / 10,
          vx: bullet.velocityX,
          vy: bullet.velocityY,
          ownerId: bullet.ownerId,
          weaponType: bullet.weaponType
        });
      }
    });

    const state = {
      tick: this.currentTick,
      timestamp: Date.now(),
      players: playerStates,
      bullets: bulletStates,
      weaponPickups: this.weaponPickups.map(p => ({
        id: p.id,
        available: p.available
      }))
    };

    // Store for delta compression
    this.lastSentState = state;
    return state;
  }

  getDeltaState() {
    // If no previous state, send full state
    if (!this.lastSentState) {
      return this.getState();
    }

    // Build delta containing only changes
    const delta = {
      tick: this.currentTick,
      timestamp: Date.now(),
      isDelta: true
    };

    // Always send all players (they're usually moving)
    // But use reduced precision for bandwidth savings
    const playerStates = {};
    this.players.forEach((player, id) => {
      playerStates[id] = {
        id: id,
        x: Math.round(player.x * 10) / 10,
        y: Math.round(player.y * 10) / 10,
        rotation: Math.round(player.rotation * 100) / 100,
        hp: player.hp,
        weapon: player.weapon,
        kills: player.kills,
        isDashing: player.isDashing,
        isInvulnerable: player.isInvulnerable,
        lastProcessedInput: player.lastProcessedInput,
        isMoving: player.isMoving,
        facingLeft: player.facingLeft
      };
    });
    delta.players = playerStates;

    // Compare bullets - send all bullets (they change every tick)
    // Bullets are small and change rapidly, so always include them
    const bulletStates = [];
    this.bullets.forEach((bullet) => {
      if (Date.now() >= bullet.createdAt) {
        bulletStates.push({
          id: bullet.id,
          x: Math.round(bullet.x * 10) / 10,
          y: Math.round(bullet.y * 10) / 10,
          vx: bullet.velocityX,
          vy: bullet.velocityY,
          ownerId: bullet.ownerId,
          weaponType: bullet.weaponType
        });
      }
    });
    delta.bullets = bulletStates;

    // Weapon pickups - only if changed
    const pickupChanges = [];
    this.weaponPickups.forEach((pickup, i) => {
      const lastPickup = this.lastSentState.weaponPickups[i];
      if (!lastPickup || pickup.available !== lastPickup.available) {
        pickupChanges.push({
          id: pickup.id,
          available: pickup.available
        });
      }
    });

    if (pickupChanges.length > 0) {
      delta.weaponPickups = pickupChanges;
    }

    // Store this state for next delta
    this.lastSentState = {
      tick: this.currentTick,
      timestamp: Date.now(),
      players: playerStates,
      bullets: bulletStates,
      weaponPickups: this.weaponPickups.map(p => ({
        id: p.id,
        available: p.available
      }))
    };

    return delta;
  }

  hasPlayerChanged(current, last) {
    // Check if player state has changed significantly
    const posChanged = Math.abs(current.x - last.x) > 0.5 || Math.abs(current.y - last.y) > 0.5;
    const rotChanged = Math.abs(current.rotation - last.rotation) > 0.05;
    const stateChanged = current.hp !== last.hp ||
                        current.weapon !== last.weapon ||
                        current.kills !== last.kills ||
                        current.isDashing !== last.isDashing ||
                        current.isInvulnerable !== last.isInvulnerable ||
                        current.isMoving !== last.isMoving ||
                        current.facingLeft !== last.facingLeft;

    return posChanged || rotChanged || stateChanged;
  }

  respawnPlayer(playerId) {
    const player = this.players.get(playerId);
    if (!player) return;

    // Random spawn
    player.x = Math.random() * 2800 - 1400;
    player.y = Math.random() * 2800 - 1400;
    player.hp = 3;
    player.isInvulnerable = true;
    player.invulnerableUntil = Date.now() + 1000; // 1s spawn protection
    player.velocityX = 0;
    player.velocityY = 0;
  }
}
