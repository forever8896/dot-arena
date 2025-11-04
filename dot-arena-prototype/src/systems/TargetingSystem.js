/**
 * TargetingSystem - Weapon-specific auto-aim targeting
 * Each weapon has unique range, pattern, and priority logic
 */

export default class TargetingSystem {
  constructor(scene) {
    this.scene = scene;
    this.currentTarget = null;
    this.currentTargets = []; // For multi-target weapons like shotgun
  }

  /**
   * Find best target(s) for current weapon
   * @param {Object} player - Player entity
   * @param {Array} enemies - Array of enemy entities
   * @param {String} weaponType - Current weapon type
   * @returns {Object|Array} Target enemy or array of targets
   */
  findTarget(player, enemies, weaponType) {
    const config = this.getTargetConfig(weaponType);

    // Filter active enemies only
    const activeEnemies = enemies.filter(e => e.sprite && e.sprite.active);

    // Filter by range
    const inRange = activeEnemies.filter(enemy => {
      const dist = Phaser.Math.Distance.Between(
        player.sprite.x, player.sprite.y,
        enemy.sprite.x, enemy.sprite.y
      );
      return dist <= config.range;
    });

    if (inRange.length === 0) {
      this.currentTarget = null;
      this.currentTargets = [];
      return null;
    }

    // Apply weapon-specific targeting
    switch(weaponType) {
      case 'sniper':
        return this.sniperTarget(player, inRange, config);
      case 'shotgun':
        return this.shotgunTargets(player, inRange, config);
      case 'rapid':
        return this.rapidTarget(player, inRange, config);
      case 'burst':
        return this.burstTarget(player, inRange, config);
      default:
        return this.rapidTarget(player, inRange, config);
    }
  }

  /**
   * Rapid Fire: Lock onto closest enemy (360° awareness)
   */
  rapidTarget(player, enemies, config) {
    if (enemies.length === 0) return null;

    // Sort by distance, get closest
    const sorted = enemies.sort((a, b) => {
      const distA = Phaser.Math.Distance.Between(
        player.sprite.x, player.sprite.y,
        a.sprite.x, a.sprite.y
      );
      const distB = Phaser.Math.Distance.Between(
        player.sprite.x, player.sprite.y,
        b.sprite.x, b.sprite.y
      );
      return distA - distB;
    });

    this.currentTarget = sorted[0];
    this.currentTargets = [sorted[0]];
    return sorted[0];
  }

  /**
   * Sniper: Lock onto furthest enemy (360° awareness)
   * Simplified to match indicator display - no cone restrictions
   */
  sniperTarget(player, enemies, config) {
    if (enemies.length === 0) {
      this.currentTarget = null;
      this.currentTargets = [];
      return null;
    }

    // Get furthest enemy (360° awareness)
    const sorted = enemies.sort((a, b) => {
      const distA = Phaser.Math.Distance.Between(
        player.sprite.x, player.sprite.y,
        a.sprite.x, a.sprite.y
      );
      const distB = Phaser.Math.Distance.Between(
        player.sprite.x, player.sprite.y,
        b.sprite.x, b.sprite.y
      );
      return distB - distA; // Furthest first
    });

    this.currentTarget = sorted[0];
    this.currentTargets = [sorted[0]];
    return sorted[0];
  }

  /**
   * Shotgun: Lock onto multiple enemies (up to 5 closest, 360° awareness)
   * Simplified to match indicator display - no cone restrictions
   */
  shotgunTargets(player, enemies, config) {
    if (enemies.length === 0) {
      this.currentTarget = null;
      this.currentTargets = [];
      return null;
    }

    // Sort by distance, get up to 5 closest enemies (360° awareness)
    const sorted = enemies.sort((a, b) => {
      const distA = Phaser.Math.Distance.Between(
        player.sprite.x, player.sprite.y,
        a.sprite.x, a.sprite.y
      );
      const distB = Phaser.Math.Distance.Between(
        player.sprite.x, player.sprite.y,
        b.sprite.x, b.sprite.y
      );
      return distA - distB;
    });

    const targets = sorted.slice(0, 5);
    this.currentTarget = targets[0]; // Primary target
    this.currentTargets = targets;
    return targets[0]; // Return primary for rotation
  }

  /**
   * Burst: Lock onto enemies in groups (prioritize clusters)
   */
  burstTarget(player, enemies, config) {
    if (enemies.length === 0) return null;

    // Find clusters (3+ enemies within 150px of each other)
    const clusters = [];

    enemies.forEach(enemy => {
      const nearby = enemies.filter(other => {
        if (other === enemy) return false;
        const dist = Phaser.Math.Distance.Between(
          enemy.sprite.x, enemy.sprite.y,
          other.sprite.x, other.sprite.y
        );
        return dist <= 150;
      });

      if (nearby.length >= 2) {
        // This enemy is part of a cluster
        clusters.push({
          center: enemy,
          count: nearby.length + 1,
          members: [enemy, ...nearby]
        });
      }
    });

    if (clusters.length > 0) {
      // Sort clusters by size, get largest
      clusters.sort((a, b) => b.count - a.count);
      const bestCluster = clusters[0];

      // Target closest enemy in best cluster
      const sorted = bestCluster.members.sort((a, b) => {
        const distA = Phaser.Math.Distance.Between(
          player.sprite.x, player.sprite.y,
          a.sprite.x, a.sprite.y
        );
        const distB = Phaser.Math.Distance.Between(
          player.sprite.x, player.sprite.y,
          b.sprite.x, b.sprite.y
        );
        return distA - distB;
      });

      this.currentTarget = sorted[0];
      this.currentTargets = [sorted[0]];
      return sorted[0];
    }

    // No clusters found, fallback to closest
    return this.rapidTarget(player, enemies, config);
  }

  /**
   * Get weapon targeting configuration
   */
  getTargetConfig(weaponType) {
    const configs = {
      'rapid': {
        range: 500,
        pattern: '360°',
        priority: 'closest',
        color: 0x00FF00  // Bright green for rapid fire
      },
      'sniper': {
        range: 900,
        pattern: '360°',
        priority: 'furthest',
        color: 0x00FFFF  // Cyan for sniper
      },
      'shotgun': {
        range: 350,
        pattern: '360°',
        priority: 'multi-closest',
        maxTargets: 5,
        color: 0xFF6600  // Orange for shotgun
      },
      'burst': {
        range: 600,
        pattern: '360°',
        priority: 'clusters',
        color: 0xFF00FF  // Magenta for burst
      }
    };

    return configs[weaponType] || configs['rapid'];
  }

  /**
   * Check if player has valid target
   */
  hasTarget() {
    return this.currentTarget !== null;
  }

  /**
   * Get current target
   */
  getTarget() {
    return this.currentTarget;
  }

  /**
   * Get all current targets (for shotgun)
   */
  getTargets() {
    return this.currentTargets;
  }

  /**
   * Clear current targets
   */
  clearTargets() {
    this.currentTarget = null;
    this.currentTargets = [];
  }
}
