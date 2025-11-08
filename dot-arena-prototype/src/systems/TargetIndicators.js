/**
 * TargetIndicators - Visual feedback for auto-aim system
 * Shows lock-on indicators, targeting cones, and range displays
 */

export default class TargetIndicators {
  constructor(scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(9); // Just below player

    this.lockIndicators = [];
    this.rangeCircle = null;
  }

  /**
   * Update indicators based on current targeting state
   */
  update(player, targetingSystem, weaponType) {
    this.graphics.clear();

    const config = targetingSystem.getTargetConfig(weaponType);
    const targets = targetingSystem.getTargets();

    // Always draw weapon range circle around player
    this.drawRangeCircle(player, config);

    // Draw simple lines to targeted enemies
    if (targets && targets.length > 0) {
      targets.forEach((target) => {
        this.drawTargetLine(player, target, config.color);
      });
    }
  }

  /**
   * Draw weapon range circle around player (always visible)
   */
  drawRangeCircle(player, config) {
    // Draw dark outline first for contrast
    this.graphics.lineStyle(4, 0x2a2b2a, 0.8);
    this.graphics.strokeCircle(
      player.sprite.x,
      player.sprite.y,
      config.range
    );

    // Draw bright colored ring on top
    this.graphics.lineStyle(2, config.color, 1.0);
    this.graphics.strokeCircle(
      player.sprite.x,
      player.sprite.y,
      config.range
    );
  }

  /**
   * Draw simple line from player to target enemy
   */
  drawTargetLine(player, target, color) {
    if (!target || !target.sprite) return;

    // Draw dark outline first for contrast
    this.graphics.lineStyle(4, 0x2a2b2a, 0.5);
    this.graphics.lineBetween(
      player.sprite.x,
      player.sprite.y,
      target.sprite.x,
      target.sprite.y
    );

    // Draw bright colored line on top
    this.graphics.lineStyle(2, color, 0.9);
    this.graphics.lineBetween(
      player.sprite.x,
      player.sprite.y,
      target.sprite.x,
      target.sprite.y
    );
  }

  /**
   * Clean up graphics
   */
  destroy() {
    if (this.graphics) {
      this.graphics.destroy();
    }
  }
}
