/**
 * Blockchain Integration Module
 * Handles all smart contract interactions for DOT Arena
 */

import { DedotClient, WsProvider } from 'dedot';
import { Contract } from 'dedot/contracts';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const CONFIG = {
  contractAddress: process.env.CONTRACT_ADDRESS || '0xdafd89d6d92d6918c81c613f85c23fdf71f9d619',
  rpcEndpoint: process.env.RPC_ENDPOINT || 'wss://testnet-passet-hub.polkadot.io/',
  serverWalletAddress: process.env.SERVER_WALLET_ADDRESS, // Must be set as game_server in contract
  // WARNING: In production, use secure key management (AWS Secrets Manager, HashiCorp Vault, etc.)
  serverWalletSeed: process.env.SERVER_WALLET_SEED, // NOT IMPLEMENTED YET - needs proper key management
};

// Global state
let client = null;
let contract = null;
let contractMetadata = null;

// Track paid players
const paidPlayers = new Map(); // walletAddress -> { playerId, timestamp, txHash, verified }

/**
 * Initialize blockchain client and contract
 */
export async function initBlockchain() {
  try {
    console.log('⛓️  Initializing blockchain connection...');
    console.log(`  RPC: ${CONFIG.rpcEndpoint}`);
    console.log(`  Contract: ${CONFIG.contractAddress}`);

    // Load contract metadata
    const metadataPath = join(__dirname, '../contracts/dot_arena/target/ink/dot_arena.json');
    contractMetadata = JSON.parse(readFileSync(metadataPath, 'utf8'));

    // Connect to blockchain
    const provider = new WsProvider(CONFIG.rpcEndpoint);
    client = await DedotClient.new(provider);

    // Initialize contract
    contract = new Contract(
      client,
      contractMetadata,
      CONFIG.contractAddress,
      {
        defaultCaller: CONFIG.serverWalletAddress || '0x0000000000000000000000000000000000000000'
      }
    );

    console.log('✅ Blockchain client initialized');

    // Start listening to contract events
    startEventListeners();

    // Check contract balance
    await checkContractBalance();

    return { client, contract };

  } catch (error) {
    console.error('❌ Failed to initialize blockchain:', error);
    throw error;
  }
}

/**
 * Listen to contract events
 */
function startEventListeners() {
  console.log('👂 Listening for contract events...');

  // Subscribe to all system events
  client.query.system.events(async (events) => {
    // Decode contract events
    const contractEvents = contract.decodeEvents(events);

    for (const event of contractEvents) {
      // ContractFunded event - someone paid entry fee
      if (contract.events.ContractFunded?.is(event)) {
        handleContractFunded(event.data);
      }

      // KillRecorded event - kill was recorded on-chain
      if (contract.events.KillRecorded?.is(event)) {
        handleKillRecorded(event.data);
      }
    }
  }).catch(error => {
    console.error('Error in event listener:', error);
  });
}

/**
 * Handle ContractFunded event
 */
function handleContractFunded(data) {
  const { funder, amount } = data;
  const address = typeof funder === 'object' && funder.address ? funder.address() : funder;

  console.log(`💰 Entry fee received from ${address}`);
  console.log(`   Amount: ${amount.toString()} (${formatDOT(amount)} DOT)`);

  // Verify correct amount (1 DOT = 10^10 units)
  const expectedFee = BigInt('10000000000');
  if (BigInt(amount.toString()) >= expectedFee) {
    // Mark player as paid
    paidPlayers.set(address, {
      timestamp: Date.now(),
      amount: amount.toString(),
      verified: true
    });

    console.log(`✅ Player ${address} verified for entry`);
  } else {
    console.warn(`⚠️  Player ${address} paid insufficient amount: ${formatDOT(amount)} DOT`);
  }
}

/**
 * Handle KillRecorded event
 */
function handleKillRecorded(data) {
  const { killer, victim, reward_paid, timestamp } = data;
  const killerAddr = typeof killer === 'object' && killer.address ? killer.address() : killer;
  const victimAddr = typeof victim === 'object' && victim.address ? victim.address() : victim;

  console.log(`💀 Kill recorded on-chain:`);
  console.log(`   Killer: ${killerAddr}`);
  console.log(`   Victim: ${victimAddr}`);
  console.log(`   Reward: ${formatDOT(reward_paid)} DOT`);
  console.log(`   Time: ${new Date(Number(timestamp) / 1000).toISOString()}`);
}

