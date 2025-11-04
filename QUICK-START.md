# DOT ARENA - Quick Start Guide

> **Get from zero to development in 30 minutes**

This guide will help you set up your development environment and start building DOT ARENA.

---

## 🎯 Prerequisites Checklist

Before starting, ensure you have:

- [ ] Computer with 8GB+ RAM
- [ ] Internet connection
- [ ] 50GB free disk space
- [ ] Terminal/command line access
- [ ] Code editor (VS Code recommended)
- [ ] 4-8 hours per day for 6 weeks

---

## ⚡ 30-Minute Setup

### Step 1: Install Rust (5 minutes)

```bash
# Install Rust
curl --proto='=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Follow prompts, choose default installation

# Restart terminal or run:
source $HOME/.cargo/env

# Verify installation
rustc --version
cargo --version

# Should show: rustc 1.70+ and cargo 1.70+
```

### Step 2: Install ink! v6 Tools (5 minutes)

```bash
# Add Rust components for RISC-V compilation
rustup component add rust-src
rustup target add riscv32em-unknown-none-elf

# Install cargo-contract (latest version for ink! v6)
cargo install cargo-contract --force --locked

# This may take 5-10 minutes
# Verify installation
cargo contract --version

# Should show: cargo-contract 4.0+
```

### Step 3: Install Node.js (5 minutes)

```bash
# Install NVM (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart terminal or run:
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install Node.js 20 LTS
nvm install 20
nvm use 20

# Verify installation
node --version
npm --version

# Should show: v20.x.x and 10.x.x
```

### Step 4: Set up Paseo Passet Hub Connection (5 minutes)

```bash
# No local node installation needed!
# ink! v6 contracts deploy to Paseo Passet Hub parachain

# Get testnet tokens from Paseo faucet:
# Visit: https://faucet.polkadot.io/paseo
# Or use the Pop CLI faucet feature (see Step 5)

# You'll deploy directly to Paseo Passet Hub testnet
# RPC Endpoint: wss://paseo-asset-hub-rpc.polkadot.io
```

### Step 5: Install Pop CLI (5 minutes)

```bash
# Install Pop CLI
cargo install --git https://github.com/r0gue-io/pop-cli --locked

# Verify installation
pop --version

# Should show: pop-cli 0.x.x
```

### Step 6: Install Code Editor Extensions (5 minutes)

If using VS Code:

```bash
# Install VS Code extensions
code --install-extension rust-lang.rust-analyzer
code --install-extension matklad.rust-analyzer
code --install-extension tamasfe.even-better-toml
code --install-extension bungcip.better-toml
```

---

## 🚀 Create Your First Contract (10 minutes)

### Initialize Contract Project

```bash
# Create project directory
mkdir dot-arena
cd dot-arena

# Create your first ink! contract
pop new contract game-registry

# Navigate to contract
cd game-registry

# Build the contract
cargo contract build

# You should see:
# ✓ Contract built successfully
# ✓ RISC-V file: target/ink/game_registry.polkavm
# ✓ Metadata file: target/ink/game_registry.json
```

### Test the Contract

```bash
# Run contract tests
cargo test

# You should see:
# running X tests
# test result: ok. X passed
```

---

## 🎮 Connect to Paseo Passet Hub (5 minutes)

### No Local Node Needed!

```bash
# ink! v6 contracts run on pallet-revive
# Deploy directly to Paseo Passet Hub parachain testnet

# Endpoint: wss://paseo-asset-hub-rpc.polkadot.io
# Chain: Paseo Passet Hub
# Execution: pallet-revive (RISC-V)

# Get testnet tokens:
pop faucet --address YOUR_ADDRESS
# Or visit: https://faucet.polkadot.io/paseo
```

---

## 🔧 Deploy Your First Contract (5 minutes)

### Deploy to Paseo Passet Hub

```bash
# In the game-registry folder
cargo contract instantiate \
  --url wss://paseo-asset-hub-rpc.polkadot.io \
  --suri "YOUR_SEED_PHRASE_HERE" \
  --constructor new \
  --args "YOUR_OWNER_ADDRESS" \
  --execute

# You should see:
# ✓ Contract instantiated on Paseo Passet Hub
# Contract address: 5xxxxxxxxxxxxxxxxxxxxxxxxx
# Execution: pallet-revive (RISC-V bytecode)
```

