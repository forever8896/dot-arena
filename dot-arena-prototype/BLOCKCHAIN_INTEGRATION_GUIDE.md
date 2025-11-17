# Blockchain Integration Guide - Polkadot Smart Contract Connection

## Overview

This guide shows how to integrate your DOT Arena game with the ink! smart contract running on a Polkadot parachain, enabling real money gameplay with entry fees and kill rewards.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    COMPLETE GAME FLOW                        │
└─────────────────────────────────────────────────────────────┘

1. LOBBY PHASE
   ┌──────────┐                  ┌──────────┐
   │  Client  │                  │  Server  │
   │  (Web)   │                  │ (Node.js)│
   └────┬─────┘                  └────┬─────┘
        │                              │
        │  Connect Socket.IO           │
        ├─────────────────────────────>│
        │                              │
        │  <init> {matchId: 123}       │
        │<─────────────────────────────┤
        │                              │
        │                              ▼
        │                     ┌─────────────────┐
        │                     │ Query Contract  │
        │                     │ get_match_data  │
        │                     └────────┬────────┘
        │                              ▼
        │                     ┌──────────────────┐
        │                     │ Smart Contract   │
        │                     │ (ink! on Polkadot)│
        │                     └────────┬─────────┘
        │                              │
        │   "Connect Polkadot Wallet"  │
        │<─────────────────────────────┤
        │                              │
        ▼                              │
   ┌────────────────┐                 │
   │ Polkadot.js    │                 │
   │ Extension      │                 │
   │ (User Wallet)  │                 │
   └───────┬────────┘                 │
           │                          │
           │ Sign & Send TX           │
           │ enter_arena(123)         │
           │ value: 1 DOT             │
           ├─────────────────────────>│
           │                          ▼
           │                 ┌─────────────────┐
           │                 │ Contract Event  │
           │                 │ PlayerEntered   │
           │                 │ {player, match} │
           │                 └────────┬────────┘
           │                          │
           │  "Payment confirmed"     │
           │<─────────────────────────┤
           │                          │
           │  Start game              │
           │<─────────────────────────┤

2. GAMEPLAY PHASE
   Game Server tracks kills in memory (real-time)
   Periodically or on thresholds, record to blockchain

   Player 1 kills Player 2
   ┌──────────┐         ┌──────────┐         ┌──────────────┐
   │  Client  │────────>│  Server  │────────>│   Contract   │
   └──────────┘  Kill   └──────────┘  record │              │
                         (immediate)  _kill() │  +0.5 DOT    │
                                               │  reward      │
                                               └──────────────┘

3. MATCH END PHASE
   Server → Contract: end_match(123)
   Client → Contract: claim_rewards(123)
   Contract → Client: Transfer accumulated DOT

```

---

## Phase 1: Server-Side Contract Integration

### 1.1 Install Dependencies

```bash
# In server/ directory
npm install --save \
  @polkadot/api \
  @polkadot/api-contract \
  @polkadot/keyring \
  @polkadot/util \
  @polkadot/util-crypto
```

### 1.2 Create Contract Manager

```javascript
// server/blockchain/ContractManager.js
import { ApiPromise, WsProvider } from '@polkadot/api';
import { ContractPromise } from '@polkadot/api-contract';
import { Keyring } from '@polkadot/keyring';
import fs from 'fs';

// Load contract metadata
const contractMetadata = JSON.parse(
  fs.readFileSync('./contracts/dot_arena/target/ink/dot_arena.json', 'utf8')
);

export default class ContractManager {
  constructor(config) {
    // Configuration
    this.wsUrl = config.wsUrl || 'ws://127.0.0.1:9944'; // Local node
    this.contractAddress = config.contractAddress;
    this.serverSeed = config.serverSeed; // Mnemonic for server account

    // State
    this.api = null;
    this.contract = null;
    this.serverAccount = null;
    this.isInitialized = false;

    // Event callbacks
    this.eventCallbacks = new Map();

    // Kill queue for batching
    this.killQueue = [];
    this.batchInterval = 30000; // 30 seconds
  }

