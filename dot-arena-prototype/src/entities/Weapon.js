import Phaser from 'phaser';
import { WeaponGraphics } from '../graphics/WeaponGraphics.js';

/**
 * Weapon class - Defines weapon behavior and properties
 */
export default class Weapon {
  constructor(scene, type) {
    this.scene = scene;
    this.type = type;
    this.config = this.getWeaponConfig(type);
  }

  getWeaponConfig(type) {
    const configs = {
      'rapid': {
        name: "Rapid Fire",
        fireRate: 800,
        bulletSpeed: 500,
        damage: 1,
        range: 500,
        bulletColor: 0x00FF00, // Bright green for rapid fire
        pellets: 1,
        spread: 0,
        burstCount: 1,
        burstDelay: 0,
        description: "Balanced weapon, good all-around"
      },
      'sniper': {
        name: "Sniper",
        fireRate: 2000,
        bulletSpeed: 800,
        damage: 2,
        range: 900,
        bulletColor: 0x00FFFF, // Cyan for sniper
        pellets: 1,
        spread: 0,
        burstCount: 1,
        burstDelay: 0,
        description: "High damage, slow fire rate, long range"
      },
      'shotgun': {
        name: "Shotgun",
        fireRate: 1500,
        bulletSpeed: 350,
        damage: 1,
        range: 350,
        bulletColor: 0xFF6600, // Brighter orange for shotgun
        pellets: 5,
        spread: 15,
        burstCount: 1,
        burstDelay: 0,
        description: "Close-range devastation, multiple pellets"
      },
      'burst': {
        name: "Burst Rifle",
        fireRate: 1200,
        bulletSpeed: 600,
        damage: 1,
        range: 600,
        bulletColor: 0xFF00FF, // Magenta for burst
        pellets: 1,
        spread: 0,
        burstCount: 3,
        burstDelay: 100,
        description: "3-round burst, can kill in one trigger pull"
      }
    };

    return configs[type] || configs['rapid'];
  }

  shoot(x, y, angle, bulletsGroup) {
    const bullets = [];

    if (this.config.burstCount > 1) {
      // Burst fire
      for (let i = 0; i < this.config.burstCount; i++) {
        this.scene.time.delayedCall(i * this.config.burstDelay, () => {
          const bullet = this.createBullet(x, y, angle, bulletsGroup);
          bullets.push(bullet);
        });
      }
    } else if (this.config.pellets > 1) {
      // Shotgun spread
      const spreadRad = Phaser.Math.DegToRad(this.config.spread);
      for (let i = 0; i < this.config.pellets; i++) {
        const offset = (i - (this.config.pellets - 1) / 2) * (spreadRad / this.config.pellets);
        const bullet = this.createBullet(x, y, angle + offset, bulletsGroup);
        bullets.push(bullet);
      }
    } else {
      // Single shot
      const bullet = this.createBullet(x, y, angle, bulletsGroup);
      bullets.push(bullet);
    }

    return bullets;
  }

  createBullet(x, y, angle, bulletsGroup) {
    const bullet = bulletsGroup.get(x, y);

    if (bullet) {
      // Use weapon-specific texture if available
      const textureKey = this.getBulletTexture();
      if (textureKey !== 'bullet') {
        bullet.setTexture(textureKey);
      }

      bullet.setActive(true);
      bullet.setVisible(true);
      bullet.setScale(0.8);
      bullet.setDepth(5);
      bullet.setTint(this.config.bulletColor);
      bullet.setRotation(angle); // Rotate bullet to match direction

      // Store weapon damage, range, and type on bullet
      bullet.weaponDamage = this.config.damage;
      bullet.weaponRange = this.config.range;
      bullet.weaponType = this.type;
      bullet.spawnPos = { x, y };

      // Calculate bullet velocity
      const velocityX = Math.cos(angle) * this.config.bulletSpeed;
      const velocityY = Math.sin(angle) * this.config.bulletSpeed;

      bullet.body.velocity.x = velocityX;
      bullet.body.velocity.y = velocityY;
    }

    return bullet;
  }

  getBulletTexture() {
    const textures = {
      'rapid': 'bullet',
      'sniper': 'bullet-sniper',
      'shotgun': 'bullet-shotgun',
      'burst': 'bullet-burst'
    };
    return textures[this.type] || 'bullet';
  }

  getVisualColor() {
    return this.config.bulletColor;
  }

  getName() {
    return this.config.name;
  }
}

/**
 * WeaponPickup class - Represents weapon pickups on the map
 */
export class WeaponPickup {
  constructor(scene, x, y, weaponType) {
    this.scene = scene;
    this.weaponType = weaponType;
    this.respawnTime = 30000; // 30 seconds
    this.isAvailable = true;

    // Create weapon sprite
    this.createSprite(x, y);
  }

