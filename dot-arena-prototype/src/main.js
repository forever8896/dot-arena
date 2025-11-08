import Phaser from 'phaser';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import EliminationScene from './scenes/EliminationScene.js';

// Remove loading text once Phaser loads
window.addEventListener('load', () => {
  const loading = document.getElementById('loading');
  if (loading) {
    setTimeout(() => loading.style.display = 'none', 1000);
  }
});

// Handle window resize
window.addEventListener('resize', () => {
  if (window.game) {
    window.game.scale.resize(window.innerWidth, window.innerHeight);
  }
});

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: 'game-container',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 }, // Top-down game, no gravity
      debug: false // Set to true to see collision boxes
    }
  },
  scene: [MenuScene, GameScene, EliminationScene],
  backgroundColor: '#f5e4d7', // Champagne Pink - ground color
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: '100%',
    height: '100%'
  },
  render: {
    pixelArt: false,
    antialias: true,
    roundPixels: true
  }
};

const game = new Phaser.Game(config);

// Expose game instance for debugging
window.game = game;