/**
 * Check if a player has paid entry fee
 */
export function hasPlayerPaid(walletAddress) {
  const payment = paidPlayers.get(walletAddress);
  return payment && payment.verified === true;
}

/**
 * Get all paid players
 */
export function getPaidPlayers() {
  return Array.from(paidPlayers.entries()).map(([address, data]) => ({
    address,
    ...data
  }));
}

/**
 * Record a kill on the blockchain
 * This is the CRITICAL function that awards DOT!
 */
export async function recordKillOnChain(killerWallet, victimWallet) {
  try {
    console.log(`🔗 Recording kill on blockchain...`);
    console.log(`   Killer: ${killerWallet}`);
    console.log(`   Victim: ${victimWallet}`);

    // Verify both players paid entry fees
    if (!hasPlayerPaid(killerWallet)) {
      throw new Error(`Killer ${killerWallet} has not paid entry fee`);
    }

    if (!hasPlayerPaid(victimWallet)) {
      throw new Error(`Victim ${victimWallet} has not paid entry fee`);
    }

    // Check server wallet is configured
    if (!CONFIG.serverWalletSeed || !CONFIG.serverWalletAddress) {
      console.error('❌ Server wallet not configured! Cannot record kill on-chain.');
      console.error('   Set SERVER_WALLET_ADDRESS and SERVER_WALLET_SEED in environment');
      console.error('   ⚠️  Kill will NOT be recorded on-chain - no DOT will be awarded!');
      return {
        success: false,
        error: 'Server wallet not configured',
        offline: true
      };
    }

    // TODO: Implement actual transaction signing
    // This requires:
    // 1. Loading server keypair from secure storage
    // 2. Creating the transaction
    // 3. Signing with server keypair
    // 4. Sending and waiting for confirmation

    console.log('⚠️  Blockchain recording NOT IMPLEMENTED YET');
    console.log('   Need to:');
    console.log('   1. Set up server wallet keypair');
    console.log('   2. Get owner to authorize server wallet (set_game_server)');
    console.log('   3. Implement transaction signing');

    return {
      success: false,
      error: 'Not implemented',
      offline: true
    };

    /*
    // FUTURE IMPLEMENTATION:

    // Import Keyring for signing
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
            reject(new Error('Transaction failed'));
          } else {
            resolve({ success: true, txHash: status.asFinalized.toString() });
          }
        }
      });
    });

    return result;
    */

  } catch (error) {
    console.error('❌ Failed to record kill on-chain:', error);
    return {
      success: false,
      error: error.message,
      offline: true
    };
  }
}

/**
 * Check contract balance
 */
async function checkContractBalance() {
  try {
    const balance = await contract.query.getContractBalance();
    console.log(`💵 Contract balance: ${formatDOT(balance)} DOT`);

    const killsRemaining = Number(balance) / 10_000_000_000;
    if (killsRemaining < 10) {
      console.warn(`⚠️  Low contract balance! Only ~${Math.floor(killsRemaining)} kills remaining`);
    }

    return balance;
  } catch (error) {
    console.error('Failed to check contract balance:', error);
    return 0;
  }
}

/**
 * Format balance to DOT
 */
function formatDOT(balance) {
  const value = typeof balance === 'bigint' ? balance : BigInt(balance.toString());
  return (Number(value) / 10_000_000_000).toFixed(4);
}

/**
 * Get blockchain client
 */
export function getClient() {
  if (!client) {
    throw new Error('Blockchain client not initialized. Call initBlockchain() first.');
  }
  return client;
}

/**
 * Get contract instance
 */
export function getContract() {
  if (!contract) {
    throw new Error('Contract not initialized. Call initBlockchain() first.');
  }
  return contract;
}

/**
 * Periodic balance check (every 5 minutes)
 */
setInterval(() => {
  if (contract) {
    checkContractBalance();
  }
}, 5 * 60 * 1000);