  createSprite(x, y) {
    // Use detailed weapon graphics instead of simple lines
    const config = new Weapon(this.scene, this.weaponType).config;

    // Define world-aligned color scheme for each weapon type
    const worldColors = {
      'rapid': {
        primary: 0xd84797,    // Mulberry - matches bullets
        secondary: 0xff1b8d,  // Hot Pink - accent
        glow: 0xe6007a        // Polkadot Pink - glow
      },
      'sniper': {
        primary: 0x00b4d8,    // Pacific Cyan - matches world accent
        secondary: 0x33c9ed,  // Lighter Pacific Cyan
        glow: 0x90e0ef        // Very light cyan
      },
      'shotgun': {
        primary: 0xf5e4d7,    // Champagne Pink - matches background accent
        secondary: 0xf0d5c0,  // Warm champagne
        glow: 0xfff8ed        // Very light warm tone
      },
      'burst': {
        primary: 0xbb6bd9,    // Softer purple (between mulberry and pacific cyan)
        secondary: 0xd891ef,  // Light purple
        glow: 0xe5c3f5        // Very light purple
      }
    };

    const weaponColors = worldColors[this.weaponType] || worldColors['rapid'];

    // Check if we have a custom sprite for this weapon type
    const customSpriteMap = {
      'shotgun': 'pickup-shotgun',
      'burst': 'pickup-burst',
      'sniper': 'pickup-sniper'
    };

    let textureKey;
    this.useCustomSprite = false;

    if (customSpriteMap[this.weaponType] && this.scene.textures.exists(customSpriteMap[this.weaponType])) {
      textureKey = customSpriteMap[this.weaponType];
      this.useCustomSprite = true;
    } else {
      // Generate detailed weapon texture using WeaponGraphics for weapons without custom sprites
      textureKey = WeaponGraphics.generateTexture(this.scene, this.weaponType, 1);
    }

    // OPTIMIZATION: Reduced from 12 objects to 5 objects (shadow, sprite, glow, ring, container)

    // Create drop shadow for weapon pickup
    this.shadow = this.scene.add.ellipse(x, y + 10, 50, 18, 0x00b4d8, 0.3);
    this.shadow.setDepth(6);
    this.shadow.setBlendMode(Phaser.BlendModes.MULTIPLY);

    // Create sprite with detailed graphics
    this.sprite = this.scene.physics.add.sprite(x, y, textureKey);
    this.sprite.setDepth(8);

    // Apply weapon-specific tint to match color scheme
    this.sprite.setTint(weaponColors.primary);

    // Scale appropriately based on sprite type
    if (this.useCustomSprite) {
      this.sprite.setScale(0.15); // Custom sprites are larger resolution images
    } else {
      this.sprite.setScale(0.6); // Generated graphics are smaller
    }

    // Add enhanced holographic glow effect with weapon colors
    this.glowCircle = this.scene.add.circle(x, y, 32, weaponColors.glow, 0.5);
    this.glowCircle.setDepth(7);
    this.glowCircle.setBlendMode(Phaser.BlendModes.ADD); // Additive blending for brightness

    // OPTIMIZATION: Single ring instead of multiple rings and hexagon
    this.ring = this.scene.add.circle(x, y, 42, weaponColors.primary, 0);
    this.ring.setStrokeStyle(2, weaponColors.primary, 0.7);
    this.ring.setDepth(8);

    // Store reference
    this.sprite.weaponPickupRef = this;

    // OPTIMIZATION: Reduced from 11 tweens to 4 tweens
    // Floating animation (including all visual elements)
    this.scene.tweens.add({
      targets: [this.sprite, this.glowCircle, this.ring],
      y: y - 10,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Shadow follows but with slight offset and subtle scale
    this.scene.tweens.add({
      targets: this.shadow,
      y: y + 5,
      scaleX: 0.8,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Rotating animation for sprite
    const spinDuration = this.useCustomSprite ? 2000 : 3000;
    this.scene.tweens.add({
      targets: this.sprite,
      angle: 360,
      duration: spinDuration,
      repeat: -1,
      ease: 'Linear'
    });

    // Pulsing glow (brighter and more dramatic)
    this.scene.tweens.add({
      targets: this.glowCircle,
      scale: 1.5,
      alpha: 0.7,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  drawHexagon(graphics, size, color, alpha) {
    graphics.clear();
    graphics.lineStyle(3, color, alpha); // Thicker lines for visibility
    graphics.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const x = Math.cos(angle) * size;
      const y = Math.sin(angle) * size;
      if (i === 0) {
        graphics.moveTo(x, y);
      } else {
        graphics.lineTo(x, y);
      }
    }
    graphics.closePath();
    graphics.strokePath();
  }

  pickup() {
    if (!this.isAvailable) return null;

    this.isAvailable = false;
    this.sprite.setVisible(false);
    this.shadow.setVisible(false);
    this.glowCircle.setVisible(false);
    this.ring.setVisible(false);

    // Play pickup sound
    console.log(`🔫 Picked up ${this.weaponType}!`);

    // Respawn after delay
    this.scene.time.delayedCall(this.respawnTime, () => {
      this.respawn();
    });

    return this.weaponType;
  }

  respawn() {
    this.isAvailable = true;
    this.sprite.setVisible(true);
    this.shadow.setVisible(true);
    this.glowCircle.setVisible(true);
    this.ring.setVisible(true);

    // Get the correct target scale for the sprite
    const targetSpriteScale = this.useCustomSprite ? 0.15 : 0.6;

    // Enhanced spawn effect - sprite scales to its proper size
    this.scene.tweens.add({
      targets: this.sprite,
      scale: { from: 0, to: targetSpriteScale },
      alpha: { from: 0, to: 1 },
      duration: 300,
      ease: 'Back.easeOut'
    });

    // Other elements scale to 1
    this.scene.tweens.add({
      targets: [this.shadow, this.glowCircle, this.ring],
      scale: { from: 0, to: 1 },
      alpha: { from: 0, to: 1 },
      duration: 300,
      ease: 'Back.easeOut'
    });

    console.log(`✨ ${this.weaponType} respawned!`);
  }

  destroy() {
    if (this.sprite) this.sprite.destroy();
    if (this.shadow) this.shadow.destroy();
    if (this.backingCircle) this.backingCircle.destroy();
    if (this.glowCircle) this.glowCircle.destroy();
  }
}
