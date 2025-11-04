# Development Timeline

## 6-Week Solo Development Roadmap

**Total Time:** 42 days (6 weeks)
**Developer:** Solo developer + Claude Code
**Target:** Polkadot Build Party Hackathon Submission

---

## Week 1: Foundation (Days 1-7)

### Days 1-2: Environment Setup & Smart Contracts Start

**Goals:**
- [x] Setup complete development environment
- [ ] Initialize all project repositories
- [ ] Deploy first contract locally

**Tasks:**

**Day 1: Development Environment**
```bash
# Install Rust toolchain
curl --proto='=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup default stable
rustup update
rustup component add rust-src
rustup target add wasm32-unknown-unknown

# Install ink! tooling
cargo install cargo-contract --force

# Install Pop CLI
cargo install --git https://github.com/r0gue-io/pop-cli

# Install Node.js environment
nvm install 20
nvm use 20

# Start substrate-contracts-node
substrate-contracts-node --dev
```

**Day 2: Project Initialization**
```bash
# Create project structure
mkdir dot-arena && cd dot-arena

# Initialize contracts
pop new contract game-registry
pop new contract treasury
pop new contract battle-token

# Initialize server
mkdir server && cd server
npm init -y
npm install express socket.io @polkadot/api

# Initialize client
cd ..
npm create vite@latest client -- --template react-ts
cd client
npm install phaser socket.io-client @polkadot/extension-dapp
```

**Deliverables:**
- ✅ All tools installed and working
- ✅ Project structure created
- ✅ Contracts compile successfully
- ✅ Local blockchain running

---

### Days 3-5: Core Smart Contracts

**Goals:**
- [ ] Complete GameRegistry contract
- [ ] Complete BattleToken contract
- [ ] Deploy and test locally

**Day 3: GameRegistry Contract**

**Morning (4 hours):**
- Write storage structure
- Implement `join_arena()` function
- Implement entry fee splitting logic

**Afternoon (4 hours):**
- Implement `record_kill()` function
- Add access control (oracle pattern)
- Write basic unit tests

**Day 4: BattleToken Contract**

**Morning (4 hours):**
- Write soulbound token logic
- Implement `mint()` function
- Add transfer prevention

**Afternoon (4 hours):**
- Cross-contract calls (GameRegistry → BattleToken)
- Test minting flow
- Integration testing

**Day 5: Treasury Contract (Simplified)**

**Morning (4 hours):**
- Basic treasury storage
- `submit_proposal()` function
- Proposal data structures

**Afternoon (4 hours):**
- `vote()` function (simple majority)
- `execute_proposal()` function
- Test full governance flow

**Deliverables:**
- ✅ GameRegistry deployed and tested
- ✅ BattleToken deployed and tested
- ✅ Treasury deployed and tested
- ✅ Cross-contract calls working
- ✅ Test coverage >70%

---

### Days 6-7: Basic Backend

**Goals:**
- [ ] Setup Node.js server
- [ ] Implement WebSocket connection
- [ ] Basic game loop running

**Day 6: Server Foundation**

**Morning (4 hours):**
```javascript
// server/src/server.js
const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);

const GameState = require('./game/GameState');
const gameState = new GameState();

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  socket.on('join', (wallet) => {
    gameState.addPlayer(socket.id, wallet);
    socket.emit('joined', { playerId: socket.id });
  });

  socket.on('disconnect', () => {
    gameState.removePlayer(socket.id);
  });
});

// Start game loop (60 FPS)
setInterval(() => {
  gameState.update();
  io.emit('state', gameState.serialize());
}, 1000 / 60);

server.listen(3000);
```

**Afternoon (4 hours):**
- Implement `GameState.js` class
- Player management (add/remove)
- Basic state serialization

**Day 7: Game Logic**

**Morning (4 hours):**
- Player movement logic
- Input handling from clients
- Position updates

**Afternoon (4 hours):**
- Bullet creation and physics
- Basic collision detection
- Test with 2 clients

**Deliverables:**
- ✅ Server running on localhost:3000
- ✅ WebSocket connections working
- ✅ 60 FPS game loop stable
- ✅ Multiple clients can connect
- ✅ Basic movement replicates