**Copy this contract address!** You'll need it later.

---

## 📁 Project Structure Setup (5 minutes)

```bash
# In dot-arena directory
cd ..

# Create server directory
mkdir server
cd server
npm init -y

# Install dependencies
npm install express socket.io @polkadot/api @polkadot/api-contract

# Create basic server file
cat > server.js << 'EOF'
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('DOT ARENA Server Running!');
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
EOF

# Test server
node server.js

# Visit http://localhost:3000
# You should see: "DOT ARENA Server Running!"
```

---

## ✅ Verification Checklist

After setup, verify everything works:

### Rust & ink!
```bash
# Check Rust version
rustc --version  # Should be 1.70+

# Check cargo-contract
cargo contract --version  # Should be 3.0+

# Build test contract
cd game-registry
cargo contract build  # Should succeed
```

### Node.js
```bash
# Check Node.js version
node --version  # Should be v20.x.x

# Check npm
npm --version  # Should be 10.x.x
```

### Blockchain
```bash
# Check substrate-contracts-node
substrate-contracts-node --version  # Should work

# Start node (in separate terminal)
substrate-contracts-node --dev --tmp
# Should start without errors
```

### VS Code (Optional)
```bash
# Check extensions
code --list-extensions | grep rust
# Should show rust-analyzer and related extensions
```

---

## 🎯 What's Next?

You now have a complete development environment! Here's what to do next:

### Option 1: Follow the Documentation
1. Read [PROJECT-SUMMARY.md](./PROJECT-SUMMARY.md) for overview
2. Review [04-SMART-CONTRACTS.md](./docs/04-SMART-CONTRACTS.md) for contract details
3. Follow [11-DEVELOPMENT-TIMELINE.md](./docs/11-DEVELOPMENT-TIMELINE.md) week by week

### Option 2: Start Coding Immediately

**Week 1, Day 1: Smart Contracts**

```bash
# 1. Open game-registry/lib.rs
code game-registry/lib.rs

# 2. Replace with contract code from docs/04-SMART-CONTRACTS.md
# Copy the GameRegistry contract code

# 3. Build
cargo contract build

# 4. Test
cargo test

# 5. Deploy
cargo contract instantiate --suri //Alice --constructor new --execute
```

**Week 1, Day 2: Game Server**

```bash
# 1. Create game logic
mkdir server/src/game
cd server/src/game

# 2. Create GameState.js
code GameState.js

# 3. Implement game loop (see docs/05-GAME-SERVER.md when created)

# 4. Test server
cd ../..
node server.js
```

---

## 🐛 Troubleshooting

### Rust Installation Issues

**Problem:** `rustc: command not found`
```bash
# Solution: Reload shell
source $HOME/.cargo/env

# Or restart terminal
```

**Problem:** `error: linker cc not found`
```bash
# Solution: Install build tools

# Ubuntu/Debian:
sudo apt install build-essential

# macOS:
xcode-select --install

# Fedora:
sudo dnf install gcc
```

### cargo-contract Issues

**Problem:** `cargo-contract build` fails with "wasm32-unknown-unknown not found"
```bash
# Solution: Add target
rustup target add wasm32-unknown-unknown
```

**Problem:** Build takes too long
```bash
# Solution: Use release mode
cargo contract build --release
```

### Node.js Issues

**Problem:** `nvm: command not found`
```bash
# Solution: Reinstall NVM or use manual Node install
# Visit: https://nodejs.org/en/download
```

**Problem:** Permission errors with npm
```bash
# Solution: Fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### Paseo Passet Hub Connection Issues

**Problem:** Cannot connect to Paseo Passet Hub
```bash
# Solution: Check RPC endpoint
# Correct endpoint: wss://paseo-asset-hub-rpc.polkadot.io

# Or use pop CLI:
pop up parachain --network paseo-asset-hub
```

**Problem:** Out of testnet tokens
```bash
# Solution: Request from faucet
pop faucet --address YOUR_ADDRESS