  async initialize() {
    console.log('📡 Connecting to Polkadot node...');

    // Create API instance
    const provider = new WsProvider(this.wsUrl);
    this.api = await ApiPromise.create({ provider });

    console.log('✅ Connected to chain:', (await this.api.rpc.system.chain()).toString());

    // Create keyring and load server account
    const keyring = new Keyring({ type: 'sr25519' });
    this.serverAccount = keyring.addFromUri(this.serverSeed);

    console.log('🔑 Server account:', this.serverAccount.address);

    // Load contract
    this.contract = new ContractPromise(
      this.api,
      contractMetadata,
      this.contractAddress
    );

    console.log('📜 Contract loaded:', this.contractAddress);

    // Subscribe to contract events
    await this.subscribeToEvents();

    // Start kill batch processor
    this.startKillBatcher();

    this.isInitialized = true;
    console.log('✅ Blockchain integration ready');
  }

  // ========== CONTRACT QUERIES (Read-only, free) ==========

  async getCurrentMatchId() {
    const gasLimit = this.api.registry.createType('WeightV2', {
      refTime: 1000000000,
      proofSize: 131072
    });

    const { result, output } = await this.contract.query.getCurrentMatchId(
      this.serverAccount.address,
      { gasLimit }
    );

    if (result.isOk) {
      return output.toHuman();
    } else {
      throw new Error('Failed to get current match ID');
    }
  }

  async getMatchData(matchId) {
    const gasLimit = this.getGasLimit();

    const { result, output } = await this.contract.query.getMatchData(
      this.serverAccount.address,
      { gasLimit },
      matchId
    );

    if (result.isOk && output.isSome) {
      const [prizePool, playerCount, isActive] = output.unwrap().toHuman();
      return {
        prizePool: this.parseDOT(prizePool),
        playerCount: parseInt(playerCount),
        isActive
      };
    } else {
      throw new Error(`Match ${matchId} not found`);
    }
  }

  async getPlayerStats(matchId, playerAddress) {
    const gasLimit = this.getGasLimit();

    const { result, output } = await this.contract.query.getPlayerStats(
      this.serverAccount.address,
      { gasLimit },
      matchId,
      playerAddress
    );

    if (result.isOk && output.isSome) {
      const [kills, hasEntered, pendingRewards, hasClaimed] = output.unwrap().toHuman();
      return {
        kills: parseInt(kills),
        hasEntered,
        pendingRewards: this.parseDOT(pendingRewards),
        hasClaimed
      };
    } else {
      return null;
    }
  }

  async verifyPlayerPaid(matchId, playerAddress) {
    const stats = await this.getPlayerStats(matchId, playerAddress);
    return stats ? stats.hasEntered : false;
  }

  // ========== CONTRACT TRANSACTIONS (Write, costs gas) ==========

  async startMatch() {
    console.log('🎮 Starting new match on-chain...');

    const gasLimit = this.getGasLimit();

    return new Promise((resolve, reject) => {
      this.contract.tx
        .startMatch({ gasLimit })
        .signAndSend(this.serverAccount, ({ status, events }) => {
          if (status.isInBlock) {
            console.log('📦 Match start TX in block:', status.asInBlock.toHex());

            // Find MatchStarted event
            events.forEach(({ event }) => {
              if (this.api.events.contracts.ContractEmitted.is(event)) {
                const [account, data] = event.data;
                // Decode event data to get match ID
                // This is simplified - actual decoding depends on event format
                console.log('✅ Match started event:', data.toHuman());
              }
            });
          }

          if (status.isFinalized) {
            console.log('✅ Match start finalized');
            resolve(status.asFinalized.toHex());
          }
        })
        .catch(reject);
    });
  }

  async recordKill(matchId, killerAddress, victimAddress) {
    console.log(`📝 Recording kill: ${killerAddress} → ${victimAddress}`);

    const gasLimit = this.getGasLimit();

    try {
      await this.contract.tx
        .recordKill(
          { gasLimit },
          matchId,
          killerAddress,
          victimAddress
        )
        .signAndSend(this.serverAccount, ({ status }) => {
          if (status.isFinalized) {
            console.log('✅ Kill recorded on-chain');
          }
        });
    } catch (error) {
      console.error('❌ Failed to record kill:', error);
      // Add to retry queue
      this.killQueue.push({ matchId, killerAddress, victimAddress });
    }
  }

