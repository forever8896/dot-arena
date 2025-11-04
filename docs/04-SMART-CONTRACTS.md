# Smart Contracts Documentation

## Table of Contents
- [Overview](#overview)
- [ink! v6 and pallet-revive](#ink-v6-and-pallet-revive)
- [Contract Architecture](#contract-architecture)
- [GameRegistry Contract](#gameregistry-contract)
- [Treasury Contract](#treasury-contract)
- [BattleToken Contract](#battletoken-contract)
- [Contract Interactions](#contract-interactions)
- [Deployment Guide](#deployment-guide)
- [Testing Strategy](#testing-strategy)
- [Security Considerations](#security-considerations)

---

## Overview

DOT ARENA uses three main ink! v6 smart contracts deployed on Paseo Passet Hub parachain:

| Contract | Purpose | Complexity |
|----------|---------|------------|
| **GameRegistry** | Entry fees, kill rewards, player tracking | Medium |
| **Treasury** | DAO governance, proposal management | High |
| **BattleToken** | Soulbound governance tokens | Low |

---

## ink! v6 and pallet-revive

### What is ink! v6?

ink! v6 is a major upgrade that introduces:

**RISC-V Bytecode Compilation:**
- Contracts compile to RISC-V bytecode (`.polkavm` files)
- Executed by `pallet-revive` instead of the old Contracts pallet
- More efficient execution and smaller contract sizes
- Better optimization potential

**Multi-ABI Support:**
- ink! ABI (native, using SCALE codec)
- Solidity ABI (for Ethereum tool compatibility)
- Can generate both simultaneously

**pallet-revive Execution:**
- Language-agnostic smart contract execution
- Supports multiple languages compiling to RISC-V
- Deterministic, sandboxed execution
- Gas metering for safety

### Paseo Passet Hub Deployment

**Why Paseo Passet Hub?**
- Testnet parachain with pallet-revive enabled
- Full ink! v6 support with RISC-V execution
- Real parachain environment (not local dev node)
- Free testnet tokens from faucet
- Production-like testing environment

**Key Details:**
- RPC Endpoint: `wss://paseo-asset-hub-rpc.polkadot.io`
- Chain: Paseo Passet Hub (parachain on Paseo relay chain)
- Execution: pallet-revive with RISC-V bytecode
- Faucet: `https://faucet.polkadot.io/paseo`

### Design Philosophy

1. **Simplicity First**
   - Minimal complexity
   - Clear responsibilities
   - Easy to audit

2. **Gas Optimization**
   - Efficient data structures
   - Minimize storage writes
   - Batch operations where possible
   - RISC-V provides better optimization than Wasm

3. **Upgradability Consideration**
   - Proxy pattern for future upgrades
   - Version tracking
   - Migration paths

4. **Security by Design**
   - Access control
   - Reentrancy guards
   - Input validation
   - pallet-revive sandboxing

---

## Contract Architecture

### Contract Dependency Graph

```
┌─────────────────────────────────────────────┐
│          GameRegistry Contract              │
│                                             │
│  • Entry fee management                     │
│  • Kill reward distribution                 │
│  • Player state tracking                    │
└───────────┬─────────────────────────────────┘
            │
            │ Cross-contract calls
            │
            ├──────────────┬──────────────────┐
            │              │                  │
            ▼              ▼                  ▼
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│ Treasury       │  │ BattleToken    │  │ Protocol       │
│                │  │                │  │ Fee Receiver   │
│ • Store 20%    │  │ • Mint tokens  │  │ • Receives 10% │
│   of fees      │  │ • Track balance│  │                │
└────────────────┘  └────────────────┘  └────────────────┘
```

### File Structure

```
contracts/
├── game-registry/
│   ├── Cargo.toml
│   ├── lib.rs                  // Main contract
│   └── tests/
│       └── integration.rs
├── treasury/
│   ├── Cargo.toml
│   ├── lib.rs                  // Main contract
│   └── tests/
│       └── governance.rs
├── battle-token/
│   ├── Cargo.toml
│   ├── lib.rs                  // Main contract
│   └── tests/
│       └── soulbound.rs
└── shared/
    ├── errors.rs               // Common errors
    └── types.rs                // Shared types
```

---

## GameRegistry Contract

### Purpose

The GameRegistry contract is the financial heart of DOT ARENA. It handles:
- Entry fee collection and distribution
- Kill reward payouts
- BATTLE token minting
- Player state management

### Storage Structure

```rust
#[ink(storage)]
pub struct GameRegistry {
    /// Contract owner (can update authorized oracle)
    owner: AccountId,

    /// Authorized game server oracle (can report kills)
    oracle: AccountId,

    /// Treasury contract address
    treasury: AccountId,

    /// Protocol fee recipient
    protocol_address: AccountId,

    /// BattleToken contract address
    battle_token: AccountId,

    /// Active players (address => PlayerEntry)
    active_players: Mapping<AccountId, PlayerEntry>,

    /// Player statistics (address => PlayerStats)
    player_stats: Mapping<AccountId, PlayerStats>,

    /// Total treasury accumulated
    total_treasury: Balance,

    /// Total protocol fees collected
    total_protocol_fees: Balance,

    /// Game mode settings
    casual_entry_fee: Balance,
    high_stakes_entry_fee: Balance,

    /// Paused state (emergency)
    paused: bool,
}
```

### Data Structures

```rust
/// Player entry record
#[derive(scale::Encode, scale::Decode, Clone, Debug)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct PlayerEntry {
    /// Entry fee paid
    entry_fee: Balance,
    /// Timestamp of entry
    timestamp: u64,
    /// Game mode
    mode: GameMode,
    /// Bounty available (70% of entry)
    bounty: Balance,
}

/// Player lifetime statistics
#[derive(scale::Encode, scale::Decode, Clone, Debug, Default)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct PlayerStats {
    /// Total kills
    kills: u32,
    /// Total deaths
    deaths: u32,
    /// Total earnings (in lamports)
    total_earnings: Balance,
    /// Total BATTLE tokens earned
    total_battle_tokens: u128,
    /// First played timestamp
    first_played: u64,
    /// Last played timestamp
    last_played: u64,
}

/// Game mode enum
#[derive(scale::Encode, scale::Decode, Clone, Debug, PartialEq)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum GameMode {
    Casual,      // 1 DOT
    HighStakes,  // 10 DOT
}
```

### Core Functions

#### 1. Join Arena

```rust
/// Player joins the arena by paying entry fee
#[ink(message, payable)]
pub fn join_arena(&mut self, mode: GameMode) -> Result<(), Error> {
    // Check not paused
    if self.paused {
        return Err(Error::ContractPaused);
    }

    let caller = self.env().caller();
    let entry_fee = self.env().transferred_value();

    // Validate entry fee
    let required_fee = match mode {
        GameMode::Casual => self.casual_entry_fee,
        GameMode::HighStakes => self.high_stakes_entry_fee,
    };

    if entry_fee != required_fee {
        return Err(Error::IncorrectEntryFee);
    }

    // Check player not already active
    if self.active_players.contains(&caller) {
        return Err(Error::AlreadyInGame);
    }

    // Split entry fee
    let bounty = entry_fee * 70 / 100;       // 70%
    let treasury_cut = entry_fee * 20 / 100; // 20%
    let protocol_cut = entry_fee * 10 / 100; // 10%

    // Transfer treasury cut
    if self.env().transfer(self.treasury, treasury_cut).is_err() {
        return Err(Error::TransferFailed);
    }
    self.total_treasury += treasury_cut;

    // Transfer protocol cut
    if self.env().transfer(self.protocol_address, protocol_cut).is_err() {
        return Err(Error::TransferFailed);
    }
    self.total_protocol_fees += protocol_cut;

    // Create player entry
    let entry = PlayerEntry {
        entry_fee,
        timestamp: self.env().block_timestamp(),
        mode,
        bounty,
    };

    // Store entry
    self.active_players.insert(caller, &entry);

    // Update stats
    self.update_player_stats(caller, |stats| {
        if stats.first_played == 0 {
            stats.first_played = self.env().block_timestamp();
        }
        stats.last_played = self.env().block_timestamp();
    });

    // Emit event
    self.env().emit_event(PlayerJoined {
        player: caller,
        mode,
        entry_fee,
        timestamp: self.env().block_timestamp(),
    });

    Ok(())
}
```

#### 2. Record Kill

```rust
/// Oracle reports a kill (killer eliminated victim)
#[ink(message)]
pub fn record_kill(
    &mut self,
    killer: AccountId,
    victim: AccountId,
) -> Result<(), Error> {
    // Only oracle can call
    if self.env().caller() != self.oracle {
        return Err(Error::Unauthorized);
    }

    // Check not paused
    if self.paused {
        return Err(Error::ContractPaused);
    }

    // Get victim's entry
    let victim_entry = self.active_players
        .get(&victim)
        .ok_or(Error::PlayerNotFound)?;

    let bounty = victim_entry.bounty;
    let mode = victim_entry.mode;

    // Remove victim from active players
    self.active_players.remove(&victim);

    // Transfer bounty to killer
    if self.env().transfer(killer, bounty).is_err() {
        return Err(Error::TransferFailed);
    }

    // Calculate BATTLE tokens to mint
    let battle_tokens = self.calculate_battle_reward(mode, false);

    // Mint BATTLE tokens to killer
    // (Cross-contract call to BattleToken)
    self.mint_battle_tokens(killer, battle_tokens)?;

    // Update killer stats
    self.update_player_stats(killer, |stats| {
        stats.kills += 1;
        stats.total_earnings += bounty;
        stats.total_battle_tokens += battle_tokens;
    });

    // Update victim stats
    self.update_player_stats(victim, |stats| {
        stats.deaths += 1;
    });

    // Emit event
    self.env().emit_event(KillRecorded {
        killer,
        victim,
        bounty,
        battle_tokens,
        timestamp: self.env().block_timestamp(),
    });

    Ok(())
}
```

#### 3. Calculate BATTLE Reward

```rust
/// Calculate BATTLE tokens earned for an action
fn calculate_battle_reward(&self, mode: GameMode, is_participation: bool) -> u128 {
    if is_participation {
        // Base participation reward
        10
    } else {
        // Kill reward
        let base = 5;
        let multiplier = match mode {
            GameMode::Casual => 1,
            GameMode::HighStakes => 2,
        };
        base * multiplier
    }
}
```

### Events

```rust
#[ink(event)]
pub struct PlayerJoined {
    #[ink(topic)]
    player: AccountId,
    mode: GameMode,
    entry_fee: Balance,
    timestamp: u64,
}

#[ink(event)]
pub struct KillRecorded {
    #[ink(topic)]
    killer: AccountId,
    #[ink(topic)]
    victim: AccountId,
    bounty: Balance,
    battle_tokens: u128,
    timestamp: u64,
}

#[ink(event)]
pub struct PlayerLeft {
    #[ink(topic)]
    player: AccountId,
    refund: Balance,
    timestamp: u64,
}
```

### Error Types

```rust
#[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum Error {
    /// Caller is not authorized
    Unauthorized,
    /// Player not found in active players
    PlayerNotFound,
    /// Incorrect entry fee amount
    IncorrectEntryFee,
    /// Player already in game
    AlreadyInGame,
    /// Transfer failed
    TransferFailed,
    /// Contract is paused
    ContractPaused,
    /// Cross-contract call failed
    CrossContractCallFailed,
}
```

---

## Treasury Contract

### Purpose

The Treasury contract manages community funds and governance:
- Stores 20% of all entry fees
- Proposal submission and management
- Voting mechanism
- Fund distribution based on votes

### Storage Structure

```rust
#[ink(storage)]
pub struct Treasury {
    /// Contract owner
    owner: AccountId,

    /// GameRegistry contract (can deposit funds)
    game_registry: AccountId,

    /// BattleToken contract (for checking voting power)
    battle_token: AccountId,

    /// Minimum BATTLE tokens to submit proposal
    min_proposal_stake: u128,

    /// Next proposal ID
    next_proposal_id: u32,

    /// All proposals (ID => Proposal)
    proposals: Mapping<u32, Proposal>,

    /// Votes (proposal_id, voter) => Vote
    votes: Mapping<(u32, AccountId), Vote>,

    /// Total treasury balance
    total_balance: Balance,

    /// Voting period duration (in milliseconds)
    voting_period: u64,
}
```

### Data Structures

```rust
/// Proposal structure
#[derive(scale::Encode, scale::Decode, Clone, Debug)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct Proposal {
    /// Proposal ID
    id: u32,
    /// Proposer address
    proposer: AccountId,
    /// Title (max 100 chars)
    title: String,
    /// Description (max 1000 chars)
    description: String,
    /// Amount requested
    amount: Balance,
    /// Recipient address
    recipient: AccountId,
    /// Category
    category: ProposalCategory,
    /// Total votes for
    votes_for: u128,
    /// Total votes against
    votes_against: u128,
    /// Voting end time
    end_time: u64,
    /// Execution status
    status: ProposalStatus,
    /// Created timestamp
    created_at: u64,
}

/// Proposal categories
#[derive(scale::Encode, scale::Decode, Clone, Debug, PartialEq)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum ProposalCategory {
    Tournament,    // Tournament prizes
    Development,   // Game development
    Grant,         // Ecosystem grants
    Reward,        // Player rewards
    PublicGood,    // Public goods funding
}

/// Proposal status
#[derive(scale::Encode, scale::Decode, Clone, Debug, PartialEq)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum ProposalStatus {
    Active,        // Currently voting
    Passed,        // Passed but not executed
    Executed,      // Executed successfully
    Rejected,      // Voting failed
    Canceled,      // Canceled by proposer
}

/// Vote record
#[derive(scale::Encode, scale::Decode, Clone, Debug)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct Vote {
    /// Support (true = for, false = against)
    support: bool,
    /// Voting power (BATTLE tokens)
    weight: u128,
    /// Conviction multiplier (1-16)
    conviction: u8,
    /// Effective weight (weight * conviction)
    effective_weight: u128,
    /// Timestamp
    timestamp: u64,
}
```

### Core Functions

#### 1. Submit Proposal

```rust
/// Submit a new treasury proposal
#[ink(message)]
pub fn submit_proposal(
    &mut self,
    title: String,
    description: String,
    amount: Balance,
    recipient: AccountId,
    category: ProposalCategory,
) -> Result<u32, Error> {
    let caller = self.env().caller();

    // Validate inputs
    if title.len() > 100 {
        return Err(Error::TitleTooLong);
    }
    if description.len() > 1000 {
        return Err(Error::DescriptionTooLong);
    }
    if amount == 0 {
        return Err(Error::InvalidAmount);
    }
    if amount > self.total_balance {
        return Err(Error::InsufficientTreasuryFunds);
    }

    // Check proposer has minimum BATTLE tokens
    let battle_balance = self.get_battle_balance(caller)?;
    if battle_balance < self.min_proposal_stake {
        return Err(Error::InsufficientBattleTokens);
    }

    // Create proposal
    let proposal = Proposal {
        id: self.next_proposal_id,
        proposer: caller,
        title,
        description,
        amount,
        recipient,
        category,
        votes_for: 0,
        votes_against: 0,
        end_time: self.env().block_timestamp() + self.voting_period,
        status: ProposalStatus::Active,
        created_at: self.env().block_timestamp(),
    };

    // Store proposal
    self.proposals.insert(self.next_proposal_id, &proposal);

    // Emit event
    self.env().emit_event(ProposalSubmitted {
        proposal_id: self.next_proposal_id,
        proposer: caller,
        amount,
        category,
    });

    // Increment proposal ID
    let proposal_id = self.next_proposal_id;
    self.next_proposal_id += 1;

    Ok(proposal_id)
}
```

#### 2. Vote on Proposal

```rust
/// Vote on a proposal
#[ink(message)]
pub fn vote(
    &mut self,
    proposal_id: u32,
    support: bool,
    conviction: u8,
) -> Result<(), Error> {
    let caller = self.env().caller();

    // Validate conviction (1-16, powers of 2)
    if conviction == 0 || conviction > 16 || !conviction.is_power_of_two() {
        return Err(Error::InvalidConviction);
    }

    // Get proposal
    let mut proposal = self.proposals
        .get(&proposal_id)
        .ok_or(Error::ProposalNotFound)?;

    // Check proposal is active
    if proposal.status != ProposalStatus::Active {
        return Err(Error::ProposalNotActive);
    }

    // Check voting period not ended
    if self.env().block_timestamp() >= proposal.end_time {
        return Err(Error::VotingPeriodEnded);
    }

    // Get voter's BATTLE balance
    let balance = self.get_battle_balance(caller)?;
    if balance == 0 {
        return Err(Error::NoVotingPower);
    }

    // Check if already voted
    if self.votes.contains(&(proposal_id, caller)) {
        return Err(Error::AlreadyVoted);
    }

    // Calculate effective weight with conviction
    let effective_weight = balance * conviction as u128;

    // Create vote record
    let vote = Vote {
        support,
        weight: balance,
        conviction,
        effective_weight,
        timestamp: self.env().block_timestamp(),
    };

    // Update proposal vote counts
    if support {
        proposal.votes_for += effective_weight;
    } else {
        proposal.votes_against += effective_weight;
    }

    // Store vote
    self.votes.insert((proposal_id, caller), &vote);
    self.proposals.insert(proposal_id, &proposal);

    // Emit event
    self.env().emit_event(VoteCast {
        proposal_id,
        voter: caller,
        support,
        weight: effective_weight,
    });

    Ok(())
}
```

#### 3. Execute Proposal

```rust
/// Execute a passed proposal
#[ink(message)]
pub fn execute_proposal(&mut self, proposal_id: u32) -> Result<(), Error> {
    // Get proposal
    let mut proposal = self.proposals
        .get(&proposal_id)
        .ok_or(Error::ProposalNotFound)?;

    // Check voting period ended
    if self.env().block_timestamp() < proposal.end_time {
        return Err(Error::VotingPeriodNotEnded);
    }

    // Check not already executed
    if proposal.status != ProposalStatus::Active {
        return Err(Error::ProposalAlreadyProcessed);
    }

    // Check if passed (simple majority for MVP)
    let passed = proposal.votes_for > proposal.votes_against;

    if passed {
        // Transfer funds
        if self.env().transfer(proposal.recipient, proposal.amount).is_err() {
            return Err(Error::TransferFailed);
        }

        // Update balance
        self.total_balance -= proposal.amount;

        // Update status
        proposal.status = ProposalStatus::Executed;

        // Emit event
        self.env().emit_event(ProposalExecuted {
            proposal_id,
            amount: proposal.amount,
            recipient: proposal.recipient,
        });
    } else {
        // Proposal rejected
        proposal.status = ProposalStatus::Rejected;

        // Emit event
        self.env().emit_event(ProposalRejected {
            proposal_id,
        });
    }

    // Update proposal
    self.proposals.insert(proposal_id, &proposal);

    Ok(())
}
```

### Governance Parameters

```rust
/// Voting thresholds by proposal size
pub fn get_voting_threshold(&self, amount: Balance) -> u8 {
    if amount < 500_000_000_000 {        // < 500 DOT
        50  // 50% approval
    } else if amount < 2_000_000_000_000 { // < 2000 DOT
        60  // 60% approval
    } else {
        66  // 66% approval (supermajority)
    }
}

/// Voting period by proposal size
pub fn get_voting_period(&self, amount: Balance) -> u64 {
    if amount < 500_000_000_000 {
        7 * 24 * 60 * 60 * 1000  // 7 days
    } else if amount < 2_000_000_000_000 {
        14 * 24 * 60 * 60 * 1000  // 14 days
    } else {
        21 * 24 * 60 * 60 * 1000  // 21 days
    }
}
```

---

## BattleToken Contract

### Purpose

Soulbound governance token that cannot be transferred:
- Earned through gameplay
- Used for voting power
- Non-transferable (soulbound)
- Tracks player governance participation

### Storage Structure

```rust
#[ink(storage)]
pub struct BattleToken {
    /// Contract owner
    owner: AccountId,

    /// GameRegistry (authorized minter)
    game_registry: AccountId,

    /// Token balances
    balances: Mapping<AccountId, u128>,

    /// Locked tokens (for conviction voting)
    /// (account, unlock_time) => amount
    locked: Mapping<(AccountId, u64), u128>,

    /// Total supply
    total_supply: u128,
}
```

### Core Functions

```rust
/// Mint tokens (only GameRegistry)
#[ink(message)]
pub fn mint(&mut self, to: AccountId, amount: u128) -> Result<(), Error> {
    if self.env().caller() != self.game_registry {
        return Err(Error::Unauthorized);
    }

    let balance = self.balances.get(&to).unwrap_or(0);
    self.balances.insert(to, &(balance + amount));
    self.total_supply += amount;

    self.env().emit_event(Transfer {
        from: None,
        to: Some(to),
        value: amount,
    });

    Ok(())
}

/// Get balance
#[ink(message)]
pub fn balance_of(&self, owner: AccountId) -> u128 {
    self.balances.get(&owner).unwrap_or(0)
}

/// Transfer disabled (soulbound)
#[ink(message)]
pub fn transfer(&mut self, _to: AccountId, _value: u128) -> Result<(), Error> {
    Err(Error::TokensSoulbound)
}

/// Lock tokens for conviction voting
#[ink(message)]
pub fn lock(&mut self, amount: u128, duration: u64) -> Result<(), Error> {
    let caller = self.env().caller();
    let balance = self.balance_of(caller);

    if balance < amount {
        return Err(Error::InsufficientBalance);
    }

    let unlock_time = self.env().block_timestamp() + duration;
    self.locked.insert((caller, unlock_time), &amount);

    self.env().emit_event(TokensLocked {
        account: caller,
        amount,
        unlock_time,
    });

    Ok(())
}
```

---

## Contract Interactions

### Cross-Contract Calls

```rust
// In GameRegistry: Call BattleToken.mint()
fn mint_battle_tokens(&mut self, to: AccountId, amount: u128) -> Result<(), Error> {
    use battle_token::BattleTokenRef;

    let mut token = BattleTokenRef::from_account_id(self.battle_token);
    token.mint(to, amount)
        .map_err(|_| Error::CrossContractCallFailed)?;

    Ok(())
}

// In Treasury: Query BattleToken.balance_of()
fn get_battle_balance(&self, account: AccountId) -> Result<u128, Error> {
    use battle_token::BattleTokenRef;

    let token = BattleTokenRef::from_account_id(self.battle_token);
    let balance = token.balance_of(account);

    Ok(balance)
}
```

---

## Deployment Guide

### Paseo Passet Hub Deployment

```bash
# 1. Get testnet tokens
pop faucet --address YOUR_ADDRESS
# Or visit: https://faucet.polkadot.io/paseo

# 2. Build contracts (generates RISC-V bytecode)
cd contracts/game-registry
cargo contract build
# Generates: target/ink/game_registry.polkavm

cd ../treasury
cargo contract build
# Generates: target/ink/treasury.polkavm

cd ../battle-token
cargo contract build
# Generates: target/ink/battle_token.polkavm

# 3. Deploy BattleToken first
cargo contract instantiate \
  --url wss://paseo-asset-hub-rpc.polkadot.io \
  --suri "YOUR_SEED_PHRASE" \
  --constructor new \
  --args "YOUR_OWNER_ADDRESS" \
  --execute
# Note: Executes on pallet-revive with RISC-V bytecode

# 4. Deploy Treasury
cargo contract instantiate \
  --url wss://paseo-asset-hub-rpc.polkadot.io \
  --suri "YOUR_SEED_PHRASE" \
  --constructor new \
  --args \
    "YOUR_OWNER_ADDRESS" \
    "<battle_token_address>" \
  --execute

# 5. Deploy GameRegistry
cargo contract instantiate \
  --url wss://paseo-asset-hub-rpc.polkadot.io \
  --suri "YOUR_SEED_PHRASE" \
  --constructor new \
  --args \
    "YOUR_OWNER_ADDRESS" \
    "YOUR_ORACLE_ADDRESS" \
    "<treasury_address>" \
    "<protocol_address>" \
    "<battle_token_address>" \
  --execute
```

### Using Pop CLI (Recommended)

```bash
# Pop CLI simplifies deployment
pop up contract --network paseo-asset-hub

# Interactive deployment wizard
# - Select contract to deploy
# - Auto-connects to Paseo Passet Hub
# - Guides through constructor arguments
# - Handles gas estimation
```

---

## Testing Strategy

### Unit Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use ink::env::test;

    #[ink::test]
    fn join_arena_works() {
        let mut contract = GameRegistry::new(...);

        let accounts = test::default_accounts();
        test::set_caller(accounts.bob);
        test::set_value_transferred(1_000_000_000_000); // 1 DOT

        assert!(contract.join_arena(GameMode::Casual).is_ok());

        // Verify player is active
        assert!(contract.active_players.contains(&accounts.bob));
    }

    #[ink::test]
    fn record_kill_works() {
        // Setup
        let mut contract = GameRegistry::new(...);

        // Both players join
        // ...

        // Oracle reports kill
        test::set_caller(contract.oracle);
        assert!(contract.record_kill(killer, victim).is_ok());

        // Verify bounty transferred
        // Verify BATTLE tokens minted
        // Verify stats updated
    }

    #[ink::test]
    fn unauthorized_kill_fails() {
        let mut contract = GameRegistry::new(...);

        test::set_caller(AccountId::from([0x02; 32])); // Not oracle

        assert_eq!(
            contract.record_kill(killer, victim),
            Err(Error::Unauthorized)
        );
    }
}
```

### Integration Tests

```rust
#[cfg(all(test, feature = "e2e-tests"))]
mod e2e_tests {
    use super::*;

    #[ink_e2e::test]
    async fn full_game_flow_works(mut client: ink_e2e::Client<C, E>) -> E2EResult<()> {
        // Deploy all contracts
        let battle_token = deploy_battle_token(&mut client).await;
        let treasury = deploy_treasury(&mut client, battle_token).await;
        let game_registry = deploy_game_registry(&mut client, treasury, battle_token).await;

        // Player 1 joins
        let player1 = client.create_and_fund_account(&ink_e2e::alice()).await;
        join_arena(&mut client, &player1, GameMode::Casual).await?;

        // Player 2 joins
        let player2 = client.create_and_fund_account(&ink_e2e::bob()).await;
        join_arena(&mut client, &player2, GameMode::Casual).await?;

        // Oracle reports kill
        record_kill(&mut client, player1.account_id, player2.account_id).await?;

        // Verify results
        let balance = get_balance(&client, player1.account_id).await?;
        assert!(balance > initial_balance);

        Ok(())
    }
}
```

---

## Security Considerations

### Access Control

```rust
/// Modifier pattern for oracle-only functions
fn ensure_oracle(&self) -> Result<(), Error> {
    if self.env().caller() != self.oracle {
        return Err(Error::Unauthorized);
    }
    Ok(())
}

/// Owner-only functions
fn ensure_owner(&self) -> Result<(), Error> {
    if self.env().caller() != self.owner {
        return Err(Error::Unauthorized);
    }
    Ok(())
}
```

### Reentrancy Protection

```rust
// Use Checks-Effects-Interactions pattern
pub fn record_kill(&mut self, killer: AccountId, victim: AccountId) -> Result<(), Error> {
    // 1. CHECKS
    self.ensure_oracle()?;
    let victim_entry = self.active_players.get(&victim).ok_or(Error::PlayerNotFound)?;

    // 2. EFFECTS
    let bounty = victim_entry.bounty;
    self.active_players.remove(&victim);
    self.update_stats(killer, victim);

    // 3. INTERACTIONS (external calls last)
    self.env().transfer(killer, bounty)?;
    self.mint_battle_tokens(killer, reward)?;

    Ok(())
}
```

### Integer Overflow Protection

```rust
// Use checked arithmetic
let bounty = entry_fee.checked_mul(70)
    .and_then(|v| v.checked_div(100))
    .ok_or(Error::ArithmeticOverflow)?;
```

### Emergency Pause

```rust
/// Pause contract in emergency
#[ink(message)]
pub fn pause(&mut self) -> Result<(), Error> {
    self.ensure_owner()?;
    self.paused = true;

    self.env().emit_event(ContractPaused {
        timestamp: self.env().block_timestamp(),
    });

    Ok(())
}

/// Resume contract
#[ink(message)]
pub fn unpause(&mut self) -> Result<(), Error> {
    self.ensure_owner()?;
    self.paused = false;

    self.env().emit_event(ContractUnpaused {
        timestamp: self.env().block_timestamp(),
    });

    Ok(())
}
```

---

Next: [Game Server →](./05-GAME-SERVER.md)
