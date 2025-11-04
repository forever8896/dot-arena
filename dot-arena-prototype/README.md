# DOT ARENA - Playable MVP Prototype 🎮

A browser-based multiplayer shooter prototype built with Phaser.js.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Game runs at http://localhost:5173
```

## 🎮 Controls

- **W A S D** - Move in 8 directions
- **Mouse** - Aim (360 degrees)
- **Left Click** - Shoot projectiles

## ✨ Features

- ✅ Smooth WASD movement
- ✅ 360° mouse aiming with character rotation
- ✅ Click-to-shoot projectile system
- ✅ Polkadot pink gradient map
- ✅ HP system with visual feedback
- ✅ Fire rate cooldown indicator
- ✅ Camera follows player
- ✅ Recoil and visual effects

## 🛠️ Tech Stack

- **Phaser.js 3** - Game engine
- **Vite** - Dev server and bundler
- **Vanilla JS** - ES6 modules

## 📁 Project Structure

```
dot-arena-prototype/
├── index.html              # Entry point
├── package.json            # Dependencies
├── vite.config.js          # Vite configuration
└── src/
    ├── main.js             # Game initialization
    ├── scenes/
    │   └── GameScene.js    # Main gameplay scene
    ├── entities/
    │   └── Player.js       # Player with WASD + aim + shoot
    └── assets/
        └── character.png   # Polkadot logo sprite
```

## 🎯 What's Working

1. **Movement System**
   - 8-directional movement (WASD)
   - Normalized diagonal movement
   - World bounds collision
   - Smooth velocity-based physics

2. **Aiming System**
   - Player sprite rotates to face mouse cursor
   - 360-degree aiming
   - Accurate angle calculation

3. **Shooting System**
   - Click to shoot projectiles
   - Fire rate cooldown (800ms)
   - Object pooling for bullets
   - Visual feedback (white flash + recoil)

4. **Visual Polish**
   - Polkadot pink gradient background
   - Subtle grid pattern
   - HP hearts display
   - Fire rate cooldown indicator
   - FPS counter

## 🐛 Debugging

- Press **F12** to open browser console
- Check console logs for shoot events
- FPS counter visible in top-left
- Set `debug: true` in physics config to see collision boxes

## 🔧 Configuration

### Tweak Movement Speed
In `src/entities/Player.js`:
```javascript
this.speed = 250; // Change this value
```

### Tweak Fire Rate
In `src/entities/Player.js`:
```javascript
this.fireRate = 800; // Milliseconds between shots
```

### Tweak Bullet Speed
In `src/entities/Player.js`:
```javascript
this.bulletSpeed = 500; // Pixels per second
```

## 🚀 Next Steps

### Immediate (30 min each):
- [ ] Add dummy enemy NPCs
- [ ] Add collision detection (bullet hits)
- [ ] Add map obstacles (walls)

### Short-term (2-3 hours each):
- [ ] Multiplayer with Socket.io
- [ ] Different weapon types
- [ ] Power-ups and pickups

### Long-term (4-6 hours each):
- [ ] Blockchain integration (entry fees)
- [ ] Treasury and governance
- [ ] Leaderboards

## 📊 Performance

- Target: 60 FPS
- Canvas size: 1000x700px
- World size: 3000x3000px
- Object pooling: Max 100 bullets

## 🎨 Asset Credits

- Character sprite: Polkadot logo (character.png)
- Color scheme: Polkadot pink (#E6007A)

## 📝 Notes

- No blockchain integration yet (coming later)
- Single player only (multiplayer coming next)
- Local gameplay only (no server yet)

---

**Status:** ✅ Playable MVP - Movement, aiming, and shooting all working!

**Play time:** ~30 seconds before you want more features 😄
