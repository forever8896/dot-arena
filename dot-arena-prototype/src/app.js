import { DedotClient, WsProvider } from 'dedot';
import { Contract } from 'dedot/contracts';
import contractMetadata from '../contracts/dot_arena/target/ink/dot_arena.json';
import './styles/main.css';

// Configuration
const CONFIG = {
  contractAddress: '0xdafd89d6d92d6918c81c613f85c23fdf71f9d619',
  rpcEndpoint: 'wss://testnet-passet-hub.polkadot.io/',
  entryFee: 10_000_000_000n, // 1 DOT with 10 decimals
  networkName: 'Passet Hub Testnet',
};

// Global state
const state = {
  client: null,
  contract: null,
  connectedAccount: null,
  signer: null,
  gameStarted: false,
};

// Initialize application
async function init() {
  console.log('🎮 Initializing DOT Arena...');

  // Setup wallet connection buttons
  setupWalletButtons();

  // Check for injected wallets
  await checkInjectedWallets();
}

// Check for available Polkadot wallets
async function checkInjectedWallets() {
  // Wait for wallet extensions to inject
  await new Promise(resolve => setTimeout(resolve, 500));

  const wallets = {
    'subwallet-js': 'SubWallet',
    'talisman': 'Talisman',
    'polkadot-js': 'Polkadot.js'
  };

  const walletButtons = document.querySelectorAll('.wallet-btn');

  walletButtons.forEach((btn, index) => {
    const walletId = Object.keys(wallets)[index];
    const injectedWallet = window.injectedWeb3?.[walletId];

    if (!injectedWallet) {
      btn.classList.add('opacity-50', 'cursor-not-allowed');
      btn.disabled = true;
      const statusDiv = btn.querySelector('.text-white\\/50');
      if (statusDiv) {
        statusDiv.textContent = 'Not installed';
      }
    }
  });
}

// Setup wallet connection buttons
function setupWalletButtons() {
  const walletButtons = document.querySelectorAll('.wallet-btn');

  walletButtons.forEach((btn, index) => {
    btn.addEventListener('click', async () => {
      const walletNames = ['subwallet-js', 'talisman', 'polkadot-js'];
      const walletId = walletNames[index];
      await connectWallet(walletId);
    });
  });

  // Disconnect button
  const disconnectBtn = document.getElementById('disconnect-btn');
  if (disconnectBtn) {
    disconnectBtn.addEventListener('click', disconnectWallet);
  }

  // Pay entry fee button
  const payEntryBtn = document.getElementById('pay-entry-btn');
  if (payEntryBtn) {
    payEntryBtn.addEventListener('click', payEntryFee);
  }
}

// Connect to wallet
async function connectWallet(walletId) {
  try {
    console.log(`🔗 Connecting to ${walletId}...`);

    // Get the injected extension
    const injectedExtension = window.injectedWeb3?.[walletId];

    if (!injectedExtension) {
      alert(`Please install ${walletId} extension first!`);
      return;
    }

    // Enable the extension
    const extension = await injectedExtension.enable('DOT Arena');

    if (!extension) {
      throw new Error('Failed to enable extension');
    }

    // Get accounts
    const accounts = await extension.accounts.get();

    if (!accounts || accounts.length === 0) {
      alert('No accounts found. Please create an account in your wallet first.');
      return;
    }

    // Use the first account
    const account = accounts[0];
    state.connectedAccount = account;
    state.signer = extension.signer;

    console.log('✅ Wallet connected:', account.address);

    // Initialize blockchain client
    await initBlockchainClient();

    // Get account balance
    const balance = await getAccountBalance(account.address);

    // Update UI
    showWalletConnected(account, balance);

  } catch (error) {
    console.error('❌ Failed to connect wallet:', error);
    alert('Failed to connect wallet. Please try again.');
  }
}

// Disconnect wallet
function disconnectWallet() {
  state.connectedAccount = null;
  state.signer = null;

  // Reset UI
  document.getElementById('connect-wallets').classList.remove('hidden');
  document.getElementById('wallet-connected').classList.add('hidden');

  console.log('👋 Wallet disconnected');
}

// Initialize blockchain client
async function initBlockchainClient() {
  try {
    console.log('⛓️ Connecting to blockchain...');

    const provider = new WsProvider(CONFIG.rpcEndpoint);
    state.client = await DedotClient.new(provider);

    // Initialize contract
    state.contract = new Contract(
      state.client,
      contractMetadata,
      CONFIG.contractAddress,
      {
        defaultCaller: state.connectedAccount.address
      }
    );

    console.log('✅ Blockchain client initialized');

  } catch (error) {
    console.error('❌ Failed to initialize blockchain client:', error);
    throw error;
  }
}

// Get account balance
async function getAccountBalance(address) {
  try {
    if (!state.client) return 0n;

    const accountInfo = await state.client.query.system.account(address);
    return accountInfo.data.free;

  } catch (error) {
    console.error('Failed to get balance:', error);
    return 0n;
  }
}

// Format balance for display
function formatBalance(balance) {
  const dot = Number(balance) / 10_000_000_000;
  return dot.toFixed(4);
}