**Week 1 Checkpoint:**
```
✅ Smart contracts deployed locally
✅ Game server running
✅ Basic multiplayer working
Estimated completion: 30%
```

---

## Week 2: Game Server Logic (Days 8-14)

### Days 8-10: Combat System

**Day 8: Shooting Mechanics**

**Morning (4 hours):**
```javascript
// server/src/game/Bullet.js
class Bullet {
  constructor(x, y, targetX, targetY, owner) {
    this.x = x;
    this.y = y;
    this.owner = owner;

    // Calculate velocity
    const dx = targetX - x;
    const dy = targetY - y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    this.vx = (dx / distance) * 400; // 400 px/s
    this.vy = (dy / distance) * 400;

    this.lifetime = 500 / 400 * 1000; // 500px range
    this.age = 0;
  }

  update(delta) {
    const seconds = delta / 1000;
    this.x += this.vx * seconds;
    this.y += this.vy * seconds;
    this.age += delta;
  }

  isExpired() {
    return this.age >= this.lifetime;
  }
}
```

**Afternoon (4 hours):**
- Implement shooting in GameState
- Add cooldown tracking
- Test bullet spawning

**Day 9: Collision Detection**

**Morning (4 hours):**
```javascript
// server/src/game/Physics.js
class Physics {
  checkCollision(bullet, player) {
    const dx = bullet.x - player.x;
    const dy = bullet.y - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance < (bullet.radius + player.radius);
  }

  checkAllCollisions(bullets, players) {
    const hits = [];

    for (let bullet of bullets) {
      for (let player of players.values()) {
        if (bullet.owner === player.id) continue;
        if (player.isDead) continue;

        if (this.checkCollision(bullet, player)) {
          hits.push({ bullet, player });
        }
      }
    }

    return hits;
  }
}
```

**Afternoon (4 hours):**
- Integrate collision detection in game loop
- Handle damage application
- Test hit detection accuracy

**Day 10: Kill System**

**Morning (4 hours):**
- Implement death detection
- Track killer-victim pairs
- Emit kill events

**Afternoon (4 hours):**
- Test full combat flow
- Balance damage/HP
- Verify kill tracking

**Deliverables:**
- ✅ Players can shoot bullets
- ✅ Bullets hit players accurately
- ✅ Damage reduces HP
- ✅ Death triggers at 0 HP
- ✅ Killer identified correctly

---

### Days 11-12: Blockchain Integration

**Day 11: Entry Fee Verification**

**Morning (4 hours):**
```javascript
// server/src/blockchain/verifier.js
const { ApiPromise, WsProvider } = require('@polkadot/api');
const { ContractPromise } = require('@polkadot/api-contract');

class EntryVerifier {
  async init() {
    const wsProvider = new WsProvider('ws://127.0.0.1:9944');
    this.api = await ApiPromise.create({ provider: wsProvider });

    this.contract = new ContractPromise(
      this.api,
      gameRegistryAbi,
      gameRegistryAddress
    );
  }

  async verifyEntry(walletAddress) {
    // Query contract for active player
    const { result, output } = await this.contract.query
      .isPlayerActive(walletAddress, {
        value: 0,
        gasLimit: -1,
      });

    if (result.isOk && output) {
      return output.toHuman();
    }

    return false;
  }
}
```

**Afternoon (4 hours):**
- Integrate verifier in server
- Test entry verification flow
- Handle verification errors

**Day 12: Kill Reporting Oracle**

**Morning (4 hours):**
```javascript
// server/src/blockchain/oracle.js
class KillOracle {
  constructor(api, contract, oracleKeypair) {
    this.api = api;
    this.contract = contract;
    this.keypair = oracleKeypair;
  }

  async reportKill(killerAddress, victimAddress) {
    try {
      // Call recordKill on contract
      const tx = this.contract.tx.recordKill(
        { value: 0, gasLimit: -1 },
        killerAddress,
        victimAddress
      );

      await tx.signAndSend(this.keypair, (result) => {
        if (result.status.isInBlock) {
          console.log(`Kill recorded in block ${result.status.asInBlock}`);
        }
      });

      return true;
    } catch (error) {
      console.error('Failed to report kill:', error);
      return false;
    }
  }
}
```

