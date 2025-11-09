import Phaser from 'phaser';
import Player from '../entities/Player.js';
import Enemy from '../entities/Enemy.js';
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

  create() {
    // Create Polkadot pink gradient background
    this.createBackground();

    // Create animations for character
    this.createCharacterAnimations();

    // Create player at center of world (0, 0)
    this.player = new Player(this, 0, 0);

    // Camera follows player smoothly
    this.cameras.main.startFollow(this.player.sprite, true, 0.08, 0.08);
    this.cameras.main.setZoom(1);

    // Set camera bounds to match world bounds
    this.cameras.main.setBounds(-1500, -1500, 3000, 3000);

    // Create walls/obstacles
    this.createWalls();

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
      // Destroy bullet on wall hit
      bullet.setActive(false);
      bullet.setVisible(false);
    });
    this.physics.add.collider(this.enemyBullets, this.walls, (bullet, wall) => {
      // Destroy enemy bullet on wall hit
      bullet.setActive(false);
      bullet.setVisible(false);
    });

    // Enemy bullet collision will be checked manually in update loop

    // Create UI
    this.createUI();

    // FPS and position trackers removed for cleaner UI

    // Create minimap
    this.createMinimap();

    // Start enemy spawning
    this.startEnemySpawning();

    // Create weapon spawns
    this.createWeaponSpawns();

    // Track session start time
    this.sessionStartTime = this.time.now;

    // Initialize screen effects
    this.screenEffects = new ScreenEffects(this);

    // Track bullet trails
    this.bulletTrails = new Map(); // bullet -> trail effect
    this.enemyBulletTrails = new Map(); // enemy bullet -> trail effect
  }

  update(time, delta) {
    // Update player
    if (this.player) {
      this.player.update();

      // Check weapon pickups
      this.checkWeaponPickups();
    }

    // Update minimap
    this.updateMinimap();

    // Update survival time
    if (this.player && this.player.hp > 0) {
      this.survivalTime = Math.floor((this.time.now - this.sessionStartTime) / 1000);
    }

    // Update enemies
    this.enemies.forEach(enemy => {
      if (enemy.sprite && enemy.sprite.active) {
        enemy.update();
      }
    });

    // Check player bullets hitting enemies
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
            return;
          }
        }

        this.enemies.forEach(enemy => {
          if (enemy.sprite && enemy.sprite.active) {
            const distance = Phaser.Math.Distance.Between(
              bullet.x, bullet.y,
              enemy.sprite.x, enemy.sprite.y
            );

            // Check if bullet is close enough to hit (using sprite bounds)
            if (distance < 30) {
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
              ImpactEffect.create(this, enemy.sprite.x, enemy.sprite.y, weaponType, willKill);
              this.createHitFeedback(enemy.sprite.x, enemy.sprite.y, willKill);

              // Track kills
              if (willKill) {
                this.kills++;
                // Play death sound on kill
                this.sound.play('death-sound', { volume: 0.4 });
              }
            }
          }
        });
      }
    });

    // Check enemy bullets hitting player (same manual approach)
    this.enemyBullets.children.entries.forEach(bullet => {
      if (bullet.active) {
        // Update or create bullet trail for enemy bullets
        if (!this.enemyBulletTrails.has(bullet)) {
          const trail = new BulletTrailEffect(this, bullet, bullet.weaponType || 'rapid');
          this.enemyBulletTrails.set(bullet, trail);
        }
        const trail = this.enemyBulletTrails.get(bullet);
        if (trail) trail.update();

        if (this.player && !this.player.isInvulnerable) {
          const distance = Phaser.Math.Distance.Between(
            bullet.x, bullet.y,
            this.player.sprite.x, this.player.sprite.y
          );

          // Check if bullet is close enough to hit
          if (distance < 30) {
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
      }
    });

    // Clean up bullets that are too far away
    this.bullets.children.entries.forEach(bullet => {
      if (bullet.active) {
        const distance = Phaser.Math.Distance.Between(
          this.player.sprite.x, this.player.sprite.y,
          bullet.x, bullet.y
        );

        // Remove bullet if it's 800 pixels away from player
        if (distance > 800) {
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

    // Clean up enemy bullets
    this.enemyBullets.children.entries.forEach(bullet => {
      if (bullet.active) {
        const distance = Phaser.Math.Distance.Between(
          this.player.sprite.x, this.player.sprite.y,
          bullet.x, bullet.y
        );

        if (distance > 800) {
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
    // Generate Pacific Cyan background with visible surface texture
    const baseGraphics = this.add.graphics();

    // Create visible brightness variations across the surface using noise
    const pixelSize = 8; // Larger blocks for more visible texture

    for (let x = 0; x < worldWidth; x += pixelSize) {
      for (let y = 0; y < worldHeight; y += pixelSize) {
        // Get noise value for this position (range roughly -0.5 to 0.5)
        const noiseValue = this.fbm(x * 0.005, y * 0.005, 3);

        // Convert noise to brightness multiplier (0.7 to 1.3 range for visible variation)
        const brightnessFactor = 1.0 + (noiseValue * 0.6);

        // Base Pacific Cyan: R=0x00, G=0xb4, B=0xd8
        let r = Math.floor(0x00 * brightnessFactor);
        let g = Math.floor(0xb4 * brightnessFactor);
        let b = Math.floor(0xd8 * brightnessFactor);

        // Clamp to valid color range
        r = Math.max(0, Math.min(255, r));
        g = Math.max(0, Math.min(255, g));
        b = Math.max(0, Math.min(255, b));

        const texturedColor = (r << 16) | (g << 8) | b;

        baseGraphics.fillStyle(texturedColor, 1);
        baseGraphics.fillRect(x, y, pixelSize, pixelSize);
      }
    }

    baseGraphics.generateTexture('deep-bg-texture', worldWidth, worldHeight);
    baseGraphics.destroy();
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
    // Create floating geometric particles for atmosphere
    this.ambientParticles = [];
    const particleCount = 30;
    const shapes = ['circle', 'triangle', 'diamond', 'square'];
    const colors = [0x00b4d8, 0x33c9ed, 0x0077b6, 0xf5e4d7, 0x2a2b2a]; // Pacific Cyan variations, Champagne Pink, Jet

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
        case 'square':
          graphics.fillStyle(color, 1);
          graphics.fillRect(-size/2, -size/2, size, size);
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

      // Slow floating animation
      const duration = Phaser.Math.Between(8000, 15000);
      const targetX = x + Phaser.Math.Between(-200, 200);
      const targetY = y + Phaser.Math.Between(-200, 200);

      this.tweens.add({
        targets: particle,
        x: targetX,
        y: targetY,
        duration: duration,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      // Gentle rotation
      this.tweens.add({
        targets: particle,
        angle: 360,
        duration: Phaser.Math.Between(10000, 20000),
        repeat: -1,
        ease: 'Linear'
      });

      // Subtle alpha pulse
      this.tweens.add({
        targets: particle,
        alpha: Phaser.Math.FloatBetween(0.05, 0.4),
        duration: Phaser.Math.Between(3000, 6000),
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
      // Create graphics for each wall with pseudo-3D effect
      const graphics = this.add.graphics();

      // Base wall color
      graphics.fillStyle(wallColor, 1);
      graphics.fillRoundedRect(
        0,
        0,
        config.width,
        config.height,
        cornerRadius
      );

      // Lighter top edge (simulated lighting from above) - lighter Pacific Cyan
      graphics.fillStyle(0x33c9ed, 0.4);
      graphics.fillRoundedRect(0, 0, config.width, 4, cornerRadius);

      // Darker bottom edge (depth shadow) - Honolulu Blue (darker cyan)
      graphics.fillStyle(0x0077b6, 0.5);
      graphics.fillRoundedRect(0, config.height - 4, config.width, 4, cornerRadius);

      // Subtle left highlight - lighter Pacific Cyan
      graphics.fillStyle(0x33c9ed, 0.3);
      graphics.fillRoundedRect(0, 0, 3, config.height, cornerRadius);

      // Subtle right shadow - Honolulu Blue
      graphics.fillStyle(0x0077b6, 0.4);
      graphics.fillRoundedRect(config.width - 3, 0, 3, config.height, cornerRadius);

      // Add bright border for better contrast - Champagne Pink
      graphics.lineStyle(2, 0xf5e4d7, 0.3);
      graphics.strokeRoundedRect(
        0,
        0,
        config.width,
        config.height,
        cornerRadius
      );

      graphics.generateTexture(`wall_${config.x}_${config.y}`, config.width, config.height);
      graphics.destroy();

      // Create drop shadow for wall first
      const wallShadow = this.add.rectangle(
        config.x + 3,
        config.y + 3,
        config.width,
        config.height,
        0x2a2b2a, // Jet
        0.3
      );
      wallShadow.setDepth(0);

      // Create physics sprite with proper origin
      const wall = this.walls.create(config.x, config.y, `wall_${config.x}_${config.y}`);
      wall.setOrigin(0.5, 0.5); // Center the sprite origin
      wall.setDepth(1);
      wall.refreshBody();
    });
  }

  createUI() {
    // HP Display - hearts only
    this.hpText = this.add.text(10, 10, '', {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      padding: { x: 10, y: 6 }
    }).setScrollFactor(0).setDepth(1000);

    // DOT counter
    this.dotText = this.add.text(10, 50, '◎ 0.00', {
      fontSize: '24px',
      color: '#E6007A',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      padding: { x: 10, y: 6 }
    }).setScrollFactor(0).setDepth(1000);

    // Kills counter
    this.killsText = this.add.text(10, 90, '☠️ 0', {
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      padding: { x: 10, y: 6 }
    }).setScrollFactor(0).setDepth(1000);

    // Update UI every frame
    this.events.on('update', () => {
      if (this.player) {
        // HP hearts only
        const hearts = '❤️'.repeat(this.player.hp);
        this.hpText.setText(hearts);

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

    // Create player dot on minimap
    this.minimapPlayer = this.add.circle(0, 0, 5, 0xFFFFFF);
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

    // Update enemy dots on minimap
    // Clean up old enemy dots
    while (this.minimapEnemies.length > this.enemies.length) {
      const dot = this.minimapEnemies.pop();
      if (dot) dot.destroy();
    }

    // Create new enemy dots if needed
    while (this.minimapEnemies.length < this.enemies.length) {
      const dot = this.add.circle(0, 0, 3, 0xFF0000); // Red dots for enemies
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

    // Add enemy sprite to physics group for collisions
    this.physics.add.existing(enemy.sprite);
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
    if (!this.player || !this.player.sprite) return;

    this.weaponPickups.forEach(pickup => {
      if (!pickup.isAvailable) return;

      const distance = Phaser.Math.Distance.Between(
        this.player.sprite.x,
        this.player.sprite.y,
        pickup.sprite.x,
        pickup.sprite.y
      );

      // Magnetic pull effect when close
      if (distance < 100 && distance > 40) {
        const angle = Phaser.Math.Angle.Between(
          pickup.sprite.x,
          pickup.sprite.y,
          this.player.sprite.x,
          this.player.sprite.y
        );

        const pullStrength = (100 - distance) / 100; // Stronger when closer
        const pullX = Math.cos(angle) * pullStrength * 3;
        const pullY = Math.sin(angle) * pullStrength * 3;

        pickup.sprite.x += pullX;
        pickup.sprite.y += pullY;
        pickup.glowCircle.x = pickup.sprite.x;
        pickup.glowCircle.y = pickup.sprite.y;
        pickup.outerRing.x = pickup.sprite.x;
        pickup.outerRing.y = pickup.sprite.y;
        pickup.innerRing.x = pickup.sprite.x;
        pickup.innerRing.y = pickup.sprite.y;
        pickup.hexFrame.x = pickup.sprite.x;
        pickup.hexFrame.y = pickup.sprite.y;
        pickup.scanLines.forEach(line => {
          line.x += pullX;
          line.y += pullY;
        });
      }

      // Pickup range
      if (distance < 40) {
        const newWeaponType = pickup.pickup();
        if (newWeaponType) {
          // Play pickup sound
          this.sound.play('pickup-sound', { volume: 0.5 });

          // Drop current weapon at player's position
          const droppedType = this.player.switchWeapon(newWeaponType);

          // Enhanced weapon switch visual effects
          WeaponSwitchEffect.create(this, this.player.sprite, newWeaponType);

          // Popup text
          const pickupText = this.add.text(
            this.player.sprite.x,
            this.player.sprite.y - 50,
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
            y: this.player.sprite.y - 80,
            alpha: 0,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => pickupText.destroy()
          });

          console.log(`🔄 Picked up ${newWeaponType}, dropped ${droppedType}`);
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
}