// Show wallet connected UI
function showWalletConnected(account, balance) {
  // Hide connect buttons
  document.getElementById('connect-wallets').classList.add('hidden');

  // Show connected state
  const connectedDiv = document.getElementById('wallet-connected');
  connectedDiv.classList.remove('hidden');

  // Update address
  const addressEl = document.getElementById('wallet-address');
  const shortAddress = `${account.address.slice(0, 6)}...${account.address.slice(-6)}`;
  addressEl.textContent = shortAddress;

  // Update balance
  const balanceEl = document.getElementById('wallet-balance');
  balanceEl.textContent = `${formatBalance(balance)} DOT`;
}

// Pay entry fee
async function payEntryFee() {
  try {
    console.log('💰 Paying entry fee...');
    console.log('Contract:', state.contract);
    console.log('Signer:', state.signer);
    console.log('Connected account:', state.connectedAccount);

    if (!state.contract || !state.signer) {
      throw new Error('Wallet not connected');
    }

    // Check if user has enough balance
    const balance = await getAccountBalance(state.connectedAccount.address);
    console.log('Current balance:', formatBalance(balance), 'DOT');

    if (balance < CONFIG.entryFee) {
      alert(`Insufficient balance. You need at least 1 DOT to play. You have ${formatBalance(balance)} DOT.`);
      return;
    }

    // Show processing state
    document.getElementById('wallet-connected').classList.add('hidden');
    document.getElementById('payment-processing').classList.remove('hidden');

    console.log('Creating transaction with value:', CONFIG.entryFee);

    // Call the fund_contract function with proper transaction options
    // The value must be passed in the options parameter
    const tx = state.contract.tx.fundContract({ value: CONFIG.entryFee });

    console.log('Transaction created:', tx);
    console.log('Signing and sending transaction...');

    // Sign and send transaction using the injected signer
    const unsub = await tx.signAndSend(
      state.connectedAccount.address,
      { signer: state.signer },
      (result) => {
        const { status, dispatchError, events } = result;
        console.log('📡 Transaction status:', status.type);

        if (status.type === 'Finalized' || status.type === 'BestChainBlockIncluded') {
          if (dispatchError) {
            console.error('❌ Transaction failed with error:', dispatchError);

            // Parse the error
            let errorMessage = 'Transaction failed';
            if (dispatchError.isModule) {
              const decoded = state.client.registry.findMetaError(dispatchError.asModule);
              errorMessage = `${decoded.section}.${decoded.name}: ${decoded.docs}`;
            }

            console.error('Error details:', errorMessage);
            alert(`Transaction failed: ${errorMessage}`);
            showPaymentError();
            unsub();
          } else {
            console.log('✅ Entry fee paid successfully!');
            console.log('Events:', events);
            showPaymentConfirmed();

            // Start the game after a short delay
            setTimeout(() => {
              startGame();
            }, 2000);

            unsub();
          }
        }
      }
    );

  } catch (error) {
    console.error('❌ Payment failed with exception:', error);
    console.error('Error stack:', error.stack);
    alert(`Payment error: ${error.message}`);
    showPaymentError();
  }
}

// Show payment error
function showPaymentError() {
  document.getElementById('payment-processing').classList.add('hidden');
  document.getElementById('wallet-connected').classList.remove('hidden');
  alert('Payment failed. Please try again.');
}

// Show payment confirmed
function showPaymentConfirmed() {
  document.getElementById('payment-processing').classList.add('hidden');
  document.getElementById('payment-confirmed').classList.remove('hidden');
}

// Start the game
async function startGame() {
  console.log('🎮 Starting game...');

  state.gameStarted = true;

  // Hide main menu
  document.getElementById('main-menu').classList.add('hidden');

  // Show game container
  const gameContainer = document.getElementById('game-container');
  gameContainer.classList.remove('hidden');

  // Dynamically import and initialize Phaser game
  const { default: Phaser } = await import('phaser');
  const { default: MenuScene } = await import('./scenes/MenuScene.js');
  const { default: GameScene } = await import('./scenes/GameScene.js');
  const { default: EliminationScene } = await import('./scenes/EliminationScene.js');

  const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 0 },
        debug: false,
        fps: 60,
        fixedStep: true
      }
    },
    scene: [MenuScene, GameScene, EliminationScene],
    backgroundColor: '#f5e4d7',
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: '100%',
      height: '100%'
    },
    render: {
      pixelArt: false,
      antialias: true,
      roundPixels: true,
      batchSize: 4096,
      maxTextures: 16,
      powerPreference: 'high-performance'
    },
    fps: {
      target: 60,
      forceSetTimeOut: false,
      smoothStep: true
    }
  };

  const game = new Phaser.Game(config);

  // Store wallet info in game registry for use in game scenes
  game.registry.set('walletAddress', state.connectedAccount.address);
  game.registry.set('contract', state.contract);

  window.game = game;

  console.log('✅ Game started!');
}

// Handle window resize
window.addEventListener('resize', () => {
  if (window.game && state.gameStarted) {
    window.game.scale.resize(window.innerWidth, window.innerHeight);
  }
});

// Initialize on load
window.addEventListener('load', init);
