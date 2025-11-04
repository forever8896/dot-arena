# Technical Architecture

## Table of Contents
- [System Overview](#system-overview)
- [Architecture Diagram](#architecture-diagram)
- [Component Architecture](#component-architecture)
- [Data Flow](#data-flow)
- [Technology Stack](#technology-stack)
- [Infrastructure](#infrastructure)
- [Security Architecture](#security-architecture)
- [Scalability](#scalability)

---

## System Overview

DOT ARENA is built as a distributed system with three main layers:

```
┌─────────────────────────────────────────────────────┐
│                  CLIENT LAYER                       │
│  (Browser-based, Phaser.js + React)                 │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│                  SERVER LAYER                       │
│  (Node.js + Socket.io + Express)                    │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│               BLOCKCHAIN LAYER                      │
│  (ink! Smart Contracts on Substrate)                │
└─────────────────────────────────────────────────────┘
```

### Design Principles

1. **Separation of Concerns**
   - Game logic on server (authoritative)
   - Blockchain for settlements (entry fees, rewards)
   - Client for rendering and input

2. **Trustless Where It Matters**
   - Money flows through smart contracts
   - Game server can't steal funds
   - Transparent on-chain governance

3. **Performance Where It Matters**
   - Real-time gameplay (60 FPS)
   - Off-chain game state (no blockchain lag)
   - Blockchain only for financial transactions

4. **Progressive Decentralization**
   - Phase 1: Centralized game server (MVP)
   - Phase 2: Multiple validator servers
   - Phase 3: Fully decentralized state channels

---

## Architecture Diagram

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Browser)                          │
│                                                                     │
│  ┌──────────────────────┐         ┌──────────────────────┐        │
│  │   Game Client        │         │   Dashboard          │        │
│  │   (Phaser.js)        │         │   (React)            │        │
│  │                      │         │                      │        │
│  │  • Rendering         │         │  • Wallet Connection │        │
│  │  • Input Handling    │         │  • Treasury UI       │        │
│  │  • Client Prediction │         │  • Voting Interface  │        │
│  └──────────┬───────────┘         └──────────┬───────────┘        │
│             │                                 │                    │
└─────────────┼─────────────────────────────────┼────────────────────┘
              │                                 │
              │ WebSocket (Socket.io)           │ HTTPS (REST)
              │                                 │
┌─────────────┼─────────────────────────────────┼────────────────────┐
│             ▼                                 ▼                    │
│  ┌──────────────────────┐         ┌──────────────────────┐        │
│  │   Game Server        │         │   API Server         │        │
│  │   (Node.js)          │◄────────│   (Express)          │        │
│  │                      │         │                      │        │
│  │  • Game Loop         │         │  • REST API          │        │
│  │  • Physics           │         │  • Auth              │        │
│  │  • Collision         │         │  • Leaderboards      │        │
│  │  • State Management  │         │  • Stats             │        │
│  └──────────┬───────────┘         └──────────┬───────────┘        │
│             │                                 │                    │
│             │                                 │                    │
│  ┌──────────┴─────────────────────────────────┴───────────┐       │
│  │               Blockchain Oracle                        │       │
│  │               (Polkadot.js)                            │       │
│  │                                                        │       │
│  │  • Verify entry fees                                  │       │
│  │  • Report kills to blockchain                         │       │
│  │  • Monitor governance events                          │       │
│  └──────────────────────────┬─────────────────────────────┘       │
│                             │                                     │
└─────────────────────────────┼─────────────────────────────────────┘
                              │
                              │ Polkadot.js API
                              │
┌─────────────────────────────┼─────────────────────────────────────┐
│                             ▼                                     │
│  ┌────────────────────────────────────────────────────────┐      │
│  │          Paseo Passet Hub (pallet-revive)              │      │
│  │                                                        │      │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │      │
│  │  │ GameRegistry │  │  Treasury    │  │ BattleToken │ │      │
│  │  │ (ink! v6)    │  │ (ink! v6)    │  │ (ink! v6)   │ │      │
│  │  │ RISC-V       │  │ RISC-V       │  │ RISC-V      │ │      │
│  │  └──────────────┘  └──────────────┘  └─────────────┘ │      │
│  │                                                        │      │
│  └────────────────────────────────────────────────────────┘      │
│                                                                   │
│                     BLOCKCHAIN LAYER                              │
└───────────────────────────────────────────────────────────────────┘
```

### Data Flow Diagram

```
┌─────────┐
│ Player  │
└────┬────┘
     │
     │ 1. Connect Wallet
     ▼
┌─────────────────────────┐
│  Browser Wallet         │
│  (SubWallet/Talisman)   │
└────┬────────────────────┘
     │
     │ 2. Sign Transaction (Entry Fee)
     ▼
┌───────────────────────────────┐
│  GameRegistry Contract        │
│  • Receives 1 DOT             │
│  • Splits: 70%/20%/10%        │
│  • Records player entry       │
└────┬──────────────────────────┘
     │
     │ 3. Entry Confirmed
     ▼
┌───────────────────────────────┐
│  Game Server                  │
│  • Spawns player in arena     │
│  • Updates game state         │
└────┬──────────────────────────┘
     │
     │ 4. Gameplay Loop (WebSocket)
     │    ┌────────────────────┐
     │    │ Player Input       │
     │    │ → Server Process   │
     │    │ → State Update     │
     │    │ → Broadcast        │
     │    └────────────────────┘
     │
     │ 5. Player Kills Enemy
     ▼
┌───────────────────────────────┐
│  Blockchain Oracle            │
│  • Verifies kill              │
│  • Calls contract             │
└────┬──────────────────────────┘
     │
     │ 6. Record Kill
     ▼
┌───────────────────────────────┐
│  GameRegistry Contract        │
│  • Pays killer bounty         │
│  • Mints BATTLE tokens        │
│  • Updates stats              │
└────┬──────────────────────────┘
     │
     │ 7. Rewards Distributed
     ▼
┌─────────────────────────┐
│  Player Wallet          │
│  Balance Updated        │
└─────────────────────────┘
```

---

## Component Architecture

### 1. Client Layer

#### Game Client (Phaser.js)

```javascript
// Component Structure
GameClient/
├── Scenes/
│   ├── BootScene.js        // Asset loading
│   ├── MenuScene.js        // Main menu
│   ├── GameScene.js        // Main gameplay
│   └── DeathScene.js       // Death/respawn screen
├── Entities/
│   ├── Player.js           // Player entity
│   ├── Bullet.js           // Bullet entity
│   └── Obstacle.js         // Map obstacles
├── Managers/
│   ├── NetworkManager.js   // Socket.io client
│   ├── InputManager.js     // Input handling
│   └── AudioManager.js     // Sound effects
└── Utils/
    ├── Interpolation.js    // Smooth movement
    └── Prediction.js       // Client-side prediction
```

**Key Responsibilities:**
- Render game state at 60 FPS
- Capture player input
- Client-side prediction for local player
- Interpolation for remote players
- Sound effects and visual feedback

**Technologies:**
- Phaser.js 3.60+
- Socket.io-client
- Webpack for bundling

---

#### Dashboard (React)

```typescript
// Component Structure
Dashboard/
├── components/
│   ├── WalletConnect/
│   │   ├── WalletButton.tsx
│   │   └── WalletModal.tsx
│   ├── Treasury/
│   │   ├── ProposalList.tsx
│   │   ├── ProposalDetail.tsx
│   │   ├── ProposalCreate.tsx
│   │   └── VotingInterface.tsx
│   ├── Stats/
│   │   ├── PlayerStats.tsx
│   │   ├── Leaderboard.tsx
│   │   └── TreasuryDashboard.tsx
│   └── Common/
│       ├── Button.tsx
│       ├── Card.tsx
│       └── Modal.tsx
├── hooks/
│   ├── usePolkadot.ts      // Polkadot.js integration
│   ├── useContract.ts      // Contract interactions
│   └── useGovernance.ts    // Governance logic
├── services/
│   ├── api.ts              // Backend API calls
│   └── blockchain.ts       // Blockchain queries
└── utils/
    ├── formatters.ts       // Number/address formatting
    └── constants.ts        // Contract addresses, etc.
```

**Key Responsibilities:**
- Wallet connection and management
- Treasury proposal browsing
- Voting interface
- Player statistics
- Leaderboards

**Technologies:**
- React 18 + TypeScript
- Polkadot.js API
- TanStack Query (data fetching)
- Tailwind CSS

---

### 2. Server Layer

#### Game Server (Node.js)

```javascript
// Server Structure
server/
├── src/
│   ├── server.js           // Main server entry
│   ├── game/
│   │   ├── GameState.js    // Central game state
│   │   ├── GameLoop.js     // 60 FPS update loop
│   │   ├── Player.js       // Player entity
│   │   ├── Bullet.js       // Bullet entity
│   │   ├── Physics.js      // Collision detection
│   │   └── Map.js          // Map data
│   ├── blockchain/
│   │   ├── oracle.js       // Blockchain oracle
│   │   ├── contracts.js    // Contract interfaces
│   │   └── verifier.js     // Entry verification
│   ├── api/
│   │   ├── routes.js       // REST endpoints
│   │   ├── auth.js         // Wallet auth
│   │   └── stats.js        // Statistics
│   └── utils/
│       ├── logger.js       // Logging
│       └── config.js       // Configuration
└── tests/
    ├── game.test.js
    └── oracle.test.js
```

**Key Responsibilities:**
- Authoritative game state
- Physics simulation
- Collision detection
- Matchmaking (future)
- Blockchain interaction
- API endpoints

**Technologies:**
- Node.js 20+
- Express.js
- Socket.io
- Polkadot.js API

---

#### Game Loop Architecture

```javascript
class GameLoop {
  constructor() {
    this.tickRate = 60; // 60 updates per second
    this.tickInterval = 1000 / this.tickRate;
    this.lastTick = Date.now();
  }

  start() {
    setInterval(() => {
      const now = Date.now();
      const delta = now - this.lastTick;

      this.update(delta);
      this.broadcast();

      this.lastTick = now;
    }, this.tickInterval);
  }

  update(delta) {
    // Update all players
    for (let player of this.players.values()) {
      player.update(delta);
    }

    // Update all bullets
    for (let bullet of this.bullets) {
      bullet.update(delta);
      this.checkCollisions(bullet);
    }

    // Remove dead entities
    this.cleanup();
  }

  broadcast() {
    // Send game state to all connected clients
    const state = this.serialize();
    io.emit('state', state);
  }
}
```

---

### 3. Blockchain Layer

#### Smart Contract Architecture

```rust
// Contract Structure
contracts/
├── game-registry/
│   ├── lib.rs              // Main contract
│   ├── types.rs            // Data structures
│   └── errors.rs           // Error types
├── treasury/
│   ├── lib.rs              // Treasury contract
│   ├── governance.rs       // Voting logic
│   └── proposals.rs        // Proposal management
└── battle-token/
    ├── lib.rs              // Token contract
    └── soulbound.rs        // Non-transfer logic
```

**Contract Interactions:**

```
GameRegistry ←→ Treasury
     ↓              ↑
     ↓              ↑
     ↓        (query balance)
     ↓              ↑
     └→ BattleToken ←┘
         (mint tokens)
```

**Technologies:**
- ink! v6 (RISC-V bytecode)
- cargo-contract 4.0+
- pallet-revive execution
- Paseo Passet Hub parachain

---

## Data Flow

### Entry Fee Flow

```
1. Player initiates entry
   ↓
2. Wallet prompts for signature
   ↓
3. Transaction sent to GameRegistry contract
   ↓
4. Contract receives DOT:
   ├─ 70% stored as player's bounty
   ├─ 20% transferred to Treasury
   └─ 10% transferred to protocol address
   ↓
5. Contract emits PlayerJoined event
   ↓
6. Oracle detects event
   ↓
7. Server allows player to spawn
```

### Kill Reward Flow

```
1. Server detects player death
   ↓
2. Server validates kill (anti-cheat)
   ↓
3. Oracle calls recordKill(killer, victim)
   ↓
4. Contract executes:
   ├─ Transfer victim's bounty to killer
   ├─ Mint BATTLE tokens to killer
   └─ Emit KillRecorded event
   ↓
5. Killer's wallet balance updates
   ↓
6. Client shows reward notification
```

### Governance Flow

```
1. Player submits proposal
   ↓
2. Dashboard calls Treasury.submitProposal()
   ↓
3. Contract validates:
   ├─ Player has 100+ BATTLE tokens
   └─ Proposal data is valid
   ↓
4. Proposal created, voting period starts
   ↓
5. Other players vote
   ↓
6. Voting period ends
   ↓
7. Anyone calls executeProposal()
   ↓
8. Contract executes:
   ├─ Check if passed threshold
   └─ Transfer funds if approved
```

---

## Technology Stack

### Frontend Technologies

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Game Engine | Phaser.js | 3.60+ | 2D rendering and game loop |
| UI Framework | React | 18+ | Dashboard interface |
| Language | TypeScript | 5.0+ | Type safety |
| Styling | Tailwind CSS | 3.0+ | Utility-first CSS |
| Build Tool | Vite | 4.0+ | Fast builds and HMR |
| State Management | Zustand | 4.0+ | Lightweight state |
| Data Fetching | TanStack Query | 4.0+ | Server state management |
| Web3 | Polkadot.js | 10.0+ | Blockchain interaction |

### Backend Technologies

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Runtime | Node.js | 20 LTS | Server runtime |
| Framework | Express | 4.18+ | REST API |
| WebSocket | Socket.io | 4.6+ | Real-time communication |
| Language | JavaScript | ES2022 | Server logic |
| Database | Redis | 7.0+ | Session storage (optional) |
| Process Manager | PM2 | 5.0+ | Production process management |
| Testing | Jest | 29+ | Unit testing |

### Blockchain Technologies

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Language | Rust | 1.70+ | Smart contracts |
| Framework | ink! | v6 | Contract framework with RISC-V |
| CLI | cargo-contract | 4.0+ | Contract tooling |
| Execution | pallet-revive | Latest | RISC-V smart contract execution |
| Deployment | Paseo Passet Hub | Testnet | Testnet parachain deployment |
| Wallet | SubWallet/Talisman | Latest | User wallets |

### DevOps Technologies

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Version Control | Git + GitHub | Code repository |
| CI/CD | GitHub Actions | Automated testing and deployment |
| Hosting | DigitalOcean / AWS | Server hosting |
| Domain | Namecheap | Domain registration |
| SSL | Let's Encrypt | HTTPS certificates |
| Monitoring | UptimeRobot | Server monitoring |
| Analytics | Plausible | Privacy-friendly analytics |

---

## Infrastructure

### Development Environment

```
Developer Machine
├── contracts/           (Local Substrate Contracts Node)
├── server/              (Node.js on localhost:3000)
└── client/              (Vite dev server on localhost:5173)
```

**Setup Steps:**
```bash
# 1. Start local blockchain
substrate-contracts-node --dev

# 2. Deploy contracts
cd contracts/game-registry
cargo contract build
cargo contract instantiate --suri //Alice

# 3. Start game server
cd server
npm install
npm run dev

# 4. Start client
cd client
npm install
npm run dev
```

---

### Testnet Environment

```
┌─────────────────────────────────────┐
│  Testnet Deployment                 │
│                                     │
│  Blockchain: Contracts Node Testnet │
│  Server: DigitalOcean Droplet       │
│  Client: Vercel                     │
└─────────────────────────────────────┘
```

**Infrastructure:**
- **Blockchain:** Rococo testnet or Contracts Node testnet
- **Server:** Single DigitalOcean droplet ($12/month)
- **Frontend:** Vercel (free tier)
- **Domain:** dotarena-testnet.xyz ($12/year)

---

### Production Environment

```
┌─────────────────────────────────────────────────────┐
│               PRODUCTION DEPLOYMENT                 │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  CDN (Cloudflare)                           │   │
│  └──────────────┬──────────────────────────────┘   │
│                 │                                   │
│  ┌──────────────┴──────────────┐                   │
│  │  Static Assets (Vercel)     │                   │
│  │  • Game client (Phaser)     │                   │
│  │  • Dashboard (React)        │                   │
│  └─────────────────────────────┘                   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  Game Servers (Load Balanced)               │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐       │   │
│  │  │ Server 1│ │ Server 2│ │ Server 3│       │   │
│  │  │ US-East │ │ US-West │ │ EU      │       │   │
│  │  └─────────┘ └─────────┘ └─────────┘       │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  Blockchain (Moonbeam / Asset Hub)          │   │
│  │  • GameRegistry                             │   │
│  │  • Treasury                                 │   │
│  │  • BattleToken                              │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Scaling Strategy:**
1. **Horizontal Scaling:** Multiple game server instances
2. **Geographic Distribution:** Servers in different regions
3. **Load Balancing:** Distribute players across servers
4. **Stateless Servers:** Easy to add/remove instances

---

## Security Architecture

### Client Security

**Concerns:**
- Client can be modified (cheating)
- Network packets can be intercepted
- Inputs can be manipulated

**Mitigations:**
1. **Server Authority:** All game logic on server
2. **Input Validation:** Sanitize all client inputs
3. **Rate Limiting:** Prevent input spam
4. **Checksums:** Verify client integrity (future)

### Server Security

**Concerns:**
- DDoS attacks
- Unauthorized access
- Resource exhaustion

**Mitigations:**
1. **Rate Limiting:** Limit requests per IP
2. **Authentication:** Wallet signature verification
3. **Resource Limits:** Cap players per server
4. **Firewall:** Only expose necessary ports
5. **HTTPS:** Encrypted communication

### Blockchain Security

**Concerns:**
- Smart contract exploits
- Oracle manipulation
- Governance attacks

**Mitigations:**
1. **Audits:** Professional contract audits
2. **Testing:** Comprehensive test coverage
3. **Pause Function:** Emergency pause capability
4. **Timelocks:** Governance delays for security
5. **Oracle Authority:** Only trusted oracle can report kills

### Anti-Cheat Measures

```
┌─────────────────────────────────────┐
│  1. Client-Side Detection           │
│  • Impossible movements             │
│  • Rapid-fire detection             │
│  • Teleportation detection          │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  2. Server-Side Validation          │
│  • Validate all positions           │
│  • Check movement speed             │
│  • Verify line of sight             │
│  • Rate limit actions               │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  3. Statistical Analysis            │
│  • Unusual win rates                │
│  • Perfect accuracy                 │
│  • Inhuman reaction times           │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  4. Reporting & Banning             │
│  • Player reports                   │
│  • Automated flagging               │
│  • Manual review                    │
│  • Wallet blacklist                 │
└─────────────────────────────────────┘
```

---

## Scalability

### Current Limitations (MVP)

- **Players per Server:** ~100 concurrent
- **Matches per Server:** 1 continuous match
- **Geographic Coverage:** Single region (US-East)
- **Database:** In-memory (volatile)

### Scaling Roadmap

#### Phase 1: Vertical Scaling (Months 1-3)
- Upgrade server hardware
- Optimize game loop
- Reduce network overhead
- Target: 200 concurrent players

#### Phase 2: Horizontal Scaling (Months 4-6)
- Multiple server instances
- Load balancer
- Redis for shared state
- Target: 500+ concurrent players

#### Phase 3: Geographic Distribution (Months 7-12)
- Servers in US, EU, Asia
- Region-based matchmaking
- CDN for assets
- Target: 2,000+ concurrent players

#### Phase 4: Decentralization (Year 2+)
- Peer-to-peer state channels
- Decentralized server network
- Blockchain-verified server operators
- Target: 10,000+ concurrent players

### Database Scaling

**Current: In-Memory**
```javascript
const players = new Map(); // Volatile
const gameState = {}; // Lost on restart
```

**Phase 2: Redis**
```javascript
// Persistent state
redis.set('player:123', JSON.stringify(playerData));
redis.lpush('leaderboard:kills', player.id);
```

**Phase 3: PostgreSQL**
```sql
-- Permanent records
CREATE TABLE player_stats (
  wallet_address TEXT PRIMARY KEY,
  total_kills INT,
  total_deaths INT,
  total_earnings NUMERIC,
  battle_tokens NUMERIC,
  created_at TIMESTAMP
);
```

---

Next: [Smart Contracts →](./04-SMART-CONTRACTS.md)
