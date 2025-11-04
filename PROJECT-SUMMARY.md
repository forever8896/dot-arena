# DOT ARENA - Project Summary

> **🎮 The First Multiplayer Game Where Players Govern the Profits**

**For:** Polkadot Build Party Hackathon 2025
**Duration:** 6 weeks (Oct 6 - Nov 17, 2025)
**Prize Pool:** $40,000
**Developer:** Solo Build with Claude Code

---

## 🎯 One-Sentence Pitch

"DOT ARENA is a browser-based multiplayer shooter where 20% of all entry fees flow to a community treasury controlled by players through earned governance tokens."

---

## ⚡ Quick Facts

| Aspect | Details |
|--------|---------|
| **Genre** | Multiplayer .io-style shooter |
| **Platform** | Browser (no downloads) |
| **Entry Fee** | 1-10 DOT per match |
| **Blockchain** | Paseo Passet Hub (ink! v6 contracts) |
| **Governance** | DAO treasury with voting |
| **Token** | BATTLE (soulbound, non-transferable) |
| **Development** | 6 weeks, solo developer |

---

## 🎮 How It Works

### Player Journey

```
1. Connect Wallet (SubWallet/Talisman)
   ↓
2. Choose Mode:
   • Free Play (testnet, practice)
   • Casual Arena (1 DOT)
   • High Stakes (10 DOT)
   ↓
3. Play & Compete:
   • WASD to move
   • Mouse to aim/shoot
   • 3 HP per player
   • Kill to earn bounties
   ↓
4. Earn Rewards:
   • Instant DOT payouts
   • BATTLE governance tokens
   ↓
5. Govern:
   • Vote on treasury proposals
   • Shape game development
   • Fund tournaments & builders
```

### Economic Flow

```
Entry Fee (10 DOT example with 10 players)
│
├─ 70% (7 DOT) → Prize Pool
│   └─ Winners earn from kills
│
├─ 20% (2 DOT) → Community Treasury
│   └─ Players vote on spending
│
└─ 10% (1 DOT) → Protocol Fees
    └─ Server maintenance
```

---

## 🏗️ Technical Architecture

### Three Layers

```
┌─────────────────────────────────────────┐
│  CLIENT LAYER                           │
│  • Phaser.js (game)                     │
│  • React (dashboard)                    │
│  • Polkadot.js (web3)                   │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  SERVER LAYER                           │
│  • Node.js + Express                    │
│  • Socket.io (real-time)                │
│  • 60 FPS game loop                     │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  BLOCKCHAIN LAYER                       │
│  • GameRegistry (ink!)                  │
│  • Treasury (ink!)                      │
│  • BattleToken (ink!)                   │
└─────────────────────────────────────────┘
```

### Smart Contracts

**1. GameRegistry**
- Collects entry fees
- Distributes kill rewards
- Mints BATTLE tokens
- Tracks player stats

**2. Treasury**
- Stores community funds
- Manages proposals
- Handles voting
- Executes approved proposals

**3. BattleToken**
- Soulbound (non-transferable)
- Earned through gameplay
- Used for governance voting
- No market speculation

---

## 💰 Tokenomics

### BATTLE Token Distribution

| Action | BATTLE Earned |
|--------|---------------|
| Play a match | 10 |
| Kill a player | 5 |
| 1st place | +100 |
| 2nd place | +50 |
| 3rd place | +25 |
| High Stakes Mode | 2x multiplier |

### Treasury Spending Categories

| Category | Allocation | Examples |
|----------|------------|----------|
| Tournaments | 30-40% | Prize pools, competitions |
| Development | 20-30% | New features, bug fixes |
| Grants | 15-25% | Builders, content creators |
| Rewards | 10-20% | Player incentives |
| Public Goods | 5-10% | Anti-cheat, infrastructure |

### Sustainability Model

**Conservative Projections:**
- 1,000 daily players
- 3 matches per player per day
- Average entry: 1 DOT
- Treasury accumulation: ~6,000 DOT/day ($18,000/day)
- Monthly treasury: ~$540,000

**This is sustainable because:**
- ✅ Zero-sum gameplay (no inflation)
- ✅ Skill-based (not pay-to-win)
- ✅ Transparent (on-chain accounting)
- ✅ No Ponzi mechanics
- ✅ Real utility (treasury creates value)

---

## 🎯 Why This Wins the Hackathon

### Judging Criteria (all 25% each)

**1. Technological Implementation**
- ✅ ink! smart contracts (Polkadot-native)
- ✅ Real-time multiplayer (60 FPS)
- ✅ Cross-contract calls
- ✅ Oracle pattern (off-chain → on-chain)
- ✅ Client-side prediction & interpolation

**2. Design**
- ✅ Polkadot branding (dots as players!)
- ✅ Clean, minimal aesthetic
- ✅ Intuitive UX for complex systems
- ✅ Smooth gameplay feel

