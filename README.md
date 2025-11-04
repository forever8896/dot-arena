# DOT ARENA 🎮

> **The first multiplayer game where players govern the profits**

[![Polkadot](https://img.shields.io/badge/Polkadot-E6007A?style=for-the-badge&logo=polkadot&logoColor=white)](https://polkadot.network/)
[![Built with ink!](https://img.shields.io/badge/ink!-000000?style=for-the-badge)](https://use.ink/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

**Built for Polkadot Build Party Hackathon 2025**

## 🎯 What is DOT ARENA?

DOT ARENA is a browser-based multiplayer shooter where players don't just play—they govern. Every match contributes to a community treasury, and players vote on how funds are spent using earned governance tokens.

### Core Concept

```
Player pays entry fee
    ↓
70% → Prize pool for winners
20% → Community Treasury (DAO-governed)
10% → Protocol maintenance
    ↓
Players earn BATTLE tokens (soulbound governance tokens)
    ↓
Vote on treasury proposals:
  • Tournament prizes
  • Game development
  • Builder grants
  • Community rewards
```

## ✨ Key Features

- ⚔️ **Real-time Multiplayer Combat** - Smooth .io-style gameplay
- 💰 **Play-to-Earn** - Winners earn instantly via blockchain
- 🗳️ **DAO Governance** - Players control treasury spending
- 🎫 **BATTLE Tokens** - Soulbound governance rights earned through gameplay
- 🆓 **Free Testnet Mode** - Practice without spending real DOT
- 🌐 **Browser-Based** - No downloads, play instantly

## 🚀 Quick Start

### For Players

1. **Visit:** [https://dotarena.io](https://dotarena.io) (placeholder)
2. **Connect Wallet:** SubWallet or Talisman
3. **Choose Mode:**
   - **Free Play:** Practice on testnet
   - **Casual Arena:** 1 DOT entry
   - **High Stakes:** 10 DOT entry
4. **Play & Earn!**

### For Developers

```bash
# Clone the repository
git clone https://github.com/your-username/dot-arena.git
cd dot-arena

# Install dependencies
npm install

# Start local development
npm run dev

# Deploy contracts (testnet)
cd contracts
./deploy-testnet.sh
```

## 📚 Documentation

Comprehensive documentation is available in the `/docs` folder:

1. [**Project Overview**](./docs/01-PROJECT-OVERVIEW.md) - Vision, goals, and hackathon context
2. [**Game Design**](./docs/02-GAME-DESIGN.md) - Mechanics, gameplay, and UX
3. [**Technical Architecture**](./docs/03-TECHNICAL-ARCHITECTURE.md) - System design and components
4. [**Smart Contracts**](./docs/04-SMART-CONTRACTS.md) - ink! contract specifications
5. [**Game Server**](./docs/05-GAME-SERVER.md) - Backend architecture and APIs
6. [**Client Architecture**](./docs/06-CLIENT-ARCHITECTURE.md) - Frontend and Phaser.js implementation
7. [**Governance System**](./docs/07-GOVERNANCE-SYSTEM.md) - DAO mechanics and voting
8. [**Tokenomics**](./docs/08-TOKENOMICS.md) - Economic model and sustainability
9. [**API Reference**](./docs/09-API-REFERENCE.md) - Complete API documentation
10. [**Deployment Guide**](./docs/10-DEPLOYMENT-GUIDE.md) - Production deployment steps
11. [**Development Timeline**](./docs/11-DEVELOPMENT-TIMELINE.md) - 6-week build plan
12. [**Testing Strategy**](./docs/12-TESTING-STRATEGY.md) - QA and testing approach

## 🏗️ Tech Stack

### Frontend
- **Game Client:** Phaser.js 3
- **Dashboard:** React 18 + TypeScript
- **Web3:** Polkadot.js API
- **Styling:** Tailwind CSS

### Backend
- **Game Server:** Node.js + Express
- **Real-time:** Socket.io
- **State Management:** In-memory (Redis for scaling)

### Blockchain
- **Smart Contracts:** ink! v6 (Rust, RISC-V bytecode)
- **Execution:** pallet-revive on Paseo Passet Hub parachain
- **Deployment:** Paseo Passet Hub (testnet)
- **Wallets:** SubWallet, Talisman, Polkadot.js

## 🎮 Game Modes

### 🆓 Free Play (Testnet)
- Practice gameplay
- Earn testnet BATTLE tokens
- Test governance voting
- No financial risk

### 💎 Casual Arena (1 DOT)
- Entry: 1 DOT (~$3)
- Each kill: 0.5 DOT
- Continuous play until death
- Beginner-friendly

### 🔥 High Stakes (10 DOT)
- Entry: 10 DOT (~$30)
- Each kill: 5 DOT
- Higher BATTLE token earn rate
- Competitive players

## 🏛️ Governance

Players earn **BATTLE tokens** through gameplay:
- 10 BATTLE per match played
- 5 BATTLE per kill
- Placement bonuses (1st: 100, 2nd: 50, 3rd: 25)
- Stake multiplier for higher entry fees

Use BATTLE tokens to:
- ✅ Submit treasury proposals
- ✅ Vote on funding decisions
- ✅ Lock tokens for conviction voting
- ✅ Shape game development

**Treasury Funding Categories:**
- 🏆 Tournament Prizes (30-40%)
- 🛠️ Game Development (20-30%)
- 💡 Ecosystem Grants (15-25%)
- 🎁 Player Rewards (10-20%)
- 🌍 Public Goods (5-10%)

## 🎨 Game Design

### Visual Style
- **Players:** Polkadot logo (6-dot pattern)
- **Map:** Polkadot pink (#E6007A) gradient
- **Aesthetic:** Minimal, clean, on-brand
- **UI:** Modern glassmorphism

### Gameplay
- **View:** Top-down 2D
- **Controls:** WASD movement, mouse aim, click to shoot
- **HP:** 3 hits per player
- **Map:** 5000x5000 infinite scrolling
- **Features:** Walls, bushes, tunnels

## 📊 Economic Model

### Per Match (10 players @ 1 DOT each = 10 DOT total)

```
Entry Fees: 10 DOT
├─ 7 DOT (70%) → Prize pool
├─ 2 DOT (20%) → Community Treasury
└─ 1 DOT (10%) → Protocol maintenance
```

### Sustainability
- ✅ Zero-sum game (no inflation)
- ✅ Skill-based rewards
- ✅ Transparent on-chain accounting
- ✅ No Ponzi mechanics
- ✅ Real utility (treasury creates value)

**Projected Treasury Growth** (conservative):
- 1,000 daily players × 3 matches = 3,000 matches/day
- 2 DOT per match × 3,000 = 6,000 DOT/day
- ~$18,000/day → $540,000/month community treasury

## 🏆 Why This Wins the Hackathon

### Judging Criteria Alignment

**1. Technological Implementation (25%)**
- ✅ ink! v6 smart contracts with RISC-V bytecode
- ✅ pallet-revive execution on Paseo Passet Hub
- ✅ Real-time multiplayer architecture
- ✅ Cross-contract calls
- ✅ Oracle pattern for off-chain→on-chain

**2. Design (25%)**
- ✅ Polkadot brand integration
- ✅ Intuitive UX for complex systems
- ✅ Smooth gameplay experience
- ✅ Clean, modern interface

**3. Potential Impact (25%)**
- ✅ Brings gamers to Polkadot
- ✅ Treasury funds ecosystem builders
- ✅ Template for gaming DAOs
- ✅ Viral potential

**4. Creativity (25%)**
- ✅ First game with integrated DAO treasury
- ✅ Novel use of governance primitives
- ✅ Soulbound governance tokens
- ✅ Self-sustaining economic model

## 🎯 Development Status

- [x] **Week 1:** Smart contracts + Backend foundation
- [x] **Week 2:** Game server logic
- [ ] **Week 3:** Frontend game client (IN PROGRESS)
- [ ] **Week 4:** Governance dashboard
- [ ] **Week 5:** Polish & features
- [ ] **Week 6:** Demo preparation

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

Post-hackathon roadmap:
1. **Phase 1:** Community building & tournaments
2. **Phase 2:** New features & mobile support
3. **Phase 3:** Multi-region scaling
4. **Phase 4:** Ecosystem expansion

## 📜 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🔗 Links

- **Demo:** [https://dotarena.io](https://dotarena.io)
- **Video:** [YouTube Demo](https://youtube.com/...)
- **Devpost:** [Polkadot Build Party Submission](https://polkadot.devpost.com/...)
- **Twitter:** [@DotArena](https://twitter.com/dotarena)
- **Discord:** [Join Community](https://discord.gg/...)

## 👥 Team

Built solo by [Your Name] for Polkadot Build Party 2025

- **GitHub:** [@yourusername](https://github.com/yourusername)
- **Twitter:** [@yourhandle](https://twitter.com/yourhandle)
- **Website:** [yoursite.com](https://yoursite.com)

## 🙏 Acknowledgments

- Polkadot & Web3 Foundation for the hackathon
- Parity Technologies for ink! and Substrate
- Ajuna Network for gaming infrastructure inspiration
- Mythical Games for showing gaming is possible on Polkadot
- The amazing Polkadot community

---

**Built with ❤️ on Polkadot**

*"From players, by players, for players"*
