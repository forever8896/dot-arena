import Phaser from 'phaser';
import { ImpactEffect } from '../effects/VisualEffects.js';

/**
 * RemotePlayer - Entity interpolation for smooth multiplayer
 *
 * Represents other players in the game.
 * - Receives snapshots from server
 * - Interpolates between snapshots for smooth movement
 * - Renders slightly in the past (~100ms) to have 2+ snapshots
 */
export default class RemotePlayer {
  constructor(scene, playerData) {
    this.scene = scene;
    this.playerId = playerData.id;

    // Create sprite
    this.sprite = scene.physics.add.sprite(
      playerData.x,
      playerData.y,
      'character-idle-frame64'
    );
    this.sprite.setScale(0.08);
    this.sprite.setDepth(10);
    this.sprite.play('idle');

    // Create shadow
    this.shadow = scene.add.sprite(playerData.x, playerData.y, 'character-idle-frame64');
    this.shadow.setScale(0.08);
    this.shadow.setDepth(9);
    this.shadow.setTint(0x000000);
    this.shadow.setAlpha(0.4);

    // Player state
    this.hp = playerData.hp || 3;
    this.maxHp = 3;
    this.weapon = playerData.weapon || 'rapid';
    this.kills = playerData.kills || 0;
    this.isDashing = playerData.isDashing || false;
    this.isInvulnerable = playerData.isInvulnerable || false;

    // Interpolation
    this.snapshots = [];
    this.renderDelay = 100; // ms - render 100ms in the past
    this.maxSnapshots = 5;

    // Add initial snapshot
    this.addSnapshot(playerData);

    // Username display
    this.username = playerData.username || `Player-${playerData.id.substring(0, 4)}`;
    this.createNameTag();

    // HP bar
    this.createHPBar();

    console.log(`👤 RemotePlayer created: ${this.username}`);
  }

  createNameTag() {
    this.nameText = this.scene.add.text(
      this.sprite.x,
      this.sprite.y - 50,
      this.username,
      {
        fontSize: '12px',
        color: '#ffffff',
        backgroundColor: '#000000aa',
        padding: { x: 4, y: 2 }
      }
    );
    this.nameText.setOrigin(0.5);
    this.nameText.setDepth(15);
  }

  createHPBar() {
    this.hpHearts = this.scene.add.graphics();
    this.hpHearts.setDepth(14);
  }

