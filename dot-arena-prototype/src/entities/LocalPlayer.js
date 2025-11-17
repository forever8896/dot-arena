import Phaser from 'phaser';
import Weapon from './Weapon.js';
import TargetingSystem from '../systems/TargetingSystem.js';
import TargetIndicators from '../systems/TargetIndicators.js';
import { ImpactEffect } from '../effects/VisualEffects.js';

/**
 * LocalPlayer - Client-side prediction implementation
 *
 * This player is controlled by the local user.
 * - Sends inputs to server
 * - Predicts movement immediately (feels responsive)
 * - Reconciles with server state when it arrives
 */
export default class LocalPlayer {
  constructor(scene, x, y, playerId, networkManager) {
    this.scene = scene;
    this.playerId = playerId;
    this.network = networkManager;

    // Initialize targeting systems for visual feedback
    this.targetingSystem = new TargetingSystem(scene);
    this.targetIndicators = new TargetIndicators(scene);

    // Create sprite
    this.sprite = scene.physics.add.sprite(x, y, 'character-idle-frame64');
    this.sprite.setScale(0.08);
    this.sprite.setDepth(10);
    this.sprite.play('idle');

    // Configure physics body for smooth collisions
    this.sprite.setCollideWorldBounds(true);
    this.sprite.body.setSize(100, 100); // Adjust hitbox size (1024x1024 sprite scaled to 0.08)
    this.sprite.body.setOffset(462, 462); // Center the hitbox
    this.sprite.body.setMaxVelocity(400, 400); // Prevent extreme velocities
    this.sprite.body.setDrag(0); // No drag for responsive movement
    this.sprite.body.setBounce(0, 0); // No bounce off walls

    // Create shadow
    this.shadow = scene.add.sprite(x, y, 'character-idle-frame64');
    this.shadow.setScale(0.08);
    this.shadow.setDepth(9);
    this.shadow.setTint(0x000000);
    this.shadow.setAlpha(0.4);

    // Player state
    this.hp = 3;
    this.maxHp = 3;
    this.currentWeapon = new Weapon(scene, 'rapid'); // Create Weapon object for visuals
    this.currentWeaponType = 'rapid'; // Track type for network sync
    this.kills = 0;
    this.aimAngle = 0; // Store aim angle for visuals

    // Input controls
    this.keys = scene.input.keyboard.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D
    });
    this.cursors = scene.input.keyboard.createCursorKeys();

    // Client-side prediction
    this.inputSequence = 0;
    this.pendingInputs = [];
    this.maxPendingInputs = 60; // 1 second at 60fps

    // Input throttling (match server tick rate)
    this.inputSendRate = 20; // Hz - match server tick rate
    this.lastInputSent = 0;

    // Server reconciliation
    this.lastServerState = null;
    this.reconciliationThreshold = 25; // pixels of acceptable error (increased to reduce jitter)

    // Cooldowns (client-side prediction)
    this.lastShot = 0;
    this.lastDash = 0;
    this.isDashing = false;
    this.isInvulnerable = false;

    // Weapon configs (match server)
    this.weaponConfigs = {
      rapid: { fireRate: 800 },
      sniper: { fireRate: 2000 },
      shotgun: { fireRate: 1500 },
      burst: { fireRate: 1200 }
    };

    // Setup mouse controls
    this.setupMouseControls();

    // Cooldown indicators
    this.cooldownIndicators = scene.add.graphics();
    this.cooldownIndicators.setDepth(11);
    this.indicatorYOffset = -50;

    // HP hearts (above player)
    this.hpHearts = scene.add.graphics();
    this.hpHearts.setDepth(14);

    console.log(`✅ LocalPlayer created: ${playerId}`);
  }

  setupMouseControls() {
    this.scene.input.on('pointerdown', (pointer) => {
      if (pointer.leftButtonDown()) {
        this.requestShoot();
      } else if (pointer.rightButtonDown()) {
        this.requestDash();
      }
    });
  }

  update() {
    // Capture input every frame
    const input = this.captureInput();
    if (input && this.network.isConnected) {
      // Critical actions (dash, shoot) should be sent immediately
      const hasCriticalAction = input.shoot || input.dash;

      // Throttle regular input sending to match server tick rate (20 Hz)
      const now = Date.now();
      const shouldSend = hasCriticalAction || (now - this.lastInputSent >= (1000 / this.inputSendRate));

      if (shouldSend) {
        // Send to server
        this.network.sendInput(input);
        this.lastInputSent = now;
      }

      // Always apply prediction locally (even if not sent to server)
      this.applyMovementPrediction(input);

      // Store for reconciliation
      this.pendingInputs.push(input);

      // Limit pending inputs
      if (this.pendingInputs.length > this.maxPendingInputs) {
        this.pendingInputs.shift();
      }
    }

    // Update shadow
    this.updateShadow();

    // Update HP bar
    this.updateHPBar();

    // Update animations
    this.updateAnimation();

    // Handle auto-aim (visual feedback only, server handles actual shooting)
    this.handleAutoAim();

    // Update cooldown indicators
    this.updateCooldownIndicators();

    // Visual feedback for invulnerability
    if (this.isInvulnerable) {
      const shouldShow = Math.floor(this.scene.time.now / 100) % 2 === 0;
      this.sprite.visible = shouldShow;
      this.shadow.visible = shouldShow;
    } else {
      this.sprite.visible = true;
      this.shadow.visible = true;
    }
  }

  captureInput() {
    const input = {
      sequence: this.inputSequence++,
      timestamp: Date.now(),
      movement: { x: 0, y: 0 },
      aim: 0,
      shoot: false,
      dash: false
    };

    // Movement (WASD)
    if (this.keys.W.isDown || this.cursors.up.isDown) input.movement.y -= 1;
    if (this.keys.S.isDown || this.cursors.down.isDown) input.movement.y += 1;
    if (this.keys.A.isDown || this.cursors.left.isDown) input.movement.x -= 1;
    if (this.keys.D.isDown || this.cursors.right.isDown) input.movement.x += 1;

    // Normalize diagonal movement
    const mag = Math.sqrt(input.movement.x ** 2 + input.movement.y ** 2);
    if (mag > 0) {
      input.movement.x /= mag;
      input.movement.y /= mag;
    }

    // Aim (use auto-aim angle if available, otherwise mouse)
    if (this.aimAngle !== undefined && this.targetingSystem.hasTarget()) {
      input.aim = this.aimAngle;
    } else {
      // Fallback to mouse position
      const pointer = this.scene.input.activePointer;
      const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
      input.aim = Math.atan2(
        worldPoint.y - this.sprite.y,
        worldPoint.x - this.sprite.x
      );
    }

    // Include shoot/dash requests
    if (this.shootRequested) {
      input.shoot = true;
      this.shootRequested = false; // Clear after sending
    }

    if (this.dashRequested) {
      input.dash = true;
      this.dashRequested = false; // Clear after sending
    }

    return input;
  }

  requestShoot() {
    // Check if we have a valid target
    if (!this.targetingSystem.hasTarget()) {
      // No target in range - don't shoot
      return;
    }

    const now = this.scene.time.now;
    const config = this.weaponConfigs[this.currentWeaponType];

    if (now - this.lastShot >= config.fireRate) {
      this.shootRequested = true;
      this.lastShot = now;

      // Play local sound immediately for feedback
      this.scene.playSoundSafe('shoot-sound', { volume: 0.3 });
      this.createMuzzleFlash();
    }
  }

  requestDash() {
    const now = this.scene.time.now;
    const DASH_COOLDOWN = 5000;

    if (now - this.lastDash >= DASH_COOLDOWN && !this.isDashing) {
      this.dashRequested = true;
      this.lastDash = now;
      this.isDashing = true;

      // Local feedback
      this.scene.playSoundSafe('dodge-sound', { volume: 0.4 });
      this.createDashTrail();

      // End dash locally
      this.scene.time.delayedCall(200, () => {
        this.isDashing = false;
      });
    }
  }

  applyMovementPrediction(input) {
    // Only predict movement, server handles shooting/dashing physics
    if (this.isDashing) return; // Don't override dash movement

    const speed = 250;

    // Use physics velocity instead of direct position manipulation
    // This allows Phaser's collision system to work properly
    this.sprite.setVelocity(
      input.movement.x * speed,
      input.movement.y * speed
    );
  }

  reconcileWithServer(serverState) {
    if (!serverState) return;

    const lastProcessedSeq = serverState.lastProcessedInput || 0;

    // Calculate position error
    const errorX = Math.abs(this.sprite.x - serverState.x);
    const errorY = Math.abs(this.sprite.y - serverState.y);
    const error = Math.sqrt(errorX * errorX + errorY * errorY);

    if (error > this.reconciliationThreshold) {
      // Smooth interpolation instead of hard snap to reduce jitter
      const smoothingFactor = 0.3; // Lower = smoother but slower correction
      this.sprite.x = Phaser.Math.Linear(this.sprite.x, serverState.x, smoothingFactor);
      this.sprite.y = Phaser.Math.Linear(this.sprite.y, serverState.y, smoothingFactor);

      // Replay unprocessed inputs
      const unprocessedInputs = this.pendingInputs.filter(
        input => input.sequence > lastProcessedSeq
      );

      unprocessedInputs.forEach(input => {
        this.applyMovementPrediction(input);
      });
    }

    // Clean up old inputs
    this.pendingInputs = this.pendingInputs.filter(
      input => input.sequence > lastProcessedSeq
    );

    // Update authoritative state from server
    const previousHp = this.hp;
    this.hp = serverState.hp;
    this.currentWeapon = serverState.weapon;
    this.kills = serverState.kills;
    this.isDashing = serverState.isDashing;
    this.isInvulnerable = serverState.isInvulnerable;

    // Check if player just died
    if (previousHp > 0 && this.hp <= 0) {
      this.onDeath();
    }

    this.lastServerState = serverState;
  }

  updateShadow() {
    const shadowOffsetX = 4;
    const shadowOffsetY = 6;

    this.shadow.setPosition(
      this.sprite.x + shadowOffsetX,
      this.sprite.y + shadowOffsetY
    );

    if (this.sprite.texture) {
      this.shadow.setTexture(this.sprite.texture.key);
      this.shadow.setFrame(this.sprite.frame.name);
    }

    this.shadow.setFlipX(this.sprite.flipX);
    this.shadow.setScale(this.sprite.scaleX * 1.0, this.sprite.scaleY * 0.6);
  }

  updateHPBar() {
    this.hpHearts.clear();

    const heartSize = 8;
    const heartSpacing = 10;
    const totalWidth = (this.maxHp * heartSpacing) - 2;
    const startX = this.sprite.x - totalWidth / 2;
    const startY = this.sprite.y + 45; // Below player sprite

    // Draw hearts
    for (let i = 0; i < this.maxHp; i++) {
      const heartX = startX + (i * heartSpacing);
      const heartY = startY;

      if (i < this.hp) {
        // Full heart (red)
        this.drawHeart(heartX, heartY, heartSize, 0xFF0000);
      } else {
        // Empty heart (dark grey outline)
        this.drawHeartOutline(heartX, heartY, heartSize, 0x666666);
      }
    }
  }

  drawHeart(x, y, size, color) {
    this.hpHearts.fillStyle(color, 1);

    // Draw heart shape using circles and triangle
    const halfSize = size / 2;

    // Left circle
    this.hpHearts.fillCircle(x - halfSize / 2, y, halfSize);
    // Right circle
    this.hpHearts.fillCircle(x + halfSize / 2, y, halfSize);

    // Bottom triangle
    this.hpHearts.fillTriangle(
      x - size / 2, y,           // Left point
      x + size / 2, y,           // Right point
      x, y + size                // Bottom point
    );
  }

  drawHeartOutline(x, y, size, color) {
    this.hpHearts.lineStyle(1, color, 0.8);

    const halfSize = size / 2;

    // Left circle outline
    this.hpHearts.strokeCircle(x - halfSize / 2, y, halfSize);
    // Right circle outline
    this.hpHearts.strokeCircle(x + halfSize / 2, y, halfSize);

    // Bottom triangle outline
    this.hpHearts.strokeTriangle(
      x - size / 2, y,
      x + size / 2, y,
      x, y + size
    );
  }

  updateAnimation() {
    const isMoving = this.sprite.body.velocity.length() > 10 ||
                     (this.keys.W.isDown || this.keys.A.isDown ||
                      this.keys.S.isDown || this.keys.D.isDown);

    if (isMoving) {
      if (this.sprite.anims.currentAnim?.key !== 'run') {
        this.sprite.play('run');
      }

      // Flip based on horizontal movement
      if (this.keys.A.isDown || this.cursors.left.isDown) {
        this.sprite.setFlipX(true);
      } else if (this.keys.D.isDown || this.cursors.right.isDown) {
        this.sprite.setFlipX(false);
      }
    } else {
      if (this.sprite.anims.currentAnim?.key !== 'idle') {
        this.sprite.play('idle');
      }
    }
  }

  updateCooldownIndicators() {
    // FIX: Always update position first to prevent lag
    this.cooldownIndicators.setPosition(this.sprite.x, this.sprite.y + this.indicatorYOffset);

    this.cooldownIndicators.clear();

    const barWidth = 50; // Width of each indicator bar (increased from 40)
    const barHeight = 6; // Height of bar (increased from 4)
    const spacing = 4; // Space between the two bars
    const iconSize = 12; // Size for weapon/dash icons (increased from 8)

    const now = this.scene.time.now;

    // SHOOT BAR (Top bar) - drawn at 0,0 relative to graphics position
    const firePercent = Math.min(100, ((now - this.lastShot) / this.weaponConfigs[this.currentWeaponType].fireRate) * 100);
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
    const weaponColor = this.currentWeapon?.getVisualColor ? this.currentWeapon.getVisualColor() : 0xFF8C00;
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
    const dashPercent = Math.min(100, ((now - this.lastDash) / 5000) * 100);
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

  createMuzzleFlash() {
    const pointer = this.scene.input.activePointer;
    const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const angle = Math.atan2(worldPoint.y - this.sprite.y, worldPoint.x - this.sprite.x);

    const distance = 30;
    const x = this.sprite.x + Math.cos(angle) * distance;
    const y = this.sprite.y + Math.sin(angle) * distance;

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
  }

  createDashTrail() {
    for (let i = 0; i < 5; i++) {
      this.scene.time.delayedCall(i * 40, () => {
        const ghost = this.scene.add.sprite(
          this.sprite.x,
          this.sprite.y,
          this.sprite.texture.key
        );
        ghost.setScale(0.08);
        ghost.setFlipX(this.sprite.flipX);
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

  handleAutoAim() {
    // Get all players (remote players) as potential targets
    const targets = Array.from(this.scene.remotePlayers.values());

    // Find target using targeting system
    const target = this.targetingSystem.findTarget(
      this,
      targets,
      this.currentWeapon.type
    );

    // Store aim angle for visuals
    if (target && target.sprite) {
      const angle = Phaser.Math.Angle.Between(
        this.sprite.x,
        this.sprite.y,
        target.sprite.x,
        target.sprite.y
      );
      this.aimAngle = angle;
    }

    // Update visual indicators (weapon range circle, lock-on)
    this.targetIndicators.update(
      this,
      this.targetingSystem,
      this.currentWeapon.type
    );
  }

  switchWeapon(newWeaponType) {
    const oldWeaponType = this.currentWeaponType;
    this.currentWeaponType = newWeaponType;
    this.currentWeapon = new Weapon(this.scene, newWeaponType);
    console.log(`🔄 Switched weapon: ${oldWeaponType} -> ${newWeaponType}`);
    return oldWeaponType;
  }

  takeDamage(amount) {
    // Hexagonal impact effect
    const willDie = this.hp <= amount; // Check if this hit will kill the player
    ImpactEffect.create(this.scene, this.sprite.x, this.sprite.y, 'rapid', willDie);

    // Visual feedback (HP is authoritative from server)
    this.scene.cameras.main.shake(200, 0.005);
    this.scene.playSoundSafe('dodge-sound', { volume: 0.5 });

    // Flash red
    this.sprite.setTint(0xff0000);
    this.scene.time.delayedCall(100, () => {
      this.sprite.clearTint();
    });
  }

  onKill() {
    // Visual feedback for getting a kill
    this.scene.cameras.main.flash(100, 255, 255, 255, 0.3);
  }

  onDeath() {
    console.log('💀 You died!');
    this.scene.playSoundSafe('death-sound', { volume: 0.6 });

    // Death animation
    this.scene.tweens.add({
      targets: [this.sprite, this.shadow],
      alpha: 0,
      scale: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => {
        // Hide sprites completely after animation
        this.sprite.setVisible(false);
        this.shadow.setVisible(false);

        // Show death screen after animation completes
        this.scene.time.delayedCall(500, () => {
          this.scene.showDeathScreen();
        });
      }
    });

    // Clear UI elements
    this.cooldownIndicators.clear();
    this.hpHearts.clear();
  }

  onRespawn(x, y) {
    console.log('♻️  Respawning...');

    this.sprite.setPosition(x, y);
    this.shadow.setPosition(x, y);

    // Make sprites visible again
    this.sprite.setVisible(true);
    this.shadow.setVisible(true);

    this.sprite.setAlpha(1);
    this.sprite.setScale(0.08);
    this.shadow.setAlpha(0.4);

    this.hp = 3;
    this.isInvulnerable = true;

    // Spawn effect
    this.scene.tweens.add({
      targets: this.sprite,
      scale: { from: 0, to: 0.08 },
      duration: 300,
      ease: 'Back.easeOut'
    });
  }

  destroy() {
    if (this.sprite) this.sprite.destroy();
    if (this.shadow) this.shadow.destroy();
    if (this.cooldownIndicators) this.cooldownIndicators.destroy();
  }
}