**Afternoon (4 hours):**
- Integrate oracle in game server
- Test kill → blockchain reporting
- Verify bounty transfers

**Deliverables:**
- ✅ Entry fee verification working
- ✅ Kills reported to blockchain
- ✅ Bounties transferred correctly
- ✅ BATTLE tokens minted

---

### Days 13-14: Polish & Testing

**Day 13: Game Server Polish**

**Morning (4 hours):**
- Add respawn system
- Implement spawn protection
- Add player statistics tracking

**Afternoon (4 hours):**
- Error handling
- Logging system
- Performance optimization

**Day 14: Testing & Bug Fixes**

**All Day (8 hours):**
- Solo playtesting
- Multi-client testing
- Fix critical bugs
- Load testing (simulate 20 players)

**Deliverables:**
- ✅ Stable server (no crashes)
- ✅ All critical bugs fixed
- ✅ Blockchain integration working
- ✅ Ready for frontend

**Week 2 Checkpoint:**
```
✅ Full game loop working
✅ Combat system complete
✅ Blockchain integration functional
Estimated completion: 50%
```

---

## Week 3: Frontend Game Client (Days 15-21)

### Days 15-16: Phaser Setup

**Day 15: Project Setup**

**Morning (4 hours):**
```javascript
// client/src/game/scenes/BootScene.js
import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // Load assets
    this.load.image('player', '/assets/player.png');
    this.load.image('bullet', '/assets/bullet.png');
    this.load.image('background', '/assets/background.png');
  }

  create() {
    this.scene.start('MenuScene');
  }
}
```

**Afternoon (4 hours):**
- Create MenuScene
- Create GameScene
- Configure Phaser game instance

**Day 16: Basic Rendering**

**Morning (4 hours):**
- Render player sprites
- Render bullets
- Camera setup (follow player)

**Afternoon (4 hours):**
- Background rendering
- Simple UI overlay
- HP display

**Deliverables:**
- ✅ Phaser rendering working
- ✅ Assets loading correctly
- ✅ Basic scenes functional

---

### Days 17-18: Client-Server Communication

**Day 17: Socket.io Client**

**Morning (4 hours):**
```javascript
// client/src/game/NetworkManager.js
import io from 'socket.io-client';

export default class NetworkManager {
  constructor(scene) {
    this.scene = scene;
    this.socket = io('http://localhost:3000');

    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.socket.emit('join', window.walletAddress);
    });

    this.socket.on('state', (state) => {
      this.scene.updateGameState(state);
    });

    this.socket.on('kill', (data) => {
      this.scene.showKillNotification(data);
    });
  }

  sendInput(input) {
    this.socket.emit('input', input);
  }

  shoot(targetX, targetY) {
    this.socket.emit('shoot', { x: targetX, y: targetY });
  }
}
```

**Afternoon (4 hours):**
- Integrate NetworkManager in GameScene
- Test connection
- Verify state updates

**Day 18: Input Handling**

**Morning (4 hours):**
- WASD movement input
- Mouse position tracking
- Click to shoot

**Afternoon (4 hours):**
- Send inputs to server
- Receive state updates
- Render other players

**Deliverables:**
- ✅ Client connects to server
- ✅ Input sent and processed
- ✅ Game state renders correctly
- ✅ Multiplayer visible

---

### Days 19-20: Game Feel

**Day 19: Interpolation & Prediction**

**Morning (4 hours):**
```javascript
// client/src/game/Interpolation.js
export function interpolatePosition(current, target, alpha) {
  return {
    x: current.x + (target.x - current.x) * alpha,
    y: current.y + (target.y - current.y) * alpha,
  };
}

// In GameScene
updateOtherPlayers(serverState) {
  for (let playerData of serverState.players) {
    if (playerData.id === this.localPlayerId) continue;

    let sprite = this.otherPlayers.get(playerData.id);

    if (!sprite) {
      // Create new player sprite
      sprite = this.add.sprite(playerData.x, playerData.y, 'player');
      this.otherPlayers.set(playerData.id, sprite);
    } else {
      // Smoothly interpolate to server position
      const interpolated = interpolatePosition(
        { x: sprite.x, y: sprite.y },
        { x: playerData.x, y: playerData.y },
        0.3
      );

      sprite.x = interpolated.x;
      sprite.y = interpolated.y;
    }
  }
}
```

