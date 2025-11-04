# DOT ARENA - System Architecture Diagram

## Complete System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER DEVICE (Browser)                          │
│                                                                             │
│  ┌───────────────────────────┐       ┌───────────────────────────────────┐ │
│  │     GAME CLIENT           │       │      DASHBOARD                    │ │
│  │     (Phaser.js 3)         │       │      (React 18 + TypeScript)     │ │
│  │                           │       │                                   │ │
│  │  ┌─────────────────────┐  │       │  ┌─────────────────────────────┐ │ │
│  │  │ Game Scene          │  │       │  │ Wallet Connection           │ │ │
│  │  │ • Player rendering  │  │       │  │ • SubWallet/Talisman        │ │ │
│  │  │ • Bullet physics    │  │       │  │ • Account selection         │ │ │
│  │  │ • Camera follow     │  │       │  └─────────────────────────────┘ │ │
│  │  │ • Input handling    │  │       │                                   │ │
│  │  └─────────────────────┘  │       │  ┌─────────────────────────────┐ │ │
│  │                           │       │  │ Treasury Interface          │ │ │
│  │  ┌─────────────────────┐  │       │  │ • Proposal list             │ │ │
│  │  │ Network Manager     │  │       │  │ • Voting UI                 │ │ │
│  │  │ • Socket.io client  │  │       │  │ • Proposal creation         │ │ │
│  │  │ • State sync        │  │       │  └─────────────────────────────┘ │ │
│  │  │ • Input sending     │  │       │                                   │ │
│  │  └─────────────────────┘  │       │  ┌─────────────────────────────┐ │ │
│  │                           │       │  │ Statistics                  │ │ │
│  │  ┌─────────────────────┐  │       │  │ • Player stats              │ │ │
│  │  │ Wallet Integration  │  │       │  │ • Leaderboards              │ │ │
│  │  │ • Polkadot.js       │◄─┼───────┼──┤ • Treasury analytics        │ │ │
│  │  │ • Transaction sign  │  │       │  │ • BATTLE balance            │ │ │
│  │  └─────────────────────┘  │       │  └─────────────────────────────┘ │ │
│  └───────────┬───────────────┘       └───────────────┬───────────────────┘ │
│              │                                       │                     │
└──────────────┼───────────────────────────────────────┼─────────────────────┘
               │                                       │
               │ WebSocket                             │ HTTPS
               │ (Socket.io)                           │ (REST API)
               │                                       │
┌──────────────┼───────────────────────────────────────┼─────────────────────┐
│              ▼                                       ▼                     │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │                    GAME SERVER (Node.js 20)                        │   │
│  │                    Host: dotarena.io:3000                          │   │
│  │                                                                    │   │
│  │  ┌──────────────────────┐        ┌──────────────────────────────┐ │   │
│  │  │  Socket.io Server    │        │   Express API Server         │ │   │
│  │  │                      │        │                              │ │   │
│  │  │  • Connection mgmt   │        │   Routes:                    │ │   │
│  │  │  • Player sessions   │        │   /api/stats                 │ │   │
│  │  │  • Event handling    │        │   /api/leaderboard           │ │   │
│  │  └──────────┬───────────┘        │   /api/treasury              │ │   │
│  │             │                    │   /api/player/:address       │ │   │
│  │             ▼                    └──────────────────────────────┘ │   │
│  │  ┌─────────────────────────────────────────────────────────────┐ │   │
│  │  │              GAME LOOP (60 FPS)                             │ │   │
│  │  │                                                             │ │   │
│  │  │  setInterval(() => {                                        │ │   │
│  │  │    updatePlayers(delta);      // Movement & physics        │ │   │
│  │  │    updateBullets(delta);      // Bullet flight             │ │   │
│  │  │    checkCollisions();          // Hit detection            │ │   │
│  │  │    handleKills();              // Death & rewards           │ │   │
│  │  │    broadcastState();           // Send to clients           │ │   │
│  │  │  }, 1000/60);                                              │ │   │
│  │  │                                                             │ │   │
│  │  └─────────────────────────────────────────────────────────────┘ │   │
│  │                                                                    │   │
│  │  ┌─────────────────────────────────────────────────────────────┐ │   │
│  │  │              BLOCKCHAIN ORACLE                              │ │   │
│  │  │              (Polkadot.js API)                              │ │   │
│  │  │                                                             │ │   │
│  │  │  Functions:                                                 │ │   │
│  │  │  • verifyEntryFee(player)    → Query contract             │ │   │
│  │  │  • reportKill(killer, victim) → Call contract             │ │   │
│  │  │  • listenEvents()             → Monitor blockchain         │ │   │
│  │  │                                                             │ │   │
│  │  └────────────────────┬────────────────────────────────────────┘ │   │
│  └───────────────────────┼──────────────────────────────────────────┘   │
│                          │                                              │
│               SERVER INFRASTRUCTURE LAYER                               │
└──────────────────────────┼──────────────────────────────────────────────┘
                           │
                           │ Polkadot.js API
                           │ (WebSocket/HTTP)
                           │
