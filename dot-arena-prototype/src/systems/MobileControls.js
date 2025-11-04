/**
 * MobileControls - Touch-based controls for mobile devices
 * Virtual joystick + shoot/dash buttons
 */

export default class MobileControls {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;

    // Joystick state
    this.joystickActive = false;
    this.joystickBase = null;
    this.joystickThumb = null;
    this.joystickGraphics = null;
    this.joystickRadius = 60;
    this.joystickPosition = { x: 0, y: 0 };
    this.joystickDirection = { x: 0, y: 0 };

    // Touch buttons
    this.shootButton = null;
    this.dashButton = null;

    // Touch tracking
    this.activeTouches = new Map();

    this.createMobileUI();
    this.setupTouchListeners();
  }

  createMobileUI() {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;

    // === VIRTUAL JOYSTICK (Bottom-left) ===
    const joystickX = 120;
    const joystickY = height - 120;

    this.joystickGraphics = this.scene.add.graphics();
    this.joystickGraphics.setScrollFactor(0);
    this.joystickGraphics.setDepth(2000);

    // Joystick base (larger touch area)
    this.joystickBase = this.scene.add.circle(
      joystickX,
      joystickY,
      this.joystickRadius,
      0x000000,
      0.3
    );
    this.joystickBase.setStrokeStyle(3, 0x00FFFF, 0.6);
    this.joystickBase.setScrollFactor(0);
    this.joystickBase.setDepth(2000);

    // Joystick thumb (movable center)
    this.joystickThumb = this.scene.add.circle(
      joystickX,
      joystickY,
      25,
      0x00FFFF,
      0.8
    );
    this.joystickThumb.setScrollFactor(0);
    this.joystickThumb.setDepth(2001);

    this.joystickPosition = { x: joystickX, y: joystickY };

    // === SHOOT BUTTON (Bottom-right) ===
    const shootButtonX = width - 100;
    const shootButtonY = height - 120;

    // Button background
    this.shootButton = {
      x: shootButtonX,
      y: shootButtonY,
      radius: 70,
      isPressed: false
    };

    // Draw shoot button
    this.shootButtonGraphics = this.scene.add.graphics();
    this.shootButtonGraphics.setScrollFactor(0);
    this.shootButtonGraphics.setDepth(2000);
    this.updateShootButton();

    // === DASH BUTTON (Above shoot button) ===
    const dashButtonX = width - 100;
    const dashButtonY = height - 240;

    this.dashButton = {
      x: dashButtonX,
      y: dashButtonY,
      radius: 50,
      isPressed: false
    };

    // Draw dash button
    this.dashButtonGraphics = this.scene.add.graphics();
    this.dashButtonGraphics.setScrollFactor(0);
    this.dashButtonGraphics.setDepth(2000);
    this.updateDashButton();
  }

  updateShootButton() {
    this.shootButtonGraphics.clear();

    const hasTarget = this.player.targetingSystem.hasTarget();
    const color = hasTarget ? 0xFF0000 : 0x666666;
    const alpha = this.shootButton.isPressed ? 1.0 : 0.5;

    // Outer ring
    this.shootButtonGraphics.fillStyle(0x000000, 0.4);
    this.shootButtonGraphics.fillCircle(
      this.shootButton.x,
      this.shootButton.y,
      this.shootButton.radius
    );

    // Inner circle
    this.shootButtonGraphics.fillStyle(color, alpha);
    this.shootButtonGraphics.fillCircle(
      this.shootButton.x,
      this.shootButton.y,
      this.shootButton.radius * 0.7
    );

    // Border
    this.shootButtonGraphics.lineStyle(3, color, 0.8);
    this.shootButtonGraphics.strokeCircle(
      this.shootButton.x,
      this.shootButton.y,
      this.shootButton.radius
    );

    // Icon (crosshair)
    const iconSize = 15;
    this.shootButtonGraphics.lineStyle(3, 0xFFFFFF, 0.9);
    this.shootButtonGraphics.lineBetween(
      this.shootButton.x - iconSize, this.shootButton.y,
      this.shootButton.x + iconSize, this.shootButton.y
    );
    this.shootButtonGraphics.lineBetween(
      this.shootButton.x, this.shootButton.y - iconSize,
      this.shootButton.x, this.shootButton.y + iconSize
    );
  }

  updateDashButton() {
    this.dashButtonGraphics.clear();

    const canDash = this.player.canDash();
    const color = canDash ? 0x00FFFF : 0x666666;
    const alpha = this.dashButton.isPressed ? 1.0 : 0.5;

    // Outer ring
    this.dashButtonGraphics.fillStyle(0x000000, 0.4);
    this.dashButtonGraphics.fillCircle(
      this.dashButton.x,
      this.dashButton.y,
      this.dashButton.radius
    );

    // Inner circle
    this.dashButtonGraphics.fillStyle(color, alpha);
    this.dashButtonGraphics.fillCircle(
      this.dashButton.x,
      this.dashButton.y,
      this.dashButton.radius * 0.7
    );

    // Border
    this.dashButtonGraphics.lineStyle(3, color, 0.8);
    this.dashButtonGraphics.strokeCircle(
      this.dashButton.x,
      this.dashButton.y,
      this.dashButton.radius
    );

    // Cooldown arc
    if (!canDash) {
      const percent = this.player.getDashCooldownPercent();
      const angle = (percent / 100) * Math.PI * 2;

      this.dashButtonGraphics.fillStyle(color, 0.3);
      this.dashButtonGraphics.slice(
        this.dashButton.x,
        this.dashButton.y,
        this.dashButton.radius * 0.9,
        -Math.PI / 2,
        -Math.PI / 2 + angle,
        false
      );
      this.dashButtonGraphics.fillPath();
    }

    // Icon (lightning bolt)
    this.dashButtonGraphics.fillStyle(0xFFFFFF, 0.9);
    this.dashButtonGraphics.fillTriangle(
      this.dashButton.x - 5, this.dashButton.y - 10,
      this.dashButton.x + 8, this.dashButton.y,
      this.dashButton.x - 2, this.dashButton.y + 2
    );
    this.dashButtonGraphics.fillTriangle(
      this.dashButton.x - 2, this.dashButton.y + 2,
      this.dashButton.x + 5, this.dashButton.y + 10,
      this.dashButton.x - 8, this.dashButton.y
    );
  }

  setupTouchListeners() {
    this.scene.input.on('pointerdown', this.handleTouchStart, this);
    this.scene.input.on('pointermove', this.handleTouchMove, this);
    this.scene.input.on('pointerup', this.handleTouchEnd, this);
  }

  handleTouchStart(pointer) {
    const touchX = pointer.x;
    const touchY = pointer.y;

    // Check joystick area (left side of screen)
    const joyDist = Phaser.Math.Distance.Between(
      touchX, touchY,
      this.joystickPosition.x, this.joystickPosition.y
    );

    if (joyDist < this.joystickRadius * 2) {
      this.joystickActive = true;
      this.activeTouches.set(pointer.id, 'joystick');
      this.updateJoystick(pointer);
      return;
    }

    // Check shoot button
    const shootDist = Phaser.Math.Distance.Between(
      touchX, touchY,
      this.shootButton.x, this.shootButton.y
    );

    if (shootDist < this.shootButton.radius) {
      this.shootButton.isPressed = true;
      this.activeTouches.set(pointer.id, 'shoot');
      this.player.shoot(this.scene.bullets);
      this.updateShootButton();
      return;
    }

    // Check dash button
    const dashDist = Phaser.Math.Distance.Between(
      touchX, touchY,
      this.dashButton.x, this.dashButton.y
    );

    if (dashDist < this.dashButton.radius) {
      this.dashButton.isPressed = true;
      this.activeTouches.set(pointer.id, 'dash');
      this.player.dash();
      this.updateDashButton();
      return;
    }
  }

  handleTouchMove(pointer) {
    const touchType = this.activeTouches.get(pointer.id);

    if (touchType === 'joystick' && this.joystickActive) {
      this.updateJoystick(pointer);
    }
  }

  handleTouchEnd(pointer) {
    const touchType = this.activeTouches.get(pointer.id);

    if (touchType === 'joystick') {
      this.joystickActive = false;
      this.joystickDirection = { x: 0, y: 0 };

      // Reset thumb to center
      this.joystickThumb.setPosition(
        this.joystickPosition.x,
        this.joystickPosition.y
      );
    }

    if (touchType === 'shoot') {
      this.shootButton.isPressed = false;
      this.updateShootButton();
    }

    if (touchType === 'dash') {
      this.dashButton.isPressed = false;
      this.updateDashButton();
    }

    this.activeTouches.delete(pointer.id);
  }

  updateJoystick(pointer) {
    const deltaX = pointer.x - this.joystickPosition.x;
    const deltaY = pointer.y - this.joystickPosition.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance > 0) {
      // Normalize and clamp to radius
      const clampedDist = Math.min(distance, this.joystickRadius);
      const angle = Math.atan2(deltaY, deltaX);

      const thumbX = this.joystickPosition.x + Math.cos(angle) * clampedDist;
      const thumbY = this.joystickPosition.y + Math.sin(angle) * clampedDist;

      this.joystickThumb.setPosition(thumbX, thumbY);

      // Calculate direction (-1 to 1)
      this.joystickDirection = {
        x: deltaX / this.joystickRadius,
        y: deltaY / this.joystickRadius
      };

      // Clamp to -1, 1
      this.joystickDirection.x = Math.max(-1, Math.min(1, this.joystickDirection.x));
      this.joystickDirection.y = Math.max(-1, Math.min(1, this.joystickDirection.y));
    }
  }

  update() {
    // Apply joystick movement to player
    if (this.joystickActive && !this.player.isDashing) {
      const speed = this.player.speed;
      this.player.sprite.setVelocity(
        this.joystickDirection.x * speed,
        this.joystickDirection.y * speed
      );
    } else if (!this.joystickActive && !this.player.isDashing) {
      // No joystick input - stop player
      this.player.sprite.setVelocity(0, 0);
    }

    // Update button visuals
    this.updateShootButton();
    this.updateDashButton();
  }

  destroy() {
    if (this.joystickBase) this.joystickBase.destroy();
    if (this.joystickThumb) this.joystickThumb.destroy();
    if (this.joystickGraphics) this.joystickGraphics.destroy();
    if (this.shootButtonGraphics) this.shootButtonGraphics.destroy();
    if (this.dashButtonGraphics) this.dashButtonGraphics.destroy();

    this.scene.input.off('pointerdown', this.handleTouchStart, this);
    this.scene.input.off('pointermove', this.handleTouchMove, this);
    this.scene.input.off('pointerup', this.handleTouchEnd, this);
  }
}
