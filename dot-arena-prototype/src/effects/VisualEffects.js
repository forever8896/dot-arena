/**
 * VisualEffects - Beautiful geometric visual effects system
 * Handles bullet trails, particles, glows, and screen effects
 */

export class BulletTrailEffect {
  constructor(scene, bullet, weaponType) {
    this.scene = scene;
    this.bullet = bullet;
    this.weaponType = weaponType;
    this.trailParticles = [];
    this.maxTrailLength = this.getTrailLength();
    this.trailColor = this.getTrailColor();
  }

  getTrailLength() {
    const lengths = {
      'rapid': 8,
      'sniper': 15,
      'shotgun': 5,
      'burst': 10
    };
    return lengths[this.weaponType] || 8;
  }

  getTrailColor() {
    const colors = {
      'rapid': 0xd84797,   // Mulberry
      'sniper': 0xd84797,  // Mulberry
      'shotgun': 0xd84797, // Mulberry
      'burst': 0xd84797    // Mulberry
    };
    return colors[this.weaponType] || 0xd84797;
  }

  update() {
    if (!this.bullet || !this.bullet.active) return;

    // Create solid geometric trail particle (same size as bullet)
    const trail = this.scene.add.circle(
      this.bullet.x,
      this.bullet.y,
      this.bullet.displayWidth * 0.8,
      this.trailColor,
      1.0  // Fully opaque
    );
    trail.setDepth(4);

    // Scale down and disappear abruptly (no fade)
    this.scene.tweens.add({
      targets: trail,
      scale: 0,
      duration: 150,
      ease: 'Power2',
      onComplete: () => {
        trail.destroy();
      }
    });

    this.trailParticles.push(trail);
    if (this.trailParticles.length > this.maxTrailLength) {
      const old = this.trailParticles.shift();
      if (old && old.active) old.destroy();
    }
  }

  destroy() {
    this.trailParticles.forEach(p => {
      if (p && p.active) p.destroy();
    });
    this.trailParticles = [];
  }
}

export class ImpactEffect {
  static create(scene, x, y, weaponType, isKill = false) {
    const config = this.getConfig(weaponType, isKill);

    // Central flash
    const flash = scene.add.circle(x, y, 5, config.color, 1);
    flash.setDepth(100);
    scene.tweens.add({
      targets: flash,
      scale: config.flashRadius / 5,
      alpha: 0,
      duration: config.flashDuration,
      ease: 'Power3',
      onComplete: () => flash.destroy()
    });

    // Geometric shockwave rings
    for (let i = 0; i < config.rings; i++) {
      setTimeout(() => {
        const ring = scene.add.circle(x, y, 10, config.color, 0);
        ring.setStrokeStyle(2, config.color, 1);
        ring.setDepth(100);

        scene.tweens.add({
          targets: ring,
          scale: config.ringRadius / 10,
          alpha: 0,
          duration: config.ringDuration,
          ease: 'Power2',
          onComplete: () => ring.destroy()
        });
      }, i * 50);
    }

    // Geometric particle burst
    const particleCount = isKill ? 20 : 12;
    const shapes = ['circle', 'triangle', 'square', 'diamond'];

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const distance = config.particleDistance;
      const shape = shapes[Math.floor(Math.random() * shapes.length)];

      const particle = this.createGeometricParticle(
        scene, x, y, shape, config.color, config.particleSize
      );

      scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        rotation: Math.PI * 2,
        scale: 0.3,
        duration: 400,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }

