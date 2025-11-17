import Phaser from 'phaser';
import LocalPlayer from '../entities/LocalPlayer.js';
import RemotePlayer from '../entities/RemotePlayer.js';
import NetworkManager from '../network/NetworkManager.js';
import Enemy from '../entities/Enemy.js'; // Keep for single-player mode
import { WeaponPickup } from '../entities/Weapon.js';
import { BulletTrailEffect, ImpactEffect, WeaponSwitchEffect, ScreenEffects } from '../effects/VisualEffects.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.dotEarned = 0;
    this.enemies = [];
    this.weaponPickups = [];
    this.kills = 0;
    this.survivalTime = 0;
    this.sessionStartTime = 0;

    // NEW: Multiplayer properties
    this.isMultiplayer = true; // Toggle for testing
    this.network = null;
    this.myPlayerId = null;
    this.localPlayer = null;
    this.remotePlayers = new Map(); // playerId -> RemotePlayer

    // Client-side full state (for delta compression)
    this.clientGameState = null;
  }

  preload() {
    // Load idle animation frames
    // Source: AI-generated 5s video processed with ffmpeg color keying
    // Files: frameIdle_0064.png to frameIdle_0141.png (78 frames @ 60fps)
    for (let i = 64; i <= 141; i++) {
      const frameNum = i.toString().padStart(4, '0');
      this.load.image(`character-idle-frame${i}`, `/src/assets/frameIdle_${frameNum}.png`);
    }

    // Load running animation frames
    // Source: AI-generated 5s video processed with ffmpeg color keying
    // Files: frame_0036.png to frame_0141.png (106 frames @ 60fps)
    for (let i = 36; i <= 141; i++) {
      const frameNum = i.toString().padStart(4, '0');
      this.load.image(`character-run-frame${i}`, `/src/assets/frame_${frameNum}.png`);
    }

    this.load.image('character', '/src/assets/character.png'); // Fallback static sprite

    // Load weapon pickup sprites
    this.load.image('pickup-shotgun', '/src/assets/shotgunpickup.png');
    this.load.image('pickup-burst', '/src/assets/assaultrifflepickup.png');
    this.load.image('pickup-sniper', '/src/assets/sniperpickup.png');

    // Load sound effects
    this.load.audio('shoot-sound', '/src/assets/shoot-sound.mp3');
    this.load.audio('reload-sound', '/src/assets/reload-sound.mp3');
    this.load.audio('pickup-sound', '/src/assets/pickup-sound.mp3');
    this.load.audio('dodge-sound', '/src/assets/dodge-sound.mp3');
    this.load.audio('death-sound', '/src/assets/death.wav');

    // Create enhanced bullet graphics with geometric designs
    this.createBulletTextures();
  }

  createCharacterAnimations() {
    // Idle animation: 78 frames (frameIdle_0064 to frameIdle_0141)
    // Creates smooth looping idle breathing/slight movement animation
    const idleFrames = [];
    for (let i = 64; i <= 141; i++) {
      idleFrames.push({ key: `character-idle-frame${i}` });
    }

    this.anims.create({
      key: 'idle',
      frames: idleFrames,
      frameRate: 60, // 60fps matches source video framerate
      repeat: -1    // Loop infinitely
    });

    // Run animation: 106 frames (frame_0036 to frame_0141)
    // Creates smooth running cycle animation
    const runFrames = [];
    for (let i = 36; i <= 141; i++) {
      runFrames.push({ key: `character-run-frame${i}` });
    }

    this.anims.create({
      key: 'run',
      frames: runFrames,
      frameRate: 60, // 60fps matches source video framerate
      repeat: -1     // Loop infinitely
    });
  }

  createBulletTextures() {
    // Rapid Fire - Flat circle (MULBERRY)
    const rapidGraphics = this.add.graphics();
    // Flat Mulberry circle
    rapidGraphics.fillStyle(0xd84797, 1);
    rapidGraphics.fillCircle(8, 8, 6);
    rapidGraphics.generateTexture('bullet', 16, 16);
    rapidGraphics.destroy();

    // Sniper - Flat diamond shape (MULBERRY)
    const sniperGraphics = this.add.graphics();
    // Flat Mulberry diamond
    sniperGraphics.fillStyle(0xd84797, 1);
    sniperGraphics.fillTriangle(8, 2, 2, 8, 8, 14);
    sniperGraphics.fillTriangle(8, 2, 14, 8, 8, 14);
    sniperGraphics.generateTexture('bullet-sniper', 16, 16);
    sniperGraphics.destroy();

    // Shotgun - Flat hexagon (MULBERRY)
    const shotgunGraphics = this.add.graphics();
    // Flat Mulberry hexagon
    shotgunGraphics.fillStyle(0xd84797, 1);
    shotgunGraphics.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const x = 8 + Math.cos(angle) * 5;
      const y = 8 + Math.sin(angle) * 5;
      if (i === 0) {
        shotgunGraphics.moveTo(x, y);
      } else {
        shotgunGraphics.lineTo(x, y);
      }
    }
    shotgunGraphics.closePath();
    shotgunGraphics.fillPath();
    shotgunGraphics.generateTexture('bullet-shotgun', 16, 16);
    shotgunGraphics.destroy();

    // Burst - Flat rotated square (MULBERRY)
    const burstGraphics = this.add.graphics();
    // Flat Mulberry square
    burstGraphics.fillStyle(0xd84797, 1);
    burstGraphics.save();
    burstGraphics.translateCanvas(8, 8);
    burstGraphics.rotateCanvas(Math.PI / 4);
    burstGraphics.fillRect(-4, -4, 8, 8);
    burstGraphics.restore();
    burstGraphics.generateTexture('bullet-burst', 16, 16);
    burstGraphics.destroy();
  }

  init() {
    // No texture processing needed for character sprites
    // Keep original colors and appearance
  }

  initializeSoundSystem() {
    // OPTIMIZATION: Pool of sound objects to avoid creating new ones every time
    this.soundPool = new Map();

    // Track actively playing sounds to prevent overlap
    this.activeSounds = new Map();

    // Sound configuration with cooldowns to prevent spam
    this.soundConfig = {
      'shoot-sound': { cooldown: 50, lastPlayed: 0 },      // 50ms between shots
      'reload-sound': { cooldown: 500, lastPlayed: 0 },    // 500ms between reloads
      'pickup-sound': { cooldown: 200, lastPlayed: 0 },    // 200ms between pickups
      'dodge-sound': { cooldown: 100, lastPlayed: 0 },     // 100ms between dodge sounds
      'death-sound': { cooldown: 1000, lastPlayed: 0 }     // 1s between death sounds
    };

    // Verify all sounds are loaded before allowing playback
    this.soundsReady = false;
    const soundKeys = ['shoot-sound', 'reload-sound', 'pickup-sound', 'dodge-sound', 'death-sound'];

    let loadedCount = 0;
    soundKeys.forEach(key => {
      if (this.cache.audio.exists(key)) {
        loadedCount++;
      }
    });

    this.soundsReady = (loadedCount === soundKeys.length);

    if (!this.soundsReady) {
      console.warn('⚠️ Some sounds failed to load. Sound playback may be limited.');
    } else {
      console.log('✅ All sounds loaded successfully');
    }
  }

  // OPTIMIZATION: Safe sound playing method with pooling, rate limiting and overlap prevention
  playSoundSafe(soundKey, config = {}) {
    // Check if sounds are ready
    if (!this.soundsReady || !this.cache.audio.exists(soundKey)) {
      console.warn(`Sound ${soundKey} not available`);
      return null;
    }

    const now = this.time.now;
    const soundSettings = this.soundConfig[soundKey];

    // Check cooldown to prevent rapid-fire spam
    if (soundSettings && now - soundSettings.lastPlayed < soundSettings.cooldown) {
      return null; // Skip playing if on cooldown
    }

    // Stop any currently playing instance of this sound to prevent overlap
    if (this.activeSounds.has(soundKey)) {
      const activeSound = this.activeSounds.get(soundKey);
      if (activeSound && activeSound.isPlaying) {
        activeSound.stop();
      }
    }

    // OPTIMIZATION: Reuse sound object from pool
    let sound;
    if (this.soundPool.has(soundKey)) {
      sound = this.soundPool.get(soundKey);
    } else {
      sound = this.sound.add(soundKey);
      this.soundPool.set(soundKey, sound);
    }

    const soundConfig = {
      volume: config.volume || 0.5,
      ...config
    };

    sound.play(soundConfig);

    // Track the active sound
    this.activeSounds.set(soundKey, sound);

    // Update last played time
    if (soundSettings) {
      soundSettings.lastPlayed = now;
    }

    // Clean up when sound finishes (don't destroy, just remove from active sounds)
    sound.once('complete', () => {
      this.activeSounds.delete(soundKey);
    });

    return sound;
  }

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

    // Track bullet trails
    this.bulletTrails = new Map();
    this.enemyBulletTrails = new Map();

    console.log('✅ GameScene ready');
  }

  setupSinglePlayer() {
    // Original single-player setup
    const Player = require('../entities/Player.js').default;
    this.player = new Player(this, 0, 0);

    // Camera follows player smoothly
    this.cameras.main.startFollow(this.player.sprite, true, 0.08, 0.08);
    this.cameras.main.setZoom(1);

    // Set camera bounds to match world bounds
    this.cameras.main.setBounds(-1500, -1500, 3000, 3000);

    // Create bullets group (object pooling)
    this.bullets = this.physics.add.group({
      defaultKey: 'bullet',
      maxSize: 100,
      runChildUpdate: false
    });

    // Create enemy bullets group
    this.enemyBullets = this.physics.add.group({
      defaultKey: 'bullet',
      maxSize: 100,
      runChildUpdate: false
    });

    // Setup shooting on click
    this.input.on('pointerdown', (pointer) => {
      if (pointer.leftButtonDown()) {
        this.player.shoot(this.bullets);
      }
    });

    // Add collisions
    this.physics.add.collider(this.player.sprite, this.walls);
    this.physics.add.collider(this.bullets, this.walls, (bullet, wall) => {
      bullet.setActive(false);
      bullet.setVisible(false);
    });
    this.physics.add.collider(this.enemyBullets, this.walls, (bullet, wall) => {
      bullet.setActive(false);
      bullet.setVisible(false);
    });

    // Start enemy spawning
    this.startEnemySpawning();

    // Create weapon spawns
    this.createWeaponSpawns();
  }

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
        this.addRemotePlayer({ ...playerData, id: playerData.id });
      });

      // Weapon pickups disabled for multiplayer (keeping it simple)
      this.weaponPickups = [];

      // Camera follows local player
      this.cameras.main.startFollow(this.localPlayer.sprite, true, 0.08, 0.08);
      this.cameras.main.setZoom(1);

      // Set camera bounds to match world bounds
      this.cameras.main.setBounds(-1500, -1500, 3000, 3000);

      // Create bullets group (server creates bullets, client renders)
      this.bullets = this.physics.add.group({
        defaultKey: 'bullet',
        maxSize: 100
      });

      // OPTIMIZATION: Map for O(1) bullet lookup (bulletId -> bulletSprite)
      this.bulletMap = new Map();

      // Add collision between local player and walls
      this.physics.add.collider(this.localPlayer.sprite, this.walls);

      console.log('✅ Multiplayer setup complete');

    } catch (error) {
      console.error('❌ Failed to setup multiplayer:', error);

      // Show error to user
      this.add.text(400, 300, 'Failed to connect to server\\nPlease check if server is running', {
        fontSize: '20px',
        color: '#ff0000',
        align: 'center'
      }).setOrigin(0.5);
    }
  }

  setupNetworkHandlers() {
    // Game state updates (20 times per second)
    this.network.on('gameState', (state) => {
      this.onGameState(state);
    });

    // Player joined
    this.network.on('playerJoined', (playerData) => {
      console.log('👋 Player joined:', playerData.id);
      // Don't create a RemotePlayer for ourselves!
      if (playerData.id !== this.myPlayerId) {
        this.addRemotePlayer(playerData);
      }
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
        this.awardDOT(0.9); // 0.9 DOT per kill
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

  onGameState(state) {
    // Handle delta compression
    if (state.isDelta) {
      // Merge delta into full client state
      if (!this.clientGameState) {
        // No base state yet, wait for full state
        return;
      }

      // Merge player updates
      if (state.players) {
        Object.assign(this.clientGameState.players, state.players);
      }

      // Replace bullets (they change every frame anyway)
      if (state.bullets !== undefined) {
        this.clientGameState.bullets = state.bullets;
      }

      // Merge weapon pickup changes
      if (state.weaponPickups) {
        state.weaponPickups.forEach(pickup => {
          const idx = this.clientGameState.weaponPickups.findIndex(p => p.id === pickup.id);
          if (idx !== -1) {
            this.clientGameState.weaponPickups[idx] = pickup;
          }
        });
      }

      // Update tick
      this.clientGameState.tick = state.tick;
      this.clientGameState.timestamp = state.timestamp;

      // Use merged state for rendering
      state = this.clientGameState;
    } else {
      // Full state - store it
      this.clientGameState = state;
    }

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

    // Update bullets from server
    this.updateBulletsFromServer(state.bullets || []);
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

  updateBulletsFromServer(serverBullets) {
    if (!this.bullets || !this.bulletMap) return;

    // Track which bullets exist on server
    const serverBulletIds = new Set(serverBullets.map(b => b.id));

    // OPTIMIZED: Remove bullets that no longer exist on server (now O(n) instead of O(n²))
    this.bulletMap.forEach((bulletSprite, bulletId) => {
      if (!serverBulletIds.has(bulletId)) {
        bulletSprite.setActive(false);
        bulletSprite.setVisible(false);
        this.bulletMap.delete(bulletId);
      }
    });

    // OPTIMIZED: Add/update bullets from server (now O(1) lookup instead of O(n))
    serverBullets.forEach(serverBullet => {
      // O(1) lookup in Map
      let bulletSprite = this.bulletMap.get(serverBullet.id);

      if (!bulletSprite) {
        // Create new bullet sprite
        bulletSprite = this.bullets.get();
        if (bulletSprite) {
          bulletSprite.bulletId = serverBullet.id;
          bulletSprite.setActive(true);
          bulletSprite.setVisible(true);

          // Set bullet texture based on weapon type
          const textureKey = this.getBulletTexture(serverBullet.weaponType);
          bulletSprite.setTexture(textureKey);

          bulletSprite.setPosition(serverBullet.x, serverBullet.y);
          bulletSprite.setDepth(5);

          // Store in Map for fast lookup
          this.bulletMap.set(serverBullet.id, bulletSprite);
        }
      } else {
        // Update existing bullet position
        bulletSprite.setPosition(serverBullet.x, serverBullet.y);
      }
    });
  }

  getBulletTexture(weaponType) {
    const textureMap = {
      'rapid': 'bullet',
      'sniper': 'bullet-sniper',
      'shotgun': 'bullet-shotgun',
      'burst': 'bullet-burst'
    };
    return textureMap[weaponType] || 'bullet';
  }

  update(time, delta) {
    if (this.isMultiplayer) {
      // MULTIPLAYER MODE

      // Update local player (prediction + input sending)
      if (this.localPlayer) {
        this.localPlayer.update();
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

    // OPTIMIZATION: Update bullet trails and check range (collision detection handled by Phaser physics)
    if (this.bullets) {
      this.bullets.children.entries.forEach(bullet => {
      if (bullet.active) {
        // Update or create bullet trail
        if (!this.bulletTrails.has(bullet)) {
          const trail = new BulletTrailEffect(this, bullet, bullet.weaponType || 'rapid');
          this.bulletTrails.set(bullet, trail);
        }
        const trail = this.bulletTrails.get(bullet);
        if (trail) trail.update();

        // Check if bullet exceeded range
        if (bullet.spawnPos) {
          const distanceFromSpawn = Phaser.Math.Distance.Between(
            bullet.spawnPos.x, bullet.spawnPos.y,
            bullet.x, bullet.y
          );
          if (distanceFromSpawn > (bullet.weaponRange || 500)) {
            // Clean up trail
            if (this.bulletTrails.has(bullet)) {
              this.bulletTrails.get(bullet).destroy();
              this.bulletTrails.delete(bullet);
            }
            bullet.setActive(false);
            bullet.setVisible(false);
          }
        }
      }
    });
    }

    // OPTIMIZATION: Update enemy bullet trails (collision detection handled by Phaser physics)
    if (this.enemyBullets) {
      this.enemyBullets.children.entries.forEach(bullet => {
      if (bullet.active) {
        // Update or create bullet trail for enemy bullets
        if (!this.enemyBulletTrails.has(bullet)) {
          const trail = new BulletTrailEffect(this, bullet, bullet.weaponType || 'rapid');
          this.enemyBulletTrails.set(bullet, trail);
        }
        const trail = this.enemyBulletTrails.get(bullet);
        if (trail) trail.update();
      }
    });
    }

    // OPTIMIZATION: Cull bullets that are off-screen or too far away
    const camera = this.cameras.main;
    const cullDistance = 1000; // Pixels from camera center

    if (this.bullets) {
      this.bullets.children.entries.forEach(bullet => {
      if (bullet.active) {
        // Check if bullet is within culling distance of camera
        const distanceFromCamera = Phaser.Math.Distance.Between(
          camera.midPoint.x, camera.midPoint.y,
          bullet.x, bullet.y
        );

        if (distanceFromCamera > cullDistance) {
          // Clean up trail
          if (this.bulletTrails.has(bullet)) {
            this.bulletTrails.get(bullet).destroy();
            this.bulletTrails.delete(bullet);
          }
          bullet.setActive(false);
          bullet.setVisible(false);
        }
      }
    });
    }

    // OPTIMIZATION: Cull enemy bullets
    if (this.enemyBullets) {
      this.enemyBullets.children.entries.forEach(bullet => {
      if (bullet.active) {
        const distanceFromCamera = Phaser.Math.Distance.Between(
          camera.midPoint.x, camera.midPoint.y,
          bullet.x, bullet.y
        );

        if (distanceFromCamera > cullDistance) {
          // Clean up trail
          if (this.enemyBulletTrails.has(bullet)) {
            this.enemyBulletTrails.get(bullet).destroy();
            this.enemyBulletTrails.delete(bullet);
          }
          bullet.setActive(false);
          bullet.setVisible(false);
        }
      }
    });
    }
  }

  createBackground() {
    // Create large world for scrolling
    const worldWidth = 3000;
    const worldHeight = 3000;

    // Generate all background textures once for performance
    this.generateBackgroundTextures(worldWidth, worldHeight);

    // Pacific Cyan background with subtle surface texture variation
    const bg = this.add.image(0, 0, 'deep-bg-texture');
    bg.setDepth(-10);

    // Set world bounds - player can move through entire map
    this.physics.world.setBounds(
      -worldWidth / 2, -worldHeight / 2,
      worldWidth, worldHeight
    );

    // Add border indicators at world edges (normal scroll)
    this.createWorldBorders(worldWidth, worldHeight);

    // Enhanced grid pattern with geometric details (normal scroll)
    this.createGrid(worldWidth, worldHeight);

    // PARALLAX LAYER 5: Decorative patterns (90% speed - between background and foreground)
    this.createGeometricPatterns(worldWidth, worldHeight);

    // Add zone markers (normal scroll)
    this.createZoneMarkers();

    // Add ambient floating particles for atmosphere
    this.createAmbientParticles();
  }

  generateBackgroundTextures(worldWidth, worldHeight) {
    // OPTIMIZATION: Check if texture already exists (cached)
    if (this.textures.exists('deep-bg-texture')) {
      console.log('✅ Using cached background texture');
      return;
    }

    console.log('🎨 Generating background texture (one-time operation)...');
    const startTime = performance.now();

    // Generate Champagne Pink background with tile-like structure
    const baseGraphics = this.add.graphics();

    // Tile settings
    const tileSize = 64; // Size of each tile
    const groutSize = 2; // Size of grout lines between tiles

    for (let x = 0; x < worldWidth; x += tileSize) {
      for (let y = 0; y < worldHeight; y += tileSize) {
        // Get noise value for this tile (range roughly -0.5 to 0.5)
        const noiseValue = this.fbm(x * 0.002, y * 0.002, 2);

        // Convert noise to brightness multiplier (0.85 to 1.15 range for visible but subtle variation)
        const brightnessFactor = 1.0 + (noiseValue * 0.3);

        // Base Champagne Pink: R=0xf4, G=0xc2, B=0xc2
        let r = Math.floor(0xf4 * brightnessFactor);
        let g = Math.floor(0xc2 * brightnessFactor);
        let b = Math.floor(0xc2 * brightnessFactor);

        // Clamp to valid color range
        r = Math.max(0, Math.min(255, r));
        g = Math.max(0, Math.min(255, g));
        b = Math.max(0, Math.min(255, b));

        const tileColor = (r << 16) | (g << 8) | b;

        // Draw tile with slightly darker shade variation in some tiles
        const randomDarken = Math.random() < 0.3 ? 0.95 : 1.0; // 30% of tiles are slightly darker
        const finalR = Math.floor(r * randomDarken);
        const finalG = Math.floor(g * randomDarken);
        const finalB = Math.floor(b * randomDarken);
        const finalColor = (finalR << 16) | (finalG << 8) | finalB;

        // Draw tile
        baseGraphics.fillStyle(finalColor, 1);
        baseGraphics.fillRect(x, y, tileSize - groutSize, tileSize - groutSize);

        // Draw grout lines (slightly darker champagne)
        const groutColor = 0xe8b4b4; // Darker champagne for grout
        baseGraphics.fillStyle(groutColor, 1);
        // Right edge grout
        baseGraphics.fillRect(x + tileSize - groutSize, y, groutSize, tileSize);
        // Bottom edge grout
        baseGraphics.fillRect(x, y + tileSize - groutSize, tileSize, groutSize);

        // Add subtle surface texture within each tile
        const innerPixelSize = 8;
        for (let tx = 0; tx < tileSize - groutSize; tx += innerPixelSize) {
          for (let ty = 0; ty < tileSize - groutSize; ty += innerPixelSize) {
            const innerNoise = this.fbm((x + tx) * 0.01, (y + ty) * 0.01, 1);
            const innerBrightness = 1.0 + (innerNoise * 0.1);

            const innerR = Math.floor(finalR * innerBrightness);
            const innerG = Math.floor(finalG * innerBrightness);
            const innerB = Math.floor(finalB * innerBrightness);

            const innerColor = (Math.max(0, Math.min(255, innerR)) << 16) |
                             (Math.max(0, Math.min(255, innerG)) << 8) |
                             Math.max(0, Math.min(255, innerB));

            baseGraphics.fillStyle(innerColor, 1);
            baseGraphics.fillRect(x + tx, y + ty, innerPixelSize, innerPixelSize);
          }
        }
      }
    }

    baseGraphics.generateTexture('deep-bg-texture', worldWidth, worldHeight);
    baseGraphics.destroy();

    const endTime = performance.now();
    console.log(`✅ Background texture generated in ${(endTime - startTime).toFixed(2)}ms`);
  }

  // Simple Perlin-like noise function using value noise
  simpleNoise(x, y, seed = 0) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);

    const u = x * x * (3 - 2 * x);
    const v = y * y * (3 - 2 * y);

    // Simple hash function for pseudo-random values
    const hash = (i, j) => {
      let h = seed + i * 374761393 + j * 668265263;
      h = (h ^ (h >> 13)) * 1274126177;
      return (h ^ (h >> 16)) / 2147483648.0;
    };

    const a = hash(X, Y);
    const b = hash(X + 1, Y);
    const c = hash(X, Y + 1);
    const d = hash(X + 1, Y + 1);

    const k1 = a + u * (b - a);
    const k2 = c + u * (d - c);

    return k1 + v * (k2 - k1);
  }

  // Fractional Brownian Motion - layered noise for organic texture
  fbm(x, y, octaves = 4) {
    let value = 0;
    let amplitude = 0.5;
    let frequency = 1;

    for (let i = 0; i < octaves; i++) {
      value += amplitude * this.simpleNoise(x * frequency, y * frequency, i);
      amplitude *= 0.5;
      frequency *= 2;
    }

    return value;
  }



  createWorldBorders(width, height) {
    const graphics = this.add.graphics();

    // Pacific Cyan for borders
    const borderColor = 0x00b4d8; // Pacific Cyan
    const borderWidth = 8;
    const cornerRadius = 50;

    graphics.lineStyle(borderWidth, borderColor, 1);

    // Draw rounded rectangle
    graphics.strokeRoundedRect(
      -width / 2,
      -height / 2,
      width,
      height,
      cornerRadius
    );

    graphics.setDepth(-2);
  }

  createGrid(width, height) {
    const gridSize = 100;
    const graphics = this.add.graphics();

    // Primary grid - subtle Pacific Cyan with slight imperfections
    graphics.lineStyle(1, 0x00b4d8, 0.15);

    // Vertical lines
    for (let x = -width / 2; x <= width / 2; x += gridSize) {
      const offsetX = (Math.random() - 0.5) * 1.5; // Subtle offset
      graphics.lineBetween(x + offsetX, -height / 2, x + offsetX, height / 2);
    }

    // Horizontal lines
    for (let y = -height / 2; y <= height / 2; y += gridSize) {
      const offsetY = (Math.random() - 0.5) * 1.5; // Subtle offset
      graphics.lineBetween(-width / 2, y + offsetY, width / 2, y + offsetY);
    }

    // Major grid lines (every 500px) - brighter Pacific Cyan
    graphics.lineStyle(2, 0x33c9ed, 0.3);

    for (let x = -width / 2; x <= width / 2; x += 500) {
      graphics.lineBetween(x, -height / 2, x, height / 2);
    }

    for (let y = -height / 2; y <= height / 2; y += 500) {
      graphics.lineBetween(-width / 2, y, width / 2, y);
    }

    // Center cross lines - Warm champagne pink
    graphics.lineStyle(3, 0xf0d5c0, 0.4); // Warm sepia-tinted champagne
    graphics.lineBetween(0, -height / 2, 0, height / 2);
    graphics.lineBetween(-width / 2, 0, width / 2, 0);

    // Add random grid breaks/gaps for organic feel
    const gapCount = 30;
    for (let i = 0; i < gapCount; i++) {
      const x = Phaser.Math.Between(-width / 2, width / 2);
      const y = Phaser.Math.Between(-height / 2, height / 2);
      const gapSize = Math.random() * 12 + 4;

      // Cover small section to create "gap" in grid - use warm background color
      graphics.fillStyle(0xfff8ed, 0.9);
      graphics.fillCircle(x, y, gapSize);
    }

    graphics.setDepth(-1);
  }

  createGeometricPatterns(width, height) {
    const graphics = this.add.graphics();
    graphics.setDepth(-1);
    graphics.setScrollFactor(0.9); // Parallax - move slower than foreground

    // Corner decorations - hexagons in Pacific Cyan tones
    const corners = [
      { x: -1200, y: -1200 },
      { x: 1200, y: -1200 },
      { x: -1200, y: 1200 },
      { x: 1200, y: 1200 }
    ];

    corners.forEach(corner => {
      // Large hexagon - Pacific Cyan
      graphics.lineStyle(3, 0x00b4d8, 0.2);
      this.drawHexagonAt(graphics, corner.x, corner.y, 80);

      // Medium hexagon - Lighter Pacific Cyan
      graphics.lineStyle(2, 0x33c9ed, 0.15);
      this.drawHexagonAt(graphics, corner.x, corner.y, 50);

      // Small hexagon - Champagne Pink
      graphics.lineStyle(1, 0xf5e4d7, 0.1);
      this.drawHexagonAt(graphics, corner.x, corner.y, 30);

      // Corner accent lines - Pacific Cyan
      graphics.lineStyle(2, 0x00b4d8, 0.2);
      const lineLength = 60;
      if (corner.x < 0) {
        graphics.lineBetween(corner.x, corner.y, corner.x + lineLength, corner.y);
      } else {
        graphics.lineBetween(corner.x, corner.y, corner.x - lineLength, corner.y);
      }
      if (corner.y < 0) {
        graphics.lineBetween(corner.x, corner.y, corner.x, corner.y + lineLength);
      } else {
        graphics.lineBetween(corner.x, corner.y, corner.x, corner.y - lineLength);
      }
    });

    // Scattered geometric shapes for visual interest
    const decorPositions = [
      { x: -800, y: 0 }, { x: 800, y: 0 },
      { x: 0, y: -800 }, { x: 0, y: 800 },
      { x: -600, y: -600 }, { x: 600, y: -600 },
      { x: -600, y: 600 }, { x: 600, y: 600 }
    ];

    decorPositions.forEach((pos, i) => {
      const shape = i % 3;
      graphics.lineStyle(1, 0x00b4d8, 0.1); // Pacific Cyan

      switch (shape) {
        case 0: // Circle
          graphics.strokeCircle(pos.x, pos.y, 25);
          break;
        case 1: // Triangle
          const triSize = 30;
          graphics.strokeTriangle(
            pos.x, pos.y - triSize,
            pos.x - triSize, pos.y + triSize,
            pos.x + triSize, pos.y + triSize
          );
          break;
        case 2: // Diamond
          graphics.beginPath();
          graphics.moveTo(pos.x, pos.y - 25);
          graphics.lineTo(pos.x + 25, pos.y);
          graphics.lineTo(pos.x, pos.y + 25);
          graphics.lineTo(pos.x - 25, pos.y);
          graphics.closePath();
          graphics.strokePath();
          break;
      }
    });
  }

  drawHexagonAt(graphics, x, y, size) {
    graphics.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const px = x + Math.cos(angle) * size;
      const py = y + Math.sin(angle) * size;
      if (i === 0) {
        graphics.moveTo(px, py);
      } else {
        graphics.lineTo(px, py);
      }
    }
    graphics.closePath();
    graphics.strokePath();
  }

  createAmbientParticles() {
    // OPTIMIZATION: Reduced from 30 particles with 90 tweens to 12 particles with 24 tweens
    this.ambientParticles = [];
    const particleCount = 12; // Reduced from 30
    const shapes = ['circle', 'triangle', 'diamond'];
    const colors = [0x00b4d8, 0x33c9ed, 0xf5e4d7]; // Reduced color palette

    for (let i = 0; i < particleCount; i++) {
      const x = Phaser.Math.Between(-1400, 1400);
      const y = Phaser.Math.Between(-1400, 1400);
      const shape = Phaser.Utils.Array.GetRandom(shapes);
      const color = Phaser.Utils.Array.GetRandom(colors);
      const size = Phaser.Math.Between(3, 8);

      let particle;
      const graphics = this.add.graphics();
      graphics.setPosition(x, y);
      graphics.setDepth(-3);
      graphics.setScrollFactor(0.8); // Parallax - slower than foreground
      graphics.setAlpha(Phaser.Math.FloatBetween(0.1, 0.3));

      // Draw shape
      switch (shape) {
        case 'triangle':
          graphics.fillStyle(color, 1);
          graphics.fillTriangle(0, -size, -size, size, size, size);
          break;
        case 'diamond':
          graphics.fillStyle(color, 1);
          graphics.fillTriangle(0, -size, size, 0, 0, size);
          graphics.fillTriangle(0, -size, -size, 0, 0, size);
          break;
        default: // circle
          graphics.fillStyle(color, 1);
          graphics.fillCircle(0, 0, size);
      }

      particle = graphics;

      // OPTIMIZATION: Combine movement and rotation into single tween
      const duration = Phaser.Math.Between(8000, 15000);
      const targetX = x + Phaser.Math.Between(-200, 200);
      const targetY = y + Phaser.Math.Between(-200, 200);

      this.tweens.add({
        targets: particle,
        x: targetX,
        y: targetY,
        angle: 360,
        alpha: Phaser.Math.FloatBetween(0.05, 0.4),
        duration: duration,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      this.ambientParticles.push(particle);
    }
  }

  createZoneMarkers() {
    const graphics = this.add.graphics();
    graphics.setDepth(-1);

    // Create 4 quadrant markers (NE, NW, SE, SW) in grey tones
    const zones = [
      { x: 750, y: -750, label: 'NE', color: 0x888888 },
      { x: -750, y: -750, label: 'NW', color: 0x999999 },
      { x: 750, y: 750, label: 'SE', color: 0x777777 },
      { x: -750, y: 750, label: 'SW', color: 0xaaaaaa }
    ];

    zones.forEach(zone => {
      // Zone circle
      graphics.lineStyle(2, zone.color, 0.15);
      graphics.strokeCircle(zone.x, zone.y, 100);

      // Inner accent circle
      graphics.lineStyle(1, zone.color, 0.1);
      graphics.strokeCircle(zone.x, zone.y, 70);

      // Zone labels removed for cleaner look

      // Corner brackets
      const bracketSize = 15;
      graphics.lineStyle(2, zone.color, 0.2);
      // Top-left
      graphics.lineBetween(zone.x - 100, zone.y - 100, zone.x - 100 + bracketSize, zone.y - 100);
      graphics.lineBetween(zone.x - 100, zone.y - 100, zone.x - 100, zone.y - 100 + bracketSize);
      // Top-right
      graphics.lineBetween(zone.x + 100, zone.y - 100, zone.x + 100 - bracketSize, zone.y - 100);
      graphics.lineBetween(zone.x + 100, zone.y - 100, zone.x + 100, zone.y - 100 + bracketSize);
      // Bottom-left
      graphics.lineBetween(zone.x - 100, zone.y + 100, zone.x - 100 + bracketSize, zone.y + 100);
      graphics.lineBetween(zone.x - 100, zone.y + 100, zone.x - 100, zone.y + 100 - bracketSize);
      // Bottom-right
      graphics.lineBetween(zone.x + 100, zone.y + 100, zone.x + 100 - bracketSize, zone.y + 100);
      graphics.lineBetween(zone.x + 100, zone.y + 100, zone.x + 100, zone.y + 100 - bracketSize);
    });
  }

  createWalls() {
    // Create static group for walls
    this.walls = this.physics.add.staticGroup();

    const wallColor = 0x00b4d8; // Pacific Cyan
    const cornerRadius = 8;

    // Symmetrical wall layout - 4-way symmetry covering entire map
    const wallConfigs = [
      // CENTER AREA (0, 0)
      // Center cross walls for cover
      { x: 0, y: 200, width: 150, height: 40 },
      { x: 0, y: -200, width: 150, height: 40 },
      { x: 200, y: 0, width: 40, height: 150 },
      { x: -200, y: 0, width: 40, height: 150 },

      // INNER QUADRANTS (±400, ±300 range)
      // Horizontal walls in each quadrant
      { x: 400, y: 300, width: 300, height: 40 },
      { x: -400, y: 300, width: 300, height: 40 },
      { x: 400, y: -300, width: 300, height: 40 },
      { x: -400, y: -300, width: 300, height: 40 },

      // Vertical walls in each quadrant
      { x: 600, y: 100, width: 40, height: 300 },
      { x: -600, y: 100, width: 40, height: 300 },
      { x: 600, y: -100, width: 40, height: 300 },
      { x: -600, y: -100, width: 40, height: 300 },

      // MID RANGE (±600, ±600 range)
      // L-shaped corner walls
      { x: 200, y: 600, width: 200, height: 40 },
      { x: 300, y: 500, width: 40, height: 200 },
      { x: -200, y: 600, width: 200, height: 40 },
      { x: -300, y: 500, width: 40, height: 200 },
      { x: 200, y: -600, width: 200, height: 40 },
      { x: 300, y: -500, width: 40, height: 200 },
      { x: -200, y: -600, width: 200, height: 40 },
      { x: -300, y: -500, width: 40, height: 200 },

      // OUTER QUADRANTS (±900-1100 range)
      // Top-right outer area
      { x: 900, y: 900, width: 250, height: 40 },
      { x: 1100, y: 700, width: 40, height: 250 },
      { x: 800, y: 1100, width: 200, height: 40 },

      // Top-left outer area
      { x: -900, y: 900, width: 250, height: 40 },
      { x: -1100, y: 700, width: 40, height: 250 },
      { x: -800, y: 1100, width: 200, height: 40 },

      // Bottom-right outer area
      { x: 900, y: -900, width: 250, height: 40 },
      { x: 1100, y: -700, width: 40, height: 250 },
      { x: 800, y: -1100, width: 200, height: 40 },

      // Bottom-left outer area
      { x: -900, y: -900, width: 250, height: 40 },
      { x: -1100, y: -700, width: 40, height: 250 },
      { x: -800, y: -1100, width: 200, height: 40 },

      // MID-OUTER RING (±750 range)
      // Horizontal mid-outer walls
      { x: 0, y: 750, width: 200, height: 40 },
      { x: 0, y: -750, width: 200, height: 40 },
      { x: 750, y: 0, width: 40, height: 200 },
      { x: -750, y: 0, width: 40, height: 200 },

      // Diagonal area walls (±500, ±800)
      { x: 500, y: 800, width: 180, height: 40 },
      { x: 800, y: 500, width: 40, height: 180 },
      { x: -500, y: 800, width: 180, height: 40 },
      { x: -800, y: 500, width: 40, height: 180 },
      { x: 500, y: -800, width: 180, height: 40 },
      { x: 800, y: -500, width: 40, height: 180 },
      { x: -500, y: -800, width: 180, height: 40 },
      { x: -800, y: -500, width: 40, height: 180 },

      // FAR CORNERS (±1200-1300 range near edges)
      // Box structures near corners
      { x: 1200, y: 1200, width: 150, height: 40 },
      { x: 1200, y: 1100, width: 40, height: 150 },
      { x: -1200, y: 1200, width: 150, height: 40 },
      { x: -1200, y: 1100, width: 40, height: 150 },
      { x: 1200, y: -1200, width: 150, height: 40 },
      { x: 1200, y: -1100, width: 40, height: 150 },
      { x: -1200, y: -1200, width: 150, height: 40 },
      { x: -1200, y: -1100, width: 40, height: 150 },
    ];

    wallConfigs.forEach(config => {
      // Create graphics for each wall with enhanced 3D beveled effect
      const graphics = this.add.graphics();

      const bevelSize = 8; // Size of the beveled edge

      // Base wall color - Pacific Cyan
      graphics.fillStyle(wallColor, 1);
      graphics.fillRoundedRect(
        0,
        0,
        config.width,
        config.height,
        cornerRadius
      );

      // TOP BEVEL - Create graduated highlight from top
      // Brightest at the very top, fading down
      for (let i = 0; i < bevelSize; i++) {
        const intensity = 1 - (i / bevelSize); // 1.0 at top, 0.0 at bottom of bevel
        const alpha = 0.6 * intensity; // Fade the alpha
        graphics.fillStyle(0x90e0ef, alpha); // Very light cyan
        graphics.fillRoundedRect(0, i, config.width, 1, cornerRadius);
      }

      // BOTTOM BEVEL - Create graduated shadow from bottom
      // Darkest at the very bottom, fading up
      for (let i = 0; i < bevelSize; i++) {
        const intensity = 1 - (i / bevelSize); // 1.0 at bottom, 0.0 at top of bevel
        const alpha = 0.7 * intensity;
        graphics.fillStyle(0x03045e, alpha); // Very dark blue
        graphics.fillRoundedRect(0, config.height - bevelSize + i, config.width, 1, cornerRadius);
      }

      // LEFT BEVEL - Bright highlight (light coming from top-left)
      for (let i = 0; i < bevelSize; i++) {
        const intensity = 1 - (i / bevelSize);
        const alpha = 0.5 * intensity;
        graphics.fillStyle(0xcaf0f8, alpha); // Lighter cyan
        graphics.fillRoundedRect(i, 0, 1, config.height, cornerRadius);
      }

      // RIGHT BEVEL - Deep shadow
      for (let i = 0; i < bevelSize; i++) {
        const intensity = 1 - (i / bevelSize);
        const alpha = 0.6 * intensity;
        graphics.fillStyle(0x023e8a, alpha); // Dark blue
        graphics.fillRoundedRect(config.width - bevelSize + i, 0, 1, config.height, cornerRadius);
      }

      // Add corner highlights for extra dimension
      // Top-left corner - bright spot
      graphics.fillStyle(0xffffff, 0.3);
      graphics.fillCircle(cornerRadius, cornerRadius, cornerRadius / 2);

      // Top-right corner - slight highlight
      graphics.fillStyle(0xffffff, 0.15);
      graphics.fillCircle(config.width - cornerRadius, cornerRadius, cornerRadius / 2);

      // Bottom-left corner - slight shadow
      graphics.fillStyle(0x000000, 0.15);
      graphics.fillCircle(cornerRadius, config.height - cornerRadius, cornerRadius / 2);

      // Bottom-right corner - deepest shadow
      graphics.fillStyle(0x000000, 0.3);
      graphics.fillCircle(config.width - cornerRadius, config.height - cornerRadius, cornerRadius / 2);

      // Add subtle inner glow for plasticity
      graphics.lineStyle(1, 0xade8f4, 0.4);
      graphics.strokeRoundedRect(
        bevelSize / 2,
        bevelSize / 2,
        config.width - bevelSize,
        config.height - bevelSize,
        cornerRadius
      );

      // Outer border for definition - Champagne Pink accent
      graphics.lineStyle(2, 0xf5e4d7, 0.4);
      graphics.strokeRoundedRect(
        0,
        0,
        config.width,
        config.height,
        cornerRadius
      );

      graphics.generateTexture(`wall_${config.x}_${config.y}`, config.width, config.height);
      graphics.destroy();

      // OPTIMIZATION: Reduced from 5 shadow layers to 2 layers
      const shadowOffsetX = 6;
      const shadowOffsetY = 8;

      // Single shadow layer with blur effect
      const shadowGraphics = this.add.graphics();
      shadowGraphics.fillStyle(0x000000, 0.2);
      shadowGraphics.fillRoundedRect(
        -config.width / 2,
        -config.height / 2,
        config.width + 4,
        config.height + 4,
        cornerRadius
      );
      shadowGraphics.setPosition(
        config.x + shadowOffsetX + 2,
        config.y + shadowOffsetY + 2
      );
      shadowGraphics.setDepth(-0.5);

      // Ambient occlusion shadow (darker, tighter)
      const aoShadow = this.add.graphics();
      aoShadow.fillStyle(0x000000, 0.3);
      aoShadow.fillRoundedRect(
        -config.width / 2,
        -config.height / 2,
        config.width,
        config.height,
        cornerRadius
      );
      aoShadow.setPosition(config.x + 2, config.y + 3);
      aoShadow.setDepth(-0.3);

      // Create physics sprite with proper origin
      const wall = this.walls.create(config.x, config.y, `wall_${config.x}_${config.y}`);
      wall.setOrigin(0.5, 0.5); // Center the sprite origin
      wall.setDepth(1);
      wall.body.immovable = true; // Walls should not move on collision
      wall.refreshBody();
    });
  }

  createUI() {
    // DOT counter
    this.dotText = this.add.text(10, 10, '◎ 0.00', {
      fontSize: '24px',
      color: '#E6007A',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      padding: { x: 10, y: 6 }
    }).setScrollFactor(0).setDepth(1000);

    // Kills counter
    this.killsText = this.add.text(10, 50, '☠️ 0', {
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      padding: { x: 10, y: 6 }
    }).setScrollFactor(0).setDepth(1000);

    // Update UI every frame
    this.events.on('update', () => {
      if (this.player) {
        // DOT counter
        this.dotText.setText(`◎ ${this.dotEarned.toFixed(2)}`);

        // Kills counter
        this.killsText.setText(`☠️ ${this.kills}`);
      }
    });
  }

  createMinimap() {
    // Minimap settings
    const minimapSize = 200;
    const minimapPadding = 20;
    const worldWidth = 3000;
    const worldHeight = 3000;

    // Position minimap in top-right corner
    const minimapX = this.scale.width - minimapSize - minimapPadding;
    const minimapY = minimapPadding;

    // Create minimap background
    this.minimapBg = this.add.graphics();
    this.minimapBg.setScrollFactor(0);
    this.minimapBg.setDepth(1000);

    // Draw background with rounded corners
    const cornerRadius = 12;
    this.minimapBg.fillStyle(0x2a2b2a, 0.8); // Jet
    this.minimapBg.fillRoundedRect(minimapX, minimapY, minimapSize, minimapSize, cornerRadius);

    // Draw border with grey and rounded corners
    const borderColor = 0x808080; // Grey to match world bounds
    this.minimapBg.lineStyle(3, borderColor, 1);
    this.minimapBg.strokeRoundedRect(minimapX, minimapY, minimapSize, minimapSize, cornerRadius);

    // Draw grid lines (quadrants)
    this.minimapBg.lineStyle(1, 0x666666, 0.3);
    this.minimapBg.lineBetween(
      minimapX + minimapSize / 2, minimapY,
      minimapX + minimapSize / 2, minimapY + minimapSize
    );
    this.minimapBg.lineBetween(
      minimapX, minimapY + minimapSize / 2,
      minimapX + minimapSize, minimapY + minimapSize / 2
    );

    // Create player dot on minimap (blue for local player)
    this.minimapPlayer = this.add.circle(0, 0, 4, 0x0080FF); // Blue dot
    this.minimapPlayer.setScrollFactor(0);
    this.minimapPlayer.setDepth(1001);

    // Create viewport rectangle on minimap
    this.minimapViewport = this.add.graphics();
    this.minimapViewport.setScrollFactor(0);
    this.minimapViewport.setDepth(1001);

    // Create container for enemy dots on minimap
    this.minimapEnemies = [];

    // Create graphics for obstacles on minimap
    this.minimapObstacles = this.add.graphics();
    this.minimapObstacles.setScrollFactor(0);
    this.minimapObstacles.setDepth(1000);

    // Draw obstacles on minimap (walls)
    this.minimapObstacles.fillStyle(0xcccccc, 0.6); // Light grey
    this.walls.children.entries.forEach(wall => {
      const wallMinimapX = minimapX + ((wall.x + worldWidth / 2) / worldWidth) * minimapSize;
      const wallMinimapY = minimapY + ((wall.y + worldHeight / 2) / worldHeight) * minimapSize;
      const wallMinimapWidth = (wall.displayWidth / worldWidth) * minimapSize;
      const wallMinimapHeight = (wall.displayHeight / worldHeight) * minimapSize;

      this.minimapObstacles.fillRect(
        wallMinimapX - wallMinimapWidth / 2,
        wallMinimapY - wallMinimapHeight / 2,
        wallMinimapWidth,
        wallMinimapHeight
      );
    });

    // Create container for weapon pickup dots on minimap
    this.minimapWeaponPickups = [];

    // Store minimap settings for updates
    this.minimapSettings = {
      x: minimapX,
      y: minimapY,
      size: minimapSize,
      worldWidth,
      worldHeight
    };

    // Minimap label and quadrant labels removed for cleaner UI
  }

  updateMinimap() {
    if (!this.player || !this.minimapSettings) return;

    const { x, y, size, worldWidth, worldHeight } = this.minimapSettings;

    // Calculate player position on minimap
    // World coords: -1500 to 1500 -> Minimap coords: 0 to size
    const playerMinimapX = x + ((this.player.sprite.x + worldWidth / 2) / worldWidth) * size;
    const playerMinimapY = y + ((this.player.sprite.y + worldHeight / 2) / worldHeight) * size;

    // Update player dot position
    this.minimapPlayer.setPosition(playerMinimapX, playerMinimapY);

    // Calculate viewport rectangle on minimap
    const cam = this.cameras.main;
    const viewportWidth = cam.width;
    const viewportHeight = cam.height;

    // Scale viewport to minimap size
    const minimapViewportWidth = (viewportWidth / worldWidth) * size;
    const minimapViewportHeight = (viewportHeight / worldHeight) * size;

    // Center viewport rectangle on player position
    const viewportX = playerMinimapX - minimapViewportWidth / 2;
    const viewportY = playerMinimapY - minimapViewportHeight / 2;

    // Draw viewport rectangle with white/grey color
    this.minimapViewport.clear();
    const viewportColor = 0xbbbbbb; // Light grey
    this.minimapViewport.lineStyle(2, viewportColor, 0.9);
    this.minimapViewport.strokeRect(
      viewportX,
      viewportY,
      minimapViewportWidth,
      minimapViewportHeight
    );

    // Add semi-transparent fill
    this.minimapViewport.fillStyle(viewportColor, 0.15);
    this.minimapViewport.fillRect(
      viewportX,
      viewportY,
      minimapViewportWidth,
      minimapViewportHeight
    );

    // Update enemy/player dots on minimap
    if (this.isMultiplayer) {
      // Multiplayer: Show other players (RemotePlayers)
      const remotePlayers = Array.from(this.remotePlayers.values());

      // Clean up old dots
      while (this.minimapEnemies.length > remotePlayers.length) {
        const dot = this.minimapEnemies.pop();
        if (dot) dot.destroy();
      }

      // Create new dots if needed
      while (this.minimapEnemies.length < remotePlayers.length) {
        const dot = this.add.circle(0, 0, 4, 0xFF0000); // Red dots for other players
        dot.setScrollFactor(0);
        dot.setDepth(1001);
        this.minimapEnemies.push(dot);
      }

      // Update player dot positions
      remotePlayers.forEach((remotePlayer, index) => {
        if (remotePlayer.sprite && remotePlayer.hp > 0 && this.minimapEnemies[index]) {
          const playerX = x + ((remotePlayer.sprite.x + worldWidth / 2) / worldWidth) * size;
          const playerY = y + ((remotePlayer.sprite.y + worldHeight / 2) / worldHeight) * size;
          this.minimapEnemies[index].setPosition(playerX, playerY);
          this.minimapEnemies[index].setVisible(true);
        } else if (this.minimapEnemies[index]) {
          this.minimapEnemies[index].setVisible(false);
        }
      });
    } else {
      // Single-player: Show enemies
      // Clean up old enemy dots
      while (this.minimapEnemies.length > this.enemies.length) {
        const dot = this.minimapEnemies.pop();
        if (dot) dot.destroy();
      }

      // Create new enemy dots if needed
      while (this.minimapEnemies.length < this.enemies.length) {
        const dot = this.add.circle(0, 0, 4, 0xFF0000); // Red dots for enemies
        dot.setScrollFactor(0);
        dot.setDepth(1001);
        this.minimapEnemies.push(dot);
      }

      // Update enemy dot positions
      this.enemies.forEach((enemy, index) => {
        if (enemy.sprite && enemy.sprite.active && this.minimapEnemies[index]) {
          const enemyMinimapX = x + ((enemy.sprite.x + worldWidth / 2) / worldWidth) * size;
          const enemyMinimapY = y + ((enemy.sprite.y + worldHeight / 2) / worldHeight) * size;
          this.minimapEnemies[index].setPosition(enemyMinimapX, enemyMinimapY);
          this.minimapEnemies[index].setVisible(true);
        } else if (this.minimapEnemies[index]) {
          this.minimapEnemies[index].setVisible(false);
        }
      });
    }

    // Update weapon pickup dots on minimap
    // Clean up old weapon pickup dots
    while (this.minimapWeaponPickups.length > this.weaponPickups.length) {
      const dot = this.minimapWeaponPickups.pop();
      if (dot) dot.destroy();
    }

    // Create new weapon pickup dots if needed
    while (this.minimapWeaponPickups.length < this.weaponPickups.length) {
      const dot = this.add.circle(0, 0, 3, 0xFFFFFF); // White dots for weapons
      dot.setScrollFactor(0);
      dot.setDepth(1001);
      this.minimapWeaponPickups.push(dot);
    }

    // Update weapon pickup dot positions and colors
    this.weaponPickups.forEach((pickup, index) => {
      if (pickup.isAvailable && this.minimapWeaponPickups[index]) {
        const pickupMinimapX = x + ((pickup.sprite.x + worldWidth / 2) / worldWidth) * size;
        const pickupMinimapY = y + ((pickup.sprite.y + worldHeight / 2) / worldHeight) * size;
        this.minimapWeaponPickups[index].setPosition(pickupMinimapX, pickupMinimapY);
        this.minimapWeaponPickups[index].setVisible(true);

        // Color-code by weapon type
        const weaponColors = {
          'rapid': 0x00FF00,  // Bright green
          'sniper': 0x00FFFF,  // Cyan
          'shotgun': 0xFF6600, // Bright orange
          'burst': 0xFF00FF    // Magenta
        };
        this.minimapWeaponPickups[index].setFillStyle(weaponColors[pickup.weaponType] || 0x00FF00);
      } else if (this.minimapWeaponPickups[index]) {
        this.minimapWeaponPickups[index].setVisible(false);
      }
    });

    // Update minimap position on window resize
    const newMinimapX = this.scale.width - size - 20;
    if (newMinimapX !== this.minimapSettings.x) {
      this.minimapSettings.x = newMinimapX;
      this.minimapBg.clear();

      // Redraw background with rounded corners
      const cornerRadius = 12;
      this.minimapBg.fillStyle(0x2a2b2a, 0.8); // Jet
      this.minimapBg.fillRoundedRect(newMinimapX, y, size, size, cornerRadius);

      // Redraw border with grey and rounded corners
      const borderColor = 0x808080; // Grey
      this.minimapBg.lineStyle(3, borderColor, 1);
      this.minimapBg.strokeRoundedRect(newMinimapX, y, size, size, cornerRadius);

      // Redraw grid lines
      this.minimapBg.lineStyle(1, 0x666666, 0.3);
      this.minimapBg.lineBetween(
        newMinimapX + size / 2, y,
        newMinimapX + size / 2, y + size
      );
      this.minimapBg.lineBetween(
        newMinimapX, y + size / 2,
        newMinimapX + size, y + size / 2
      );

      // Label positions removed for cleaner UI
    }
  }

  startEnemySpawning() {
    // OPTIMIZATION: Create physics group for enemies
    this.enemySprites = this.physics.add.group({
      runChildUpdate: false
    });

    // OPTIMIZATION: Setup collision handlers using Phaser physics (much faster than manual loops)
    this.physics.add.overlap(this.bullets, this.enemySprites, this.bulletHitEnemy, null, this);
    this.physics.add.overlap(this.enemyBullets, this.player.sprite, this.enemyBulletHitPlayer, null, this);

    // Spawn initial enemies
    this.spawnEnemy();
    this.spawnEnemy();

    // Spawn new enemy every 15 seconds
    this.time.addEvent({
      delay: 15000,
      callback: () => {
        // Max 6 enemies at once
        if (this.enemies.filter(e => e.sprite && e.sprite.active).length < 6) {
          this.spawnEnemy();
        }
      },
      loop: true
    });
  }

  spawnEnemy() {
    // Spawn enemy at random edge of map (away from player)
    const side = Phaser.Math.Between(0, 3);
    let x, y;

    switch (side) {
      case 0: // Top
        x = Phaser.Math.Between(-1400, 1400);
        y = -1400;
        break;
      case 1: // Right
        x = 1400;
        y = Phaser.Math.Between(-1400, 1400);
        break;
      case 2: // Bottom
        x = Phaser.Math.Between(-1400, 1400);
        y = 1400;
        break;
      case 3: // Left
        x = -1400;
        y = Phaser.Math.Between(-1400, 1400);
        break;
    }

    const enemy = new Enemy(this, x, y, this.player);
    this.enemies.push(enemy);

    // OPTIMIZATION: Add enemy sprite to physics group for collision detection
    this.enemySprites.add(enemy.sprite);
    this.physics.add.collider(enemy.sprite, this.walls);
  }

  awardDOT(amount) {
    this.dotEarned += amount;

    // Show floating text animation
    const enemyX = this.input.mousePointer.worldX;
    const enemyY = this.input.mousePointer.worldY;

    const floatingText = this.add.text(enemyX, enemyY, `+${amount} ◎`, {
      fontSize: '28px',
      color: '#E6007A',
      fontWeight: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    }).setDepth(1000);

    // Animate floating text
    this.tweens.add({
      targets: floatingText,
      y: enemyY - 80,
      alpha: 0,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => {
        floatingText.destroy();
      }
    });
  }

  createWeaponSpawns() {
    const weaponSpawnPoints = [
      // Center area - no rapid fire since that's default
      { x: 0, y: 400, type: 'sniper' },
      { x: 0, y: -400, type: 'shotgun' },
      { x: 400, y: 0, type: 'burst' },
      { x: -400, y: 0, type: 'sniper' },

      // Corners - distribute special weapons
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

    weaponSpawnPoints.forEach(spawn => {
      const weaponPickup = new WeaponPickup(this, spawn.x, spawn.y, spawn.type);
      this.weaponPickups.push(weaponPickup);
    });

    console.log(`✨ Created ${this.weaponPickups.length} weapon spawns`);
  }

  checkWeaponPickups() {
    // In multiplayer, use localPlayer; in singleplayer, use player
    const playerToCheck = this.isMultiplayer ? this.localPlayer : this.player;
    if (!playerToCheck || !playerToCheck.sprite) return;

    this.weaponPickups.forEach((pickup, index) => {
      if (!pickup.isAvailable) return;

      const distance = Phaser.Math.Distance.Between(
        playerToCheck.sprite.x,
        playerToCheck.sprite.y,
        pickup.sprite.x,
        pickup.sprite.y
      );

      // Magnetic pull effect when close (only in single-player)
      if (!this.isMultiplayer && distance < 100 && distance > 40) {
        const angle = Phaser.Math.Angle.Between(
          pickup.sprite.x,
          pickup.sprite.y,
          playerToCheck.sprite.x,
          playerToCheck.sprite.y
        );

        const pullStrength = (100 - distance) / 100; // Stronger when closer
        const pullX = Math.cos(angle) * pullStrength * 3;
        const pullY = Math.sin(angle) * pullStrength * 3;

        // OPTIMIZATION: Update only the 4 visual elements (sprite, glow, ring, shadow)
        pickup.sprite.x += pullX;
        pickup.sprite.y += pullY;
        pickup.glowCircle.x = pickup.sprite.x;
        pickup.glowCircle.y = pickup.sprite.y;
        pickup.ring.x = pickup.sprite.x;
        pickup.ring.y = pickup.sprite.y;
        pickup.shadow.x += pullX;
        pickup.shadow.y += pullY;
      }

      // Auto-pickup when close
      if (distance < 40) {
        if (this.isMultiplayer) {
          // MULTIPLAYER: Tell server we want to pick this up
          this.network.pickupWeapon(index);
          // Server will broadcast weaponPickedUp event to all players
        } else {
          // SINGLE-PLAYER: Original pickup logic
          const newWeaponType = pickup.pickup();
          if (newWeaponType) {
            // Play pickup sound
            this.playSoundSafe('pickup-sound', { volume: 0.5 });

            // Drop current weapon at player's position
            const droppedType = playerToCheck.switchWeapon(newWeaponType);

            // Enhanced weapon switch visual effects
            WeaponSwitchEffect.create(this, playerToCheck.sprite, newWeaponType);

            // Popup text
            const pickupText = this.add.text(
              playerToCheck.sprite.x,
              playerToCheck.sprite.y - 50,
              `${newWeaponType.toUpperCase()} ACQUIRED!`,
              {
                fontSize: '24px',
                color: '#00FF00',
                fontWeight: 'bold',
                stroke: '#000000',
                strokeThickness: 4
              }
            ).setOrigin(0.5).setDepth(1000);

            this.tweens.add({
              targets: pickupText,
              y: playerToCheck.sprite.y - 80,
              alpha: 0,
              duration: 1000,
              ease: 'Power2',
              onComplete: () => pickupText.destroy()
            });

            console.log(`🔄 Picked up ${newWeaponType}, dropped ${droppedType}`);
          }
        }
      }
    });
  }

  showDeathScreen() {
    // Transition to elimination scene with player stats
    this.scene.start('EliminationScene', {
      playerStats: {
        kills: this.kills,
        survivalTime: this.survivalTime,
        placement: 0, // Will be calculated server-side in multiplayer
        totalPlayers: 100 // Default for display
      }
    });
  }

  createHitFeedback(x, y, isKill) {
    // Screen shake - more intense for kills
    if (isKill) {
      this.cameras.main.shake(250, 0.012);

      // Freeze frame (hitstop) for kills
      this.physics.pause();
      this.time.delayedCall(50, () => {
        this.physics.resume();
      });

      // White flash
      this.cameras.main.flash(100, 255, 255, 255, 0.3);
    } else {
      // Smaller shake for regular hits
      const weaponType = this.player?.currentWeapon?.type || 'rapid';
      const hitIntensity = {
        'rapid': 0.003,
        'sniper': 0.010,
        'shotgun': 0.008,
        'burst': 0.005
      };
      this.cameras.main.shake(150, hitIntensity[weaponType] || 0.003);
    }

    // Hit particles
    const particleCount = isKill ? 20 : 8;
    const color = isKill ? 0xFF0000 : 0xFFFFFF;

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = isKill ? 200 : 100;
      const distance = isKill ? 50 : 30;

      const particle = this.add.circle(x, y, isKill ? 4 : 2, color);
      particle.setDepth(100);

      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0,
        duration: 300,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }

    // Text popup on kill
    if (isKill) {
      const killText = this.add.text(x, y - 30, 'ELIMINATED!', {
        fontSize: '20px',
        color: '#FF0000',
        fontWeight: 'bold',
        stroke: '#000000',
        strokeThickness: 4
      }).setOrigin(0.5).setDepth(101);

      this.tweens.add({
        targets: killText,
        y: y - 60,
        alpha: 0,
        scale: 1.5,
        duration: 800,
        ease: 'Power2',
        onComplete: () => killText.destroy()
      });
    }
  }

  // OPTIMIZATION: Phaser physics collision handlers (replaces manual loops)
  bulletHitEnemy(bullet, enemySprite) {
    if (!bullet.active || !enemySprite.active) return;

    const enemy = enemySprite.enemyRef;
    if (!enemy) return;

    // Clean up trail
    if (this.bulletTrails.has(bullet)) {
      this.bulletTrails.get(bullet).destroy();
      this.bulletTrails.delete(bullet);
    }

    bullet.setActive(false);
    bullet.setVisible(false);
    const damage = bullet.weaponDamage || 1;

    // Check if this will be a kill
    const willKill = enemy.hp - damage <= 0;

    // Apply damage
    enemy.takeDamage(damage);

    // Enhanced hit feedback with new impact effects
    const weaponType = bullet.weaponType || 'rapid';
    ImpactEffect.create(this, enemySprite.x, enemySprite.y, weaponType, willKill);
    this.createHitFeedback(enemySprite.x, enemySprite.y, willKill);

    // Track kills
    if (willKill) {
      this.kills++;
      // Play death sound on kill
      this.playSoundSafe('death-sound', { volume: 0.4 });
    }
  }

  enemyBulletHitPlayer(playerSprite, bullet) {
    if (!bullet.active) return;
    if (this.player.isInvulnerable) return;

    // Clean up trail
    if (this.enemyBulletTrails.has(bullet)) {
      this.enemyBulletTrails.get(bullet).destroy();
      this.enemyBulletTrails.delete(bullet);
    }

    bullet.setActive(false);
    bullet.setVisible(false);
    this.player.takeDamage(1);
  }
}

