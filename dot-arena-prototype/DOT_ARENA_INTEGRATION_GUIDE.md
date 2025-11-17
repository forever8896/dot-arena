# DOT Arena Contract Integration Guide

## 🎯 Contract Overview

**Contract Address:** `0xdafd89d6d92d6918c81c613f85c23fdf71f9d619`
**Network:** Testnet Asset Hub (wss://testnet-passet-hub.polkadot.io/)

### Key Contract Functions

1. **`fund_contract()`** - Players pay 1 DOT to enter the game (payable)
2. **`record_kill(killer, victim)`** - Server records kills and pays rewards instantly (0.9 DOT)
3. **`get_player_stats(address)`** - Query player's total kills and total earnings
4. **`get_contract_balance()`** - Check contract's available balance

### Important Events

1. **`ContractFunded`** - Emitted when someone funds the contract (entry fee paid)
   - `funder: Address` - Who paid the fee
   - `amount: U256` - Amount paid (should be 1 DOT = 10_000_000_000)

2. **`KillRecorded`** - Emitted when a kill is recorded and reward is paid
   - `killer: Address` - Who got the kill
   - `victim: Address` - Who was killed
   - `reward_paid: U256` - Reward amount (0.9 DOT)
   - `timestamp: u64` - Block timestamp

---

## 🏗️ Architecture Overview

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│                 │         │                  │         │                 │
│   Frontend      │◄────────│   Game Server    │◄────────│   Blockchain    │
│   (Browser)     │         │   (Node.js)      │         │   Contract      │
│                 │         │                  │         │                 │
└─────────────────┘         └──────────────────┘         └─────────────────┘
        │                           │                             │
        │ 1. Connect Wallet         │                             │
        │ 2. Pay 1 DOT Entry        │                             │
        │────────────────────────────────────────────────────────►│
        │                           │                             │
        │                           │  3. Listen ContractFunded   │
        │                           │◄────────────────────────────│
        │                           │                             │
        │ 4. Notify server of       │                             │
        │    payment (socket)       │                             │
        │──────────────────────────►│                             │
        │                           │                             │
        │                           │  5. Player kills someone    │
        │                           │  6. Call record_kill()      │
        │                           │────────────────────────────►│
        │                           │                             │
        │                           │  7. Reward sent instantly   │
        │                           │◄────────────────────────────│
        │                           │     + KillRecorded event    │
        │                           │                             │
        │ 8. Query player stats     │                             │
        │    to show rewards        │                             │
        │────────────────────────────────────────────────────────►│
        │                           │                             │
```

---

## 📦 Step 1: Setup & Dependencies

### Install Required Packages

```bash
# For frontend (if using Dedot/Typink approach)
npm install dedot typink

# For server (Node.js backend)
npm install dedot socket.io
```

### Generate Contract Types (Typink)

```bash
# Generate TypeScript types from contract metadata
npx dedot typink -m ./contracts/dot_arena/target/ink/dot_arena.json -o ./src/contracts/types
```

This generates type-safe TypeScript interfaces for your contract at `src/contracts/types/dot_arena/`.

---

## 🎮 Step 2: Frontend Integration

### 2.1 Setup Wallet Connection

Create a main provider component that wraps your game:

```typescript
// src/providers/PolkadotProvider.tsx
import { DedotClient, WsProvider } from 'dedot';
import { TypinkProvider } from 'typink';
import { subwallet, talisman, polkadotjs } from 'typink/wallets';

const RPC_ENDPOINT = 'wss://testnet-passet-hub.polkadot.io/';

export function PolkadotProvider({ children }) {
  return (
    <TypinkProvider
      appName="DOT Arena"
      supportedNetworks={[{
        id: 'passet-hub-testnet',
        name: 'Passet Hub Testnet',
        rpcEndpoint: RPC_ENDPOINT,
        symbol: 'DOT',
        decimals: 10
      }]}
      defaultNetworkId="passet-hub-testnet"
      wallets={[subwallet, talisman, polkadotjs]}
      cacheMetadata={true}>
      {children}
    </TypinkProvider>
  );
}
```

### 2.2 Connect Wallet Button

```typescript
// src/components/WalletConnect.tsx
import { useTypink } from 'typink';

export function WalletConnect() {
  const {
    connectedAccount,
    accounts,
    wallets,
    connectWallet,
    disconnect
  } = useTypink();

  if (connectedAccount) {
    return (
      <div>
        <p>Connected: {connectedAccount.name}</p>
        <p>Address: {connectedAccount.address}</p>
        <button onClick={() => disconnect()}>Disconnect</button>
      </div>
    );
  }

  return (
    <div>
      {wallets.map((wallet) => (
        <button
          key={wallet.id}
          onClick={() => connectWallet(wallet.id)}
          disabled={!wallet.installed}>
          <img src={wallet.logo} alt={wallet.name} width={24} />
          {wallet.name}
        </button>
      ))}
    </div>
  );
}
```

### 2.3 Pay Entry Fee Component

```typescript
// src/components/PayEntryFee.tsx
import { useContract, useContractTx, txToaster } from 'typink';
import { DotArenaContractApi } from '@/contracts/types/dot_arena';
import { io } from 'socket.io-client';

const CONTRACT_ADDRESS = '0xdafd89d6d92d6918c81c613f85c23fdf71f9d619';
const ENTRY_FEE = 10_000_000_000n; // 1 DOT with 10 decimals

export function PayEntryFee() {
  const { contract } = useContract<DotArenaContractApi>(CONTRACT_ADDRESS);
  const fundTx = useContractTx(contract, 'fund_contract');
  const { connectedAccount } = useTypink();

  const socket = io('http://your-game-server:3001'); // Connect to your game server

  const handlePayEntry = async () => {
    if (!connectedAccount) return;

    const toaster = txToaster('Paying entry fee...');

    try {
      await fundTx.signAndSend({
        txOptions: { value: ENTRY_FEE }, // Send 1 DOT with the transaction
        callback: (result) => {
          toaster.onTxProgress(result);

          if (result.status.type === 'BestChainBlockIncluded' && !result.dispatchError) {
            // Transaction successful - notify game server
            socket.emit('entry-fee-paid', {
              address: connectedAccount.address,
              txHash: result.txHash
            });
          }
        },
      });
    } catch (error) {
      toaster.onTxError(error);
    }
  };

  return (
    <button
      onClick={handlePayEntry}
      disabled={fundTx.inBestBlockProgress}>
      {fundTx.inBestBlockProgress ? 'Processing...' : 'Pay 1 DOT to Enter'}
    </button>
  );
}
```

### 2.4 Display Player Stats (Rewards)

**IMPORTANT:** There's NO claim function in this contract! Rewards are paid instantly when `record_kill()` is called. The stats show lifetime earnings, not claimable rewards.

```typescript
// src/components/PlayerStats.tsx
import { useContract, useContractQuery } from 'typink';
import { DotArenaContractApi } from '@/contracts/types/dot_arena';
import { formatBalance } from 'dedot/utils';

const CONTRACT_ADDRESS = '0xdafd89d6d92d6918c81c613f85c23fdf71f9d619';

export function PlayerStats() {
  const { connectedAccount } = useTypink();
  const { contract } = useContract<DotArenaContractApi>(CONTRACT_ADDRESS);

  const { data: stats, isLoading, refresh } = useContractQuery({
    contract,
    fn: 'get_player_stats',
    args: connectedAccount?.address ? [connectedAccount.address] : undefined,
    watch: true // Auto-refresh on new blocks
  });

  if (isLoading) return <div>Loading stats...</div>;
  if (!stats) return <div>No stats available</div>;

  const [totalKills, totalEarned] = stats;

  return (
    <div className="player-stats">
      <h3>Your Stats</h3>
      <div>
        <p>Total Kills: {totalKills}</p>
        <p>Total Earned: {formatBalance(totalEarned, { decimals: 10, symbol: 'DOT' })}</p>
        <p className="note">💡 Rewards are paid instantly on each kill!</p>
      </div>
      <button onClick={refresh}>Refresh Stats</button>
    </div>
  );
}
```

### 2.5 Watch Contract Events (Optional)

```typescript
// src/hooks/useWatchContractEvents.ts
import { useWatchContractEvent, useContract } from 'typink';
import { DotArenaContractApi } from '@/contracts/types/dot_arena';
import { useCallback } from 'react';
import { toast } from 'sonner';

const CONTRACT_ADDRESS = '0xdafd89d6d92d6918c81c613f85c23fdf71f9d619';

export function useWatchKillEvents() {
  const { contract } = useContract<DotArenaContractApi>(CONTRACT_ADDRESS);
  const { connectedAccount } = useTypink();

  useWatchContractEvent(
    contract,
    'KillRecorded',
    useCallback((events) => {
      events.forEach((event) => {
        const { killer, victim, reward_paid } = event.data;

        if (killer.address() === connectedAccount?.address) {
          toast.success(
            `You earned ${formatBalance(reward_paid, { decimals: 10, symbol: 'DOT' })} for a kill!`
          );
        }
      });
    }, [connectedAccount])
  );
}
```

---

## 🖥️ Step 3: Server Integration (Node.js)

### 3.1 Setup Dedot Client on Server

```typescript
// server/blockchain/client.ts
import { DedotClient, WsProvider } from 'dedot';
import { Contract } from 'dedot/contracts';
import dotArenaMetadata from './dot_arena.json';

const CONTRACT_ADDRESS = '0xdafd89d6d92d6918c81c613f85c23fdf71f9d619';
const RPC_ENDPOINT = 'wss://testnet-passet-hub.polkadot.io/';

let client: DedotClient;
let contract: Contract;

export async function initBlockchain() {
  const provider = new WsProvider(RPC_ENDPOINT);
  client = await DedotClient.new(provider);

  contract = new Contract(client, dotArenaMetadata, CONTRACT_ADDRESS, {
    defaultCaller: process.env.SERVER_WALLET_ADDRESS // Your server's wallet
  });

  console.log('Blockchain client initialized');

  // Start listening to events
  startEventListeners();

  return { client, contract };
}

export function getClient() {
  if (!client) throw new Error('Client not initialized');
  return client;
}

export function getContract() {
  if (!contract) throw new Error('Contract not initialized');
  return contract;
}
```

### 3.2 Listen for Entry Fee Payments

```typescript
// server/blockchain/eventListeners.ts
import { getClient, getContract } from './client';
import { io } from '../socket'; // Your socket.io instance

interface PlayerPayment {
  address: string;
  amount: bigint;
  timestamp: number;
  blockNumber: number;
}

const paidPlayers = new Set<string>(); // Track who has paid

export async function startEventListeners() {
  const client = getClient();
  const contract = getContract();

  // Listen to all system events and filter for our contract
  await client.query.system.events(async (events) => {
    // Decode contract events
    const contractEvents = contract.decodeEvents(events);

    for (const event of contractEvents) {
      if (contract.events.ContractFunded.is(event)) {
        const { funder, amount } = event.data;
        const address = funder.address();

        // Verify they paid the correct amount (1 DOT)
        if (amount === 10_000_000_000n) {
          console.log(`✅ Entry fee paid by ${address}`);

          paidPlayers.add(address);

          // Notify all connected clients
          io.emit('player-joined', {
            address,
            timestamp: Date.now()
          });

          // Store in database
          await savePlayerPayment({
            address,
            amount,
            timestamp: Date.now(),
            blockNumber: await client.query.system.number()
          });
        }
      }

      if (contract.events.KillRecorded.is(event)) {
        const { killer, victim, reward_paid, timestamp } = event.data;

        console.log(`💀 Kill recorded: ${killer.address()} killed ${victim.address()}`);

        // Notify all clients about the kill and reward
        io.emit('kill-recorded', {
          killer: killer.address(),
          victim: victim.address(),
          reward: reward_paid.toString(),
          timestamp
        });
      }
    }
  });
}

export function hasPlayerPaid(address: string): boolean {
  return paidPlayers.has(address);
}
```

### 3.3 Record Kills from Game Server

```typescript
// server/game/killHandler.ts
import { getContract } from '../blockchain/client';
import { hasPlayerPaid } from '../blockchain/eventListeners';

// Server wallet needs to be set as game_server in the contract first
const SERVER_KEYPAIR = ... // Load from secure storage

export async function recordKill(killerAddress: string, victimAddress: string) {
  // Verify both players have paid entry fees
  if (!hasPlayerPaid(killerAddress)) {
    throw new Error('Killer has not paid entry fee');
  }
  if (!hasPlayerPaid(victimAddress)) {
    throw new Error('Victim has not paid entry fee');
  }

  const contract = getContract();

  try {
    // Call record_kill - this will:
    // 1. Check contract has enough balance
    // 2. Pay 0.9 DOT to killer instantly
    // 3. Update killer's stats
    // 4. Emit KillRecorded event
    const result = await contract.tx
      .record_kill(killerAddress, victimAddress)
      .signAndSend(SERVER_KEYPAIR, ({ status, dispatchError }) => {
        if (status.type === 'BestChainBlockIncluded') {
          if (dispatchError) {
            console.error('Kill recording failed:', dispatchError);
          } else {
            console.log('✅ Kill recorded on-chain');
          }
        }
      })
      .untilBestChainBlockIncluded();

    return result;
  } catch (error) {
    console.error('Failed to record kill:', error);
    throw error;
  }
}
```

### 3.4 Socket.io Integration

```typescript
// server/socket/index.ts
import { Server } from 'socket.io';
import { hasPlayerPaid } from '../blockchain/eventListeners';
import { recordKill } from '../game/killHandler';

export function setupSocketHandlers(io: Server) {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Player notifies server they paid entry fee
    socket.on('entry-fee-paid', async ({ address, txHash }) => {
      console.log(`Player ${address} claims to have paid (tx: ${txHash})`);

      // We rely on the event listener to confirm payment
      // This is just a notification for faster UI updates

      // Wait a bit for event to be processed
      setTimeout(() => {
        if (hasPlayerPaid(address)) {
          socket.emit('entry-confirmed', { address });
        } else {
          socket.emit('entry-pending', { address });
        }
      }, 2000);
    });

    // Game notifies server of a kill
    socket.on('player-killed', async ({ killer, victim }) => {
      try {
        await recordKill(killer, victim);

        // Event listener will broadcast KillRecorded event to all clients
      } catch (error) {
        socket.emit('kill-recording-failed', {
          error: error.message
        });
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
}
```

---

## 🔐 Step 4: Security Considerations

### Important Notes

1. **Server Wallet Setup**
   - The server needs a wallet address that's set as `game_server` in the contract
   - Owner must call `set_game_server(server_address)` first
   - Keep server private key secure (use environment variables, secrets manager)

2. **Entry Fee Validation**
   - Always verify the payment amount is exactly 1 DOT
   - Check the `ContractFunded` event, don't trust client notifications alone
   - Players who don't pay should not be allowed to play

3. **Kill Recording**
   - Only the designated server wallet can call `record_kill()`
   - Validate kills happened in your game logic before calling the contract
   - Check contract balance before recording kills (contract needs funds for rewards)

4. **Event Monitoring**
   - Subscribe to events on the server, not just the client
   - Use event data as source of truth for payments and kills
   - Keep track of processed events to avoid duplicates

---

## 📊 Step 5: Contract Balance Management

### Check Contract Balance

```typescript
import { getContract } from './blockchain/client';

async function checkContractBalance() {
  const contract = getContract();
  const balance = await contract.query.get_contract_balance();

  console.log(`Contract balance: ${balance} (${balance / 10_000_000_000n} DOT)`);

  // Warn if balance is low
  const killsRemaining = balance / 10_000_000_000n; // Each kill costs 1 DOT total
  if (killsRemaining < 10) {
    console.warn(`⚠️ Contract is running low on funds! Only ${killsRemaining} kills remaining`);
  }
}
```

### Periodic Balance Checks

```typescript
// Run every 5 minutes
setInterval(checkContractBalance, 5 * 60 * 1000);
```

---

## 🎯 Complete Flow Example

### Player Journey

1. **Connect Wallet** → Player connects SubWallet/Talisman
2. **Pay Entry Fee** → Player clicks "Pay 1 DOT to Enter", transaction sent
3. **Wait for Confirmation** → Frontend watches for `ContractFunded` event
4. **Notify Server** → Frontend tells server "I paid" via socket
5. **Server Confirms** → Server's event listener verifies payment, adds to `paidPlayers`
6. **Start Playing** → Server allows player to join game
7. **Get Kill** → Player eliminates another player in-game
8. **Server Records Kill** → Server calls `record_kill(killer, victim)`
9. **Instant Reward** → Smart contract sends 0.9 DOT to killer immediately
10. **Stats Update** → Player queries `get_player_stats()` to see updated earnings
11. **View in Wallet** → Player sees DOT balance increase in their wallet

### Server Flow

1. **Initialize** → Connect to blockchain, load contract
2. **Listen to Events** → Monitor `ContractFunded` and `KillRecorded` events
3. **Track Payments** → Maintain list of addresses that paid entry fees
4. **Validate Kills** → Check both killer and victim paid before recording
5. **Call Contract** → Execute `record_kill()` when kill happens in-game
6. **Broadcast Updates** → Emit socket events for real-time UI updates

---

## 🔧 Environment Setup

### Frontend (.env.local)

```bash
NEXT_PUBLIC_CONTRACT_ADDRESS=0xdafd89d6d92d6918c81c613f85c23fdf71f9d619
NEXT_PUBLIC_RPC_ENDPOINT=wss://testnet-passet-hub.polkadot.io/
NEXT_PUBLIC_GAME_SERVER_URL=http://localhost:3001
```

### Server (.env)

```bash
RPC_ENDPOINT=wss://testnet-passet-hub.polkadot.io/
CONTRACT_ADDRESS=0xdafd89d6d92d6918c81c613f85c23fdf71f9d619
SERVER_WALLET_ADDRESS=5YourServerAddress...
SERVER_WALLET_PRIVATE_KEY=0x... # Keep this secret!
PORT=3001
```

---

## 📚 Additional Resources

- **Dedot Docs:** https://docs.dedot.dev/
- **Typink Docs:** https://docs.dedot.dev/typink
- **Pop CLI:** https://learn.onpop.io/
- **ink! Docs:** https://use.ink/

---

## ⚠️ Important Reminders

1. **NO CLAIM FUNCTION** - Rewards are paid instantly, players don't need to "claim"
2. **Entry Fee is Required** - Verify payment via `ContractFunded` event
3. **Server Must Be Authorized** - Owner must call `set_game_server()` first
4. **Keep Server Key Secure** - Use proper secret management
5. **Monitor Contract Balance** - Refill when low to avoid failed payouts
6. **Event-Driven Architecture** - Use events as source of truth, not client notifications

---

## 🚀 Next Steps

1. Set up your server wallet and get it authorized as `game_server`
2. Implement the frontend wallet connection and entry fee payment
3. Set up the server event listeners
4. Integrate kill recording into your game loop
5. Test the complete flow on testnet
6. Monitor contract balance and set up alerts
7. Deploy to production when ready!

Good luck building DOT Arena! 🎮⚔️