    // Kill-specific effects
    if (isKill) {
      // Expanding hexagon
      this.createExpandingHexagon(scene, x, y, config.color);

      // Cross burst
      this.createCrossBurst(scene, x, y, config.color);
    }
  }

  static getConfig(weaponType, isKill) {
    const base = {
      'rapid': { color: 0xd84797, flashRadius: 30, ringRadius: 40 },   // Mulberry
      'sniper': { color: 0xd84797, flashRadius: 50, ringRadius: 70 },  // Mulberry
      'shotgun': { color: 0xd84797, flashRadius: 40, ringRadius: 50 }, // Mulberry
      'burst': { color: 0xd84797, flashRadius: 35, ringRadius: 45 }    // Mulberry
    };

    const config = base[weaponType] || base['rapid'];

    return {
      ...config,
      flashDuration: isKill ? 300 : 150,
      rings: isKill ? 3 : 2,
      ringDuration: isKill ? 500 : 300,
      particleDistance: isKill ? 60 : 40,
      particleSize: isKill ? 6 : 4
    };
  }

  static createGeometricParticle(scene, x, y, shape, color, size) {
    const graphics = scene.add.graphics();
    graphics.setPosition(x, y);
    graphics.setDepth(100);

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

    return graphics;
  }

  static createExpandingHexagon(scene, x, y, color) {
    const hexagon = scene.add.graphics();
    hexagon.setPosition(x, y);
    hexagon.setDepth(101);

    const drawHexagon = (size, alpha) => {
      hexagon.clear();
      hexagon.lineStyle(3, color, alpha);
      hexagon.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const px = Math.cos(angle) * size;
        const py = Math.sin(angle) * size;
        if (i === 0) {
          hexagon.moveTo(px, py);
        } else {
          hexagon.lineTo(px, py);
        }
      }
      hexagon.closePath();
      hexagon.strokePath();
    };

    drawHexagon(10, 1);

    scene.tweens.addCounter({
      from: 10,
      to: 80,
      duration: 600,
      ease: 'Power2',
      onUpdate: (tween) => {
        const value = tween.getValue();
        const alpha = 1 - tween.progress;
        drawHexagon(value, alpha);
      },
      onComplete: () => hexagon.destroy()
    });
  }

  static createCrossBurst(scene, x, y, color) {
    const lines = [];
    const directions = [
      { x: 1, y: 0 }, { x: -1, y: 0 },
      { x: 0, y: 1 }, { x: 0, y: -1 },
      { x: 0.707, y: 0.707 }, { x: -0.707, y: -0.707 },
      { x: 0.707, y: -0.707 }, { x: -0.707, y: 0.707 }
    ];

    directions.forEach(dir => {
      const line = scene.add.line(0, 0, x, y,
        x + dir.x * 50, y + dir.y * 50, color, 1);
      line.setLineWidth(2);
      line.setDepth(101);
      lines.push(line);

      scene.tweens.add({
        targets: line,
        alpha: 0,
        duration: 300,
        ease: 'Power2',
        onComplete: () => line.destroy()
      });
    });
  }
}

export class WeaponSwitchEffect {
  static create(scene, player, newWeapon) {
    const colors = {
      'rapid': 0xd84797,   // Mulberry
      'sniper': 0xd84797,  // Mulberry
      'shotgun': 0xd84797, // Mulberry
      'burst': 0xd84797    // Mulberry
    };
    const color = colors[newWeapon] || 0xd84797;

    // Expanding ring around player using graphics
    const ring = scene.add.graphics();
    ring.setDepth(9);
    ring.lineStyle(4, color, 0.8);
    ring.strokeCircle(player.x, player.y, player.displayWidth);

    // Animate with scale
    ring.setPosition(0, 0);
    scene.tweens.add({
      targets: ring,
      scaleX: 4,
      scaleY: 4,
      alpha: 0,
      duration: 500,
      ease: 'Power2',
      onComplete: () => ring.destroy()
    });

    // Rotating hexagonal aura
    const hexAura = scene.add.graphics();
    hexAura.setPosition(player.x, player.y);
    hexAura.setDepth(9);

    const drawRotatingHex = (rotation, scale, alpha) => {
      hexAura.clear();
      hexAura.lineStyle(2, color, alpha);
      hexAura.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i + rotation;
        const size = player.displayWidth * scale;
        const px = Math.cos(angle) * size;
        const py = Math.sin(angle) * size;
        if (i === 0) {
          hexAura.moveTo(px, py);
        } else {
          hexAura.lineTo(px, py);
        }
      }
      hexAura.closePath();
      hexAura.strokePath();
    };

    drawRotatingHex(0, 1.5, 0.8);