  async endMatch(matchId) {
    console.log(`🏁 Ending match ${matchId} on-chain...`);

    const gasLimit = this.getGasLimit();

    return new Promise((resolve, reject) => {
      this.contract.tx
        .endMatch({ gasLimit }, matchId)
        .signAndSend(this.serverAccount, ({ status }) => {
          if (status.isFinalized) {
            console.log('✅ Match ended on-chain');
            resolve();
          }
        })
        .catch(reject);
    });
  }

  // ========== EVENT LISTENERS ==========

  async subscribeToEvents() {
    console.log('👂 Subscribing to contract events...');

    // Subscribe to all contract events
    this.api.query.system.events((events) => {
      events.forEach((record) => {
        const { event } = record;

        if (this.api.events.contracts.ContractEmitted.is(event)) {
          const [account, data] = event.data;

          // Check if event is from our contract
          if (account.toString() === this.contractAddress) {
            this.handleContractEvent(data);
          }
        }
      });
    });
  }

  handleContractEvent(eventData) {
    // Decode event based on contract metadata
    // This is simplified - actual implementation needs proper ABI decoding

    const decoded = this.decodeEvent(eventData);

    switch (decoded.name) {
      case 'PlayerEntered':
        console.log('💰 PlayerEntered:', decoded.args);
        this.emit('playerPaid', {
          player: decoded.args.player,
          matchId: decoded.args.match_id,
          entryFee: this.parseDOT(decoded.args.entry_fee)
        });
        break;

      case 'KillRecorded':
        console.log('🎯 KillRecorded:', decoded.args);
        this.emit('killConfirmed', {
          killer: decoded.args.killer,
          victim: decoded.args.victim,
          matchId: decoded.args.match_id,
          reward: this.parseDOT(decoded.args.reward)
        });
        break;

      case 'MatchStarted':
        console.log('🎮 MatchStarted:', decoded.args);
        this.emit('matchStarted', {
          matchId: decoded.args.match_id
        });
        break;

      case 'MatchEnded':
        console.log('🏁 MatchEnded:', decoded.args);
        this.emit('matchEnded', {
          matchId: decoded.args.match_id,
          prizePool: this.parseDOT(decoded.args.total_prize_pool)
        });
        break;
    }
  }

  // ========== KILL BATCHING ==========

  queueKill(matchId, killerAddress, victimAddress) {
    this.killQueue.push({ matchId, killerAddress, victimAddress });
  }

  startKillBatcher() {
    setInterval(async () => {
      if (this.killQueue.length === 0) return;

      console.log(`📤 Batching ${this.killQueue.length} kills to blockchain...`);

      // Process all queued kills
      const kills = [...this.killQueue];
      this.killQueue = [];

      for (const kill of kills) {
        try {
          await this.recordKill(kill.matchId, kill.killerAddress, kill.victimAddress);
        } catch (error) {
          console.error('Failed to record kill:', error);
          // Re-queue for next batch
          this.killQueue.push(kill);
        }
      }
    }, this.batchInterval);
  }

  // ========== UTILITIES ==========

  getGasLimit() {
    return this.api.registry.createType('WeightV2', {
      refTime: 3000000000, // 3B ref time
      proofSize: 131072    // 128KB proof size
    });
  }

  parseDOT(value) {
    // Convert from smallest unit (10^10) to DOT
    if (typeof value === 'string') {
      value = value.replace(/,/g, ''); // Remove commas
      return parseFloat(value) / 1e10;
    }
    return value / 1e10;
  }

  formatDOT(amount) {
    // Convert DOT to smallest unit
    return BigInt(Math.floor(amount * 1e10));
  }

  decodeEvent(eventData) {
    // Simplified event decoding
    // In production, use proper ABI decoder from contract metadata
    const hex = eventData.toHex();

    // This is a placeholder - implement proper decoding
    return {
      name: 'PlayerEntered',
      args: {}
    };
  }

