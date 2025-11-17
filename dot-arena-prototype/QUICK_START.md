# Quick Start - Multiplayer Testing

## 🚀 Get the Server Running (2 minutes)

### Terminal 1: Start Server
```bash
cd server
node index.js
```

You should see:
```
╔═══════════════════════════════════════╗
║     🎮 DOT ARENA SERVER RUNNING       ║
╠═══════════════════════════════════════╣
║  Port: 3001
║  Tick Rate: 20 Hz
║  World Size: 3000x3000
║  Status: ✅ READY
╚═══════════════════════════════════════╝
```

### Terminal 2: Start Client
```bash
npm run dev
```

## 🎮 Testing Procedure

### Step 1: Open Multiple Browser Windows

1. **Browser Window 1**: http://localhost:5173
2. **Browser Window 2**: http://localhost:5173 (same URL, different window)
3. **Optional Browser Window 3**: http://localhost:5173

### Step 2: What You Should See

#### Window 1 (Player 1):
- ✅ You spawn in the arena
- ✅ You can move with WASD
- ✅ You can aim with mouse
- ✅ You can shoot with left-click
- ✅ You can dash with right-click

#### Window 2 (Player 2):
- ✅ You spawn in a different location
- ✅ You see Player 1 moving around (with their name tag)
- ✅ Player 1 sees you moving

### Step 3: Test Multiplayer Features

**Movement Sync:**
1. Move Player 1 with WASD
2. Check Window 2 - Player 1 should move smoothly

**Combat:**
1. Bring players close together
2. Player 1: Aim at Player 2, left-click to shoot
3. Player 2: Should see HP bar decrease
4. Check server console: Should show hit/kill messages

**Weapon Pickups:**
1. Walk over colored weapon pickups
2. Press 'E' or walk close (auto-pickup)
3. Other players should see the weapon disappear

**Respawning:**
1. Kill a player (reduce HP to 0)
2. After 3 seconds, they respawn at a random location

## 📊 Server Monitoring

### Health Check
```bash
curl http://localhost:3001/health
```

Expected output:
```json
{
  "status": "ok",
  "players": 2,
  "bullets": 0,
  "tick": 1234,
  "uptime": 60.5
}
```

### Stats
```bash
curl http://localhost:3001/stats
```

Expected output:
```json
{
  "players": [
    {"id": "abc123", "kills": 3, "hp": 2},
    {"id": "def456", "kills": 1, "hp": 3}
  ],
  "totalPlayers": 2,
  "activeBullets": 0,
  "tick": 1234
}
```

## 🐛 Troubleshooting

### Problem: "Connection timeout"
**Solution:** Make sure server is running on port 3001
```bash
# Check if port is in use
lsof -i :3001
```

### Problem: Players not syncing
**Solution:** Check browser console (F12) for errors
- Should see: `✅ Connected to server`
- Should see: `🎮 Received initial state`

### Problem: Lag/stuttering
**Solution:** This is normal on localhost, optimizations needed:
- Reduce number of bullets
- Lower tick rate if CPU is slow
- Close other applications

### Problem: Can't shoot
**Solution:**
- Make sure you're aiming at another player (auto-aim system)
- Check cooldown bars above your character
- Ensure weapon is ready (green bar = ready)

## ✅ Checklist

Before reporting issues, verify:
- [ ] Server shows "✅ READY"
- [ ] Browser console shows "✅ Connected to server"
- [ ] Can see other players in minimap (top-right)
- [ ] Network latency < 100ms (check console logs)
- [ ] Using Chrome/Firefox (not Safari, IE)

## 📝 Next Steps

Once multiplayer works:
1. Add blockchain integration (payment flow)
2. Implement matchmaking
3. Add leaderboards
4. Deploy to production server

---

## 🎯 Expected Server Console Output

```
🎮 Player connected: abc123
✅ Player abc123 spawned at (450, -200)

🎮 Player connected: def456
✅ Player def456 spawned at (-300, 500)

💥 abc123 hit for 1 damage (HP: 2)
💥 abc123 hit for 1 damage (HP: 1)
💀 def456 eliminated abc123 (killer kills: 1)
💰 def456 earned 0.5 DOT (pending blockchain integration)
♻️  abc123 respawned

👋 Player disconnected: abc123
```

## 🔧 Development Tips

### See Server Tick Performance
Server will warn if ticks are slow:
```
⚠️  Tick took 65ms (target: 50ms)
```

This means server is overloaded. Reduce:
- Number of players
- Number of bullets
- Or optimize code

### Check Network Traffic
Open browser DevTools → Network → WS (WebSocket)
- Should see constant traffic (20 messages/second)
- Message size should be small (<500 bytes)

### Test Reconnection
1. Stop server (Ctrl+C)
2. Client should show "🔌 Disconnected"
3. Restart server
4. Client should show "🔄 Reconnected"

---

Ready to test? Run `node server/index.js` and open the game! 🎮