    scene.tweens.addCounter({
      from: 0,
      to: Math.PI * 2,
      duration: 800,
      ease: 'Power2',
      onUpdate: (tween) => {
        const rotation = tween.getValue();
        const scale = 1.5 + tween.progress * 0.5;
        const alpha = 0.8 * (1 - tween.progress);
        drawRotatingHex(rotation, scale, alpha);
      },
      onComplete: () => hexAura.destroy()
    });

    // Particle burst
    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 * i) / 16;
      const distance = player.displayWidth * 2;

      const particle = scene.add.circle(
        player.x + Math.cos(angle) * player.displayWidth,
        player.y + Math.sin(angle) * player.displayWidth,
        3, color, 0.8
      );
      particle.setDepth(100);

      scene.tweens.add({
        targets: particle,
        x: player.x + Math.cos(angle) * distance,
        y: player.y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.3,
        duration: 400,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }

    // Camera flash
    scene.cameras.main.flash(150,
      ((color >> 16) & 255) * 0.3,
      ((color >> 8) & 255) * 0.3,
      (color & 255) * 0.3
    );
  }
}

export class GlowEffect {
  constructor(scene, target, color, intensity = 0.3, size = 1.5) {
    this.scene = scene;
    this.target = target;
    this.color = color;
    this.intensity = intensity;
    this.size = size;

    this.glow = scene.add.circle(
      target.x, target.y,
      target.displayWidth * size,
      color,
      intensity
    );
    this.glow.setDepth(target.depth - 1);
    this.glow.setBlendMode(Phaser.BlendModes.ADD);
  }

  update() {
    if (this.target && this.target.active) {
      this.glow.setPosition(this.target.x, this.target.y);
    }
  }

  pulse(duration = 1000) {
    this.scene.tweens.add({
      targets: this.glow,
      alpha: this.intensity * 1.5,
      scale: this.size * 1.2,
      duration: duration / 2,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  destroy() {
    if (this.glow) this.glow.destroy();
  }
}

export class ScreenEffects {
  constructor(scene) {
    this.scene = scene;
    this.createVignette();
  }

  createVignette() {
    const { width, height } = this.scene.cameras.main;

    // Create vignette using graphics with concentric rectangles
    this.vignette = this.scene.add.graphics();
    this.vignette.setScrollFactor(0);
    this.vignette.setDepth(999);

    // Draw vignette as darkened edges
    const steps = 20;
    for (let i = 0; i < steps; i++) {
      const progress = i / steps;
      const alpha = progress * 0.5; // Max 0.5 alpha at edges
      const inset = (1 - progress) * Math.min(width, height) * 0.3;

      this.vignette.fillStyle(0x2a2b2a, alpha / steps);
      this.vignette.fillRect(
        inset,
        inset,
        width - inset * 2,
        height - inset * 2
      );
    }
  }

  addSpeedLines(player, intensity = 0.5) {
    // Create motion blur lines when player is moving fast
    const speed = Math.sqrt(player.body.velocity.x ** 2 + player.body.velocity.y ** 2);
    if (speed < 200) return;

    const lines = [];
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 300 + Math.random() * 200;
      const startX = player.x + Math.cos(angle) * distance;
      const startY = player.y + Math.sin(angle) * distance;

      const line = this.scene.add.line(0, 0,
        startX, startY,
        player.x, player.y,
        0xFFFFFF, intensity
      );
      line.setLineWidth(1);
      line.setDepth(998);
      lines.push(line);
    }

    this.scene.tweens.add({
      targets: lines,
      alpha: 0,
      duration: 200,
      onComplete: () => lines.forEach(l => l.destroy())
    });
  }

  chromaticAberration(duration = 200, intensity = 5) {
    // Simulate RGB split effect
    const camera = this.scene.cameras.main;
    const originalX = camera.scrollX;

    camera.setTint(0xff0000);
    this.scene.time.delayedCall(duration / 3, () => {
      camera.setTint(0x00ff00);
    });
    this.scene.time.delayedCall(duration * 2 / 3, () => {
      camera.setTint(0x0000ff);
    });
    this.scene.time.delayedCall(duration, () => {
      camera.clearTint();
    });
  }

  destroy() {
    if (this.vignette) this.vignette.destroy();
  }
}