**3. Potential Impact**
- ✅ Brings gamers to Polkadot
- ✅ Treasury funds ecosystem builders
- ✅ Template for gaming DAOs
- ✅ Viral potential (streamers, tournaments)

**4. Creativity**
- ✅ First game with integrated DAO treasury
- ✅ Novel use of governance primitives
- ✅ Soulbound governance tokens
- ✅ Self-sustaining economic model

### Competitive Advantages

| Advantage | Impact |
|-----------|--------|
| **Novel Concept** | No other P2E game has player-governed treasury |
| **Polkadot-First** | Built FOR Polkadot, not ported from EVM |
| **Sustainable** | No Ponzi, transparent, skill-based |
| **Accessible** | Browser-based, low entry cost |
| **Demo-able** | Judges can actually play it! |
| **Timely** | Mythical Games just joined, gaming is hot |

---

## 📊 Development Plan

### 6-Week Timeline

| Week | Focus | Completion |
|------|-------|------------|
| **Week 1** | Smart contracts + Server foundation | 30% |
| **Week 2** | Game logic + Blockchain integration | 50% |
| **Week 3** | Frontend game client | 70% |
| **Week 4** | Governance dashboard | 85% |
| **Week 5** | Polish + Features | 95% |
| **Week 6** | Demo + Submission | 100% |

### Critical Path

```
Week 1: Contracts → Week 2: Game Server → Week 3: Client
                                                    ↓
Week 6: Demo ← Week 5: Polish ← Week 4: Dashboard
```

### Tech Stack Summary

**Frontend:**
- Phaser.js 3 (game engine)
- React 18 + TypeScript (dashboard)
- Polkadot.js API (web3)
- Tailwind CSS (styling)

**Backend:**
- Node.js 20 + Express
- Socket.io (real-time)
- Polkadot.js (blockchain oracle)

**Blockchain:**
- ink! v6 (smart contracts with RISC-V)
- pallet-revive execution environment
- Paseo Passet Hub parachain (testnet deployment)

**DevOps:**
- Vercel (frontend hosting)
- DigitalOcean (game server)
- GitHub Actions (CI/CD)

---

## 🎨 Game Design

### Core Gameplay

**Controls:**
- WASD: Movement
- Mouse: Aim direction
- Click: Shoot

**Mechanics:**
- HP: 3 per player
- Damage: 1 per hit
- Fire rate: 1 shot/second
- Movement: 200 px/s
- Bullet speed: 400 px/s

**Map:**
- Size: 5000×5000 pixels
- Style: Infinite scrolling (.io-style)
- Obstacles: Walls, bushes, tunnels
- Theme: Polkadot pink gradient