  on(event, callback) {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, []);
    }
    this.eventCallbacks.get(event).push(callback);
  }

  emit(event, data) {
    if (!this.eventCallbacks.has(event)) return;
    this.eventCallbacks.get(event).forEach(callback => callback(data));
  }

  async disconnect() {
    if (this.api) {
      await this.api.disconnect();
    }
  }
}
```

### 1.3 Integrate with Game Server

```javascript
// server/index.js - ADD CONTRACT INTEGRATION
import ContractManager from './blockchain/ContractManager.js';

// Initialize contract manager
const contractManager = new ContractManager({
  wsUrl: process.env.POLKADOT_WS_URL || 'ws://127.0.0.1:9944',
  contractAddress: process.env.CONTRACT_ADDRESS,
  serverSeed: process.env.SERVER_SEED // Use env variable for security!
});

// Initialize on startup
(async () => {
  try {
    await contractManager.initialize();

    // Start a new match
    await contractManager.startMatch();
    const matchId = await contractManager.getCurrentMatchId();
    currentMatchId = matchId;

    console.log(`🎮 Match ${matchId} is live!`);
  } catch (error) {
    console.error('Failed to initialize blockchain:', error);
    process.exit(1);
  }
})();

// Listen for payment confirmations
contractManager.on('playerPaid', async (data) => {
  console.log(`💰 Player ${data.player} paid entry fee for match ${data.matchId}`);

  // Find their socket connection by wallet address
  const player = findPlayerByAddress(data.player);
  if (player) {
    io.to(player.socketId).emit('paymentConfirmed', {
      matchId: data.matchId,
      entryFee: data.entryFee
    });
  }
});

// Modified player connection - require payment
io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Don't spawn player immediately - wait for payment
  socket.emit('requirePayment', {
    matchId: currentMatchId,
    entryFee: 1.0, // DOT
    contractAddress: contractManager.contractAddress
  });

  socket.on('walletConnected', async (walletAddress) => {
    console.log(`Wallet connected: ${walletAddress}`);

    // Verify payment
    const hasPaid = await contractManager.verifyPlayerPaid(currentMatchId, walletAddress);

    if (hasPaid) {
      // Spawn player in game
      const newPlayer = spawnPlayer(socket.id, walletAddress);
      players.set(socket.id, newPlayer);

      socket.emit('init', {
        playerId: socket.id,
        players: Array.from(players.values()),
        weaponPickups: weaponPickups,
        matchId: currentMatchId
      });

      socket.broadcast.emit('playerJoined', newPlayer);
    } else {
      socket.emit('paymentRequired', {
        message: 'Please pay entry fee to join the game'
      });
    }
  });
});

// Modified kill handler - record to blockchain
function handlePlayerDeath(victimId, killerId) {
  const victim = players.get(victimId);
  const killer = players.get(killerId);

  if (killer) {
    killer.kills += 1;

    // Queue kill for blockchain recording
    contractManager.queueKill(
      currentMatchId,
      killer.walletAddress,
      victim.walletAddress
    );

    console.log(`💀 ${killer.walletAddress} killed ${victim.walletAddress} (queued for blockchain)`);
  }

  // Broadcast kill event
  io.emit('playerKilled', {
    victimId,
    killerId,
    killerKills: killer ? killer.kills : 0
  });

  // Don't respawn in battle royale mode
  // Instead, send to spectator mode
}
```

---

## Phase 2: Client-Side Wallet Integration

### 2.1 Install Dependencies

```bash
npm install --save \
  @polkadot/extension-dapp \
  @polkadot/api \
  @polkadot/api-contract
```

### 2.2 Create Wallet Manager

```javascript
// src/blockchain/WalletManager.js
import { web3Accounts, web3Enable, web3FromAddress } from '@polkadot/extension-dapp';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { ContractPromise } from '@polkadot/api-contract';