  addSnapshot(state) {
    this.snapshots.push({
      timestamp: Date.now(),
      x: state.x,
      y: state.y,
      rotation: state.rotation || 0,
      hp: state.hp,
      weapon: state.weapon,
      kills: state.kills || 0,
      isDashing: state.isDashing || false,
      isInvulnerable: state.isInvulnerable || false,
      isMoving: state.isMoving || false,
      facingLeft: state.facingLeft || false
    });

    // Keep only recent snapshots
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }
  }

  update() {
    // Don't update if player is dead
    if (this.hp <= 0) {
      return;
    }

    if (this.snapshots.length < 2) {
      // Not enough data to interpolate, just use latest position
      if (this.snapshots.length === 1) {
        const latest = this.snapshots[0];
        this.sprite.setPosition(latest.x, latest.y);
        this.updateVisuals(latest);
      }
      return;
    }

    // Calculate render time (in the past)
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

    // If render time is past all snapshots, use latest
    if (renderTime > this.snapshots[this.snapshots.length - 1].timestamp) {
      to = this.snapshots[this.snapshots.length - 1];
      from = this.snapshots[this.snapshots.length - 2];
    }

    // Calculate interpolation factor
    const duration = to.timestamp - from.timestamp;
    const elapsed = renderTime - from.timestamp;
    const t = duration > 0 ? Phaser.Math.Clamp(elapsed / duration, 0, 1) : 1;

    // Interpolate position
    const x = Phaser.Math.Linear(from.x, to.x, t);
    const y = Phaser.Math.Linear(from.y, to.y, t);

    this.sprite.setPosition(x, y);

    // Check for HP changes (hit detection)
    if (this.hp !== to.hp) {
      const damage = this.hp - to.hp;
      if (damage > 0) {
        this.onHit();
      }
      this.hp = to.hp;
    }

    // Check for death
    if (this.hp <= 0 && this.sprite.visible) {
      this.onDeath();
      return; // Stop updating after death
    }

    // Update visuals
    this.updateVisuals(to, from);

    // Update shadow
    this.updateShadow();

    // Update name tag
    this.updateNameTag();

    // Update HP bar
    this.updateHPBar();

    // Update state
    this.weapon = to.weapon;
    this.kills = to.kills;
    this.isDashing = to.isDashing;
    this.isInvulnerable = to.isInvulnerable;
  }

  updateVisuals(to, from) {
    // Animation based on movement
    const isMoving = to.isMoving || (from && from.isMoving);

    if (isMoving) {
      if (this.sprite.anims.currentAnim?.key !== 'run') {
        this.sprite.play('run');
      }

      // Flip sprite based on direction
      if (to.facingLeft !== undefined) {
        this.sprite.setFlipX(to.facingLeft);
      }
    } else {
      if (this.sprite.anims.currentAnim?.key !== 'idle') {
        this.sprite.play('idle');
      }
    }

    // Invulnerability visual
    if (this.isInvulnerable) {
      const shouldShow = Math.floor(this.scene.time.now / 100) % 2 === 0;
      this.sprite.setAlpha(shouldShow ? 1 : 0.5);
      this.shadow.setAlpha(shouldShow ? 0.4 : 0.2);
    } else {
      this.sprite.setAlpha(1);
      this.shadow.setAlpha(0.4);
    }

    // Dash visual
    if (this.isDashing) {
      this.sprite.setTint(0x00FFFF);
    } else {
      this.sprite.clearTint();
    }
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

  updateNameTag() {
    this.nameText.setPosition(this.sprite.x, this.sprite.y - 50);

    // Update kills display
    const displayText = this.kills > 0 ? `${this.username} (${this.kills})` : this.username;
    this.nameText.setText(displayText);
  }

  updateHPBar() {
    this.hpHearts.clear();

    const heartSize = 8;
    const heartSpacing = 10;
    const totalWidth = (this.maxHp * heartSpacing) - 2;
    const startX = this.sprite.x - totalWidth / 2;
    const startY = this.sprite.y - 45;

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

  onHit() {
    // Hexagonal impact effect
    const willDie = this.hp <= 1; // Check if this hit will kill the player
    ImpactEffect.create(this.scene, this.sprite.x, this.sprite.y, 'rapid', willDie);

    // Screen shake (smaller for remote players)
    this.scene.cameras.main.shake(150, 0.002);

    // Visual feedback for getting hit
    this.sprite.setTint(0xff0000);
    this.scene.time.delayedCall(100, () => {
      if (this.sprite && !this.isDashing) {
        this.sprite.clearTint();
      }
    });

    // Flash name tag
    this.nameText.setStyle({ color: '#ff0000' });
    this.scene.time.delayedCall(200, () => {
      if (this.nameText) {
        this.nameText.setStyle({ color: '#ffffff' });
      }
    });
  }

  onDeath() {
    console.log(`💀 ${this.username} died`);

    // Death animation
    this.scene.tweens.add({
      targets: [this.sprite, this.shadow],
      alpha: 0,
      scale: 0,
      duration: 500,
      ease: 'Power2',
      onComplete: () => {
        // Hide sprites completely after animation
        this.sprite.setVisible(false);
        this.shadow.setVisible(false);
      }
    });

    // Hide UI
    this.nameText.setVisible(false);
    this.hpHearts.clear();
  }

  onRespawn(x, y) {
    console.log(`♻️  ${this.username} respawned`);

    this.sprite.setPosition(x, y);
    this.shadow.setPosition(x, y);
    this.hp = 3;

    // Make sprites visible again
    this.sprite.setVisible(true);
    this.shadow.setVisible(true);

    // Respawn animation
    this.sprite.setAlpha(1);
    this.sprite.setScale(0.08);
    this.shadow.setAlpha(0.4);
    this.nameText.setVisible(true);

    this.scene.tweens.add({
      targets: this.sprite,
      scale: { from: 0, to: 0.08 },
      duration: 300,
      ease: 'Back.easeOut'
    });

    this.scene.tweens.add({
      targets: this.shadow,
      scale: { from: 0, to: 0.08 },
      duration: 300,
      ease: 'Back.easeOut'
    });
  }

  destroy() {
    if (this.sprite) this.sprite.destroy();
    if (this.shadow) this.shadow.destroy();
    if (this.nameText) this.nameText.destroy();
    if (this.hpBarBg) this.hpBarBg.destroy();
    if (this.hpBarFill) this.hpBarFill.destroy();
  }
}
