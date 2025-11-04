# DOT ARENA - MVP Prototype Fast-Track Plan

## 🎯 Goal
Get a playable prototype running in **2-3 hours** with:
- WASD movement
- Mouse aim (360 degrees)
- Click to shoot projectiles
- Polkadot pink map
- Character.png as player sprite

## 🚀 Fast-Track Approach

### Phase 1: Setup (15 minutes)
1. Create minimal project structure
2. Set up Phaser.js with Vite
3. Load character.png sprite

### Phase 2: Core Gameplay (60 minutes)
1. WASD movement (15 min)
2. Mouse aiming with sprite rotation (15 min)
3. Projectile shooting on click (20 min)
4. Simple collision detection (10 min)

### Phase 3: Visual Polish (30 minutes)
1. Polkadot pink background gradient
2. Camera follow player
3. Basic UI (HP, ammo counter)

### Phase 4: Testing & Feel (15 minutes)
1. Tweak movement speed
2. Adjust projectile speed
3. Test controls responsiveness

---

## 📁 Minimal Project Structure

```
dot-arena-prototype/
├── index.html           # Entry point
├── package.json         # Dependencies
├── vite.config.js       # Vite config
└── src/
    ├── main.js          # Phaser game initialization
    ├── scenes/
    │   └── GameScene.js # Main gameplay scene
    ├── entities/
    │   ├── Player.js    # Player with WASD + aim
    │   └── Bullet.js    # Projectile
    └── assets/
        └── character.png # Polkadot logo sprite
```

---

## 🛠️ Tech Stack (Minimal)

- **Phaser.js 3** - Game engine
- **Vite** - Fast dev server & bundler
- **Vanilla JS** - No framework overhead

---

## 📋 Implementation Steps

### Step 1: Initialize Project (5 min)

```bash
# Create project
mkdir dot-arena-prototype
cd dot-arena-prototype

# Initialize npm
npm init -y

# Install dependencies
npm install phaser vite

# Copy character sprite
cp ../character.png src/assets/
```

### Step 2: Setup Phaser (10 min)

**package.json scripts:**
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  }
}
```

**index.html:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>DOT ARENA Prototype</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #1a1a1a;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
    }
    canvas {
      border: 2px solid #E6007A;
    }
  </style>
</head>
<body>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

**src/main.js:**
```javascript
import Phaser from 'phaser';
import GameScene from './scenes/GameScene.js';

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 }, // Top-down game, no gravity
      debug: false
    }
  },
  scene: [GameScene],
  backgroundColor: '#E6007A'
};

const game = new Phaser.Game(config);
```

### Step 3: Create GameScene (15 min)

**src/scenes/GameScene.js:**
```javascript
import Phaser from 'phaser';
import Player from '../entities/Player.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    // Load character sprite
    this.load.image('character', '/src/assets/character.png');

    // Create bullet graphic (simple circle)
    const graphics = this.add.graphics();
    graphics.fillStyle(0xFFFFFF, 1);
    graphics.fillCircle(4, 4, 4);
    graphics.generateTexture('bullet', 8, 8);
    graphics.destroy();
  }

  create() {
    // Create Polkadot pink gradient background
    this.createBackground();

    // Create player at center
    this.player = new Player(this, 400, 300);

    // Camera follows player
    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);
    this.cameras.main.setZoom(1);

    // Create bullets group
    this.bullets = this.physics.add.group({
      defaultKey: 'bullet',
      maxSize: 50
    });

    // Setup shooting
    this.input.on('pointerdown', () => {
      this.player.shoot(this.bullets);
    });
  }

  update(time, delta) {
    if (this.player) {
      this.player.update();
    }

    // Remove bullets that are out of bounds
    this.bullets.children.entries.forEach(bullet => {
      if (bullet.active) {
        const distance = Phaser.Math.Distance.Between(
          this.player.sprite.x, this.player.sprite.y,
          bullet.x, bullet.y
        );
        if (distance > 600) {
          bullet.setActive(false);
          bullet.setVisible(false);
        }
      }
    });
  }

  createBackground() {
    // Create a large pink gradient background
    const graphics = this.add.graphics();

    // Gradient from bright pink to darker pink
    const colors = [
      { offset: 0, color: 0xFF1B8D },
      { offset: 0.5, color: 0xE6007A },
      { offset: 1, color: 0xB0005F }
    ];

    // Fill entire world (larger than viewport for scrolling)
    const worldWidth = 2000;
    const worldHeight = 2000;

    graphics.fillGradientStyle(0xFF1B8D, 0xFF1B8D, 0xB0005F, 0xB0005F, 1);
    graphics.fillRect(-worldWidth/2, -worldHeight/2, worldWidth, worldHeight);

    // Set world bounds
    this.physics.world.setBounds(
      -worldWidth/2, -worldHeight/2,
      worldWidth, worldHeight
    );
  }
}
```

### Step 4: Create Player Entity (20 min)

**src/entities/Player.js:**
```javascript
import Phaser from 'phaser';