┌──────────────────────────┼──────────────────────────────────────────────┐
│                          ▼                                              │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │        SUBSTRATE CONTRACTS NODE / MOONBEAM PARACHAIN            │  │
│  │        RPC Endpoint: wss://moonbeam.api.onfinality.io           │  │
│  │                                                                  │  │
│  │  ┌────────────────────────────────────────────────────────────┐ │  │
│  │  │                   SMART CONTRACTS                          │ │  │
│  │  │                                                            │ │  │
│  │  │  ┌──────────────────────────────────────────────────────┐ │ │  │
│  │  │  │  GameRegistry Contract (ink!)                        │ │ │  │
│  │  │  │  Address: 0x1234...5678                              │ │ │  │
│  │  │  │                                                      │ │ │  │
│  │  │  │  Storage:                                            │ │ │  │
│  │  │  │  ├─ active_players: Map<AccountId, PlayerEntry>    │ │ │  │
│  │  │  │  ├─ player_stats: Map<AccountId, PlayerStats>      │ │ │  │
│  │  │  │  ├─ treasury: AccountId                            │ │ │  │
│  │  │  │  ├─ battle_token: AccountId                        │ │ │  │
│  │  │  │  └─ oracle: AccountId (authorized)                 │ │ │  │
│  │  │  │                                                      │ │ │  │
│  │  │  │  Functions:                                          │ │ │  │
│  │  │  │  • join_arena(mode) payable                        │ │ │  │
│  │  │  │  • record_kill(killer, victim)                     │ │ │  │
│  │  │  │  • get_player_stats(player) → PlayerStats          │ │ │  │
│  │  │  │  • is_player_active(player) → bool                 │ │ │  │
│  │  │  └──────────────────────────────────────────────────────┘ │ │  │
│  │  │                                                            │ │  │
│  │  │  ┌──────────────────────────────────────────────────────┐ │ │  │
│  │  │  │  Treasury Contract (ink!)                            │ │ │  │
│  │  │  │  Address: 0xabcd...ef01                              │ │ │  │
│  │  │  │                                                      │ │ │  │
│  │  │  │  Storage:                                            │ │ │  │
│  │  │  │  ├─ proposals: Map<u32, Proposal>                  │ │ │  │
│  │  │  │  ├─ votes: Map<(u32, AccountId), Vote>            │ │ │  │
│  │  │  │  ├─ total_balance: Balance                         │ │ │  │
│  │  │  │  ├─ battle_token: AccountId                        │ │ │  │
│  │  │  │  └─ next_proposal_id: u32                          │ │ │  │
│  │  │  │                                                      │ │ │  │
│  │  │  │  Functions:                                          │ │ │  │
│  │  │  │  • submit_proposal(...)                            │ │ │  │
│  │  │  │  • vote(proposal_id, support, conviction)          │ │ │  │
│  │  │  │  • execute_proposal(proposal_id)                   │ │ │  │
│  │  │  │  • get_proposal(id) → Proposal                     │ │ │  │
│  │  │  └──────────────────────────────────────────────────────┘ │ │  │
│  │  │                                                            │ │  │
│  │  │  ┌──────────────────────────────────────────────────────┐ │ │  │
│  │  │  │  BattleToken Contract (ink!)                         │ │ │  │
│  │  │  │  Address: 0x9876...5432                              │ │ │  │
│  │  │  │                                                      │ │ │  │
│  │  │  │  Storage:                                            │ │ │  │
│  │  │  │  ├─ balances: Map<AccountId, u128>                 │ │ │  │
│  │  │  │  ├─ locked: Map<(AccountId, u64), u128>           │ │ │  │
│  │  │  │  ├─ total_supply: u128                             │ │ │  │
│  │  │  │  └─ game_registry: AccountId (authorized minter)   │ │ │  │
│  │  │  │                                                      │ │ │  │
│  │  │  │  Functions:                                          │ │ │  │
│  │  │  │  • mint(to, amount) [oracle only]                  │ │ │  │
│  │  │  │  • balance_of(account) → u128                      │ │ │  │
│  │  │  │  • transfer(...) [DISABLED - Soulbound]            │ │ │  │
│  │  │  │  • lock(amount, duration)                          │ │ │  │
│  │  │  └──────────────────────────────────────────────────────┘ │ │  │
│  │  └────────────────────────────────────────────────────────────┘ │  │
│  │                                                                  │  │
│  │                   BLOCKCHAIN LAYER                               │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

