#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Env, Address};

// Issue 2: Smart Contract - Stellar Path Payments & Yield Allocation (Blend Integration)

#[contracttype]
pub enum DataKey {
    UserBalance(Address),
    TotalDeposits,
}

#[contract]
pub struct SmasageYieldRouter;

#[contractimpl]
impl SmasageYieldRouter {
    /// Initialize the contract and accept deposits in USDC.
    /// In a real implementation, this would handle token transfers and issue calls to the Blend Protocol.
    pub fn deposit(env: Env, from: Address, amount: i128, blend_percentage: u32, lp_percentage: u32) {
        from.require_auth();
        assert!(blend_percentage + lp_percentage <= 100, "Allocation exceeds 100%");
        
        let mut balance: i128 = env.storage().persistent().get(&DataKey::UserBalance(from.clone())).unwrap_or(0);
        balance += amount;
        env.storage().persistent().set(&DataKey::UserBalance(from.clone()), &balance);
        
        // Mock: Here we would route `blend_percentage` to the Blend protocol
        // Mock: Here we would route `lp_percentage` to Soroswap Pool
    }

    pub fn withdraw(env: Env, to: Address, amount: i128) {
        to.require_auth();
        let mut balance: i128 = env.storage().persistent().get(&DataKey::UserBalance(to.clone())).unwrap_or(0);
        assert!(balance >= amount, "Insufficient balance");
        balance -= amount;
        env.storage().persistent().set(&DataKey::UserBalance(to.clone()), &balance);
        
        // Mock: Here we would break LP positions and retrieve from Blend Protocol
    }

    pub fn get_balance(env: Env, user: Address) -> i128 {
        env.storage().persistent().get(&DataKey::UserBalance(user)).unwrap_or(0)
    }
}

// Basic Test Mock
#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    #[test]
    fn test_deposit_withdraw() {
        let env = Env::default();
        let contract_id = env.register_contract(None, SmasageYieldRouter);
        let client = SmasageYieldRouterClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        
        env.mock_all_auths();

        // 60% Blend, 30% LP, 10% Gold (mocked conceptually)
        client.deposit(&user, &1000, &60, &30);
        
        assert_eq!(client.get_balance(&user), 1000);
        
        client.withdraw(&user, &500);
        assert_eq!(client.get_balance(&user), 500);
    }
}
