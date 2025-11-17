# DOT Arena Server - Blockchain Integration Setup

## ⚠️ Current Status: PARTIALLY IMPLEMENTED

The server now has blockchain integration **scaffolded** but requires additional setup to actually process payments on-chain.

## ✅ What's Working

1. **Blockchain Client Connection**
   - Connects to Passet Hub Testnet
   - Loads contract metadata
   - Subscribes to contract events

2. **Entry Fee Payment Listening**
   - Monitors `ContractFunded` events
   - Tracks which wallet addresses have paid
   - Verifies payment amounts (1 DOT)

3. **Player Authentication**
   - Players must send wallet address when connecting
   - Server verifies payment before allowing spawn
   - Maintains wallet ↔ player ID mapping

4. **Kill Event Handling**
   - Detects when a player kills another
   - Attempts to record kill on blockchain
   - Tracks wallet addresses of both players

## ❌ What's NOT Working Yet

### 1. Server Wallet Keypair (CRITICAL)

**Status:** NOT IMPLEMENTED

The server needs its own wallet to sign transactions calling `record_kill()`.

**Required Steps:**

```bash
# 1. Create a server wallet (do this ONCE)
# Use SubWallet or similar to create a new account
# Save the seed phrase SECURELY (use a password manager or secrets vault)

# 2. Get testnet DOT for gas fees
# The server wallet needs DOT to pay transaction fees

# 3. Set environment variables
export SERVER_WALLET_ADDRESS="5YourServerWalletAddressHere..."
export SERVER_WALLET_SEED="your twelve word seed phrase here"

# 4. Owner must authorize server wallet in contract
# Call contract.setGameServer(SERVER_WALLET_ADDRESS)
# Only the contract owner can do this!
```

**Security Warning:**
- NEVER commit server wallet seed to git
- Use environment variables or secrets management
- In production: AWS Secrets Manager, HashiCorp Vault, etc.

### 2. Transaction Signing Implementation

**File:** `server/blockchain.js`
**Function:** `recordKillOnChain()`
**Line:** ~120

Currently just returns `{ success: false, error: 'Not implemented' }`

**What needs to be added:**

```javascript
// Install @polkadot/keyring
npm install @polkadot/keyring

// In recordKillOnChain():
import { Keyring } from '@polkadot/keyring';

// Create keypair from seed
const keyring = new Keyring({ type: 'sr25519' });
const serverKeypair = keyring.addFromUri(CONFIG.serverWalletSeed);

// Create transaction
const tx = contract.tx.recordKill(killerWallet, victimWallet);

// Sign and send
const result = await new Promise((resolve, reject) => {
  tx.signAndSend(serverKeypair, ({ status, dispatchError }) => {
    if (status.type === 'Finalized') {
      if (dispatchError) {
        let errorMessage = 'Transaction failed';
        if (dispatchError.isModule) {
          const decoded = client.registry.findMetaError(dispatchError.asModule);
          errorMessage = `${decoded.section}.${decoded.name}`;
        }
        reject(new Error(errorMessage));
      } else {
        resolve({
          success: true,
          txHash: status.asFinalized.toString()
        });
      }
    }
  });
});

return result;
```

### 3. Frontend Socket Authentication

**File:** `src/app.js` (or game initialization)
**Status:** NOT IMPLEMENTED

After payment succeeds, the frontend needs to:

```javascript
// After startGame() in src/app.js
socket.emit('authenticate', {
  address: state.connectedAccount.address
});

// Listen for auth result
socket.on('authFailed', (data) => {
  alert(`Authentication failed: ${data.message}`);
  // Kick player back to main menu
});

socket.on('init', (data) => {
  // Player authenticated and spawned!
  console.log('Spawned with wallet:', data.walletAddress);
});
```

## 🔧 Complete Setup Guide

### Step 1: Create Server Wallet

```bash
# Option A: Use Pop CLI
pop account create --name dot-arena-server

# Option B: Use SubWallet browser extension
# Create new account → Save seed phrase securely
```

### Step 2: Fund Server Wallet

```bash
# Get testnet DOT from faucet
# Server needs DOT for transaction fees (gas)
```

### Step 3: Authorize Server in Contract

```javascript
// Using Dedot/Typink in frontend or script:

const contract = new Contract(client, metadata, CONTRACT_ADDRESS);

// ONLY CONTRACT OWNER CAN DO THIS
await contract.tx.setGameServer(SERVER_WALLET_ADDRESS)
  .signAndSend(ownerKeypair, callback);
```

### Step 4: Configure Server Environment

