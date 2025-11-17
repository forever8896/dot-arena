#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
mod dot_arena {
    use ink::storage::Mapping;
    use ink::primitives::U256;

    /// Player statistics (lifetime)
    #[ink::scale_derive(Encode, Decode, TypeInfo)]
    #[cfg_attr(feature = "std", derive(ink::storage::traits::StorageLayout))]
    #[derive(Clone, Debug, Default)]
    pub struct PlayerStats {
        /// Total kills (all time)
        total_kills: u32,
        /// Total rewards earned (all time)
        total_earned: U256,
    }

    #[ink(storage)]
    pub struct DotArena {
        /// Reward per kill (0.9 DOT = 9*10^9 units)
        reward_per_kill: U256,
        /// Dev fee percentage (10%)
        dev_fee_percent: u8,
        /// Dev accumulated funds
        dev_balance: U256,
        /// Player lifetime stats
        player_stats: Mapping<Address, PlayerStats>,
        /// Contract owner
        owner: Address,
        /// Server account authorized to record kills
        game_server: Option<Address>,
    }

    /// Events emitted by the contract
    #[ink(event)]
    pub struct KillRecorded {
        #[ink(topic)]
        killer: Address,
        #[ink(topic)]
        victim: Address,
        reward_paid: U256,
        timestamp: u64,
    }

    #[ink(event)]
    pub struct ContractFunded {
        #[ink(topic)]
        funder: Address,
        amount: U256,
    }

    /// Errors
    #[ink::scale_derive(Encode, Decode, TypeInfo)]
    #[derive(Debug, PartialEq, Eq)]
    pub enum Error {
        /// Not authorized
        Unauthorized,
        /// Transfer failed
        TransferFailed,
        /// Insufficient contract balance
        InsufficientBalance,
    }

    pub type Result<T> = core::result::Result<T, Error>;

    impl DotArena {
        /// Constructor
        #[ink(constructor)]
        pub fn new() -> Self {
            let caller = Self::env().caller();
            Self {
                reward_per_kill: U256::from(9_000_000_000u128), // 0.9 DOT (10 decimals)
                dev_fee_percent: 10,
                dev_balance: U256::from(0u128),
                player_stats: Mapping::default(),
                owner: caller,
                game_server: None,
            }
        }

        /// Set the game server address (only owner)
        #[ink(message)]
        pub fn set_game_server(&mut self, server: Address) -> Result<()> {
            if self.env().caller() != self.owner {
                return Err(Error::Unauthorized);
            }
            self.game_server = Some(server);
            Ok(())
        }

        /// Record a kill and pay reward immediately (only game server)
        /// This is the ONLY function the game needs to call!
        #[ink(message)]
        pub fn record_kill(
            &mut self,
            killer: Address,
            victim: Address,
        ) -> Result<()> {
            let caller = self.env().caller();
            if Some(caller) != self.game_server {
                return Err(Error::Unauthorized);
            }

            // Calculate rewards
            let total_reward = U256::from(10_000_000_000u128); // 1 DOT total per kill
            let dev_fee = (total_reward * U256::from(self.dev_fee_percent)) / U256::from(100u128);
            let player_reward = total_reward - dev_fee; // 0.9 DOT

            // Check contract has enough balance
            if self.env().balance() < total_reward {
                return Err(Error::InsufficientBalance);
            }

            // Update killer stats
            let mut killer_stats = self.player_stats.get(&killer).unwrap_or_default();
            killer_stats.total_kills += 1;
            killer_stats.total_earned += player_reward;
            self.player_stats.insert(&killer, &killer_stats);

            // Update dev balance tracking
            self.dev_balance += dev_fee;

            // Transfer reward immediately to killer
            if self.env().transfer(killer, player_reward).is_err() {
                return Err(Error::TransferFailed);
            }

            self.env().emit_event(KillRecorded {
                killer,
                victim,
                reward_paid: player_reward,
                timestamp: self.env().block_timestamp(),
            });

            Ok(())
        }

        /// Withdraw dev fees (only owner)
        #[ink(message)]
        pub fn withdraw_dev_fees(&mut self) -> Result<()> {
            if self.env().caller() != self.owner {
                return Err(Error::Unauthorized);
            }

            let amount = self.dev_balance;
            self.dev_balance = U256::from(0u128);

            if self.env().transfer(self.owner, amount).is_err() {
                return Err(Error::TransferFailed);
            }

            Ok(())
        }

        /// Fund the contract (anyone can fund it to support prize pool)
        #[ink(message, payable)]
        pub fn fund_contract(&mut self) -> Result<()> {
            let amount = self.env().transferred_value();

            self.env().emit_event(ContractFunded {
                funder: self.env().caller(),
                amount,
            });

            Ok(())
        }

        // === Query functions ===

        #[ink(message)]
        pub fn get_reward_per_kill(&self) -> U256 {
            self.reward_per_kill
        }

        #[ink(message)]
        pub fn get_player_stats(&self, player: Address) -> Option<(u32, U256)> {
            self.player_stats.get(&player)
                .map(|s| (s.total_kills, s.total_earned))
        }

        #[ink(message)]
        pub fn get_dev_balance(&self) -> U256 {
            self.dev_balance
        }

        #[ink(message)]
        pub fn get_contract_balance(&self) -> U256 {
            self.env().balance()
        }

        #[ink(message)]
        pub fn get_game_server(&self) -> Option<Address> {
            self.game_server
        }

        #[ink(message)]
        pub fn get_owner(&self) -> Address {
            self.owner
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        #[ink::test]
        fn new_works() {
            let contract = DotArena::new();
            assert_eq!(contract.get_reward_per_kill(), U256::from(9_000_000_000u128));
            assert_eq!(contract.dev_fee_percent, 10);
        }

        #[ink::test]
        fn record_kill_requires_server() {
            let mut contract = DotArena::new();

            // Should fail because caller is not game server
            let result = contract.record_kill(
                Address::from([0x01; 32]),
                Address::from([0x02; 32])
            );

            assert_eq!(result, Err(Error::Unauthorized));
        }
    }
}
