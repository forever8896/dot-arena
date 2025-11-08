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

    // Title
    this.add.text(width / 2, 70, 'ELIMINATED', {
      fontSize: '60px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // === STATS Section ===
    const statsY = 170;

    this.add.text(width / 2, statsY, 'YOUR PERFORMANCE', {
      fontSize: '26px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const statsBox = this.add.rectangle(width / 2, statsY + 75, 480, 140, 0x2a2b2a, 0.3);
    statsBox.setStrokeStyle(2, 0xFFFFFF, 0.4);

    this.add.text(width / 2, statsY + 45, `Kills: ${this.playerStats.kills}  •  Placement: ${this.playerStats.placement}/${this.playerStats.totalPlayers}`, {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFFFFF'
    }).setOrigin(0.5);

    this.add.text(width / 2, statsY + 75, `Survival: ${Math.floor(this.playerStats.survivalTime)}s`, {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFFFFF'
    }).setOrigin(0.5);

    this.add.text(width / 2, statsY + 105, `DOT Earned: ${(this.playerStats.kills * 0.5).toFixed(2)}`, {
      fontSize: '22px',
      fontFamily: 'Arial, sans-serif',
      color: '#00FF88',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // === IMPACT Section ===
    const impactY = statsY + 190;

    this.add.text(width / 2, impactY, 'YOUR IMPACT', {
      fontSize: '26px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const impactBox = this.add.rectangle(width / 2, impactY + 95, 580, 180, 0x2a2b2a, 0.3);
    impactBox.setStrokeStyle(2, 0xFFFFFF, 0.4);

    this.add.text(width / 2, impactY + 40, 'Every kill distributes 1 DOT:', {
      fontSize: '17px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(width / 2, impactY + 70, '0.5 DOT to Winner  •  0.5 DOT to Platform', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFFFFF'
    }).setOrigin(0.5);

    this.add.text(width / 2, impactY + 100, 'Platform: 10% Dev Fund | 90% Governance', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFFFFF'
    }).setOrigin(0.5);

    this.add.text(width / 2, impactY + 130, 'YOU vote on Polkadot ecosystem projects', {
      fontSize: '15px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFFFFF',
      fontStyle: 'italic'
    }).setOrigin(0.5);

    // Buttons
    const buttonY = height * 0.88;

    // Play Again button
    const playAgainButton = this.add.rectangle(width / 2 - 180, buttonY, 280, 55, 0xFFFFFF, 1);
    playAgainButton.setInteractive({ useHandCursor: true });

    const playAgainText = this.add.text(width / 2 - 180, buttonY, 'PLAY AGAIN (1 DOT)', {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      color: '#E6007A',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Main Menu button
    const menuButton = this.add.rectangle(width / 2 + 180, buttonY, 220, 55, 0x2a2b2a, 0.5);
    menuButton.setStrokeStyle(2, 0xFFFFFF, 1);
    menuButton.setInteractive({ useHandCursor: true });

    const menuText = this.add.text(width / 2 + 180, buttonY, 'MAIN MENU', {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Button hover effects - Play Again
    playAgainButton.on('pointerover', () => {
      playAgainButton.setFillStyle(0xFFFFFF, 0.8);
    });

    playAgainButton.on('pointerout', () => {
      playAgainButton.setFillStyle(0xFFFFFF, 1);
    });

    playAgainButton.on('pointerdown', () => {
      playAgainButton.setFillStyle(0xCCCCCC, 1);
    });

    playAgainButton.on('pointerup', () => {
      playAgainButton.setFillStyle(0xFFFFFF, 1);
      this.scene.start('GameScene');
    });

    // Button hover effects - Menu
    menuButton.on('pointerover', () => {
      menuButton.setFillStyle(0x2a2b2a, 0.7);
    });

    menuButton.on('pointerout', () => {
      menuButton.setFillStyle(0x2a2b2a, 0.5);
    });

    menuButton.on('pointerdown', () => {
      menuButton.setFillStyle(0x2a2b2a, 0.9);
    });

    menuButton.on('pointerup', () => {
      menuButton.setFillStyle(0x2a2b2a, 0.5);
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