## Data Flow Sequences

### Sequence 1: Player Joins Game

```
┌──────┐         ┌────────┐         ┌────────┐         ┌─────────┐
│Player│         │ Client │         │ Server │         │Contract │
└───┬──┘         └───┬────┘         └───┬────┘         └────┬────┘
    │                │                  │                   │
    │ 1. Click Play  │                  │                   │
    ├───────────────>│                  │                   │
    │                │                  │                   │
    │                │ 2. Sign Tx       │                   │
    │                │  (Entry Fee)     │                   │
    │                ├─────────────────────────────────────>│
    │                │                  │                   │
    │                │                  │ 3. join_arena()   │
    │                │                  │  • Split fees     │
    │                │                  │  • Store entry    │
    │                │                  │  • Emit event     │
    │                │<─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
    │                │                  │                   │
    │                │ 4. Verify Entry  │                   │
    │                ├─────────────────>│                   │
    │                │                  │                   │
    │                │                  │ 5. Query Contract │
    │                │                  ├──────────────────>│
    │                │                  │<──────────────────│
    │                │                  │  isPlayerActive() │
    │                │ 6. Spawn Player  │                   │
    │                │<─────────────────┤                   │
    │                │                  │                   │
    │ 7. Game Start  │                  │                   │
    │<───────────────┤                  │                   │
    │                │                  │                   │
```

### Sequence 2: Player Gets Kill

```
┌──────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌─────────┐
│Killer│  │Victim  │  │ Server │  │ Oracle │  │Contract │
└───┬──┘  └───┬────┘  └───┬────┘  └───┬────┘  └────┬────┘
    │         │            │           │            │
    │ Shoot   │            │           │            │
    ├─────────┼───────────>│           │            │
    │         │            │           │            │
    │         │   Hit!     │           │            │
    │         │<───────────┤           │            │
    │         │            │           │            │
    │         │  HP = 0    │           │            │
    │         │  (Death)   │           │            │
    │         │            │           │            │
    │         │            │ Validate  │            │
    │         │            │  Kill     │            │
    │         │            ├──────────>│            │
    │         │            │           │            │
    │         │            │           │ record_kill()
    │         │            │           ├───────────>│
    │         │            │           │            │
    │         │            │           │ • Transfer │
    │         │            │           │   bounty   │
    │         │            │           │ • Mint     │
    │         │            │           │   BATTLE   │
    │         │            │           │ • Update   │
    │         │            │           │   stats    │
    │ Reward! │            │<─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│
    │<────────┼────────────┤           │            │
    │ +0.7 DOT│            │           │            │
    │ +5 BATTLE            │           │            │
    │         │            │           │            │
```

### Sequence 3: Governance Voting

```
┌──────┐     ┌────────┐     ┌─────────┐     ┌──────────┐
│Voter │     │Dashboard    │ Treasury │     │BattleToken
└───┬──┘     └───┬────┘     └────┬────┘     └─────┬────┘
    │            │               │                │
    │ Browse     │               │                │
    │ Proposals  │               │                │
    ├───────────>│               │                │
    │            │               │                │
    │            │ Query         │                │
    │            │ Proposals     │                │
    │            ├──────────────>│                │
    │            │<──────────────┤                │
    │            │  Proposal[]   │                │
    │            │               │                │
    │ Vote (Aye) │               │                │
    ├───────────>│               │                │
    │            │               │                │
    │            │ Sign Tx       │                │
    │            │  vote()       │                │
    │            ├──────────────>│                │
    │            │               │                │
    │            │               │ Get Balance    │
    │            │               ├───────────────>│
    │            │               │<───────────────┤
    │            │               │  1000 BATTLE   │
    │            │               │                │
    │            │               │ Record Vote    │
    │            │               │ • Store vote   │
    │            │               │ • Update tally │
    │            │<──────────────┤                │
    │            │  Tx Success   │                │
    │            │               │                │
    │ Vote Cast! │               │                │
    │<───────────┤               │                │
    │            │               │                │
```