# Or visit web faucet:
# https://faucet.polkadot.io/paseo
```

---

## 📚 Learning Resources

### Essential Reading (Start Here)

1. **Polkadot Basics**
   - [Polkadot Wiki](https://wiki.polkadot.network/)
   - [Substrate Documentation](https://docs.substrate.io/)

2. **ink! Smart Contracts**
   - [ink! Documentation](https://use.ink/)
   - [ink! Examples](https://github.com/paritytech/ink-examples)

3. **Game Development**
   - [Phaser.js Documentation](https://phaser.io/learn)
   - [Socket.io Guide](https://socket.io/docs/)

### Video Tutorials

- Polkadot for Beginners: [YouTube Playlist](https://youtube.com/polkadot)
- ink! Smart Contracts: [Parity Tech YouTube](https://youtube.com/c/ParityTech)
- Real-time Multiplayer Games: [Various tutorials](https://youtube.com)

### Community Support

- **Polkadot Forum:** [forum.polkadot.network](https://forum.polkadot.network)
- **Substrate StackExchange:** [substrate.stackexchange.com](https://substrate.stackexchange.com)
- **Discord:** Polkadot, Substrate Developer communities
- **Telegram:** Polkadot technical support groups

---

## 🎯 Daily Development Routine

### Morning (4 hours)

1. **Review yesterday's work** (15 min)
2. **Read relevant docs** (30 min)
3. **Deep work on main task** (3 hours)
4. **Commit changes** (15 min)

### Afternoon (4 hours)

1. **Implement secondary features** (2 hours)
2. **Testing and debugging** (1 hour)
3. **Documentation updates** (30 min)
4. **Plan tomorrow** (30 min)

### Evening (Optional, 2 hours)

1. **Code review and refactoring**
2. **Learning new concepts**
3. **Community engagement**

---

## 📊 Progress Tracking

### Week 1 Goals

- [ ] All tools installed
- [ ] First contract deployed
- [ ] Server running
- [ ] Blockchain interaction working

### Week 2 Goals

- [ ] Full game loop implemented
- [ ] Multiplayer working
- [ ] Blockchain integration complete

### Week 3 Goals

- [ ] Client rendering working
- [ ] Gameplay feels good
- [ ] Wallet connection functional

### Week 4 Goals

- [ ] Dashboard complete
- [ ] Governance working
- [ ] End-to-end flow tested

### Week 5 Goals

- [ ] All features implemented
- [ ] Bugs fixed
- [ ] Performance optimized

### Week 6 Goals

- [ ] Deployed to production
- [ ] Demo video complete
- [ ] Hackathon submitted

---

## 🚨 Important Reminders

### Do's ✅

- ✅ Commit code frequently (hourly)
- ✅ Test after every feature
- ✅ Document as you code
- ✅ Ask for help early
- ✅ Take breaks every 2 hours
- ✅ Keep scope focused on MVP

### Don'ts ❌

- ❌ Skip testing
- ❌ Ignore TypeScript/lint errors
- ❌ Over-engineer solutions
- ❌ Add features not in plan
- ❌ Work more than 10 hours/day
- ❌ Forget to backup code

---

## 🎉 You're Ready!

You now have:

✅ Complete development environment
✅ First contract compiled and deployed
✅ Server running
✅ Blockchain node active
✅ Documentation access
✅ Development plan

**Next Action:** Start Week 1, Day 1 from the [Development Timeline](./docs/11-DEVELOPMENT-TIMELINE.md)

---

## 🆘 Need Help?

**Stuck on setup?**
- Check [Troubleshooting](#troubleshooting) above
- Search [Substrate StackExchange](https://substrate.stackexchange.com)
- Ask in Polkadot Discord

**Ready to build?**
- Open [04-SMART-CONTRACTS.md](./docs/04-SMART-CONTRACTS.md)
- Follow [11-DEVELOPMENT-TIMELINE.md](./docs/11-DEVELOPMENT-TIMELINE.md)
- Start coding!

**Questions about design?**
- Read [02-GAME-DESIGN.md](./docs/02-GAME-DESIGN.md)
- Review [03-TECHNICAL-ARCHITECTURE.md](./docs/03-TECHNICAL-ARCHITECTURE.md)
- Check [PROJECT-SUMMARY.md](./PROJECT-SUMMARY.md)

---

**Good luck building DOT ARENA! You've got this! 🚀**
