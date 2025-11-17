# 🚀 DOT Arena - Quick Setup Guide

## ✅ Transaction Signing is NOW IMPLEMENTED!

The game is **99% complete**. Here's what you need to do:

## Step 1: Create Server Wallet (2 minutes)

```bash
# Option 1: Use SubWallet browser extension
# - Create new account
# - Copy the 12-word seed phrase
# - Copy the wallet address

# Option 2: Use Polkadot.js extension
# - Create new account
# - Export seed phrase
# - Copy address
```

## Step 2: Configure Server (30 seconds)

```bash
# Copy example env file
cp .env.example .env

# Edit .env and add your server wallet seed
nano .env  # or use any text editor

# Add this line:
SERVER_WALLET_SEED="your twelve word seed phrase goes here"
```

## Step 3: Fund Server Wallet (1 minute)

The server wallet needs a tiny amount of DOT for gas fees:

```bash
# Get testnet DOT from faucet
# Visit: https://faucet.polkadot.io/
# Or use Pop CLI: pop faucet --address YOUR_SERVER_ADDRESS
```

## Step 4: Authorize Server in Contract (OWNER ONLY)

The contract owner must authorize your server wallet:

```javascript
// Using Dedot/Typink or Polkadot.js Apps
contract.tx.setGameServer("YOUR_SERVER_WALLET_ADDRESS")
  .signAndSend(ownerKeypair);
```

Or use Pop CLI:
```bash
pop call contract \
  --contract 0xdafd89d6d92d6918c81c613f85c23fdf71f9d619 \
  --message set_game_server \
  --args "YOUR_SERVER_WALLET_ADDRESS" \
  --suri "//Alice"  # Owner's account
```

## Step 5: Start the Server

```bash
cd server
node index.js
```

You should see:
```
🔑 Server wallet loaded: 5YourAddress...
✅ Blockchain client initialized
╔═══════════════════════════════════════╗
║     🎮 DOT ARENA SERVER RUNNING       ║
╠═══════════════════════════════════════╣
║  Blockchain: ✅ CONNECTED
║  Status: ✅ READY
╚═══════════════════════════════════════╝
```

## Step 6: Update Frontend (Add Authentication)

Add this to `src/app.js` after game starts:

```javascript
// In the startGame() function, after creating the Phaser game
async function startGame() {
  // ... existing code ...

  // Connect to game server
  const socket = io('http://localhost:3001');

  // Authenticate with server using wallet address
  socket.emit('authenticate', {
    address: state.connectedAccount.address
  });

  // Handle authentication response
  socket.on('authFailed', (data) => {
    alert(`Authentication failed: ${data.message}`);
    // Reload page to go back to main menu
    window.location.reload();
  });

  socket.on('init', (data) => {
    console.log('✅ Authenticated! Spawned at:', data.player);
    // Store socket for game to use
    game.registry.set('socket', socket);
  });

  // Listen for DOT rewards
  socket.on('dotReward', (data) => {
    console.log(`💰 You earned ${data.amount}!`);
    console.log(`   Transaction: ${data.txHash}`);
    alert(`🎉 Kill! You earned ${data.amount}`);
  });
}
```

## Step 7: Test the Complete Flow

1. **Start server:** `node server/index.js`
2. **Start frontend:** `npm run dev`
3. **Open browser:** http://localhost:5173
4. **Connect wallet** → SubWallet/Talisman
5. **Pay entry fee** → 1 DOT
6. **Game loads** → You spawn in the arena
7. **Get a kill** → Watch server console
8. **Receive DOT** → 0.9 DOT sent to your wallet!

## 🎯 Expected Console Output (Server)

When a kill happens:

```
💀 player-123 eliminated player-456 (killer kills: 1)
💰 Recording kill on blockchain...
   Killer wallet: 5KillerAddress...
   Victim wallet: 5VictimAddress...
📝 Creating transaction...
✍️  Signing and sending transaction...
   Status: Ready
   Status: Broadcast
   Status: InBlock
   Status: Finalized
✅ Transaction finalized in block: 0xabc123...
   Event: system.ExtrinsicSuccess
   Event: contracts.Called
   Event: balances.Transfer { from: Contract, to: Killer, amount: 9000000000 }
✅ Kill recorded! 5KillerAddress... earned 0.9 DOT
   Transaction: 0xabc123...
```

## ⚠️ Troubleshooting

### "Server wallet not configured"
- Make sure `.env` file exists
- Check `SERVER_WALLET_SEED` is set correctly
- Restart the server

### "Unauthorized" error
- Contract owner hasn't called `setGameServer()` yet
- Verify server wallet address is correct
- Check owner authorized the right address

### "Insufficient balance" error
- Server wallet needs DOT for gas
- Get testnet DOT from faucet
- Each transaction costs ~0.001 DOT

### "Player has not paid entry fee"
- Frontend didn't emit `authenticate` event
- Payment transaction not confirmed yet
- Check blockchain explorer for payment

## 🎉 That's It!

Your game is now **fully functional** with:
- ✅ Wallet connection
- ✅ Entry fee payment (1 DOT)
- ✅ Server authentication
- ✅ Kill recording on blockchain
- ✅ Instant DOT rewards (0.9 DOT per kill)

**Time to complete:** ~5 minutes (if you have a wallet ready)

## 📚 Additional Resources

- **Full Integration Guide:** `DOT_ARENA_INTEGRATION_GUIDE.md`
- **Server Setup Details:** `SERVER_BLOCKCHAIN_SETUP.md`
- **Frontend Integration:** `FRONTEND_INTEGRATION_PLAN.md`
- **Wallet Integration:** `WALLET_INTEGRATION.md`

---

**LFG! 🚀 Your play-to-earn battle royale is ready!**