## Network Architecture

### Development (Local)

```
┌─────────────────────────────────────┐
│   Developer Machine (localhost)    │
│                                     │
│  ┌────────────────────────────────┐ │
│  │ substrate-contracts-node       │ │
│  │ Port: 9944 (WebSocket)         │ │
│  │ • Local blockchain             │ │
│  │ • Instant finality             │ │
│  │ • Dev accounts (Alice, Bob)    │ │
│  └────────────────────────────────┘ │
│                                     │
│  ┌────────────────────────────────┐ │
│  │ Game Server (Node.js)          │ │
│  │ Port: 3000                     │ │
│  │ • Socket.io on :3000           │ │
│  │ • REST API on :3000/api        │ │
│  └────────────────────────────────┘ │
│                                     │
│  ┌────────────────────────────────┐ │
│  │ Client (Vite Dev Server)       │ │
│  │ Port: 5173                     │ │
│  │ • Hot module reloading         │ │
│  │ • Fast refresh                 │ │
│  └────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Production

```
┌─────────────────────────────────────────────────┐
│             CLOUDFLARE CDN                      │
│             (Global Edge Network)               │
└──────────────────┬──────────────────────────────┘
                   │
      ┌────────────┴────────────┐
      │                         │
      ▼                         ▼
┌────────────────┐    ┌──────────────────┐
│ Vercel         │    │ DigitalOcean     │
│ (Static)       │    │ Droplet          │
│                │    │                  │
│ • Game client  │    │ • Game server    │
│ • Dashboard    │    │ • Socket.io      │
│ • CDN cached   │    │ • API server     │
└────────────────┘    └─────────┬────────┘
                                │
                                │
                ┌───────────────┴───────────────┐
                │                               │
                ▼                               ▼
        ┌──────────────┐              ┌──────────────┐
        │ Moonbeam     │              │ Asset Hub    │
        │ Parachain    │              │ Parachain    │
        │              │              │              │
        │ • Contracts  │              │ • USDC/USDT  │
        │ • EVM compat │              │ • Low fees   │
        └──────────────┘              └──────────────┘
```

## File System Architecture

```
dot-arena/
├── contracts/                    # Smart contracts
│   ├── game-registry/
│   │   ├── lib.rs               # Main contract code
│   │   ├── Cargo.toml           # Dependencies
│   │   └── tests/
│   ├── treasury/
│   │   ├── lib.rs
│   │   ├── Cargo.toml
│   │   └── tests/
│   └── battle-token/
│       ├── lib.rs
│       ├── Cargo.toml
│       └── tests/
│
├── server/                       # Game server
│   ├── src/
│   │   ├── server.js            # Main entry
│   │   ├── game/
│   │   │   ├── GameState.js
│   │   │   ├── Player.js
│   │   │   ├── Bullet.js
│   │   │   └── Physics.js
│   │   ├── blockchain/
│   │   │   ├── oracle.js
│   │   │   ├── verifier.js
│   │   │   └── contracts.js
│   │   └── api/
│   │       ├── routes.js
│   │       └── stats.js
│   ├── package.json
│   └── .env
│
├── client/                       # Frontend
│   ├── src/
│   │   ├── game/                # Phaser game
│   │   │   ├── index.ts
│   │   │   ├── scenes/
│   │   │   │   ├── BootScene.ts
│   │   │   │   ├── MenuScene.ts
│   │   │   │   └── GameScene.ts
│   │   │   └── managers/
│   │   │       ├── NetworkManager.ts
│   │   │       └── InputManager.ts
│   │   │
│   │   ├── dashboard/           # React dashboard
│   │   │   ├── App.tsx
│   │   │   ├── components/
│   │   │   │   ├── WalletConnect/
│   │   │   │   ├── Treasury/
│   │   │   │   └── Stats/
│   │   │   └── hooks/
│   │   │       ├── usePolkadot.ts
│   │   │       └── useContract.ts
│   │   │
│   │   └── assets/
│   │       ├── player.png
│   │       └── bullet.png
│   │
│   ├── package.json
│   └── vite.config.ts
│
└── docs/                         # Documentation
    ├── 01-PROJECT-OVERVIEW.md
    ├── 02-GAME-DESIGN.md
    ├── 03-TECHNICAL-ARCHITECTURE.md
    └── ...
```

---

**This architecture ensures:**
- ✅ Clear separation of concerns
- ✅ Scalable components
- ✅ Secure by design
- ✅ Easy to maintain
- ✅ Performance optimized