**Afternoon (4 hours):**
- Client-side prediction for local player
- Server reconciliation
- Test smoothness

**Day 20: Visual Polish**

**Morning (4 hours):**
- Particle effects (muzzle flash, hit effects)
- Screen shake on damage
- Death animations

**Afternoon (4 hours):**
- UI polish (HP hearts, kill feed)
- Sound effects integration
- Background music

**Deliverables:**
- ✅ Smooth movement (no jitter)
- ✅ Responsive controls
- ✅ Visual feedback for actions
- ✅ Polished game feel

---

### Day 21: Game Client Finalization

**Morning (4 hours):**
- Death screen implementation
- Respawn flow
- Exit to menu

**Afternoon (4 hours):**
- Bug fixes
- Performance optimization
- Playtesting

**Week 3 Checkpoint:**
```
✅ Game client playable
✅ Multiplayer working smoothly
✅ Good game feel
Estimated completion: 70%
```

---

## Week 4: Dashboard & Governance (Days 22-28)

### Days 22-23: Wallet Integration

**Day 22: Wallet Connection**

**Morning (4 hours):**
```typescript
// client/src/hooks/usePolkadot.ts
import { useEffect, useState } from 'react';
import { web3Accounts, web3Enable } from '@polkadot/extension-dapp';
import { ApiPromise, WsProvider } from '@polkadot/api';

export function usePolkadot() {
  const [api, setApi] = useState<ApiPromise | null>(null);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);

  useEffect(() => {
    async function init() {
      // Connect to node
      const wsProvider = new WsProvider('ws://127.0.0.1:9944');
      const api = await ApiPromise.create({ provider: wsProvider });
      setApi(api);

      // Get wallet accounts
      await web3Enable('DOT Arena');
      const allAccounts = await web3Accounts();
      setAccounts(allAccounts);
    }

    init();
  }, []);

  return { api, accounts, selectedAccount, setSelectedAccount };
}
```

**Afternoon (4 hours):**
- Wallet selection UI
- Connect button component
- Account display

**Day 23: Contract Interactions**

**Morning (4 hours):**
```typescript
// client/src/hooks/useContract.ts
import { ContractPromise } from '@polkadot/api-contract';
import { usePolkadot } from './usePolkadot';

export function useGameRegistry() {
  const { api } = usePolkadot();

  const joinArena = async (mode: 'Casual' | 'HighStakes') => {
    const entryFee = mode === 'Casual' ? '1000000000000' : '10000000000000';

    const contract = new ContractPromise(api, abi, address);

    await contract.tx.joinArena(
      { value: entryFee, gasLimit: -1 },
      mode
    ).signAndSend(selectedAccount);
  };

  return { joinArena };
}
```

**Afternoon (4 hours):**
- Treasury contract hook
- BattleToken queries
- Test transactions

**Deliverables:**
- ✅ Wallet connection working
- ✅ Transaction signing functional
- ✅ Contract queries working

---

### Days 24-26: Governance Dashboard

**Day 24: Proposal List**

**Morning (4 hours):**
```typescript
// client/src/components/Treasury/ProposalList.tsx
export function ProposalList() {
  const { proposals, loading } = useProposals();

  if (loading) return <div>Loading...</div>;

  return (
    <div className="proposal-list">
      {proposals.map((proposal) => (
        <ProposalCard key={proposal.id} proposal={proposal} />
      ))}
    </div>
  );
}
```

**Afternoon (4 hours):**
- Proposal card component
- Filtering/sorting
- Pagination

**Day 25: Voting Interface**

