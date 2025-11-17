import Phaser from 'phaser';

export default class EliminationScene extends Phaser.Scene {
  constructor() {
    super({ key: 'EliminationScene' });
  }

  init(data) {
    this.playerStats = data.playerStats || {
      kills: 0,
      survivalTime: 0,
      placement: 0,
      totalPlayers: 0
    };
  }

  create() {
    const { width, height } = this.scale;

    // Calculate DOT earned (0.9 DOT per kill)
    const dotEarned = (this.playerStats.kills * 0.9).toFixed(2);
    const hasEarnings = parseFloat(dotEarned) > 0;

    // R.I.P. Title
    this.add.text(width / 2, height / 2 - 120, 'R.I.P.', {
      fontSize: '80px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // DOT Earnings or sad message
    if (hasEarnings) {
      this.add.text(width / 2, height / 2 - 20, `You earned ${dotEarned} DOT`, {
        fontSize: '32px',
        fontFamily: 'Arial, sans-serif',
        color: '#E6007A',
        fontStyle: 'bold'
      }).setOrigin(0.5);

      this.add.text(width / 2, height / 2 + 30, 'Start again or claim your rewards at the', {
        fontSize: '20px',
        fontFamily: 'Arial, sans-serif',
        color: '#FFFFFF'
      }).setOrigin(0.5);

      this.add.text(width / 2, height / 2 + 60, 'MAIN MENU', {
        fontSize: '24px',
        fontFamily: 'Arial, sans-serif',
        color: '#FFFFFF',
        fontStyle: 'bold'
      }).setOrigin(0.5);
    } else {
      this.add.text(width / 2, height / 2 - 20, 'No DOT earned', {
        fontSize: '28px',
        fontFamily: 'Arial, sans-serif',
        color: '#999999'
      }).setOrigin(0.5);

      this.add.text(width / 2, height / 2 + 30, 'Better luck next time!', {
        fontSize: '20px',
        fontFamily: 'Arial, sans-serif',
        color: '#FFFFFF',
        fontStyle: 'italic'
      }).setOrigin(0.5);
    }

    // Single Main Menu button
    const buttonY = height / 2 + 140;
    const menuButton = this.add.rectangle(width / 2, buttonY, 280, 60, 0xE6007A, 1);
    menuButton.setInteractive({ useHandCursor: true });

    const menuText = this.add.text(width / 2, buttonY, 'MAIN MENU', {
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Button hover effects
    menuButton.on('pointerover', () => {
      menuButton.setFillStyle(0xE6007A, 0.8);
    });

    menuButton.on('pointerout', () => {
      menuButton.setFillStyle(0xE6007A, 1);
    });

    menuButton.on('pointerdown', () => {
      menuButton.setFillStyle(0xC6006A, 1);
    });

    menuButton.on('pointerup', () => {
      menuButton.setFillStyle(0xE6007A, 1);
      this.scene.start('MenuScene');
    });

    // Fade in animation
    this.cameras.main.fadeIn(500, 230, 0, 122);

    // Handle window resize
    this.scale.on('resize', this.resize, this);
  }

  resize(gameSize) {
    const { width, height } = gameSize;
    // Reposition elements on resize if needed
  }
}