export default class WalletManager {
  constructor(config) {
    this.wsUrl = config.wsUrl;
    this.contractAddress = config.contractAddress;
    this.contractMetadata = config.contractMetadata;

    this.api = null;
    this.contract = null;
    this.selectedAccount = null;
    this.isConnected = false;
  }

  async initialize() {
    // Connect to Polkadot node
    const provider = new WsProvider(this.wsUrl);
    this.api = await ApiPromise.create({ provider });

    // Load contract
    this.contract = new ContractPromise(
      this.api,
      this.contractMetadata,
      this.contractAddress
    );

    console.log('✅ Wallet manager initialized');
  }

  async connectWallet() {
    // Request access to Polkadot extension
    const extensions = await web3Enable('DOT Arena');

    if (extensions.length === 0) {
      throw new Error('No Polkadot extension installed. Please install Polkadot.js extension.');
    }

    // Get all accounts
    const accounts = await web3Accounts();

    if (accounts.length === 0) {
      throw new Error('No accounts found. Please create an account in Polkadot.js extension.');
    }

    // For now, select first account
    // In production, show account selector UI
    this.selectedAccount = accounts[0];
    this.isConnected = true;

    console.log('✅ Wallet connected:', this.selectedAccount.address);

    return this.selectedAccount;
  }

  async payEntryFee(matchId) {
    if (!this.selectedAccount) {
      throw new Error('Wallet not connected');
    }

    console.log(`💰 Paying entry fee for match ${matchId}...`);

    const entryFee = await this.getEntryFee();
    const gasLimit = this.getGasLimit();

    // Get injector for signing
    const injector = await web3FromAddress(this.selectedAccount.address);

    return new Promise((resolve, reject) => {
      this.contract.tx
        .enterArena(
          {
            value: entryFee,
            gasLimit
          },
          matchId
        )
        .signAndSend(
          this.selectedAccount.address,
          { signer: injector.signer },
          ({ status, events }) => {
            if (status.isInBlock) {
              console.log('📦 Payment TX in block');
            }

            if (status.isFinalized) {
              console.log('✅ Payment confirmed!');

              // Check for errors
              const failed = events.find(({ event }) =>
                this.api.events.system.ExtrinsicFailed.is(event)
              );

              if (failed) {
                reject(new Error('Transaction failed'));
              } else {
                resolve({
                  blockHash: status.asFinalized.toHex(),
                  matchId,
                  entryFee: this.parseDOT(entryFee)
                });
              }
            }
          }
        )
        .catch(reject);
    });
  }

  async claimRewards(matchId) {
    if (!this.selectedAccount) {
      throw new Error('Wallet not connected');
    }

    console.log(`💎 Claiming rewards for match ${matchId}...`);

    const gasLimit = this.getGasLimit();
    const injector = await web3FromAddress(this.selectedAccount.address);

    return new Promise((resolve, reject) => {
      this.contract.tx
        .claimRewards({ gasLimit }, matchId)
        .signAndSend(
          this.selectedAccount.address,
          { signer: injector.signer },
          ({ status, events }) => {
            if (status.isFinalized) {
              console.log('✅ Rewards claimed!');

              // Find RewardsClaimed event
              const rewardEvent = events.find(({ event }) =>
                event.method === 'RewardsClaimed'
              );

              if (rewardEvent) {
                const [player, matchId, amount] = rewardEvent.event.data;
                resolve({
                  amount: this.parseDOT(amount),
                  matchId: matchId.toNumber()
                });
              } else {
                resolve({ amount: 0, matchId });
              }
            }
          }
        )
        .catch(reject);
    });
  }

  async getEntryFee() {
    const gasLimit = this.getGasLimit();

    const { result, output } = await this.contract.query.getEntryFee(
      this.selectedAccount.address,
      { gasLimit }
    );

    if (result.isOk) {
      return output.toHuman();
    } else {
      throw new Error('Failed to get entry fee');
    }
  }