**Morning (4 hours):**
```typescript
// client/src/components/Treasury/VotingInterface.tsx
export function VotingInterface({ proposalId }: { proposalId: number }) {
  const { vote, isVoting } = useVote();
  const [support, setSupport] = useState(true);
  const [conviction, setConviction] = useState(1);

  const handleVote = async () => {
    await vote(proposalId, support, conviction);
  };

  return (
    <div>
      <div>
        <button onClick={() => setSupport(true)}>For</button>
        <button onClick={() => setSupport(false)}>Against</button>
      </div>

      <select value={conviction} onChange={(e) => setConviction(+e.target.value)}>
        <option value={1}>1x (no lock)</option>
        <option value={2}>2x (7 days)</option>
        <option value={4}>4x (14 days)</option>
        <option value={8}>8x (30 days)</option>
      </select>

      <button onClick={handleVote} disabled={isVoting}>
        Vote
      </button>
    </div>
  );
}
```

**Afternoon (4 hours):**
- Vote submission
- Transaction confirmation UI
- Success/error handling

**Day 26: Proposal Creation**

**Morning (4 hours):**
- Proposal form
- Input validation
- Category selection

**Afternoon (4 hours):**
- Submit proposal transaction
- Form state management
- Testing flow

**Deliverables:**
- ✅ Proposal browsing working
- ✅ Voting functional
- ✅ Proposal creation working

---

### Days 27-28: Statistics & Polish

**Day 27: Stats Dashboard**

**Morning (4 hours):**
- Player stats component
- Leaderboards
- Treasury analytics

**Afternoon (4 hours):**
- Charts/graphs (recharts)
- Data visualization
- Real-time updates

**Day 28: UI/UX Polish**

**Morning (4 hours):**
- Responsive design
- Mobile layouts
- Accessibility improvements

**Afternoon (4 hours):**
- Loading states
- Error boundaries
- Toast notifications

**Week 4 Checkpoint:**
```
✅ Dashboard complete
✅ Governance functional
✅ Full user flow working
Estimated completion: 85%
```

---

## Week 5: Polish & Features (Days 29-35)

### Days 29-30: Map Features

**Day 29: Obstacles**

**Morning (4 hours):**
- Add wall obstacles to map
- Collision detection with walls
- Visual rendering

**Afternoon (4 hours):**
- Add bush obstacles
- Hide mechanic (semi-transparent)
- Test gameplay with obstacles

**Day 30: Advanced Features**

**Morning (4 hours):**
- Spawn protection visual
- Kill feed UI
- Mini-map (future)

**Afternoon (4 hours):**
- Player name display
- Leaderboard in-game
- Settings menu

---

### Days 31-32: Visual Polish

**Day 31: Art Assets**

**All Day (8 hours):**
- Create/source Polkadot dot player sprite
- Create bullet sprites
- Create UI elements
- Background gradients
- Map tile designs

**Day 32: Animations**

**Morning (4 hours):**
- Player rotation animation
- Shooting animation
- Death animation

**Afternoon (4 hours):**
- UI transitions
- Button hover effects
- Particle effects

---

### Days 33-35: Testing & Optimization

**Day 33: Performance Optimization**

**Morning (4 hours):**
- Client FPS optimization
- Server tick rate tuning
- Network bandwidth reduction

**Afternoon (4 hours):**
- Memory leak detection
- Asset optimization
- Code splitting

**Day 34: Bug Hunting**

**All Day (8 hours):**
- Comprehensive playtesting
- Bug tracking and fixes
- Edge case handling
- Error logging

**Day 35: Beta Testing**

**All Day (8 hours):**
- Invite 5-10 testers
- Collect feedback
- Fix critical issues
- Balance adjustments

**Week 5 Checkpoint:**
```
✅ All features complete
✅ Performance optimized
✅ Bugs fixed
Estimated completion: 95%
```

---

## Week 6: Demo Preparation (Days 36-42)

### Days 36-37: Deployment

**Day 36: Testnet Deployment**

**Morning (4 hours):**
- Deploy contracts to testnet
- Configure contract addresses
- Test on testnet

**Afternoon (4 hours):**
- Deploy server to DigitalOcean
- Configure domain
- Setup SSL certificates

**Day 37: Frontend Deployment**

**Morning (4 hours):**
- Build production client
- Deploy to Vercel
- Configure environment variables

