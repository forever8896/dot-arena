import Phaser from 'phaser';
import Weapon from './Weapon.js';

export default class Enemy {
  constructor(scene, x, y, player) {
    this.scene = scene;
    this.player = player;

    // Create drop shadow first (renders behind sprite)
    this.shadow = scene.add.ellipse(x, y + 8, 45, 15, 0x000000, 0.4);
    this.shadow.setDepth(9);
    this.shadow.setBlendMode(Phaser.BlendModes.MULTIPLY);

    // Create sprite (red-tinted character)
    this.sprite = scene.physics.add.sprite(x, y, 'character');
    this.sprite.setScale(0.15);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDepth(10);
    this.sprite.setTint(0xFF0000); // Red tint for enemies

    // Store reference to this enemy in the sprite
    this.sprite.enemyRef = this;

    // Movement properties
    this.speed = 180; // Slightly slower than player
    this.hp = 2; // Less HP than player
    this.maxHp = 2;

    // Weapon system - enemies can have different weapons
    const weaponTypes = ['rapid', 'sniper', 'shotgun', 'burst'];
    const randomWeapon = weaponTypes[Math.floor(Math.random() * weaponTypes.length)];
    this.currentWeapon = new Weapon(scene, randomWeapon);
    this.lastFired = 0;

    // Dash properties (same as player but less frequent)
    this.dashDistance = 150;
    this.dashDuration = 200;
    this.dashSpeed = 750;
    this.dashCooldown = 8000; // Longer cooldown than player
    this.lastDash = 0;
    this.isDashing = false;

    this.detectionRange = 600; // How far enemy can see player

    // AI state
    this.state = 'patrol'; // patrol, chase, attack
    this.patrolTarget = this.getRandomPatrolPoint();
  }

  getRandomPatrolPoint() {
    // Get random point within world bounds
    return {
      x: Phaser.Math.Between(-1400, 1400),
      y: Phaser.Math.Between(-1400, 1400)
    };
  }

  update() {
    if (!this.sprite.active) return;

    // Update shadow position to follow enemy
    if (this.shadow) {
      this.shadow.setPosition(this.sprite.x, this.sprite.y + 8);
    }

    // Check distance to player
    const distanceToPlayer = Phaser.Math.Distance.Between(
      this.sprite.x,
      this.sprite.y,
      this.player.sprite.x,
      this.player.sprite.y
    );

    // AI behavior based on distance
    if (distanceToPlayer < this.detectionRange) {
      this.state = 'chase';
      this.chasePlayer();

      // Try to shoot if in range
      if (distanceToPlayer < 500) {
        this.shootAtPlayer();
      }
    } else {
      this.state = 'patrol';
      this.patrol();
    }

    // Rotate to face movement direction
    this.updateRotation();
  }

  patrol() {
    // Move towards patrol target
    const distanceToTarget = Phaser.Math.Distance.Between(
      this.sprite.x,
      this.sprite.y,
      this.patrolTarget.x,
      this.patrolTarget.y
    );

    // If reached patrol point, get new one
    if (distanceToTarget < 50) {
      this.patrolTarget = this.getRandomPatrolPoint();
    }

    // Move towards patrol target
    const angle = Phaser.Math.Angle.Between(
      this.sprite.x,
      this.sprite.y,
      this.patrolTarget.x,
      this.patrolTarget.y
    );

    this.sprite.setVelocity(
      Math.cos(angle) * this.speed,
      Math.sin(angle) * this.speed
    );
  }

  chasePlayer() {
    // Don't override velocity if dashing
    if (this.isDashing) return;

    // Move towards player
    const angle = Phaser.Math.Angle.Between(
      this.sprite.x,
      this.sprite.y,
      this.player.sprite.x,
      this.player.sprite.y
    );

    this.sprite.setVelocity(
      Math.cos(angle) * this.speed,
      Math.sin(angle) * this.speed
    );

    // Try to dash towards player occasionally (30% chance when off cooldown)
    const distanceToPlayer = Phaser.Math.Distance.Between(
      this.sprite.x,
      this.sprite.y,
      this.player.sprite.x,
      this.player.sprite.y
    );

    if (distanceToPlayer > 200 && distanceToPlayer < 400) {
      if (Math.random() < 0.3 && this.scene.time.now - this.lastDash > this.dashCooldown) {
        this.dash(angle);
      }
    }
  }

  dash(angle) {
    if (this.isDashing) return;
    if (this.scene.time.now - this.lastDash < this.dashCooldown) return;

    this.isDashing = true;
    this.lastDash = this.scene.time.now;

    // Calculate dash direction
    const dashVelocityX = Math.cos(angle) * this.dashSpeed;
    const dashVelocityY = Math.sin(angle) * this.dashSpeed;

    // Apply dash velocity
    this.sprite.setVelocity(dashVelocityX, dashVelocityY);

    // End dash after duration
    this.scene.time.delayedCall(this.dashDuration, () => {
      this.isDashing = false;
      // Return to normal chase speed
      if (this.state === 'chase') {
        const angleToPlayer = Phaser.Math.Angle.Between(
          this.sprite.x,
          this.sprite.y,
          this.player.sprite.x,
          this.player.sprite.y
        );
        this.sprite.setVelocity(
          Math.cos(angleToPlayer) * this.speed,
          Math.sin(angleToPlayer) * this.speed
        );
      }
    });
  }

  updateRotation() {
    // Rotate to face movement direction
    if (this.sprite.body.velocity.length() > 0) {
      const angle = Math.atan2(
        this.sprite.body.velocity.y,
        this.sprite.body.velocity.x
      );
      this.sprite.rotation = angle;
    }
  }

  shootAtPlayer() {
    const now = this.scene.time.now;

    // Check fire rate cooldown
    if (now - this.lastFired < this.currentWeapon.config.fireRate) {
      return;
    }

    this.lastFired = now;

    // Calculate angle to player
    const angle = Phaser.Math.Angle.Between(
      this.sprite.x,
      this.sprite.y,
      this.player.sprite.x,
      this.player.sprite.y
    );

    // Use weapon to shoot
    this.currentWeapon.shoot(
      this.sprite.x,
      this.sprite.y,
      angle,
      this.scene.enemyBullets
    );

    // Visual feedback - flash with weapon color
    const weaponColor = this.currentWeapon.getVisualColor();
    this.sprite.setTint(weaponColor);
    this.scene.time.delayedCall(80, () => {
      this.sprite.setTint(0xFF0000);
    });
  }

  takeDamage(amount = 1) {
    this.hp -= amount;

    // Red flash on damage
    this.sprite.setTint(0xFF8888);
    this.scene.time.delayedCall(100, () => {
      if (this.hp > 0) {
        this.sprite.setTint(0xFF0000);
      }
    });

    if (this.hp <= 0) {
      this.die();
    }
  }

  die() {
    // Death animation (including shadow)
    this.scene.tweens.add({
      targets: [this.sprite, this.shadow],
      rotation: this.sprite.rotation + Math.PI * 3,
      alpha: 0,
      scale: 0,
      duration: 500,
      ease: 'Power2',
      onComplete: () => {
        this.sprite.destroy();
        if (this.shadow) this.shadow.destroy();
      }
    });

    // Award player DOT
    this.scene.awardDOT(0.5);
  }

  destroy() {
    if (this.sprite) {
      this.sprite.destroy();
    }
    if (this.shadow) {
      this.shadow.destroy();
    }
  }
}