  async getPlayerStats(matchId) {
    if (!this.selectedAccount) return null;

    const gasLimit = this.getGasLimit();

    const { result, output } = await this.contract.query.getPlayerStats(
      this.selectedAccount.address,
      { gasLimit },
      matchId,
      this.selectedAccount.address
    );

    if (result.isOk && output.isSome) {
      const [kills, hasEntered, pendingRewards, hasClaimed] = output.unwrap();
      return {
        kills: kills.toNumber(),
        hasEntered: hasEntered.toHuman(),
        pendingRewards: this.parseDOT(pendingRewards),
        hasClaimed: hasClaimed.toHuman()
      };
    }

    return null;
  }

  getGasLimit() {
    return this.api.registry.createType('WeightV2', {
      refTime: 3000000000,
      proofSize: 131072
    });
  }

  parseDOT(value) {
    if (typeof value === 'string') {
      value = value.replace(/,/g, '');
      return parseFloat(value) / 1e10;
    }
    return value / 1e10;
  }

  disconnect() {
    this.selectedAccount = null;
    this.isConnected = false;
  }
}
```

### 2.3 Create Payment Scene

```javascript
// src/scenes/PaymentScene.js
import Phaser from 'phaser';
import WalletManager from '../blockchain/WalletManager.js';

export default class PaymentScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PaymentScene' });
  }

  init(data) {
    this.matchId = data.matchId;
    this.contractAddress = data.contractAddress;
    this.entryFee = data.entryFee;
    this.networkManager = data.networkManager;
  }

  async create() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    // Title
    this.add.text(centerX, 100, 'DOT ARENA', {
      fontSize: '64px',
      color: '#E6007A',
      fontWeight: 'bold'
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(centerX, 180, 'Battle Royale with Real Rewards', {
      fontSize: '24px',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Payment info box
    const infoBox = this.add.graphics();
    infoBox.fillStyle(0x2a2b2a, 0.9);
    infoBox.fillRoundedRect(centerX - 250, 250, 500, 200, 16);
    infoBox.lineStyle(3, 0xE6007A, 1);
    infoBox.strokeRoundedRect(centerX - 250, 250, 500, 200, 16);

    this.add.text(centerX, 290, `Match #${this.matchId}`, {
      fontSize: '20px',
      color: '#ffffff'
    }).setOrigin(0.5);

    this.add.text(centerX, 340, `Entry Fee: ${this.entryFee} DOT`, {
      fontSize: '32px',
      color: '#E6007A',
      fontWeight: 'bold'
    }).setOrigin(0.5);

    this.add.text(centerX, 390, 'Kill Reward: 0.5 DOT per elimination', {
      fontSize: '18px',
      color: '#00FF00'
    }).setOrigin(0.5);

    // Connect wallet button
    const buttonBg = this.add.graphics();
    buttonBg.fillStyle(0xE6007A, 1);
    buttonBg.fillRoundedRect(centerX - 150, 480, 300, 60, 12);
    buttonBg.setInteractive(
      new Phaser.Geom.Rectangle(centerX - 150, 480, 300, 60),
      Phaser.Geom.Rectangle.Contains
    );

    const buttonText = this.add.text(centerX, 510, 'Connect Polkadot Wallet', {
      fontSize: '20px',
      color: '#ffffff',
      fontWeight: 'bold'
    }).setOrigin(0.5);

    buttonBg.on('pointerdown', () => {
      this.connectAndPay();
    });

    buttonBg.on('pointerover', () => {
      buttonBg.clear();
      buttonBg.fillStyle(0xff1b8d, 1);
      buttonBg.fillRoundedRect(centerX - 150, 480, 300, 60, 12);
    });

    buttonBg.on('pointerout', () => {
      buttonBg.clear();
      buttonBg.fillStyle(0xE6007A, 1);
      buttonBg.fillRoundedRect(centerX - 150, 480, 300, 60, 12);
    });

    // Status text
    this.statusText = this.add.text(centerX, 580, '', {
      fontSize: '16px',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Error text
    this.errorText = this.add.text(centerX, 620, '', {
      fontSize: '14px',
      color: '#ff0000'
    }).setOrigin(0.5);
  }

  async connectAndPay() {
    try {
      this.statusText.setText('🔗 Connecting to wallet...');
      this.errorText.setText('');

      // Initialize wallet manager
      const walletManager = new WalletManager({
        wsUrl: 'ws://127.0.0.1:9944',
        contractAddress: this.contractAddress,
        contractMetadata: this.contractMetadata // Load from file
      });

      await walletManager.initialize();

      // Connect wallet
      const account = await walletManager.connectWallet();
      this.statusText.setText(`✅ Connected: ${account.meta.name}`);

      await this.time.delayedCall(1000);

      this.statusText.setText('💰 Sending payment transaction...');

      // Pay entry fee
      const result = await walletManager.payEntryFee(this.matchId);

      this.statusText.setText('✅ Payment confirmed!');

      // Notify server
      this.networkManager.socket.emit('walletConnected', account.address);

      // Wait for server confirmation
      this.networkManager.on('paymentConfirmed', () => {
        this.statusText.setText('🎮 Entering arena...');
        this.time.delayedCall(1000, () => {
          this.scene.start('GameScene', {
            networkManager: this.networkManager,
            walletManager: walletManager
          });
        });
      });

    } catch (error) {
      console.error('Payment failed:', error);
      this.errorText.setText(`❌ ${error.message}`);
      this.statusText.setText('');
    }
  }
}
```

---

## Phase 3: Environment Configuration

### 3.1 Server Environment Variables

```bash
# server/.env
POLKADOT_WS_URL=ws://127.0.0.1:9944
CONTRACT_ADDRESS=5FHneW46...  # Your deployed contract address
SERVER_SEED="bottom drive obey lake curtain smoke basket hold race lonely fit walk//Alice"
PORT=3001
```

### 3.2 Client Configuration

```javascript
// src/config/blockchain.js
export const BLOCKCHAIN_CONFIG = {
  wsUrl: import.meta.env.VITE_POLKADOT_WS_URL || 'ws://127.0.0.1:9944',
  contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS,
  // Contract metadata will be loaded from JSON file
};
```

---

## Testing Guide

### Local Testing with Substrate Contracts Node

```bash
# 1. Start local Polkadot node with contracts support
substrate-contracts-node --dev --tmp

# 2. Deploy contract using Pop CLI
cd contracts/dot_arena
pop build
pop up contract --constructor new --suri //Alice

# 3. Copy contract address from output
# Example: 5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty

# 4. Set environment variables
export CONTRACT_ADDRESS=5FHneW...
export SERVER_SEED="//Bob"  # Use different account for server

# 5. Start game server
cd server
node index.js

# 6. Start client
npm run dev

# 7. Test flow:
#    - Open http://localhost:5173
#    - Connect Polkadot.js extension wallet
#    - Pay 1 DOT entry fee
#    - Join game and test kill recording
```

---

## Production Deployment Checklist

- [ ] Deploy contract to Rococo testnet (or mainnet parachain)
- [ ] Secure server account seed (use hardware wallet or key management service)
- [ ] Set up monitoring for contract events
- [ ] Implement retry logic for failed blockchain transactions
- [ ] Add transaction fee estimation to UI
- [ ] Test with real DOT on testnet
- [ ] Audit smart contract for security issues
- [ ] Set up error logging and alerting
- [ ] Document wallet connection process for users
- [ ] Create fallback for when blockchain is unreachable

---

## Common Issues

### Issue 1: "Insufficient balance" error
**Cause**: Player wallet doesn't have enough DOT
**Solution**: Provide faucet link for testnet, show balance before payment

### Issue 2: Transaction fails silently
**Cause**: Gas limit too low or contract error
**Solution**: Increase gas limit, check contract logs

### Issue 3: Events not received
**Cause**: Subscription disconnected or event decoding failed
**Solution**: Reconnect on disconnect, verify event ABI

### Issue 4: Payment confirmed but game doesn't start
**Cause**: Server-client communication issue
**Solution**: Implement polling fallback, verify payment status

---

This completes the blockchain integration guide. You now have:
1. Server-side contract management
2. Client-side wallet connection
3. Payment flow implementation
4. Event listening and synchronization
5. Testing procedures

Ready to deploy your tokenized battle royale!
