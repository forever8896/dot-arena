/**
 * WeaponGraphics.js
 * Beautiful top-down weapon graphics adapted from HTML canvas to Phaser
 */

export class WeaponGraphics {
  /**
   * Draw assault rifle (rapid fire) on a Phaser graphics object
   * Color: Cyan/Teal theme
   */
  static drawAssaultRifle(graphics, centerX, centerY, size = 1) {
    graphics.clear();

    // Scale factor for sizing
    const s = size;

    // Glow circle (outer)
    graphics.fillStyle(0x00F5FF, 0.1);
    graphics.fillCircle(centerX, centerY, 60 * s);

    graphics.fillStyle(0x00F5FF, 0.15);
    graphics.fillCircle(centerX, centerY, 45 * s);

    graphics.fillStyle(0x00F5FF, 0.2);
    graphics.fillCircle(centerX, centerY, 30 * s);

    graphics.save();
    graphics.translateCanvas(centerX, centerY);

    // Gun body (top-down) - gradient effect with layers
    graphics.fillStyle(0x164e63, 1);
    graphics.fillRect(-35 * s, -12 * s, 50 * s, 24 * s);

    graphics.fillStyle(0x0e7490, 1);
    graphics.fillRect(-33 * s, -10 * s, 46 * s, 20 * s);

    // Barrel
    graphics.fillStyle(0x0891b2, 1);
    graphics.fillRect(15 * s, -8 * s, 30 * s, 16 * s);

    // Magazine
    graphics.fillStyle(0x155e75, 1);
    graphics.fillRect(-20 * s, 5 * s, 15 * s, 20 * s);

    // Stock
    graphics.fillStyle(0x164e63, 1);
    graphics.fillRect(-45 * s, -8 * s, 10 * s, 16 * s);

    // Highlights
    graphics.fillStyle(0x67E8F9, 0.6);
    graphics.fillRect(-30 * s, -10 * s, 40 * s, 3 * s);

    // Barrel tip highlight
    graphics.fillStyle(0xFFFFFF, 0.8);
    graphics.fillRect(43 * s, -6 * s, 2 * s, 12 * s);

    // Center glow indicator
    graphics.fillStyle(0x00F5FF, 0.6);
    graphics.fillCircle(0, 0, 8 * s);
    graphics.fillStyle(0xFFFFFF, 0.8);
    graphics.fillCircle(0, 0, 4 * s);

    graphics.restore();

    return graphics;
  }

  /**
   * Draw shotgun on a Phaser graphics object
   * Color: Orange/Amber theme
   */
  static drawShotgun(graphics, centerX, centerY, size = 1) {
    graphics.clear();

    const s = size;

    // Glow circle (outer)
    graphics.fillStyle(0xFBBF24, 0.1);
    graphics.fillCircle(centerX, centerY, 60 * s);

    graphics.fillStyle(0xFBBF24, 0.15);
    graphics.fillCircle(centerX, centerY, 45 * s);

    graphics.fillStyle(0xFBBF24, 0.2);
    graphics.fillCircle(centerX, centerY, 30 * s);

    graphics.save();
    graphics.translateCanvas(centerX, centerY);

    // Shotgun body - gradient effect with layers
    graphics.fillStyle(0x78350f, 1);
    graphics.fillRect(-30 * s, -15 * s, 40 * s, 30 * s);

    graphics.fillStyle(0x92400e, 1);
    graphics.fillRect(-28 * s, -13 * s, 36 * s, 26 * s);

    // Double barrel (top)
    graphics.fillStyle(0xa16207, 1);
    graphics.fillRect(10 * s, -12 * s, 35 * s, 10 * s);

    // Double barrel (bottom)
    graphics.fillStyle(0xa16207, 1);
    graphics.fillRect(10 * s, 2 * s, 35 * s, 10 * s);

    // Barrel separators
    graphics.fillStyle(0x78350f, 1);
    graphics.fillRect(10 * s, -2 * s, 35 * s, 4 * s);

    // Pump action
    graphics.fillStyle(0x78350f, 1);
    graphics.fillRect(-5 * s, -18 * s, 15 * s, 36 * s);

    graphics.fillStyle(0x92400e, 1);
    graphics.fillRect(-3 * s, -16 * s, 11 * s, 32 * s);

    // Stock
    graphics.fillStyle(0x78350f, 1);
    graphics.fillRect(-40 * s, -10 * s, 10 * s, 20 * s);

    // Highlights on barrels
    graphics.fillStyle(0xFBBF24, 0.4);
    graphics.fillRect(12 * s, -10 * s, 30 * s, 3 * s);
    graphics.fillRect(12 * s, 4 * s, 30 * s, 3 * s);

    // Barrel tips
    graphics.fillStyle(0xFFFFFF, 0.6);
    graphics.fillRect(43 * s, -11 * s, 2 * s, 9 * s);
    graphics.fillRect(43 * s, 3 * s, 2 * s, 9 * s);

    // Center glow indicator
    graphics.fillStyle(0xFBBF24, 0.6);
    graphics.fillCircle(0, 0, 10 * s);
    graphics.fillStyle(0xFFFFFF, 0.8);
    graphics.fillCircle(0, 0, 5 * s);

    graphics.restore();

    return graphics;
  }