**Afternoon (4 hours):**
- End-to-end testing on production
- Fix deployment issues
- Verify all flows working

---

### Days 38-40: Documentation

**Day 38: README & Docs**

**Morning (4 hours):**
- Comprehensive README
- Setup instructions
- Architecture documentation

**Afternoon (4 hours):**
- API documentation
- Smart contract docs
- User guide

**Day 39: Code Comments**

**All Day (8 hours):**
- Add inline comments
- Document complex logic
- Clean up code
- Remove debug logs

**Day 40: Final Documentation**

**Morning (4 hours):**
- Deployment guide
- Troubleshooting guide
- FAQ

**Afternoon (4 hours):**
- License file
- Contributing guide
- Code of conduct

---

### Days 41-42: Demo Video & Submission

**Day 41: Video Production**

**Morning (4 hours):**
- Write script
- Record gameplay footage
- Record governance demo
- Record voiceover

**Afternoon (4 hours):**
- Video editing
- Add captions
- Add music
- Export final video

**Day 42: Final Submission**

**Morning (4 hours):**
- Upload video to YouTube
- Create Devpost submission
- Fill out all forms
- Add screenshots

**Afternoon (4 hours):**
- Social media posts
- Discord announcement
- Forum post
- Final checks

**Final Deliverables:**
- ✅ Deployed application
- ✅ Demo video
- ✅ Complete documentation
- ✅ Hackathon submission
- ✅ 100% COMPLETE!

---

## Daily Schedule Template

### Optimal Solo Dev Schedule

**Morning Block (9 AM - 1 PM): 4 hours**
- Deep work (coding, complex features)
- No interruptions
- Focus on one major task

**Afternoon Block (2 PM - 6 PM): 4 hours**
- Implementation and testing
- Integration work
- Bug fixes

**Evening (Optional) (7 PM - 9 PM): 2 hours**
- Documentation
- Planning next day
- Light tasks

**Total: 8-10 hours/day**

### Weekly Rhythm

**Monday-Friday:**
- 8 hours/day core development
- 40 hours/week

**Saturday:**
- 6 hours testing and polish
- Catch up on any delays

**Sunday:**
- 4 hours planning and documentation
- Rest and recharge

**Total: 50 hours/week**

---

## Risk Mitigation

### Common Delays & Solutions

**Smart Contract Bugs:**
- Buffer: 2 extra days in Week 2
- Solution: Simplify governance if needed

**Server Performance Issues:**
- Buffer: Day 13-14 for optimization
- Solution: Limit to 20 players for MVP

**Frontend Complexity:**
- Buffer: Day 21 is pure polish
- Solution: Remove mini-map if needed

**Blockchain Integration:**
- Buffer: Can test locally without testnet
- Solution: Deploy to testnet in Week 6 if needed

### Scope Flexibility

**Must-Have (MVP):**
- Basic multiplayer gameplay
- Entry fees and rewards
- Simple governance voting
- Free play mode

**Nice-to-Have (can cut):**
- Map obstacles
- Conviction voting
- Mini-map
- Advanced statistics

**Future Features (post-hackathon):**
- Tournament system
- Clan features
- Mobile support
- Multiple game modes

---

## Success Metrics

### Week-by-Week Goals

**Week 1:** Contracts + server foundation (30%)
**Week 2:** Full game logic (50%)
**Week 3:** Playable client (70%)
**Week 4:** Dashboard complete (85%)
**Week 5:** Polished product (95%)
**Week 6:** Shipped and submitted (100%)

### Final Checklist

- [ ] Game is playable
- [ ] Entry fees work
- [ ] Kills reward correctly
- [ ] Governance voting works
- [ ] Free play available
- [ ] Deployed to public internet
- [ ] Demo video completed
- [ ] Documentation thorough
- [ ] Devpost submitted
- [ ] Social media announced

---

**This timeline is aggressive but achievable for a solo developer with Claude Code assistance. Stay focused, track progress daily, and don't be afraid to cut nice-to-have features if you fall behind!**

---

Next: [Testing Strategy →](./12-TESTING-STRATEGY.md)