```bash
# Create .env file in server directory
cat > server/.env << EOF
CONTRACT_ADDRESS=0xdafd89d6d92d6918c81c613f85c23fdf71f9d619
RPC_ENDPOINT=wss://testnet-passet-hub.polkadot.io/
SERVER_WALLET_ADDRESS=5YourServerAddress...
SERVER_WALLET_SEED="your twelve word seed phrase"
PORT=3001
EOF

# IMPORTANT: Add .env to .gitignore!
echo "server/.env" >> .gitignore
```

### Step 5: Install Additional Dependencies

```bash
npm install @polkadot/keyring dotenv
```

### Step 6: Load Environment Variables

Add to `server/index.js` at the top:

```javascript
import dotenv from 'dotenv';
dotenv.config({ path: './server/.env' });
```

### Step 7: Implement Transaction Signing

Follow the code in section "Transaction Signing Implementation" above.

### Step 8: Update Frontend

Add authentication socket event after game starts (see section 3 above).

### Step 9: Test Complete Flow

1. Connect wallet in frontend
2. Pay 1 DOT entry fee
3. Game loads
4. Socket authenticates with server
5. Player spawns
6. Get a kill
7. Check console for blockchain transaction
8. Verify DOT received in killer's wallet

## 📊 Current Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│                 │         │                  │         │                 │
│   Frontend      │◄────────│   Game Server    │◄────────│   Blockchain    │
│   (Browser)     │         │   (Node.js)      │         │   Contract      │
│                 │         │                  │         │                 │
└─────────────────┘         └──────────────────┘         └─────────────────┘
        │                           │                             │
        │ 1. Connect Wallet         │                             │
        │ 2. Pay 1 DOT             │                             │
        │───────────────────────────────────────────────────────►│
        │                           │                             │
        │                           │  3. Listen ContractFunded   │
        │                           │◄────────────────────────────│
        │                           │  (payment verified)         │
        │                           │                             │
        │ 4. Socket.io connect      │                             │
        │──────────────────────────►│                             │
        │                           │                             │
        │ 5. Send wallet address    │                             │
        │    (authenticate)         │                             │
        │──────────────────────────►│                             │
        │                           │  6. Check payment status    │
        │                           │────────────────────────────►│
        │                           │                             │
        │ 7. Auth success           │                             │
        │    (spawn player)         │                             │
        │◄──────────────────────────│                             │
        │                           │                             │
        │                           │  8. Player kills someone    │
        │                           │  9. Call record_kill()      │
        │                           │────────────────────────────►│
        │                           │                             │
        │                           │  10. Reward sent (0.9 DOT)  │
        │                           │◄────────────────────────────│
        │                           │     + KillRecorded event    │
        │                           │                             │
        │ 11. Notify player         │                             │
        │    of DOT reward          │                             │
        │◄──────────────────────────│                             │
```

## 🚨 Security Checklist

- [ ] Server wallet seed stored in environment variables (NOT in code)
- [ ] .env file added to .gitignore
- [ ] Server wallet has minimal DOT (only for gas fees)
- [ ] Entry fee verification working before allowing spawn
- [ ] Kill recording checks both players paid
- [ ] Error handling for insufficient contract balance
- [ ] Rate limiting on authentication attempts
- [ ] Contract owner is separate from server wallet

## 🧪 Testing Offline Mode

The server starts even if blockchain connection fails:

```bash
# Server will show:
║  Blockchain: ❌ OFFLINE
║  Status: ⚠️  OFFLINE MODE

# Players can still play
# But NO DOT rewards will be given
# Good for development/testing
```

## 📝 Next Steps Summary

To make the server **authoritative** for payments:

1. ✅ Create server wallet
2. ✅ Fund it with testnet DOT
3. ✅ Owner authorizes server (`setGameServer`)
4. ✅ Add server wallet to environment variables
5. ✅ Install `@polkadot/keyring` and `dotenv`
6. ✅ Implement transaction signing in `recordKillOnChain()`
7. ✅ Add socket authentication in frontend
8. ✅ Test complete flow

**Estimated time:** 2-3 hours for someone familiar with Polkadot
**Difficulty:** Medium (requires understanding of keypairs and signing)

## 📚 Resources

- **Dedot Docs:** https://docs.dedot.dev/
- **Polkadot Keyring:** https://polkadot.js.org/docs/keyring
- **Contract Guide:** See `DOT_ARENA_INTEGRATION_GUIDE.md`
- **Pop CLI:** https://learn.onpop.io/

---

🎮 Once complete, every kill in DOT Arena will award real DOT on-chain!