  /**
   * Draw sniper rifle on a Phaser graphics object
   * Color: Purple/Violet theme
   */
  static drawSniperRifle(graphics, centerX, centerY, size = 1) {
    graphics.clear();

    const s = size;

    // Glow circle (outer)
    graphics.fillStyle(0x8B5CF6, 0.1);
    graphics.fillCircle(centerX, centerY, 60 * s);

    graphics.fillStyle(0x8B5CF6, 0.15);
    graphics.fillCircle(centerX, centerY, 45 * s);

    graphics.fillStyle(0x8B5CF6, 0.2);
    graphics.fillCircle(centerX, centerY, 30 * s);

    graphics.save();
    graphics.translateCanvas(centerX, centerY);

    // Long barrel (sniper characteristic)
    graphics.fillStyle(0x1e293b, 1);
    graphics.fillRect(-20 * s, -6 * s, 70 * s, 12 * s);

    graphics.fillStyle(0x334155, 1);
    graphics.fillRect(-18 * s, -5 * s, 66 * s, 10 * s);

    // Scope on top
    graphics.fillStyle(0x334155, 1);
    graphics.fillRect(10 * s, -12 * s, 25 * s, 8 * s);

    graphics.fillStyle(0x475569, 1);
    graphics.fillRect(12 * s, -11 * s, 21 * s, 6 * s);

    // Scope lens
    graphics.fillStyle(0x8B5CF6, 0.8);
    graphics.fillRect(13 * s, -10 * s, 4 * s, 4 * s);
    graphics.fillStyle(0xFFFFFF, 0.6);
    graphics.fillRect(14 * s, -9 * s, 2 * s, 2 * s);

    // Scope rings
    graphics.lineStyle(2, 0x1e293b, 1);
    graphics.strokeRect(15 * s, -12 * s, 3 * s, 8 * s);
    graphics.strokeRect(27 * s, -12 * s, 3 * s, 8 * s);

    // Gun body
    graphics.fillStyle(0x334155, 1);
    graphics.fillRect(-35 * s, -10 * s, 20 * s, 20 * s);

    graphics.fillStyle(0x475569, 1);
    graphics.fillRect(-33 * s, -8 * s, 16 * s, 16 * s);

    // Magazine
    graphics.fillStyle(0x1e293b, 1);
    graphics.fillRect(-20 * s, 4 * s, 12 * s, 18 * s);

    // Stock
    graphics.fillStyle(0x1e293b, 1);
    graphics.fillRect(-45 * s, -7 * s, 10 * s, 14 * s);

    // Barrel highlights
    graphics.fillStyle(0x64748b, 0.6);
    graphics.fillRect(-15 * s, -4 * s, 60 * s, 2 * s);

    // Barrel tip
    graphics.fillStyle(0xFFFFFF, 0.7);
    graphics.fillRect(48 * s, -5 * s, 2 * s, 10 * s);

    // Barrel grooves for detail
    graphics.lineStyle(1, 0x1e293b, 0.6);
    for (let i = 0; i < 5; i++) {
      const x = -10 * s + i * 12 * s;
      graphics.strokeRect(x, -6 * s, 2 * s, 12 * s);
    }

    // Center glow indicator
    graphics.fillStyle(0x8B5CF6, 0.6);
    graphics.fillCircle(0, 0, 8 * s);
    graphics.fillStyle(0xFFFFFF, 0.8);
    graphics.fillCircle(0, 0, 4 * s);

    graphics.restore();

    return graphics;
  }

  /**
   * Generate a texture for a weapon type
   * @param {Phaser.Scene} scene - The Phaser scene
   * @param {string} weaponType - 'rapid', 'shotgun', or 'sniper'
   * @param {number} size - Size multiplier (default 1)
   * @returns {string} The generated texture key
   */
  static generateTexture(scene, weaponType, size = 1) {
    const textureKey = `weapon_${weaponType}_detailed`;
    const graphics = scene.add.graphics();

    // Canvas size
    const canvasSize = 100;
    const centerX = canvasSize / 2;
    const centerY = canvasSize / 2;

    switch (weaponType) {
      case 'rapid':
        this.drawAssaultRifle(graphics, centerX, centerY, size);
        break;
      case 'shotgun':
        this.drawShotgun(graphics, centerX, centerY, size);
        break;
      case 'sniper':
        this.drawSniperRifle(graphics, centerX, centerY, size);
        break;
      default:
        // Fallback to assault rifle
        this.drawAssaultRifle(graphics, centerX, centerY, size);
    }

    graphics.generateTexture(textureKey, canvasSize, canvasSize);
    graphics.destroy();

    return textureKey;
  }
}
