import Phaser from 'phaser';
import Weapon from './Weapon.js';
import TargetingSystem from '../systems/TargetingSystem.js';
import TargetIndicators from '../systems/TargetIndicators.js';
import MobileControls from '../systems/MobileControls.js';

export default class Player {
  constructor(scene, x, y) {
    this.scene = scene;

    // Initialize targeting systems
    this.targetingSystem = new TargetingSystem(scene);
    this.targetIndicators = new TargetIndicators(scene);

    // Detect if mobile device
    this.isMobile = this.scene.sys.game.device.input.touch;

    // Create sprite using the first frame of the idle animation
    this.sprite = scene.physics.add.sprite(x, y, 'character-idle-frame64');
    this.sprite.setScale(0.08); // Scale down for 1024x1024 images
    this.sprite.setCollideWorldBounds(true); // Keep player within world bounds
    this.sprite.setDepth(10);

    // Configure physics body for smooth collisions
    this.sprite.body.setSize(100, 100); // Adjust hitbox size (1024x1024 sprite scaled to 0.08)
    this.sprite.body.setOffset(462, 462); // Center the hitbox
    this.sprite.body.setMaxVelocity(400, 400); // Prevent extreme velocities
    this.sprite.body.setDrag(0); // No drag for responsive movement
    this.sprite.body.setBounce(0, 0); // No bounce off walls

    // Create shadow sprite that matches character shape
    this.shadow = scene.add.sprite(x, y, 'character-idle-frame64');
    this.shadow.setScale(0.08); // Match sprite scale
    this.shadow.setDepth(9); // Just below player
    this.shadow.setTint(0x000000); // Make it black
    this.shadow.setAlpha(0.4); // Semi-transparent shadow

    // Play idle animation initially
    this.sprite.play('idle');

    // Movement properties
    this.speed = 250; // pixels per second
    this.lastDirection = 1; // 1 for right, -1 for left (for sprite flipping)
    this.hp = 3;
    this.maxHp = 3;

    // Weapon system
    this.currentWeapon = new Weapon(scene, 'rapid'); // Start with rapid fire
    this.lastFired = 0;
    this.wasReadyToFire = true; // Track if weapon was ready last frame

    // Dash properties
    this.dashDistance = 150;
    this.dashDuration = 200;
    this.dashSpeed = 750;
    this.dashCooldown = 5000;
    this.lastDash = 0;
    this.isDashing = false;

    // Invulnerability frames
    this.isInvulnerable = false;
    this.invulnerabilityDuration = 1000; // 1 second of invulnerability after hit

    // Create ability cooldown indicators around player
    this.cooldownIndicators = scene.add.graphics();
    this.cooldownIndicators.setDepth(11); // Above player

    // OPTIMIZATION: Track last drawn values to avoid unnecessary graphic operations
    this.lastFirePercent = -1;
    this.lastDashPercent = -1;

    // Store offset for positioning (drawn at 0,0 then positioned via setPosition)
    this.indicatorYOffset = -50;

    // Setup controls based on device
    this.setupInput();

    // Initialize mobile controls if on mobile
    if (this.isMobile) {
      this.mobileControls = new MobileControls(scene, this);
    }
  }