export default class Player {
  constructor(scene, x, y) {
    this.scene = scene;

    // Create sprite
    this.sprite = scene.physics.add.sprite(x, y, 'character');
    this.sprite.setScale(0.5); // Adjust size if needed
    this.sprite.setCollideWorldBounds(true);

    // Movement properties
    this.speed = 200;
    this.hp = 3;

    // Shooting properties
    this.fireRate = 1000; // 1 shot per second
    this.lastFired = 0;

    // Setup input
    this.cursors = scene.input.keyboard.createCursorKeys();
    this.keys = scene.input.keyboard.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D
    });
  }

  update() {
    // Reset velocity
    this.sprite.setVelocity(0);

    // WASD Movement
    const velocity = new Phaser.Math.Vector2(0, 0);

    if (this.keys.W.isDown) velocity.y -= 1;
    if (this.keys.S.isDown) velocity.y += 1;
    if (this.keys.A.isDown) velocity.x -= 1;
    if (this.keys.D.isDown) velocity.x += 1;

    // Normalize diagonal movement
    velocity.normalize();
    velocity.scale(this.speed);

    this.sprite.setVelocity(velocity.x, velocity.y);

    // Mouse aiming - rotate sprite to face cursor
    const pointer = this.scene.input.activePointer;
    const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);

    const angle = Phaser.Math.Angle.Between(
      this.sprite.x,
      this.sprite.y,
      worldPoint.x,
      worldPoint.y
    );

    this.sprite.rotation = angle;
  }

  shoot(bulletsGroup) {
    const now = this.scene.time.now;

    // Check fire rate cooldown
    if (now - this.lastFired < this.fireRate) {
      return;
    }

    this.lastFired = now;

    // Get bullet from pool
    const bullet = bulletsGroup.get(this.sprite.x, this.sprite.y);

    if (bullet) {
      bullet.setActive(true);
      bullet.setVisible(true);

      // Calculate bullet velocity based on sprite rotation
      const bulletSpeed = 400;
      const velocityX = Math.cos(this.sprite.rotation) * bulletSpeed;
      const velocityY = Math.sin(this.sprite.rotation) * bulletSpeed;

      bullet.body.velocity.x = velocityX;
      bullet.body.velocity.y = velocityY;

      // Visual feedback
      this.sprite.setTint(0xFFFFFF);
      this.scene.time.delayedCall(100, () => {
        this.sprite.clearTint();
      });
    }
  }

  takeDamage(amount = 1) {
    this.hp -= amount;

    // Red flash on damage
    this.sprite.setTint(0xFF0000);
    this.scene.time.delayedCall(200, () => {
      this.sprite.clearTint();
    });

    if (this.hp <= 0) {
      this.die();
    }
  }

  die() {
    console.log('Player died!');
    // TODO: Death animation, respawn, etc.
  }
}
```

### Step 5: Run the Prototype

```bash
# Start dev server
npm run dev

# Open browser to http://localhost:5173
```

---

## 🎮 Controls

- **WASD** - Move in 8 directions
- **Mouse** - Aim direction
- **Left Click** - Shoot projectile

---

## ✨ Expected Result

You should see:
1. ✅ Polkadot logo character in center
2. ✅ Pink gradient background
3. ✅ Character rotates to face mouse cursor
4. ✅ Smooth WASD movement in all directions
5. ✅ White projectiles shoot when clicking
6. ✅ Character flashes white when shooting
7. ✅ Camera follows player smoothly

---

## 🚀 Next Steps (After MVP Works)

### Immediate Enhancements (30 min each):
1. **Multiple Players (Dummy NPCs)**
   - Add 5-10 static dummy players
   - Test shooting them
   - Add collision detection

2. **HP System**
   - Display HP hearts in UI
   - Reduce HP on hit
   - Death animation

3. **Map Obstacles**
   - Add walls/bushes
   - Collision detection
   - Line-of-sight blocking

### Future Enhancements:
4. **Multiplayer (Socket.io)** - 2-3 hours
5. **Blockchain Integration** - 4-6 hours
6. **Governance Dashboard** - 4-6 hours

---

## 🎯 Success Criteria

MVP is successful when:
- ✅ Movement feels responsive (no lag)
- ✅ Aiming is smooth (360 degrees)
- ✅ Shooting is satisfying (visual feedback)
- ✅ Can play for 30 seconds without bugs
- ✅ Controls are intuitive

---

## 🐛 Common Issues & Fixes

### Issue: Character doesn't move
```javascript
// Check: Are physics enabled?
this.sprite = scene.physics.add.sprite(x, y, 'character');
```

### Issue: Aiming is jerky
```javascript
// Check: Camera smoothing
this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);
```

### Issue: Can shoot too fast
```javascript
// Check: Fire rate cooldown
if (now - this.lastFired < this.fireRate) return;
```

### Issue: Bullets don't appear
```javascript
// Check: Bullet is set to active and visible
bullet.setActive(true);
bullet.setVisible(true);
```

---

## 📊 Time Estimate Breakdown

| Task | Time | Cumulative |
|------|------|------------|
| Project setup | 15 min | 15 min |
| Phaser basic scene | 15 min | 30 min |
| WASD movement | 20 min | 50 min |
| Mouse aiming | 15 min | 65 min |
| Shooting system | 25 min | 90 min |
| Polish & testing | 30 min | **2 hours** |

**Total: ~2 hours for playable MVP**

---

## 🎨 Future Visual Polish

Once gameplay feels good:
- Add particle effects for bullets
- Muzzle flash animation
- Camera shake on shoot
- Trail effect on bullets
- Death explosion animation
- Spawn animation
- HP bar above player

---

## 💡 Tips for Fast Development

1. **Use Phaser's built-in physics** - Don't reinvent the wheel
2. **Object pooling for bullets** - Reuse bullet sprites
3. **Hot reload with Vite** - See changes instantly
4. **Test often** - Run game every 5 minutes
5. **Keep it simple** - No fancy features until core works

---

## 🎯 Definition of "Done"

MVP prototype is complete when you can:
1. Open browser to localhost
2. See Polkadot logo character on pink map
3. Move around smoothly with WASD
4. Aim with mouse (character rotates)
5. Shoot projectiles with left click
6. Play continuously for 1+ minute without crashes

**Once this works, we add multiplayer, then blockchain!**

---

Ready to build? Let's start with the project setup! 🚀