**Visual Style:**
- Players: 6-dot Polkadot logo
- Aesthetic: Minimal, modern
- Colors: Polkadot pink (#E6007A)
- UI: Glassmorphism

---

## 🚀 Post-Hackathon Roadmap

### Phase 1: Community (Months 1-2)
- Discord server
- Community tournaments
- Bug bounties
- Balance adjustments

### Phase 2: Features (Months 3-4)
- Team deathmatch mode
- Clan system
- Achievement NFTs
- Mobile support

### Phase 3: Scale (Months 5-6)
- Multi-region servers
- Advanced matchmaking
- Streaming integrations
- Major tournaments (10K DOT prizes)

### Phase 4: Ecosystem (Months 7+)
- Deploy to Ajuna Network
- Cross-parachain integration
- Builder grants from treasury
- Open-source SDK for other games

---

## 📈 Success Metrics

### Hackathon Success

**Must Achieve:**
- ✅ Working playable demo
- ✅ Contracts on testnet
- ✅ 10+ beta testers
- ✅ Treasury voting functional
- ✅ Professional demo video

**Stretch Goals:**
- 🎯 100+ beta testers
- 🎯 Live governance proposal passed
- 🎯 Streamer plays on Twitch
- 🎯 Media coverage

**Prize Targets:**
- 🏆 Top 3 in User-Centric Apps
- 🏆 Community Vote Prize
- 🏆 Certified Polkadot Tinkerer

### Post-Launch Metrics

**Month 1:**
- 1,000 registered wallets
- 100 daily active players
- $10K+ in entry fees
- 5+ treasury proposals

**Month 3:**
- 5,000 registered wallets
- 500 daily active players
- $50K+ monthly fees
- 10+ funded proposals

**Year 1:**
- 10,000+ players
- $100K+ monthly volume
- Self-sustaining economy
- Template for other games

---

## 🔐 Security & Trust

### Smart Contract Security

**Measures:**
- Professional audit (post-hackathon)
- Comprehensive test coverage
- Emergency pause function
- Oracle authentication
- Reentrancy guards

### Anti-Cheat

**Client-Side:**
- Impossible movement detection
- Rapid-fire detection
- Teleportation detection

**Server-Side:**
- All game logic server-authoritative
- Position validation
- Rate limiting
- Statistical analysis

**Reporting:**
- Player reports
- Automated flagging
- Manual review
- Wallet blacklist

---

## 💡 Unique Innovations

### 1. Soulbound Governance Tokens
- **Problem:** Most P2E tokens become speculative assets
- **Solution:** BATTLE tokens can't be sold, only earned
- **Impact:** Pure utility, no speculation, aligned incentives

### 2. Treasury-Funded Ecosystem
- **Problem:** Games extract value, give nothing back
- **Solution:** 20% of all fees fund community
- **Impact:** Self-sustaining ecosystem, multiplier effect

### 3. Player-Governed Development
- **Problem:** Centralized game companies control everything
- **Solution:** Players vote on features, prizes, grants
- **Impact:** True ownership, democratic development

### 4. Zero-Sum Sustainability
- **Problem:** Most P2E games are Ponzis requiring new players
- **Solution:** Prize pools come from other players, not inflation
- **Impact:** Sustainable indefinitely, skill-based

### 5. Polkadot-First Gaming
- **Problem:** Most games port from Ethereum, don't use unique features
- **Solution:** Built specifically for Polkadot's governance primitives
- **Impact:** Showcases what Polkadot can do better

---

## 🎬 Demo Video Script

### Structure (2-5 minutes)

**Act 1: The Problem (30 sec)**
```
"Traditional gaming: Players pay, corporations profit.
Web3 gaming: Unsustainable tokenomics, Ponzi schemes.
What if players controlled where the profits go?"
```

**Act 2: The Solution (90 sec)**
```
[Live gameplay demo]
- Connect wallet
- Pay 1 DOT entry fee
- Play match, get 2 kills
- Win 1 DOT instantly
- Earn 20 BATTLE tokens

[Governance demo]
- Navigate to treasury
- Show 5,000 DOT accumulated
- Submit proposal: "Tournament Prize - 100 DOT"
- Vote with BATTLE tokens
- Proposal passes
- Funds transfer on-chain
```

**Act 3: The Vision (60 sec)**
```
"In 3 months:
 • 5,000 players
 • $500K community treasury
 • 50 funded proposals
 • 20 community tournaments

This isn't just a game.
It's a new model for gaming economics.
Built on Polkadot.

Play now: dotarena.io"
```

---

## 📝 Quick Links

### Essential Documentation

1. [Project Overview](./docs/01-PROJECT-OVERVIEW.md) - Vision and goals
2. [Game Design](./docs/02-GAME-DESIGN.md) - Mechanics and UX
3. [Technical Architecture](./docs/03-TECHNICAL-ARCHITECTURE.md) - System design
4. [Smart Contracts](./docs/04-SMART-CONTRACTS.md) - ink! contracts
5. [Development Timeline](./docs/11-DEVELOPMENT-TIMELINE.md) - 6-week plan

### Resources

- **Contracts:** `/contracts` folder
- **Server:** `/server` folder
- **Client:** `/client` folder
- **Assets:** `/assets` folder
- **Diagrams:** `/diagrams` folder

---

## 🎯 Call to Action

### For Hackathon Judges

**This project demonstrates:**
- ✅ Technical excellence (ink! + real-time multiplayer)
- ✅ Innovative design (DAO + gaming integration)
- ✅ Real-world impact (sustainable P2E model)
- ✅ Polkadot showcase (governance primitives)

**Why it deserves to win:**
- Novel concept (first of its kind)
- Fully functional (actually playable)
- Ecosystem impact (brings gamers to Polkadot)
- Template for future (replicable model)

### For Developers

**Want to contribute?**
- Check out the code
- Run it locally
- Submit issues
- Propose features via governance!

### For Polkadot Community

**This is YOUR game.**
- Play and earn
- Vote on proposals
- Shape the future
- Bring your friends

---

## 🙏 Acknowledgments

**Built with:**
- Polkadot & Web3 Foundation
- Parity Technologies (ink! & Substrate)
- Ajuna Network (gaming inspiration)
- Mythical Games (proving gaming on Polkadot)
- Polkadot community (support & feedback)

**Special thanks to:**
- Claude Code (development assistant)
- Polkadot Build Party organizers
- Beta testers
- Early adopters

---

## 📜 License & Legal

**License:** MIT
**Copyright:** 2025
**Terms:** No financial advice, play responsibly

---

**"From players, by players, for players."**

🎮 **Play:** [dotarena.io](https://dotarena.io)
📺 **Demo:** [YouTube](https://youtube.com/...)
🐦 **Twitter:** [@DotArena](https://twitter.com/dotarena)
💬 **Discord:** [Join Community](https://discord.gg/...)

---

*Built for Polkadot Build Party 2025*
*Submission Date: November 17, 2025*
*Project Status: 🚀 READY TO LAUNCH*