  setupInput() {
    if (this.isMobile) {
      // Mobile controls are handled by MobileControls class
      // No keyboard/mouse needed
      return;
    }

    // Desktop controls
    // WASD keys
    this.keys = this.scene.input.keyboard.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D
    });

    // Also support arrow keys as backup
    this.cursors = this.scene.input.keyboard.createCursorKeys();

    // Left-click for shoot (auto-aim)
    this.scene.input.on('pointerdown', (pointer) => {
      if (pointer.leftButtonDown()) {
        this.shoot(this.scene.bullets);
      } else if (pointer.rightButtonDown()) {
        this.dash();
      }
    });
  }

  update() {
    // Handle movement based on device
    if (this.isMobile && this.mobileControls) {
      // Mobile controls update (handles joystick movement)
      this.mobileControls.update();
    } else {
      // Desktop keyboard movement
      this.handleMovement();
    }

    // Update shadow to match player sprite
    if (this.shadow) {
      // Shadow offset (cast to bottom-right to match lighting)
      const shadowOffsetX = 4;
      const shadowOffsetY = 6;

      // Position shadow with offset for 3D effect
      this.shadow.setPosition(
        this.sprite.x + shadowOffsetX,
        this.sprite.y + shadowOffsetY
      );

      // Match sprite's current texture frame for animation
      if (this.sprite.texture) {
        this.shadow.setTexture(this.sprite.texture.key);
        this.shadow.setFrame(this.sprite.frame.name);
      }

      // Match sprite flip
      this.shadow.setFlipX(this.sprite.flipX);

      // Match sprite scale
      this.shadow.setScale(this.sprite.scaleX, this.sprite.scaleY);

      // Make shadow slightly flattened for ground contact
      this.shadow.setScale(this.sprite.scaleX * 1.0, this.sprite.scaleY * 0.6);
    }

    // Handle auto-aim targeting
    this.handleAutoAim();

    // Check for reload sound (when weapon becomes ready after cooldown)
    this.checkReloadSound();

    // Update cooldown indicators
    this.updateCooldownIndicators();

    // Visual indicator for invulnerability - simple blinking
    if (this.isInvulnerable) {
      // Blink by toggling visibility rapidly
      const blinkSpeed = 100; // milliseconds
      const shouldShow = Math.floor(this.scene.time.now / blinkSpeed) % 2 === 0;
      this.sprite.visible = shouldShow;
      // Also hide shadow when blinking
      if (this.shadow) this.shadow.visible = shouldShow;
    } else {
      // Ensure sprite is always visible when not invulnerable
      this.sprite.visible = true;
      if (this.shadow) this.shadow.visible = true;
    }
  }

  handleMovement() {
    // Don't override velocity if dashing
    if (this.isDashing) return;

    // Skip if on mobile (handled by MobileControls)
    if (this.isMobile) return;

    // Reset velocity
    this.sprite.setVelocity(0);

    // Create velocity vector
    const velocity = new Phaser.Math.Vector2(0, 0);

    // WASD input
    if (this.keys.W.isDown || this.cursors.up.isDown) {
      velocity.y -= 1;
    }
    if (this.keys.S.isDown || this.cursors.down.isDown) {
      velocity.y += 1;
    }
    if (this.keys.A.isDown || this.cursors.left.isDown) {
      velocity.x -= 1;
    }
    if (this.keys.D.isDown || this.cursors.right.isDown) {
      velocity.x += 1;
    }

    // Store movement direction for dash
    this.movementDirection = velocity.clone();

    // Normalize diagonal movement (so moving diagonally isn't faster)
    if (velocity.length() > 0) {
      velocity.normalize();
      velocity.scale(this.speed);
    }

    // Apply velocity
    this.sprite.setVelocity(velocity.x, velocity.y);

    // Handle animations and sprite flipping based on movement
    const isMoving = velocity.length() > 0;

    if (isMoving) {
      // Play run animation if not already playing
      if (this.sprite.anims.currentAnim?.key !== 'run') {
        this.sprite.play('run');
      }

      // Determine direction and flip sprite accordingly
      // Only flip when there's horizontal movement
      if (velocity.x !== 0) {
        if (velocity.x < 0) {
          // Moving left - flip sprite
          this.sprite.setFlipX(true);
          this.lastDirection = -1;
        } else {
          // Moving right - don't flip (default orientation)
          this.sprite.setFlipX(false);
          this.lastDirection = 1;
        }
      }
    } else {
      // Play idle animation when stopped
      if (this.sprite.anims.currentAnim?.key !== 'idle') {
        this.sprite.play('idle');
      }
    }
  }

  dash() {
    const now = this.scene.time.now;

    // Check if dash is on cooldown
    if (now - this.lastDash < this.dashCooldown) {
      console.log(`⏳ Dash on cooldown: ${((this.dashCooldown - (now - this.lastDash)) / 1000).toFixed(1)}s`);
      return;
    }

    // Already dashing
    if (this.isDashing) return;

    // Get dash direction
    let direction;
    if (this.movementDirection && this.movementDirection.length() > 0) {
      direction = this.movementDirection.clone().normalize();
    } else {
      // If standing still, dash toward mouse
      const pointer = this.scene.input.activePointer;
      const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
      direction = new Phaser.Math.Vector2(
        worldPoint.x - this.sprite.x,
        worldPoint.y - this.sprite.y
      ).normalize();
    }

    // Start dash
    this.isDashing = true;
    this.lastDash = now;

    // Make player invincible during dash
    this.isInvulnerable = true;

    // Apply dash velocity
    this.sprite.setVelocity(
      direction.x * this.dashSpeed,
      direction.y * this.dashSpeed
    );

    // Create dash trail effect
    this.createDashTrail();

    // Play dash sound using safe method
    if (this.scene.playSoundSafe) {
      this.scene.playSoundSafe('dodge-sound', { volume: 0.4 });
    }
    console.log('💨 DASH!');

    // End dash after duration
    this.scene.time.delayedCall(this.dashDuration, () => {
      this.isDashing = false;
      // Remove invincibility when dash ends (unless already invulnerable from taking damage)
      // Check if we're in a damage-based invulnerability window
      if (this.invulnerabilityTimer) {
        // Don't remove invulnerability yet, damage-based i-frames are still active
      } else {
        this.isInvulnerable = false;
      }
    });
  }

  createDashTrail() {
    // Create afterimage trail
    for (let i = 0; i < 5; i++) {
      this.scene.time.delayedCall(i * 40, () => {
        // Get current texture from the sprite
        const currentTexture = this.sprite.texture.key;
        const ghost = this.scene.add.sprite(
          this.sprite.x,
          this.sprite.y,
          currentTexture
        );
        ghost.setScale(0.08); // Match new scale
        ghost.setFlipX(this.sprite.flipX); // Match the flip state
        ghost.setAlpha(0.5 - (i * 0.08));
        ghost.setDepth(9);

        this.scene.tweens.add({
          targets: ghost,
          alpha: 0,
          duration: 200,
          onComplete: () => ghost.destroy()
        });
      });
    }
  }

  canDash() {
    const now = this.scene.time.now;
    return now - this.lastDash >= this.dashCooldown && !this.isDashing;
  }

  getDashCooldownPercent() {
    const now = this.scene.time.now;
    const elapsed = now - this.lastDash;
    return Math.min(100, (elapsed / this.dashCooldown) * 100);
  }

  checkReloadSound() {
    const now = this.scene.time.now;
    const isReadyToFire = now - this.lastFired >= this.currentWeapon.config.fireRate;

    // Play reload sound when weapon transitions from not ready to ready
    if (!this.wasReadyToFire && isReadyToFire) {
      // Use safe sound method if available, prevents rapid reload sound spam
      if (this.scene.playSoundSafe) {
        this.scene.playSoundSafe('reload-sound', { volume: 0.3 });
      }
    }

    this.wasReadyToFire = isReadyToFire;
  }

  handleAutoAim() {
    // Get enemies from scene
    const enemies = this.scene.enemies || [];

    // Find target using targeting system
    const target = this.targetingSystem.findTarget(
      this,
      enemies,
      this.currentWeapon.type
    );

    // Don't rotate sprite - keep character level for Paper Mario style
    // Store angle for shooting direction only
    if (target && target.sprite) {
      const angle = Phaser.Math.Angle.Between(
        this.sprite.x,
        this.sprite.y,
        target.sprite.x,
        target.sprite.y
      );
      this.aimAngle = angle; // Store for shooting, don't apply to sprite rotation
    }

    // Update visual indicators
    this.targetIndicators.update(
      this,
      this.targetingSystem,
      this.currentWeapon.type
    );
  }

  shoot(bulletsGroup) {
    const now = this.scene.time.now;

    // Check fire rate cooldown
    if (now - this.lastFired < this.currentWeapon.config.fireRate) {
      return; // Can't shoot yet
    }

    // Check if we have a target
    if (!this.targetingSystem.hasTarget()) {
      console.log('No target locked - cannot shoot');
      return;
    }

    this.lastFired = now;
    this.wasReadyToFire = false; // Mark weapon as not ready after firing

    // Use weapon to shoot with aim angle instead of sprite rotation
    this.currentWeapon.shoot(
      this.sprite.x,
      this.sprite.y,
      this.aimAngle || 0,
      bulletsGroup
    );

    // Visual feedback - scale pulse
    const originalScale = this.sprite.scaleX;
    this.sprite.setScale(originalScale * 1.2);
    this.scene.time.delayedCall(80, () => {
      if (this.sprite) {
        this.sprite.setScale(originalScale);
      }
    });

    // Muzzle flash
    this.createMuzzleFlash();

    // Audio feedback - use safe method to prevent sound overlap
    if (this.scene.playSoundSafe) {
      this.scene.playSoundSafe('shoot-sound', { volume: 0.3 });
    }
    console.log(`💥 ${this.currentWeapon.getName()} fired!`);
  }

  createMuzzleFlash() {
    const angle = this.aimAngle || 0;
    const distance = 30;
    const x = this.sprite.x + Math.cos(angle) * distance;
    const y = this.sprite.y + Math.sin(angle) * distance;

    // White flash
    const flash = this.scene.add.circle(x, y, 8, 0xFFFFFF, 0.8);
    flash.setDepth(11);

    this.scene.tweens.add({
      targets: flash,
      scale: 2,
      alpha: 0,
      duration: 100,
      ease: 'Power2',
      onComplete: () => flash.destroy()
    });

    // Weapon-colored flash
    const flashColor = this.currentWeapon.getVisualColor();
    const coloredFlash = this.scene.add.circle(x, y, 5, flashColor, 0.6);
    coloredFlash.setDepth(11);

    this.scene.tweens.add({
      targets: coloredFlash,
      scale: 1.5,
      alpha: 0,
      duration: 150,
      ease: 'Power2',
      onComplete: () => coloredFlash.destroy()
    });
  }

  switchWeapon(weaponType) {
    const oldWeapon = this.currentWeapon.type;
    this.currentWeapon = new Weapon(this.scene, weaponType);
    console.log(`🔄 Switched from ${oldWeapon} to ${weaponType}`);
    return oldWeapon;
  }

  dropWeapon() {
    return this.currentWeapon.type;
  }

  takeDamage(amount = 1) {
    // Can't take damage if already dead or invulnerable
    if (this.hp <= 0) {
      console.log('Already dead, ignoring damage');
      return;
    }

    if (this.isInvulnerable) {
      console.log('Invulnerable, ignoring damage');
      return;
    }

    this.hp = Math.max(0, this.hp - amount);

    // Screen shake on damage
    this.scene.cameras.main.shake(200, 0.005);

    // Play dodge/damage sound using safe method
    if (this.scene.playSoundSafe) {
      this.scene.playSoundSafe('dodge-sound', { volume: 0.5 });
    }

    console.log(`💔 Took ${amount} damage! HP: ${this.hp}/${this.maxHp}`);

    if (this.hp <= 0) {
      this.die();
    } else {
      // Activate invulnerability frames
      this.isInvulnerable = true;
      console.log('Setting invulnerable = true');

      // Clear any existing invulnerability timer
      if (this.invulnerabilityTimer) {
        this.invulnerabilityTimer.remove();
      }

      // End invulnerability after duration
      this.invulnerabilityTimer = this.scene.time.delayedCall(this.invulnerabilityDuration, () => {
        this.isInvulnerable = false;
        this.invulnerabilityTimer = null;
        console.log('Setting invulnerable = false');
      });
    }
  }

  heal(amount = 1) {
    this.hp = Math.min(this.maxHp, this.hp + amount);

    // Brightness pulse on heal
    this.sprite.setScale(0.18);
    this.scene.time.delayedCall(200, () => {
      this.sprite.setScale(0.15);
    });

    console.log(`💚 Healed ${amount} HP! HP: ${this.hp}/${this.maxHp}`);
  }

  updateCooldownIndicators() {
    // FIX: Always update position first to prevent lag
    this.cooldownIndicators.setPosition(this.sprite.x, this.sprite.y + this.indicatorYOffset);

    // OPTIMIZATION: Only redraw graphics if values changed significantly (>1%)
    const now = this.scene.time.now;
    const firePercent = Math.min(100, ((now - this.lastFired) / this.currentWeapon.config.fireRate) * 100);
    const dashPercent = this.getDashCooldownPercent();

    if (Math.abs(firePercent - this.lastFirePercent) < 1 &&
        Math.abs(dashPercent - this.lastDashPercent) < 1) {
      return; // Skip redraw if no significant change (but position already updated!)
    }

    this.lastFirePercent = firePercent;
    this.lastDashPercent = dashPercent;

    this.cooldownIndicators.clear();

    const barWidth = 50; // Width of each indicator bar
    const barHeight = 6; // Height of bar
    const spacing = 4; // Space between the two bars
    const iconSize = 12; // Size for weapon/dash icons (increased from 8)

    // SHOOT BAR (Top bar) - drawn at 0,0 relative to graphics position
    const fireColor = 0xFF8C00; // Orange
    const fireAlpha = firePercent >= 100 ? 1.0 : 0.6;
    const fireWidth = (firePercent / 100) * barWidth;

    // Background bar for fire
    this.cooldownIndicators.fillStyle(0x000000, 0.7);
    this.cooldownIndicators.fillRoundedRect(
      -barWidth / 2 - 2,
      -2,
      barWidth + 4,
      barHeight + 4,
      2
    );

    // Fire progress bar with rounded corners
    if (firePercent > 0) {
      this.cooldownIndicators.fillStyle(fireColor, fireAlpha);
      this.cooldownIndicators.fillRoundedRect(
        -barWidth / 2,
        0,
        fireWidth,
        barHeight,
        2
      );

      // Add glow effect when ready
      if (firePercent >= 100) {
        this.cooldownIndicators.lineStyle(2, fireColor, 0.5);
        this.cooldownIndicators.strokeRoundedRect(
          -barWidth / 2 - 1,
          -1,
          barWidth + 2,
          barHeight + 2,
          2
        );
      }
    }

    // Weapon icon (bigger gun shape on the left)
    const weaponColor = this.currentWeapon.getVisualColor();
    this.cooldownIndicators.fillStyle(weaponColor, 1.0);
    // Gun barrel (longer and thicker)
    this.cooldownIndicators.fillRect(-barWidth / 2 - iconSize - 6, -1, iconSize + 2, 3);
    // Gun handle
    this.cooldownIndicators.fillRect(-barWidth / 2 - iconSize - 4, 1, 4, 5);
    // Gun trigger guard
    this.cooldownIndicators.fillRect(-barWidth / 2 - iconSize - 6, 4, 3, 2);

    // Border for shoot bar
    this.cooldownIndicators.lineStyle(1, 0xffffff, 0.4);
    this.cooldownIndicators.strokeRoundedRect(
      -barWidth / 2 - 2,
      -2,
      barWidth + 4,
      barHeight + 4,
      2
    );

    // DASH BAR (Bottom bar)
    const dashY = barHeight + spacing + 2;
    const dashColor = dashPercent >= 100 ? 0x00FFFF : 0xFF1B8D;
    const dashAlpha = dashPercent >= 100 ? 1.0 : 0.8;
    const dashWidth = (dashPercent / 100) * barWidth;

    // Background bar for dash
    this.cooldownIndicators.fillStyle(0x000000, 0.7);
    this.cooldownIndicators.fillRoundedRect(
      -barWidth / 2 - 2,
      dashY - 2,
      barWidth + 4,
      barHeight + 4,
      2
    );

    // Dash progress bar with rounded corners
    if (dashPercent > 0) {
      this.cooldownIndicators.fillStyle(dashColor, dashAlpha);
      this.cooldownIndicators.fillRoundedRect(
        -barWidth / 2,
        dashY,
        dashWidth,
        barHeight,
        2
      );

      // Add glow effect when ready
      if (dashPercent >= 100) {
        this.cooldownIndicators.lineStyle(2, dashColor, 0.5);
        this.cooldownIndicators.strokeRoundedRect(
          -barWidth / 2 - 1,
          dashY - 1,
          barWidth + 2,
          barHeight + 2,
          2
        );
      }
    }

    // Dash icon (bigger lightning bolt on the left)
    const dashIconColor = dashPercent >= 100 ? 0x00FFFF : 0xFFFFFF;
    this.cooldownIndicators.fillStyle(dashIconColor, 1.0);
    // Bigger lightning bolt shape
    this.cooldownIndicators.fillTriangle(
      -barWidth / 2 - iconSize - 2, dashY - 2,
      -barWidth / 2 - iconSize - 10, dashY + 3,
      -barWidth / 2 - iconSize - 5, dashY + 3
    );
    this.cooldownIndicators.fillTriangle(
      -barWidth / 2 - iconSize - 6, dashY + 3,
      -barWidth / 2 - iconSize, dashY + 8,
      -barWidth / 2 - iconSize - 6, dashY + 3
    );

    // Border for dash bar
    this.cooldownIndicators.lineStyle(1, 0xffffff, 0.4);
    this.cooldownIndicators.strokeRoundedRect(
      -barWidth / 2 - 2,
      dashY - 2,
      barWidth + 4,
      barHeight + 4,
      2
    );
  }

  die() {
    console.log('☠️ Player died!');

    // Play death sound using safe method
    if (this.scene.playSoundSafe) {
      this.scene.playSoundSafe('death-sound', { volume: 0.6 });
    }

    // Hide cooldown indicators and targeting visuals
    this.cooldownIndicators.clear();
    if (this.targetIndicators) {
      this.targetIndicators.destroy();
    }

    // Destroy mobile controls if active
    if (this.mobileControls) {
      this.mobileControls.destroy();
      this.mobileControls = null;
    }

    // Death animation - fade out sprite and shadow
    this.scene.tweens.add({
      targets: [this.sprite, this.shadow],
      alpha: 0,
      scale: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => {
        // Show death screen (single-life elimination)
        this.scene.showDeathScreen();
      }
    });
  }
}
