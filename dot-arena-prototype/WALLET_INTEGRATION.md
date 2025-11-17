# DOT Arena - Wallet Integration Guide

## 🎉 What's New

The game now features a **beautiful Tailwind CSS main menu** with full wallet integration! Players must connect their Polkadot wallet and pay 1 DOT entry fee before entering the arena.

## 🚀 Features

### Main Menu
- ✨ Beautiful gradient background with Polkadot colors
- 🎨 Modern Tailwind CSS design
- 📱 Fully responsive layout
- 🔄 Smooth animations and transitions

### Wallet Integration
- 🔗 Support for SubWallet, Talisman, and Polkadot.js
- 💰 Real-time balance display
- ✅ Entry fee payment (1 DOT)
- ⚡ Instant blockchain transaction confirmation

### Game Flow
1. **Landing Page** - Beautiful main menu with game info
2. **Connect Wallet** - Choose from supported Polkadot wallets
3. **Pay Entry Fee** - One-click payment of 1 DOT
4. **Enter Arena** - Game loads only after successful payment

## 📦 New Dependencies

```json
{
  "dependencies": {
    "dedot": "^latest",
    "typink": "^latest"
  },
  "devDependencies": {
    "tailwindcss": "^latest",
    "postcss": "^latest",
    "autoprefixer": "^latest"
  }
}
```

## 🏗️ Project Structure

```
dot-arena-prototype/
├── src/
│   ├── app.js                    # Main application logic with wallet integration
│   ├── styles/
│   │   └── main.css              # Tailwind CSS styles
│   ├── contracts/
│   │   └── types/
│   │       └── dot-arena/        # Generated contract types
│   ├── scenes/                   # Phaser game scenes
│   └── ...
├── contracts/
│   └── dot_arena/
│       └── target/ink/
│           └── dot_arena.json    # Contract metadata
├── index.html                    # Main landing page with Tailwind
├── tailwind.config.js            # Tailwind configuration
└── postcss.config.js             # PostCSS configuration
```

## 🎮 How It Works

### 1. Main Menu (Landing Page)

The landing page (`index.html`) is a pure HTML page styled with Tailwind CSS:

- **No Phaser loaded** - Phaser only loads after payment
- **Wallet connection UI** - Beautiful cards for wallet selection
- **Entry fee display** - Clear pricing (1 DOT)
- **Payment flow** - Visual states for processing and confirmation

### 2. Wallet Connection (`src/app.js`)

```javascript
// Connect to wallet
async function connectWallet(walletId) {
  // Get injected extension (SubWallet, Talisman, etc.)
  const extension = await window.injectedWeb3[walletId].enable('DOT Arena');

  // Get accounts
  const accounts = await extension.accounts.get();

  // Initialize blockchain client
  await initBlockchainClient();

  // Update UI
  showWalletConnected(account, balance);
}
```

### 3. Entry Fee Payment

```javascript
async function payEntryFee() {
  // Call contract's fund_contract function
  const tx = state.contract.tx.fund_contract({
    value: 10_000_000_000n // 1 DOT
  });

  // Sign and send transaction
  await tx.signAndSend(address, { signer }, (result) => {
    if (result.status.type === 'BestChainBlockIncluded') {
      // Payment confirmed - start game!
      startGame();
    }
  });
}
```

### 4. Game Initialization

```javascript
async function startGame() {
  // Hide main menu
  document.getElementById('main-menu').classList.add('hidden');

  // Show game container
  document.getElementById('game-container').classList.remove('hidden');

  // Dynamically import Phaser (only now!)
  const { default: Phaser } = await import('phaser');

  // Initialize game with wallet info
  const game = new Phaser.Game(config);
  game.registry.set('walletAddress', address);
  game.registry.set('contract', contract);
}
```

## 🎨 Customization

### Colors (tailwind.config.js)

```javascript
colors: {
  polkadot: {
    pink: '#E6007A',    // Polkadot brand pink
    purple: '#552BBF',  // Polkadot brand purple
    dark: '#1A1B1F',    // Dark background
  }
}
```

### Animations (main.css)

```css
@keyframes float {
  /* Title floating animation */
}

@keyframes pulse-glow {
  /* Button glow animation */
}
```

## 🔧 Development

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

## 🧪 Testing the Flow

### Prerequisites

1. **Install a Polkadot wallet:**
   - SubWallet: https://www.subwallet.app/
   - Talisman: https://talisman.xyz/
   - Polkadot.js: https://polkadot.js.org/extension/

2. **Get testnet DOT:**
   - Connect to Passet Hub Testnet
   - Use a faucet to get test DOT

### Testing Steps

1. **Start dev server:** `npm run dev`
2. **Open in browser:** http://localhost:5173
3. **Click wallet:** Choose SubWallet/Talisman/Polkadot.js
4. **Connect account:** Approve the connection
5. **See balance:** Your DOT balance appears
6. **Pay entry fee:** Click "Pay 1 DOT to Enter Arena"
7. **Confirm transaction:** Approve in wallet extension
8. **Wait for confirmation:** Transaction processes on-chain
9. **Game starts:** Phaser loads and game begins!

## 🎯 Smart Contract Integration

### Contract Address
```
0xdafd89d6d92d6918c81c613f85c23fdf71f9d619
```

### Network
```
Passet Hub Testnet
wss://testnet-passet-hub.polkadot.io/
```

### Functions Used

- `fund_contract()` - Pay 1 DOT entry fee
- `record_kill(killer, victim)` - Server records kills (TODO)
- `get_player_stats(address)` - Query player stats (TODO)

## 🔐 Security Notes

- **Private keys never exposed** - Wallets handle all signing
- **Transaction confirmation required** - User must approve each payment
- **Balance validation** - Checks if user has enough DOT
- **No server-side keys in frontend** - Game server integration separate

## 📱 Mobile Support

The main menu is fully responsive and works on mobile devices:

- Touch-friendly buttons
- Responsive grid layout
- Mobile wallet support (SubWallet mobile)

## 🚧 Next Steps

1. **Server integration** - Connect to game server for kill recording
2. **Player stats display** - Show kills and earnings after game
3. **Leaderboard** - Track top players on-chain
4. **Sound effects** - Add audio for payments and confirmations
5. **Loading states** - Better UX during blockchain calls

## 🎉 Benefits of This Approach

### Why Main Menu is HTML/Tailwind, Not Phaser

1. **Better Performance**
   - Phaser only loads when needed
   - Smaller initial bundle size
   - Faster page load

2. **Easier Styling**
   - Use modern CSS frameworks (Tailwind)
   - Responsive design is simpler
   - Better accessibility

3. **Better UX**
   - Real HTML forms and buttons
   - Browser-native interactions
   - Copy/paste wallet addresses

4. **SEO & Sharing**
   - Search engines can index the page
   - Open Graph tags work properly
   - Social media previews

5. **Wallet Integration**
   - Standard web3 patterns
   - Works with all extensions
   - Easier to debug

## 🤝 Contributing

The wallet integration is complete! Feel free to:

- Improve the UI/UX
- Add more wallet support
- Enhance animations
- Add loading states
- Improve error handling

## 📚 Resources

- **Dedot Docs:** https://docs.dedot.dev/
- **Typink Docs:** https://docs.dedot.dev/typink
- **Tailwind CSS:** https://tailwindcss.com/
- **Phaser:** https://phaser.io/

---

Built with ❤️ for the Polkadot ecosystem
