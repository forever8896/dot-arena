# Game Design Document

## Table of Contents
- [Core Gameplay](#core-gameplay)
- [Game Modes](#game-modes)
- [Player Mechanics](#player-mechanics)
- [Combat System](#combat-system)
- [Map Design](#map-design)
- [Progression System](#progression-system)
- [User Interface](#user-interface)
- [Visual Design](#visual-design)
- [Audio Design](#audio-design)
- [Accessibility](#accessibility)

---

## Core Gameplay

### Game Loop

```
┌──────────────────────────────────────┐
│  1. Connect Wallet                   │
│  2. Choose Game Mode (Free/Paid)     │
│  3. Pay Entry Fee (if paid mode)     │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│  4. Enter Arena                      │
│     - Spawn at random location       │
│     - 3 HP, no weapons needed        │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│  5. Gameplay Loop                    │
│     - Move with WASD                 │
│     - Aim with mouse                 │
│     - Shoot with click               │
│     - Kill or be killed              │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│  6. Death                            │
│     - Killer receives bounty         │
│     - You earn BATTLE tokens         │
│     - Option to respawn (pay again)  │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│  7. View Stats & Governance          │
│     - Check earnings                 │
│     - View BATTLE balance            │
│     - Vote on proposals              │
└──────────────────────────────────────┘
```

### Core Pillars

**1. Accessibility**
- Browser-based, no downloads
- Simple controls (WASD + mouse)
- 30-second learning curve
- Free practice mode

**2. Skill-Based**
- No pay-to-win mechanics
- Pure aim and movement skill
- Strategic positioning matters
- Knowledge of map layout helps

**3. Fair Monetization**
- Entry fees = prize pools
- Transparent blockchain payouts
- No hidden costs
- Clear risk/reward

**4. Community Governance**
- Players control treasury
- Democratic decision-making
- Collective ownership
- Aligned incentives

---

## Game Modes

### Mode 1: Free Play (Testnet)

**Purpose:** Onboarding and practice

**Specifications:**
- Network: Paseo Passet Hub (testnet parachain)
- Entry Fee: 0 PAS (testnet tokens from faucet)
- Rewards: Testnet BATTLE tokens
- Features: Full game functionality
- Respawn: Unlimited, instant
- Execution: pallet-revive with RISC-V

**Benefits:**
- Risk-free learning
- Test governance mechanics
- Experiment with strategy
- Build confidence

**Limitations:**
- Testnet tokens have no value
- Separate leaderboards
- Cannot transfer to mainnet
- May have more lag

**Use Cases:**
- New player tutorial
- Testing new strategies
- Governance education
- Community events

---

### Mode 2: Casual Arena (Low Stakes)

**Purpose:** Accessible play-to-earn

**Specifications:**
- Network: Paseo Passet Hub (testnet - will move to Asset Hub mainnet)
- Entry Fee: 1 DOT (~$3)
- Reward per Kill: 0.5 DOT
- BATTLE Earned: Standard rate
- Respawn Cost: 1 DOT
- Execution: ink! v6 contracts on pallet-revive

**Entry Fee Distribution:**
```
1.00 DOT Entry Fee
├─ 0.70 DOT (70%) → Bounty on your head
├─ 0.20 DOT (20%) → Community Treasury
└─ 0.10 DOT (10%) → Protocol fee
```

**Typical Session:**
```
Player enters with 1 DOT
Gets 2 kills → Earns 1.00 DOT
Gets killed → Loses bounty (0.70 DOT)
Net profit: +0.30 DOT (before original stake)
Plus: 20 BATTLE tokens earned
```

**Target Audience:**
- Casual gamers
- New to crypto gaming
- Risk-averse players
- Social players

---

### Mode 3: High Stakes Arena (High Stakes)

**Purpose:** Competitive play-to-earn

**Specifications:**
- Network: Polkadot mainnet
- Entry Fee: 10 DOT (~$30)
- Reward per Kill: 5 DOT
- BATTLE Earned: 2x standard rate
- Respawn Cost: 10 DOT

**Entry Fee Distribution:**
```
10.00 DOT Entry Fee
├─ 7.00 DOT (70%) → Bounty on your head
├─ 2.00 DOT (20%) → Community Treasury
└─ 1.00 DOT (10%) → Protocol fee
```

**Competitive Features:**
- Ranked matchmaking (future)
- Seasonal leaderboards
- Tournament qualifications
- Pro player status

**Target Audience:**
- Competitive gamers
- Experienced players
- High-skill players
- Content creators (streamers)

---

### Future Modes (Post-Hackathon)

**Team Deathmatch**
- 5v5 teams
- Shared prize pool
- Clan governance

**Tournament Mode**
- Bracket-style elimination
- Large prize pools
- Treasury-funded

**Custom Lobbies**
- Private matches
- Custom rules
- Practice with friends

---

## Player Mechanics

### Movement

**Base Movement:**
- Speed: 200 pixels/second
- Acceleration: Instant (arcade-style)
- Direction: 8-directional (WASD)
- Friction: None (slide-free)

**Controls:**
```
W = Move Up
A = Move Left
S = Move Down
D = Move Right

Diagonal movement:
W+D = Move Northeast
W+A = Move Northwest
S+D = Move Southeast
S+A = Move Southwest
```

**Movement Feel:**
- Responsive (no input lag)
- Predictable (no momentum)
- Fair (same speed for all players)
- Smooth (interpolation on client)

### Aiming

**Mouse Controls:**
- Cursor position = aim direction
- Auto-rotate player sprite to face cursor
- Visible aim indicator (crosshair)
- Range indicator (optional)

**Shooting:**
- Left Click = Fire bullet
- Fire Rate: 1 bullet per second (1000ms cooldown)
- Bullet Speed: 400 pixels/second
- Bullet Range: 500 pixels (then despawns)

**Visual Feedback:**
- Recoil animation on shoot
- Muzzle flash effect
- Bullet trail
- Cooldown indicator

### Health System

**HP Mechanics:**
- Starting HP: 3
- Damage per Hit: 1
- No HP regeneration
- No healing items
- Death at 0 HP

**Damage Feedback:**
- Screen shake on hit
- Red damage indicator
- Sound effect
- HP bar update

**Death Mechanics:**
- Instant death at 0 HP
- 2-second death animation
- Killer notification
- Bounty transfer
- Respawn option

### Player States

**Alive:**
- Can move, aim, shoot
- Visible to all players
- Has bounty on head
- Earns BATTLE tokens

**Dead:**
- Spectate mode
- View stats
- Respawn option (costs entry fee)
- Exit to lobby option

**Invulnerable (Spawn):**
- 3-second grace period
- Cannot be damaged
- Can move but cannot shoot
- Visible spawn shield effect

---

## Combat System

### Weapon System

**Simplified Design:**
- No weapon pickups
- Everyone has same "gun"
- Skill = aim + movement
- No ammo limits

**Weapon Stats:**
```
Fire Rate: 1 shot/second
Bullet Speed: 400 px/s
Bullet Damage: 1 HP
Bullet Range: 500 px
Bullet Size: 5px radius
Player Size: 20px radius
```

### Hit Detection

**Collision System:**
- Server-authoritative (prevent cheating)
- Circular hitboxes
- Continuous collision detection
- No bullet penetration

**Hit Confirmation:**
```
1. Player clicks to shoot
2. Client sends shoot command to server
3. Server validates:
   - Player is alive
   - Cooldown elapsed
   - Has bullets in clip (if implemented)
4. Server creates bullet
5. Server updates all clients
6. Clients render bullet
7. Server checks collisions each tick
8. On hit:
   - Apply damage
   - Send hit confirmation
   - Client plays hit effects
```

**Latency Compensation:**
- Client-side prediction for local player
- Server reconciliation
- Lag compensation (rewind time for hit detection)
- Smooth interpolation for other players

### Combat Strategies

**Offensive:**
- **Rushing:** Close distance quickly, rely on aim
- **Kiting:** Keep distance, shoot while retreating
- **Flanking:** Attack from unexpected angles
- **Ambush:** Hide and surprise attack

**Defensive:**
- **Cover Usage:** Hide behind obstacles
- **Dodging:** Serpentine movement to avoid bullets
- **Spacing:** Maintain optimal distance
- **Awareness:** Watch for threats from all sides

**Advanced:**
- **Prediction:** Shoot where enemy will be
- **Baiting:** Lure enemies into traps
- **Positioning:** Control high-traffic areas
- **Resource Management:** Know when to engage/disengage

---

## Map Design

### Map Overview

**Size:** 5000 × 5000 pixels
**Style:** Infinite scrolling (like agar.io)
**Theme:** Polkadot pink aesthetic

### Map Elements

**1. Open Areas**
- 40% of map
- High-risk, high-reward combat zones
- Center of map (high traffic)
- Multiple sightlines

**2. Obstacles (Walls)**
- 20% of map
- Block movement and bullets
- Strategic cover
- Create chokepoints

**Design:**
```
■■■■■
■   ■  ← Wall structure
■■■■■
```

**3. Bushes (Hide Spots)**
- 15% of map
- Allow movement through
- Block bullets
- Provide concealment (not cover)

**Visual:**
```
≋≋≋≋≋
≋   ≋  ← Bush (semi-transparent)
≋≋≋≋≋
```

**4. Tunnels (Portals)**
- 5% of map
- Instant teleportation
- Paired entrances/exits
- Strategic rotation

**Mechanic:**
```
Portal A ◄─────────► Portal B
       (instant travel)
```

**5. Danger Zones (Future)**
- Moving hazards
- Environmental damage
- Force player movement
- Dynamic gameplay

### Map Layout Philosophy

**Flow:**
```
┌────────────────────────────────┐
│  Safe Periphery (Low Traffic)  │
│  ┌──────────────────────────┐  │
│  │  Mid Zone (Some Combat)  │  │
│  │  ┌──────────────────┐    │  │
│  │  │  Hot Zone        │    │  │
│  │  │  (High Risk)     │    │  │
│  │  │  (High Reward)   │    │  │
│  │  └──────────────────┘    │  │
│  └──────────────────────────┘  │
└────────────────────────────────┘
```

**Design Principles:**
1. **No Safe Spaces** - Danger everywhere
2. **Risk/Reward** - Center has more players = more kills
3. **Strategic Variety** - Multiple viable playstyles
4. **Visual Clarity** - Always understand what's happening
5. **Performance** - Runs smoothly even with many players

### Procedural Generation (Future)

**Dynamic Elements:**
- Obstacle placement varies per session
- Portal locations randomized
- Bush distribution changes
- Keeps gameplay fresh

---

## Progression System

### BATTLE Token Earning

**Base Earning Rates:**

| Action | BATTLE Tokens | Notes |
|--------|--------------|-------|
| Match Participation | 10 | Just for playing |
| Kill | 5 | Per elimination |
| 1st Place (survival) | 100 | Last alive in session |
| 2nd Place | 50 | Second-last alive |
| 3rd Place | 25 | Third-last alive |
| Death | 0 | No penalty |

**Multipliers:**

| Factor | Multiplier | Conditions |
|--------|-----------|------------|
| High Stakes Mode | 2x | 10 DOT entry fee |
| Kill Streak (3+) | 1.5x | Consecutive kills without death |
| Underdog Bonus | 1.3x | Kill higher-ranked player |
| Headshot (future) | 1.2x | Precise aim bonus |

**Example Calculation:**
```
Casual Arena Match:
├─ Participation: 10 BATTLE
├─ 3 Kills: 15 BATTLE
└─ Kill Streak Bonus: +7 BATTLE (1.5x on last 2 kills)
Total: 32 BATTLE tokens earned
```

### Reputation System (Future)

**Player Levels:**
- Novice (0-100 BATTLE)
- Amateur (100-500 BATTLE)
- Skilled (500-1,000 BATTLE)
- Expert (1,000-5,000 BATTLE)
- Master (5,000-10,000 BATTLE)
- Legend (10,000+ BATTLE)

**Level Benefits:**
- Cosmetic rewards (unique player skins)
- Higher proposal submission limits
- Early access to new features
- Recognition badges

### Leaderboards

**Categories:**
1. **Total Kills** - All-time eliminations
2. **K/D Ratio** - Kills per death
3. **Earnings** - Total DOT earned
4. **BATTLE Holdings** - Governance power
5. **Win Rate** - % of matches where placed top 3
6. **Treasury Contributor** - Most governance participation

**Seasons:**
- Monthly seasons
- Seasonal rewards (funded by treasury?)
- Prestige system (keep progress)
- Seasonal leaderboard fame

---

## User Interface

### HUD (Heads-Up Display)

**Layout:**
```
┌─────────────────────────────────────────┐
│ HP: ❤️❤️❤️  Kills: 5  BATTLE: 150      │  ← Top Bar
├─────────────────────────────────────────┤
│                                         │
│                                         │
│           GAME AREA                     │
│                                         │
│                                         │
├─────────────────────────────────────────┤
│ Players: 23  [Mini-map]  Ping: 45ms    │  ← Bottom Bar
└─────────────────────────────────────────┘
```

**Top Bar:**
- Health (hearts)
- Current kills
- BATTLE earned this session
- Cooldown indicator (shooting)

**Bottom Bar:**
- Player count
- Mini-map (future)
- Network latency
- Settings button

**Kill Feed:**
```
┌─────────────────────┐
│ Player A killed     │  ← Recent
│ Player B            │
│                     │
│ Player C killed     │
│ YOU                 │  ← Older
└─────────────────────┘
```

### Menu System

**Main Menu:**
```
┌──────────────────────────────┐
│      DOT ARENA               │
│                              │
│  [Free Play]                 │
│  [Casual Arena] - 1 DOT      │
│  [High Stakes] - 10 DOT      │
│                              │
│  [Leaderboards]              │
│  [Governance]                │
│  [Settings]                  │
│                              │
│  Wallet: 0x123...456         │
│  BATTLE: 1,250               │
└──────────────────────────────┘
```

**Death Screen:**
```
┌──────────────────────────────┐
│     YOU WERE ELIMINATED      │
│                              │
│  Killed by: PlayerX          │
│  Survived: 3:45              │
│  Kills: 2                    │
│  Earned: +20 BATTLE          │
│                              │
│  [Respawn - 1 DOT]           │
│  [Exit to Lobby]             │
└──────────────────────────────┘
```

### Wallet Integration

**Connection Flow:**
```
1. Click "Connect Wallet"
2. Choose wallet (SubWallet/Talisman)
3. Approve connection
4. Display balance & address
5. Ready to play
```

**Transaction Prompts:**
```
┌──────────────────────────────┐
│   Confirm Transaction        │
│                              │
│  Entry Fee: 1 DOT            │
│  Destination: Game Contract  │
│  Gas: ~0.001 DOT             │
│                              │
│  [Approve] [Cancel]          │
└──────────────────────────────┘
```

---

## Visual Design

### Art Style

**Aesthetic:** Minimal, modern, on-brand

**Color Palette:**
```
Primary: #E6007A (Polkadot Pink)
Secondary: #552BBF (Polkadot Purple)
Accent: #FF1B8D (Bright Pink)
Dark: #1A1A1A (Near Black)
Light: #FFFFFF (White)

Gradients:
Background: radial-gradient(#FF1B8D, #E6007A)
UI Elements: linear-gradient(#552BBF, #E6007A)
```

### Player Design

**The Polkadot Dot:**
```
      ●
    ●   ●
  ●   ○   ●  ← 6 dots in circle
    ●   ●
      ●
```

**Specifications:**
- Base size: 40×40 pixels
- 6 dots arranged in hexagon
- Center is hollow
- Rotation animation (gentle spin)
- Colored based on team/player (future)

**States:**
- Normal: Polkadot pink
- Damaged: Flash red briefly
- Invulnerable: Blue shield overlay
- Dead: Explode into dots

### Environment Design

**Map Background:**
```css
background: radial-gradient(
  circle at 50% 50%,
  #FF1B8D 0%,
  #E6007A 50%,
  #B0005F 100%
);
```

**Grid Overlay (subtle):**
- 100×100 pixel grid
- 5% opacity
- Helps with spatial awareness

**Obstacles:**
- Walls: Dark pink (#B0005F), solid
- Bushes: Leafy texture, semi-transparent
- Tunnels: Glowing portal effect

### UI Style

**Glassmorphism:**
```css
.ui-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}
```

**Typography:**
- Primary Font: Inter (clean, modern)
- Monospace: JetBrains Mono (addresses, numbers)
- Heading: Bold 600+
- Body: Regular 400

---

## Audio Design

### Sound Effects

**Essential Sounds:**

| Action | Sound | Description |
|--------|-------|-------------|
| Shoot | Pew! | Laser-like, satisfying |
| Hit Enemy | Thwack! | Impact confirmation |
| Get Hit | Oof! | Damage feedback |
| Death | Explosion | Player eliminated |
| Kill | Cha-ching! | Reward notification |
| Spawn | Whoosh | Entering arena |
| UI Click | Click | Button feedback |

**Audio Principles:**
- Clear audio cues
- Not annoying (can play for hours)
- Mutable individually
- Low file sizes

### Music (Optional)

**Background Music:**
- Electronic/synthwave
- Low-key, non-intrusive
- Loops seamlessly
- Mutable
- Tempo increases in intense moments?

**Menu Music:**
- Calm, welcoming
- Polkadot brand feel
- Sets the mood

---

## Accessibility

### Visual Accessibility

**Colorblind Modes:**
- Protanopia (red-blind)
- Deuteranopia (green-blind)
- Tritanopia (blue-blind)
- High contrast mode

**UI Scaling:**
- 100% (default)
- 125% (medium)
- 150% (large)
- 200% (extra large)

**Text:**
- Minimum 14px font size
- Clear contrast ratios (WCAG AA)
- Adjustable UI scale

### Control Accessibility

**Alternative Controls:**
- WASD (default)
- Arrow keys (alternative)
- Custom key binding (future)
- Gamepad support (future)

**Assistive Features:**
- Auto-aim assistance (opt-in)
- Aim sensitivity adjustment
- Movement speed options (accessibility mode)

### Cognitive Accessibility

**Tutorials:**
- Interactive tutorial
- Video guides
- Text guides
- Practice mode

**UI Simplicity:**
- Clear labels
- Tooltips on hover
- No flashing effects (seizure warning)
- Pause functionality (single-player modes)

### Platform Accessibility

**Browser Support:**
- Chrome (recommended)
- Firefox
- Safari
- Edge

**Device Support:**
- Desktop (primary)
- Tablet (supported)
- Mobile (future)

**Internet Speed:**
- Minimum: 1 Mbps
- Recommended: 5+ Mbps
- Adaptive quality settings

---

## Gameplay Balancing

### Combat Balance

**Time-to-Kill (TTK):**
- 3 seconds (3 hits)
- Allows for reaction
- Skill-based outcomes
- Not too punishing

**Spawn Balance:**
- Random locations
- Never near other players
- Grace period prevents spawn camping
- Fair start each life

### Economic Balance

**Entry Fee Tuning:**
```
Goal: Average player breaks even over 10 games

Scenario: Player wins 30% of engagements
├─ 10 games × 1 DOT = 10 DOT spent
├─ 3 kills per game average = 1.5 DOT earned per game
└─ 10 games × 1.5 DOT = 15 DOT earned
Result: +5 DOT profit (50% ROI)
```

**Considerations:**
- Top 20% of players earn significantly
- Middle 60% break even or small profit
- Bottom 20% lose money (but learn)
- Free mode allows skill building

---

Next: [Technical Architecture →](./03-TECHNICAL-ARCHITECTURE.md)
