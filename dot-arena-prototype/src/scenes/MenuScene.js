import Phaser from 'phaser';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  preload() {
    // Load idle animation frames for character display
    for (let i = 64; i <= 141; i++) {
      const frameNum = i.toString().padStart(4, '0');
      this.load.image(`character-idle-frame${i}`, `/src/assets/frameIdle_${frameNum}.png`);
    }
  }

  create() {
    const { width, height } = this.scale;

    // Create idle animation if not already created
    if (!this.anims.exists('menu-idle')) {
      const idleFrames = [];
      for (let i = 64; i <= 141; i++) {
        idleFrames.push({ key: `character-idle-frame${i}` });
      }
      this.anims.create({
        key: 'menu-idle',
        frames: idleFrames,
        frameRate: 60,
        repeat: -1
      });
    }

    // Title at top
    this.add.text(width / 2, 60, 'DOT ARENA', {
      fontSize: '64px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(width / 2, 115, 'Player-Governed Battle Royale', {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFFFFF',
      alpha: 0.9
    }).setOrigin(0.5);

    // Layout: Character left, content right
    const leftX = width * 0.25;
    const rightX = width * 0.65;
    const contentStart = 180;

    // Character with glow
    this.add.circle(leftX, height / 2, 140, 0xFFFFFF, 0.08);
    const character = this.add.sprite(leftX, height / 2, 'character-idle-frame64');
    character.setScale(0.18);
    character.play('menu-idle');

    // === HOW TO PLAY Section ===
    const howToY = contentStart;

    // Box first
    const howToBox = this.add.rectangle(rightX, howToY + 60, 450, 140, 0x2a2b2a, 0.3);
    howToBox.setStrokeStyle(2, 0xFFFFFF, 0.4);

    // Header ABOVE the box
    this.add.text(rightX, howToY, 'HOW TO PLAY', {
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Content INSIDE the box
    this.add.text(rightX, howToY + 40, '1 DOT Entry Fee', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(rightX, howToY + 65, 'Eliminate enemies • Earn 0.5 DOT per kill', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFFFFF'
    }).setOrigin(0.5);

    this.add.text(rightX, howToY + 88, 'Infinite arena • Survive as long as you can!', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFFFFF'
    }).setOrigin(0.5);

    // === TOKENOMICS Section ===
    const tokenY = howToY + 190;

    // Box first
    const tokenBox = this.add.rectangle(rightX, tokenY + 65, 450, 150, 0x2a2b2a, 0.3);
    tokenBox.setStrokeStyle(2, 0xFFFFFF, 0.4);

    // Header ABOVE the box
    this.add.text(rightX, tokenY, 'TOKENOMICS', {
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Content INSIDE the box
    this.add.text(rightX, tokenY + 30, 'Platform Share (0.5 DOT per kill):', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(rightX, tokenY + 55, '10% → Development & Servers', {
      fontSize: '15px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFFFFF'
    }).setOrigin(0.5);

    this.add.text(rightX, tokenY + 78, '90% → Governance Treasury', {
      fontSize: '15px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFFFFF'
    }).setOrigin(0.5);

    this.add.text(rightX, tokenY + 101, 'YOU vote on ecosystem projects', {
      fontSize: '15px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFFFFF',
      fontStyle: 'italic'
    }).setOrigin(0.5);

    // Start button
    const startButton = this.add.rectangle(width / 2, height * 0.9, 300, 60, 0xFFFFFF, 1);
    startButton.setInteractive({ useHandCursor: true });

    const startText = this.add.text(width / 2, height * 0.9, 'ENTER ARENA (1 DOT)', {
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif',
      color: '#E6007A',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Button hover effects
    startButton.on('pointerover', () => {
      startButton.setFillStyle(0xFFFFFF, 0.8);
    });

    startButton.on('pointerout', () => {
      startButton.setFillStyle(0xFFFFFF, 1);
    });

    startButton.on('pointerdown', () => {
      startButton.setFillStyle(0xCCCCCC, 1);
    });

    startButton.on('pointerup', () => {
      startButton.setFillStyle(0xFFFFFF, 1);
      this.scene.start('GameScene');
    });

    // Add pulsing animation to title
    this.tweens.add({
      targets: title,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Add floating animation to start button
    this.tweens.add({
      targets: [startButton, startText],
      y: '+=10',
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Handle window resize
    this.scale.on('resize', this.resize, this);
  }

  resize(gameSize) {
    const { width, height } = gameSize;
    // Reposition elements on resize if needed
    // This is a simplified version - you may want to recreate elements
  }
}
