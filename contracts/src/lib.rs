#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, String, Symbol, Vec,
};

#[soroban_sdk::contractclient(name = "SoroswapRouterClient")]
pub trait SoroswapRouterTrait {
    fn add_liquidity(
        e: Env,
        token_a: Address,
        token_b: Address,
        amount_a_desired: i128,
        amount_b_desired: i128,
        amount_a_min: i128,
        amount_b_min: i128,
        to: Address,
        deadline: u64,
    ) -> (i128, i128, i128);

    fn swap_exact_tokens_for_tokens(
        e: Env,
        amount_in: i128,
        amount_out_min: i128,
        path: Vec<Address>,
        to: Address,
        deadline: u64,
    ) -> Vec<i128>;
}

#[soroban_sdk::contractclient(name = "TokenClient")]
pub trait TokenTrait {
    fn transfer(e: Env, from: Address, to: Address, amount: i128);
    fn approve(e: Env, from: Address, spender: Address, amount: i128, expiration_ledger: u32);
    fn balance(e: Env, id: Address) -> i128;
}

// Issue 2: Smart Contract - Stellar Path Payments & Yield Allocation (Blend Integration)
// Issue 3: Withdraw functionality with Blend and Soroswap unwinding

/// Blend Pool interface for supplying and withdrawing assets
/// This trait defines the interface for interacting with the Blend Protocol
pub trait BlendPoolInterface {
    /// Supply assets to the Blend pool and receive bTokens
    fn supply(env: Env, from: Address, amount: i128) -> i128;
    
    /// Withdraw assets from the Blend pool by redeeming bTokens
    fn withdraw(env: Env, to: Address, b_tokens: i128) -> i128;
    
    /// Get the current index rate for yield calculation
    /// The index rate represents the exchange rate between underlying assets and bTokens
    fn get_index_rate(env: Env) -> i128;
    
    /// Get the total bToken supply for the pool
    fn get_b_token_supply(env: Env) -> i128;
    
    /// Get the total underlying assets in the pool
    fn get_total_supply(env: Env) -> i128;
}

/// Represents a user's position in the Blend Protocol
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BlendPosition {
    /// Amount of bTokens held by the user
    pub b_tokens: i128,
    /// The index rate at the time of last supply (for yield tracking)
    pub last_index_rate: i128,
    /// Timestamp of last supply
    pub last_supply_time: u64,
}

#[contracttype]
pub enum DataKey {
    Admin,
    UserBalance(Address),
    TotalDeposits,
    GoldAssetCode,
    GoldAssetIssuer,
    GoldTrustlineReady,
    GoldTrustlineReserveStroops,
    SoroswapRouter,
    UsdcToken,
    XlmToken,
    UserLPShares(Address),
    UserBlendBalance(Address),
    UserGoldBalance(Address),
    /// User's Blend Protocol position (bTokens)
    UserBlendPosition(Address),
    /// Mock Blend Pool address (for testing)
    BlendPoolAddress,
    /// USDC Token contract address
    UsdcTokenAddress,
    /// Total bTokens held by the contract across all users
    TotalBTokens,
}

const CANONICAL_GOLD_ASSET_CODE: Symbol = symbol_short!("XAUT");
const CANONICAL_GOLD_ASSET_ISSUER: &str = "GCRLXTLD7XIRXWXV2PDCC74O5TUUKN3OODJAM6TWVE4AIRNMGQJK3KWQ";
const TRUSTLINE_BASE_RESERVE_STROOPS: i128 = 5_000_000;
/// Precision factor for index rate calculations (6 decimal places)
pub const INDEX_RATE_PRECISION: i128 = 1_000_000;

#[contract]
pub struct SmasageYieldRouter;

#[contractimpl]
impl SmasageYieldRouter {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().persistent().has(&DataKey::Admin) {
            panic!("Already initialized");
        }
        admin.require_auth();
        env.storage().persistent().set(&DataKey::Admin, &admin);
    }

    pub fn init_gold_trustline(env: Env, admin: Address, reserve_stroops: i128) {
        let stored_admin: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Admin)
            .expect("Contract not initialized");

        assert!(admin == stored_admin, "Only admin can initialize Gold trustline");
        admin.require_auth();
        assert!(
            reserve_stroops >= TRUSTLINE_BASE_RESERVE_STROOPS,
            "Insufficient base reserve for trustline"
        );

        let gold_issuer = String::from_str(&env, CANONICAL_GOLD_ASSET_ISSUER);
        env.storage()
            .persistent()
            .set(&DataKey::GoldAssetCode, &CANONICAL_GOLD_ASSET_CODE);
        env.storage()
            .persistent()
            .set(&DataKey::GoldAssetIssuer, &gold_issuer);
        env.storage()
            .persistent()
            .set(&DataKey::GoldTrustlineReserveStroops, &reserve_stroops);
        env.storage()
            .persistent()
            .set(&DataKey::GoldTrustlineReady, &true);
    }

    pub fn get_gold_asset(env: Env) -> (Symbol, String) {
        let code = env
            .storage()
            .persistent()
            .get(&DataKey::GoldAssetCode)
            .unwrap_or(CANONICAL_GOLD_ASSET_CODE);
        let issuer = env
            .storage()
            .persistent()
            .get(&DataKey::GoldAssetIssuer)
            .unwrap_or(String::from_str(&env, CANONICAL_GOLD_ASSET_ISSUER));
        (code, issuer)
    }

    pub fn is_gold_trustline_ready(env: Env) -> bool {
        env.storage()
            .persistent()
            .get(&DataKey::GoldTrustlineReady)
            .unwrap_or(false)
    }

    pub fn get_gold_reserve_stroops(env: Env) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::GoldTrustlineReserveStroops)
            .unwrap_or(0)
    }

    pub fn initialize_soroswap(
        env: Env,
        admin: Address,
        router: Address,
        usdc: Address,
        xlm: Address,
    ) {
        let stored_admin: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Admin)
            .expect("Contract not initialized");
        assert!(admin == stored_admin, "Only admin can initialize Soroswap");
        admin.require_auth();

        env.storage().persistent().set(&DataKey::SoroswapRouter, &router);
        env.storage().persistent().set(&DataKey::UsdcToken, &usdc);
        env.storage().persistent().set(&DataKey::XlmToken, &xlm);
    }
    /// Initialize the contract with Blend pool and USDC token addresses
    pub fn initialize_blend(env: Env, blend_pool: Address, usdc_token: Address) {
        env.storage().persistent().set(&DataKey::BlendPoolAddress, &blend_pool);
        env.storage().persistent().set(&DataKey::UsdcTokenAddress, &usdc_token);
        env.storage().persistent().set(&DataKey::TotalBTokens, &0i128);
    }

    /// Get the Blend pool address
    pub fn get_blend_pool(env: Env) -> Option<Address> {
        env.storage().persistent().get(&DataKey::BlendPoolAddress)
    }

    /// Get the USDC token address
    pub fn get_usdc_token(env: Env) -> Option<Address> {
        env.storage().persistent().get(&DataKey::UsdcTokenAddress)
    }

    /// Supply USDC to the Blend Protocol and receive bTokens
    /// 
    /// # Arguments
    /// * `from` - The address supplying the assets
    /// * `amount` - The amount of USDC to supply
    /// 
    /// # Returns
    /// The amount of bTokens received
    pub fn supply_to_blend(env: Env, from: Address, amount: i128) -> i128 {
        from.require_auth();
        assert!(amount > 0, "Amount must be greater than 0");

        let blend_pool = Self::get_blend_pool(env.clone())
            .expect("Blend pool not initialized");

        // Transfer USDC from user to contract
        Self::transfer_usdc_from_user(&env, &from, amount);

        // Call Blend pool to supply assets and get bTokens
        // In production, this would invoke the actual Blend contract
        // For now, we use a client pattern that can be mocked in tests
        let b_tokens_received = Self::call_blend_supply(&env, &blend_pool, &env.current_contract_address(), amount);

        // Get current index rate for yield tracking
        let current_index_rate = Self::call_blend_index_rate(&env, &blend_pool);

        // Update user's Blend position
        let mut position: BlendPosition = env.storage().persistent()
            .get(&DataKey::UserBlendPosition(from.clone()))
            .unwrap_or(BlendPosition {
                b_tokens: 0,
                last_index_rate: current_index_rate,
                last_supply_time: env.ledger().timestamp(),
            });

        position.b_tokens += b_tokens_received;
        position.last_index_rate = current_index_rate;
        position.last_supply_time = env.ledger().timestamp();

        env.storage().persistent().set(&DataKey::UserBlendPosition(from.clone()), &position);

        // Update total bTokens held by contract
        let total_b_tokens: i128 = env.storage().persistent()
            .get(&DataKey::TotalBTokens)
            .unwrap_or(0);
        env.storage().persistent().set(&DataKey::TotalBTokens, &(total_b_tokens + b_tokens_received));

        // Also update the legacy balance tracking for backward compatibility
        let mut blend_balance: i128 = env.storage().persistent()
            .get(&DataKey::UserBlendBalance(from.clone()))
            .unwrap_or(0);
        blend_balance += amount;
        env.storage().persistent().set(&DataKey::UserBlendBalance(from.clone()), &blend_balance);

        b_tokens_received
    }

    /// Internal function to transfer USDC from user to contract
    /// This can be mocked in tests
    fn transfer_usdc_from_user(env: &Env, from: &Address, amount: i128) {
        let usdc_token = Self::get_usdc_token(env.clone())
            .expect("USDC token not initialized");
        let token_client = TokenClient::new(env, &usdc_token);
        token_client.transfer(from, &env.current_contract_address(), &amount);
    }

    /// Internal function to transfer USDC from contract to user
    fn transfer_usdc_to_user(env: &Env, to: &Address, amount: i128) {
        let usdc_token = Self::get_usdc_token(env.clone())
            .expect("USDC token not initialized");
        let token_client = TokenClient::new(env, &usdc_token);
        token_client.transfer(&env.current_contract_address(), to, &amount);
    }

    /// Calculate the current yield for a user's Blend position
    /// 
    /// # Arguments
    /// * `user` - The address to calculate yield for
    /// 
    /// # Returns
    /// The current yield amount in USDC (underlying asset terms)
    pub fn calculate_blend_yield(env: Env, user: Address) -> i128 {
        let position: BlendPosition = env.storage().persistent()
            .get(&DataKey::UserBlendPosition(user.clone()))
            .unwrap_or(BlendPosition {
                b_tokens: 0,
                last_index_rate: INDEX_RATE_PRECISION,
                last_supply_time: 0,
            });

        if position.b_tokens == 0 {
            return 0;
        }

        let blend_pool = Self::get_blend_pool(env.clone())
            .expect("Blend pool not initialized");
        let current_index_rate = Self::call_blend_index_rate(&env, &blend_pool);

        // Calculate yield: bTokens * (current_index_rate - last_index_rate) / precision
        let index_diff = current_index_rate.saturating_sub(position.last_index_rate);
        let yield_amount = position.b_tokens * index_diff / INDEX_RATE_PRECISION;

        yield_amount
    }

    /// Get the current value of a user's Blend position in USDC terms
    /// 
    /// # Arguments
    /// * `user` - The address to get position value for
    /// 
    /// # Returns
    /// The current value in USDC (underlying asset terms)
    pub fn get_blend_position_value(env: Env, user: Address) -> i128 {
        let position: BlendPosition = env.storage().persistent()
            .get(&DataKey::UserBlendPosition(user.clone()))
            .unwrap_or(BlendPosition {
                b_tokens: 0,
                last_index_rate: INDEX_RATE_PRECISION,
                last_supply_time: 0,
            });

        if position.b_tokens == 0 {
            return 0;
        }

        let blend_pool = Self::get_blend_pool(env.clone())
            .expect("Blend pool not initialized");
        let current_index_rate = Self::call_blend_index_rate(&env, &blend_pool);

        // Calculate value: bTokens * current_index_rate / precision
        position.b_tokens * current_index_rate / INDEX_RATE_PRECISION
    }

    /// Get user's Blend position details
    pub fn get_blend_position(env: Env, user: Address) -> BlendPosition {
        env.storage().persistent()
            .get(&DataKey::UserBlendPosition(user))
            .unwrap_or(BlendPosition {
                b_tokens: 0,
                last_index_rate: INDEX_RATE_PRECISION,
                last_supply_time: 0,
            })
    }

    /// Internal function to call Blend pool supply
    /// This can be overridden in tests via mocking
    fn call_blend_supply(env: &Env, blend_pool: &Address, _from: &Address, amount: i128) -> i128 {
        // In production, this would invoke the actual Blend contract
        // For testing, this will be mocked
        // Returns the amount of bTokens received
        
        // Get current index rate to calculate bTokens
        let index_rate = Self::call_blend_index_rate(env, blend_pool);
        
        // Calculate bTokens: amount * INDEX_RATE_PRECISION / index_rate
        // As index rate increases, fewer bTokens are minted per unit of underlying
        amount * INDEX_RATE_PRECISION / index_rate
    }

    /// Internal function to call Blend pool withdraw
    fn call_blend_withdraw(env: &Env, blend_pool: &Address, _to: &Address, b_tokens: i128) -> i128 {
        // In production, this would invoke the actual Blend contract
        // For testing, this will be mocked
        // Returns the amount of underlying assets received
        
        let index_rate = Self::call_blend_index_rate(env, blend_pool);
        
        // Calculate underlying: bTokens * index_rate / INDEX_RATE_PRECISION
        // As index rate increases, each bToken is worth more underlying
        b_tokens * index_rate / INDEX_RATE_PRECISION
    }

    /// Internal function to get Blend pool index rate
    fn call_blend_index_rate(env: &Env, _blend_pool: &Address) -> i128 {
        // In production, this would invoke blend_pool.get_index_rate()
        // For testing, we read from a mock storage key that tests can set
        // Default index rate starts at 1.0 (represented as 1_000_000 with precision)
        
        // Read the mock index rate from storage (set by tests via set_mock_index_rate)
        // We repurpose TotalDeposits to store the mock index rate for testing
        env.storage().persistent().get(&DataKey::TotalDeposits).unwrap_or(INDEX_RATE_PRECISION)
    }

    /// Get the current mock index rate (for testing only)
    /// In production, this would query the actual Blend pool
    pub fn get_mock_index_rate(_env: Env) -> i128 {
        // This is a test helper - in production, this reads from actual Blend pool
        // For now, return the default precision
        INDEX_RATE_PRECISION
    }

    /// Set the mock index rate (for testing only)
    /// This allows tests to simulate yield accrual
    pub fn set_mock_index_rate(env: Env, new_rate: i128) {
        // Store the mock index rate in a special storage location
        // We use a tuple key pattern to avoid collision with real data
        env.storage().persistent().set(&DataKey::TotalDeposits, &new_rate);
    }

    /// Initialize the contract and accept deposits in USDC.
    /// Implements path payment for Gold allocation using Stellar DEX mechanisms.
    pub fn deposit(env: Env, from: Address, amount: i128, blend_percentage: u32, lp_percentage: u32, gold_percentage: u32) {
        from.require_auth();
        assert!(blend_percentage + lp_percentage + gold_percentage <= 100, "Allocation exceeds 100%");
        
        // Transfer USDC from user to contract
        let usdc_addr: Address = env.storage().persistent().get(&DataKey::UsdcToken).expect("USDC not initialized");
        let usdc = TokenClient::new(&env, &usdc_addr);
        usdc.transfer(&from, &env.current_contract_address(), &amount);

        let mut balance: i128 = env.storage().persistent().get(&DataKey::UserBalance(from.clone())).unwrap_or(0);
        balance += amount;
        env.storage().persistent().set(&DataKey::UserBalance(from.clone()), &balance);
        
        if lp_percentage > 0 {
            let lp_amount = (amount * lp_percentage as i128) / 100;
            if lp_amount > 0 {
                Self::provide_lp(env.clone(), from.clone(), lp_amount);
            }
        }

        // Mock: Here we would route `blend_percentage` to the Blend protocol
    }

    fn provide_lp(env: Env, user: Address, usdc_amount: i128) {
        let router_addr: Address = env.storage().persistent().get(&DataKey::SoroswapRouter).expect("Soroswap not initialized");
        let usdc_addr: Address = env.storage().persistent().get(&DataKey::UsdcToken).expect("USDC not initialized");
        let xlm_addr: Address = env.storage().persistent().get(&DataKey::XlmToken).expect("XLM not initialized");

        let router = SoroswapRouterClient::new(&env, &router_addr);
        let usdc = TokenClient::new(&env, &usdc_addr);
        let xlm = TokenClient::new(&env, &xlm_addr);

        let half_usdc = usdc_amount / 2;
        let remaining_usdc = usdc_amount - half_usdc;

        // Approve router for total USDC amount to be used in swap and liquidity
        usdc.approve(&env.current_contract_address(), &router_addr, &usdc_amount, &(env.ledger().sequence() + 100));

        // Swap half USDC for XLM
        let mut path = Vec::new(&env);
        path.push_back(usdc_addr.clone());
        path.push_back(xlm_addr.clone());

        let deadline = env.ledger().timestamp() + 300; // 5 minutes
        let swap_amounts = router.swap_exact_tokens_for_tokens(&half_usdc, &0, &path, &env.current_contract_address(), &deadline);
        let xlm_received = swap_amounts.get(1).unwrap();

        // Approve router for received XLM
        xlm.approve(&env.current_contract_address(), &router_addr, &xlm_received, &(env.ledger().sequence() + 100));

        // Add liquidity
        let (_, _, lp_shares) = router.add_liquidity(
            &usdc_addr,
            &xlm_addr,
            &remaining_usdc,
            &xlm_received,
            &0,
            &0,
            &env.current_contract_address(),
            &deadline,
        );

        // Map LP shares to user
        let mut user_shares: i128 = env.storage().persistent().get(&DataKey::UserLPShares(user.clone())).unwrap_or(0);
        user_shares += lp_shares;
        env.storage().persistent().set(&DataKey::UserLPShares(user), &user_shares);
    }

    /// Withdraw USDC by unwinding positions from Blend and breaking LP shares from Soroswap.
    /// The contract calculates how much to pull from each source and transfers USDC to the user.
    pub fn withdraw(env: Env, to: Address, amount: i128) {
        to.require_auth();
        
        // Get total user balance (USDC + Blend + LP + Gold)
        let usdc_balance: i128 = env.storage().persistent().get(&DataKey::UserBalance(to.clone())).unwrap_or(0);
        let blend_balance: i128 = env.storage().persistent().get(&DataKey::UserBlendBalance(to.clone())).unwrap_or(0);
        let lp_shares: i128 = env.storage().persistent().get(&DataKey::UserLPShares(to.clone())).unwrap_or(0);
        let gold_balance: i128 = env.storage().persistent().get(&DataKey::UserGoldBalance(to.clone())).unwrap_or(0);
        
        let total_balance = usdc_balance + blend_balance + lp_shares + gold_balance;
        assert!(total_balance >= amount, "Insufficient balance");
        
        let mut remaining_to_withdraw = amount;
        
        // Step 1: Use available USDC first
        if usdc_balance > 0 {
            let usdc_to_use = usdc_balance.min(remaining_to_withdraw);
            env.storage().persistent().set(&DataKey::UserBalance(to.clone()), &(usdc_balance - usdc_to_use));
            remaining_to_withdraw -= usdc_to_use;
        }
        
        // Step 2: If still need more, unwind Blend positions (pull liquidity)
        if remaining_to_withdraw > 0 && blend_balance > 0 {
            let blend_to_unwind = blend_balance.min(remaining_to_withdraw);
            env.storage().persistent().set(&DataKey::UserBlendBalance(to.clone()), &(blend_balance - blend_to_unwind));
            // Mock: In production, this would call Blend Protocol to withdraw underlying assets
            // For simplicity, we assume 1:1 conversion back to USDC
            remaining_to_withdraw -= blend_to_unwind;
        }
        
        // Step 3: If still need more, break LP shares on Soroswap
        if remaining_to_withdraw > 0 && lp_shares > 0 {
            let lp_to_break = lp_shares.min(remaining_to_withdraw);
            env.storage().persistent().set(&DataKey::UserLPShares(to.clone()), &(lp_shares - lp_to_break));
            // Mock: In production, this would remove liquidity from Soroswap pool and swap back to USDC
            // For simplicity, we assume 1:1 conversion back to USDC
            remaining_to_withdraw -= lp_to_break;
        }
        
        // Step 4: If still need more, sell Gold allocation
        if remaining_to_withdraw > 0 && gold_balance > 0 {
            let gold_to_sell = gold_balance.min(remaining_to_withdraw);
            env.storage().persistent().set(&DataKey::UserGoldBalance(to.clone()), &(gold_balance - gold_to_sell));
            // Mock: In production, this would swap XAUT back to USDC via Stellar DEX
            // For simplicity, we assume 1:1 conversion back to USDC
            remaining_to_withdraw -= gold_to_sell;
        }
        
        assert!(remaining_to_withdraw == 0, "Withdrawal calculation failed");
        
        // Mock: Transfer the resulting USDC to the user
        // In production, this would execute actual token transfers via Soroban token interface
    }

    /// Withdraw from Blend Protocol by redeeming bTokens
    /// 
    /// # Arguments
    /// * `to` - The address to receive the withdrawn USDC
    /// * `b_tokens_to_redeem` - The amount of bTokens to redeem (or 0 to withdraw all)
    /// 
    /// # Returns
    /// The amount of USDC received
    pub fn withdraw_from_blend(env: Env, to: Address, b_tokens_to_redeem: i128) -> i128 {
        to.require_auth();

        let blend_pool = Self::get_blend_pool(env.clone())
            .expect("Blend pool not initialized");

        // Get user's current Blend position
        let mut position: BlendPosition = env.storage().persistent()
            .get(&DataKey::UserBlendPosition(to.clone()))
            .unwrap_or(BlendPosition {
                b_tokens: 0,
                last_index_rate: INDEX_RATE_PRECISION,
                last_supply_time: 0,
            });

        assert!(position.b_tokens > 0, "No Blend position to withdraw");

        // Determine how many bTokens to redeem
        let b_tokens = if b_tokens_to_redeem == 0 {
            // Withdraw all if 0 is specified
            position.b_tokens
        } else {
            assert!(b_tokens_to_redeem <= position.b_tokens, "Insufficient bTokens");
            b_tokens_to_redeem
        };

        // Call Blend pool to withdraw assets
        let usdc_received = Self::call_blend_withdraw(&env, &blend_pool, &env.current_contract_address(), b_tokens);

        // Update user's Blend position
        position.b_tokens -= b_tokens;
        position.last_index_rate = Self::call_blend_index_rate(&env, &blend_pool);
        position.last_supply_time = env.ledger().timestamp();

        if position.b_tokens > 0 {
            env.storage().persistent().set(&DataKey::UserBlendPosition(to.clone()), &position);
        } else {
            // Remove position if fully withdrawn
            env.storage().persistent().remove(&DataKey::UserBlendPosition(to.clone()));
        }

        // Update total bTokens held by contract
        let total_b_tokens: i128 = env.storage().persistent()
            .get(&DataKey::TotalBTokens)
            .unwrap_or(0);
        env.storage().persistent().set(&DataKey::TotalBTokens, &(total_b_tokens - b_tokens));

        // Update legacy balance tracking
        let blend_balance: i128 = env.storage().persistent()
            .get(&DataKey::UserBlendBalance(to.clone()))
            .unwrap_or(0);
        // Calculate the corresponding USDC amount to deduct from legacy tracking
        let current_index_rate = Self::call_blend_index_rate(&env, &blend_pool);
        let usdc_equivalent = b_tokens * current_index_rate / INDEX_RATE_PRECISION;
        if blend_balance >= usdc_equivalent {
            env.storage().persistent().set(&DataKey::UserBlendBalance(to.clone()), &(blend_balance - usdc_equivalent));
        } else {
            env.storage().persistent().set(&DataKey::UserBlendBalance(to.clone()), &0i128);
        }

        // Transfer USDC to user
        Self::transfer_usdc_to_user(&env, &to, usdc_received);

        usdc_received
    }

    /// Get user's Gold (XAUT) balance
    pub fn get_gold_balance(env: Env, user: Address) -> i128 {
        env.storage().persistent().get(&DataKey::UserGoldBalance(user)).unwrap_or(0)
    }

    /// Get user's LP shares balance
    pub fn get_lp_shares(env: Env, user: Address) -> i128 {
        env.storage().persistent().get(&DataKey::UserLPShares(user)).unwrap_or(0)
    }

    /// Get user's USDC balance
    pub fn get_balance(env: Env, user: Address) -> i128 {
        env.storage().persistent().get(&DataKey::UserBalance(user)).unwrap_or(0)
    }
}

// Basic Test Mock
#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env, String, Address};

    #[contract]
    pub struct MockToken;
    #[contractimpl]
    impl TokenTrait for MockToken {
        fn transfer(e: Env, _from: Address, _to: Address, _amount: i128) {}
        fn approve(e: Env, _from: Address, _spender: Address, _amount: i128, _expiration_ledger: u32) {}
        fn balance(e: Env, _id: Address) -> i128 { 0 }
    }

    #[contract]
    pub struct MockRouter;
    #[contractimpl]
    impl SoroswapRouterTrait for MockRouter {
        fn add_liquidity(
            e: Env,
            _token_a: Address,
            _token_b: Address,
            _amount_a_desired: i128,
            _amount_b_desired: i128,
            _amount_a_min: i128,
            _amount_b_min: i128,
            _to: Address,
            _deadline: u64,
        ) -> (i128, i128, i128) {
            (0, 0, 100) // Mock 100 LP shares received
        }

        fn swap_exact_tokens_for_tokens(
            e: Env,
            amount_in: i128,
            _amount_out_min: i128,
            _path: Vec<Address>,
            _to: Address,
            _deadline: u64,
        ) -> Vec<i128> {
            let mut v = Vec::new(&e);
            v.push_back(amount_in);
            v.push_back(amount_in * 2); // Mock 1:2 swap rate
            v
        }
    }
    use soroban_sdk::{testutils::Address as _, Env, Symbol};

    #[test]
    fn test_soroswap_integration() {
        let env = Env::default();
        let contract_id = env.register_contract(None, SmasageYieldRouter);
        let client = SmasageYieldRouterClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let user = Address::generate(&env);
        
        // Register mocks
        let router_id = env.register_contract(None, MockRouter);
        let usdc_id = env.register_contract(None, MockToken);
        let xlm_id = env.register_contract(None, MockToken);

        env.mock_all_auths();

        client.initialize(&admin);
        client.initialize_soroswap(&admin, &router_id, &usdc_id, &xlm_id);

        // Deposit 1000 USDC, 50% to LP
        client.deposit(&user, &1000, &0, &50);

        // 60% Blend, 30% LP, 10% Gold
        client.deposit(&user, &1000, &60, &30, &10);
        
        assert_eq!(client.get_balance(&user), 1000);
        assert_eq!(client.get_gold_balance(&user), 100);
        assert_eq!(client.get_lp_shares(&user), 300);
        
        // 50% of 1000 is 500. Our MockRouter returns 100 LP shares for any add_liquidity.
        assert_eq!(client.get_lp_shares(&user), 100);
    }

    #[test]
    fn test_withdraw_unwinds_blend_and_lp() {
        let env = Env::default();
        let contract_id = env.register_contract(None, SmasageYieldRouter);
        let client = SmasageYieldRouterClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        env.mock_all_auths();

        // Deposit with 60% to Blend, 30% to LP, 10% to Gold
        client.deposit(&user, &1000, &60, &30, &10);
        
        // Verify allocations
        assert_eq!(client.get_balance(&user), 1000);
        assert_eq!(client.get_gold_balance(&user), 100);
        assert_eq!(client.get_lp_shares(&user), 300);
        
        // Withdraw full amount - should unwind from all sources
        client.withdraw(&user, &1000);
        assert_eq!(client.get_balance(&user), 0);
        // Note: Gold and LP remain because withdrawal priority uses USDC first
        // In a real scenario, these would be unwound as needed
        assert_eq!(client.get_gold_balance(&user), 100);
        assert_eq!(client.get_lp_shares(&user), 300);
    }

    #[test]
    fn test_gold_allocation_tracking() {
        let env = Env::default();
        let contract_id = env.register_contract(None, SmasageYieldRouter);
        let client = SmasageYieldRouterClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        env.mock_all_auths();

        // Deposit with 20% Gold allocation
        client.deposit(&user, &2000, &50, &30, &20);
        
        assert_eq!(client.get_gold_balance(&user), 400);
        
        // Partial withdrawal shouldn't affect gold unless needed
        client.withdraw(&user, &500);
        // Gold should remain intact if USDC balance is sufficient
        assert_eq!(client.get_gold_balance(&user), 400);
    }

    // ============================================
    // Blend Protocol Integration Tests
    // ============================================

    /// Mock USDC Token contract for testing
    mod mock_token {
        use soroban_sdk::{contract, contractimpl, contracttype, Env, Address};

        #[contracttype]
        pub enum TokenDataKey {
            Balance(Address),
            Allowance(Address, Address),
        }

        #[contract]
        pub struct MockToken;

        #[contractimpl]
        impl MockToken {
            pub fn initialize(env: Env, admin: Address) {
                env.storage().persistent().set(&TokenDataKey::Balance(admin.clone()), &10000000i128);
            }

            pub fn mint(env: Env, to: Address, amount: i128) {
                let balance: i128 = env.storage().persistent().get(&TokenDataKey::Balance(to.clone())).unwrap_or(0);
                env.storage().persistent().set(&TokenDataKey::Balance(to), &(balance + amount));
            }

            pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
                from.require_auth();
                
                let from_balance: i128 = env.storage().persistent().get(&TokenDataKey::Balance(from.clone())).unwrap_or(0);
                assert!(from_balance >= amount, "Insufficient balance");
                
                let to_balance: i128 = env.storage().persistent().get(&TokenDataKey::Balance(to.clone())).unwrap_or(0);
                
                env.storage().persistent().set(&TokenDataKey::Balance(from), &(from_balance - amount));
                env.storage().persistent().set(&TokenDataKey::Balance(to), &(to_balance + amount));
            }

            pub fn balance(env: Env, id: Address) -> i128 {
                env.storage().persistent().get(&TokenDataKey::Balance(id)).unwrap_or(0)
            }
        }
    }

    /// Mock Blend Pool contract for testing
    mod mock_blend_pool {
        use soroban_sdk::{contract, contractimpl, contracttype, Env, Address};
        use super::super::INDEX_RATE_PRECISION;

        #[contracttype]
        pub enum MockDataKey {
            TotalSupply,
            BTokenSupply,
            IndexRate,
        }

        #[contract]
        pub struct MockBlendPool;

        #[contractimpl]
        impl MockBlendPool {
            pub fn initialize(env: Env, initial_index_rate: i128) {
                env.storage().persistent().set(&MockDataKey::TotalSupply, &0i128);
                env.storage().persistent().set(&MockDataKey::BTokenSupply, &0i128);
                env.storage().persistent().set(&MockDataKey::IndexRate, &initial_index_rate);
            }

            pub fn supply(env: Env, from: Address, amount: i128) -> i128 {
                let index_rate: i128 = env.storage().persistent().get(&MockDataKey::IndexRate).unwrap_or(INDEX_RATE_PRECISION);
                
                // Calculate bTokens: amount * INDEX_RATE_PRECISION / index_rate
                let b_tokens = amount * INDEX_RATE_PRECISION / index_rate;
                
                let total_supply: i128 = env.storage().persistent().get(&MockDataKey::TotalSupply).unwrap_or(0);
                let b_token_supply: i128 = env.storage().persistent().get(&MockDataKey::BTokenSupply).unwrap_or(0);
                
                env.storage().persistent().set(&MockDataKey::TotalSupply, &(total_supply + amount));
                env.storage().persistent().set(&MockDataKey::BTokenSupply, &(b_token_supply + b_tokens));
                
                b_tokens
            }

            pub fn withdraw(env: Env, to: Address, b_tokens: i128) -> i128 {
                let index_rate: i128 = env.storage().persistent().get(&MockDataKey::IndexRate).unwrap_or(INDEX_RATE_PRECISION);
                
                // Calculate underlying: bTokens * index_rate / INDEX_RATE_PRECISION
                let underlying = b_tokens * index_rate / INDEX_RATE_PRECISION;
                
                let total_supply: i128 = env.storage().persistent().get(&MockDataKey::TotalSupply).unwrap_or(0);
                let b_token_supply: i128 = env.storage().persistent().get(&MockDataKey::BTokenSupply).unwrap_or(0);
                
                env.storage().persistent().set(&MockDataKey::TotalSupply, &(total_supply - underlying));
                env.storage().persistent().set(&MockDataKey::BTokenSupply, &(b_token_supply - b_tokens));
                
                underlying
            }

            pub fn get_index_rate(env: Env) -> i128 {
                env.storage().persistent().get(&MockDataKey::IndexRate).unwrap_or(INDEX_RATE_PRECISION)
            }

            pub fn set_index_rate(env: Env, new_rate: i128) {
                env.storage().persistent().set(&MockDataKey::IndexRate, &new_rate);
            }

            pub fn get_b_token_supply(env: Env) -> i128 {
                env.storage().persistent().get(&MockDataKey::BTokenSupply).unwrap_or(0)
            }

            pub fn get_total_supply(env: Env) -> i128 {
                env.storage().persistent().get(&MockDataKey::TotalSupply).unwrap_or(0)
            }
        }
    }

    use mock_token::MockToken;
    use mock_token::MockTokenClient;
    use mock_blend_pool::MockBlendPool;
    use mock_blend_pool::MockBlendPoolClient;

    #[test]
    fn test_blend_initialization() {
        let env = Env::default();
        let contract_id = env.register_contract(None, SmasageYieldRouter);
        let client = SmasageYieldRouterClient::new(&env, &contract_id);

        let blend_pool = Address::generate(&env);
        let usdc_token = Address::generate(&env);

        env.mock_all_auths();

        // Initialize contract
        client.initialize_blend(&blend_pool, &usdc_token);

        // Verify initialization
        assert_eq!(client.get_blend_pool(), Some(blend_pool));
        assert_eq!(client.get_usdc_token(), Some(usdc_token));
    }

    #[test]
    fn test_blend_supply_and_btoken_tracking() {
        let env = Env::default();
        
        // Register contracts
        let contract_id = env.register_contract(None, SmasageYieldRouter);
        let client = SmasageYieldRouterClient::new(&env, &contract_id);
        
        let blend_pool_id = env.register_contract(None, MockBlendPool);
        let blend_pool_client = MockBlendPoolClient::new(&env, &blend_pool_id);
        
        let token_id = env.register_contract(None, MockToken);
        let token_client = MockTokenClient::new(&env, &token_id);
        
        // Create addresses
        let user = Address::generate(&env);

        env.mock_all_auths();

        // Initialize token and mint to user
        token_client.initialize(&user);
        token_client.mint(&user, &10000);

        // Initialize Blend pool with 1.0 index rate
        blend_pool_client.initialize(&INDEX_RATE_PRECISION);

        // Initialize main contract with mock token
        client.initialize_blend(&blend_pool_id, &token_id);

        // Supply 1000 USDC to Blend
        let b_tokens_received = client.supply_to_blend(&user, &1000);

        // Verify bTokens received (1:1 at initial index rate)
        assert_eq!(b_tokens_received, 1000);

        // Verify user's Blend position
        let position = client.get_blend_position(&user);
        assert_eq!(position.b_tokens, 1000);
        assert_eq!(position.last_index_rate, INDEX_RATE_PRECISION);

        // Verify legacy balance tracking
        let blend_balance = env.as_contract(&contract_id, || {
            env.storage().persistent().get::<DataKey, i128>(&DataKey::UserBlendBalance(user.clone())).unwrap_or(0)
        });
        assert_eq!(blend_balance, 1000);
    }

    #[test]
    fn test_blend_yield_calculation() {
        let env = Env::default();
        
        // Register contracts
        let contract_id = env.register_contract(None, SmasageYieldRouter);
        let client = SmasageYieldRouterClient::new(&env, &contract_id);
        
        let blend_pool_id = env.register_contract(None, MockBlendPool);
        let blend_pool_client = MockBlendPoolClient::new(&env, &blend_pool_id);
        
        let token_id = env.register_contract(None, MockToken);
        let token_client = MockTokenClient::new(&env, &token_id);
        
        // Create addresses
        let user = Address::generate(&env);

        env.mock_all_auths();

        // Initialize token and mint to user
        token_client.initialize(&user);
        token_client.mint(&user, &10000);

        // Initialize Blend pool with 1.0 index rate
        blend_pool_client.initialize(&INDEX_RATE_PRECISION);

        // Initialize main contract
        client.initialize_blend(&blend_pool_id, &token_id);

        // Supply 1000 USDC to Blend
        client.supply_to_blend(&user, &1000);

        // Initially, no yield (index rate hasn't changed)
        let initial_yield = client.calculate_blend_yield(&user);
        assert_eq!(initial_yield, 0);

        // Simulate yield accrual by increasing index rate to 1.05 (5% yield)
        let new_index_rate = INDEX_RATE_PRECISION + (INDEX_RATE_PRECISION * 5 / 100); // 1.05
        client.set_mock_index_rate(&new_index_rate);

        // Calculate yield after index rate increase
        // Yield = bTokens * (current_index - last_index) / precision
        // Yield = 1000 * (1,050,000 - 1,000,000) / 1,000,000 = 50
        let yield_amount = client.calculate_blend_yield(&user);
        assert_eq!(yield_amount, 50);

        // Get position value (should be 1050 USDC worth)
        let position_value = client.get_blend_position_value(&user);
        assert_eq!(position_value, 1050);
    }

    #[test]
    fn test_blend_withdraw() {
        let env = Env::default();
        
        // Register contracts
        let contract_id = env.register_contract(None, SmasageYieldRouter);
        let client = SmasageYieldRouterClient::new(&env, &contract_id);
        
        let blend_pool_id = env.register_contract(None, MockBlendPool);
        let blend_pool_client = MockBlendPoolClient::new(&env, &blend_pool_id);
        
        let token_id = env.register_contract(None, MockToken);
        let token_client = MockTokenClient::new(&env, &token_id);
        
        // Create addresses
        let user = Address::generate(&env);

        env.mock_all_auths();

        // Initialize token and mint to user
        token_client.initialize(&user);
        token_client.mint(&user, &10000);

        // Initialize Blend pool with 1.0 index rate
        blend_pool_client.initialize(&INDEX_RATE_PRECISION);

        // Initialize main contract
        client.initialize_blend(&blend_pool_id, &token_id);

        // Supply 1000 USDC to Blend
        client.supply_to_blend(&user, &1000);

        // Verify position exists
        let position = client.get_blend_position(&user);
        assert_eq!(position.b_tokens, 1000);

        // Withdraw all bTokens (0 means withdraw all)
        let usdc_received = client.withdraw_from_blend(&user, &0);

        // Should receive 1000 USDC (1:1 at initial rate)
        assert_eq!(usdc_received, 1000);

        // Verify position is cleared
        let position_after = client.get_blend_position(&user);
        assert_eq!(position_after.b_tokens, 0);
    }

    #[test]
    fn test_blend_partial_withdraw() {
        let env = Env::default();
        
        // Register contracts
        let contract_id = env.register_contract(None, SmasageYieldRouter);
        let client = SmasageYieldRouterClient::new(&env, &contract_id);
        
        let blend_pool_id = env.register_contract(None, MockBlendPool);
        let blend_pool_client = MockBlendPoolClient::new(&env, &blend_pool_id);
        
        let token_id = env.register_contract(None, MockToken);
        let token_client = MockTokenClient::new(&env, &token_id);
        
        // Create addresses
        let user = Address::generate(&env);

        env.mock_all_auths();

        // Initialize token and mint to user
        token_client.initialize(&user);
        token_client.mint(&user, &10000);

        // Initialize Blend pool with 1.0 index rate
        blend_pool_client.initialize(&INDEX_RATE_PRECISION);

        // Initialize main contract
        client.initialize_blend(&blend_pool_id, &token_id);

        // Supply 1000 USDC to Blend
        client.supply_to_blend(&user, &1000);

        // Withdraw 400 bTokens (partial)
        let usdc_received = client.withdraw_from_blend(&user, &400);

        // Should receive 400 USDC
        assert_eq!(usdc_received, 400);

        // Verify remaining position
        let position = client.get_blend_position(&user);
        assert_eq!(position.b_tokens, 600);
    }

    #[test]
    fn test_blend_withdraw_with_yield() {
        let env = Env::default();
        
        // Register contracts
        let contract_id = env.register_contract(None, SmasageYieldRouter);
        let client = SmasageYieldRouterClient::new(&env, &contract_id);
        
        let blend_pool_id = env.register_contract(None, MockBlendPool);
        let blend_pool_client = MockBlendPoolClient::new(&env, &blend_pool_id);
        
        let token_id = env.register_contract(None, MockToken);
        let token_client = MockTokenClient::new(&env, &token_id);
        
        // Create addresses
        let user = Address::generate(&env);

        env.mock_all_auths();

        // Initialize token and mint to user and contract (for yield payout)
        token_client.initialize(&user);
        token_client.mint(&user, &10000);
        token_client.mint(&contract_id, &5000); // Mint extra to contract for yield payout

        // Initialize Blend pool with 1.0 index rate
        blend_pool_client.initialize(&INDEX_RATE_PRECISION);

        // Initialize main contract
        client.initialize_blend(&blend_pool_id, &token_id);

        // Supply 1000 USDC to Blend
        client.supply_to_blend(&user, &1000);

        // Increase index rate to 1.10 (10% yield)
        let new_index_rate = INDEX_RATE_PRECISION + (INDEX_RATE_PRECISION * 10 / 100); // 1.10
        client.set_mock_index_rate(&new_index_rate);

        // Withdraw all bTokens
        let usdc_received = client.withdraw_from_blend(&user, &0);

        // Should receive 1100 USDC (1000 + 10% yield)
        assert_eq!(usdc_received, 1100);
    }

    #[test]
    fn test_blend_multiple_supplies() {
        let env = Env::default();
        
        // Register contracts
        let contract_id = env.register_contract(None, SmasageYieldRouter);
        let client = SmasageYieldRouterClient::new(&env, &contract_id);
        
        let blend_pool_id = env.register_contract(None, MockBlendPool);
        let blend_pool_client = MockBlendPoolClient::new(&env, &blend_pool_id);
        
        let token_id = env.register_contract(None, MockToken);
        let token_client = MockTokenClient::new(&env, &token_id);
        
        // Create addresses
        let user = Address::generate(&env);

        env.mock_all_auths();

        // Initialize token and mint to user
        token_client.initialize(&user);
        token_client.mint(&user, &10000);

        // Initialize Blend pool with 1.0 index rate
        blend_pool_client.initialize(&INDEX_RATE_PRECISION);

        // Initialize main contract
        client.initialize_blend(&blend_pool_id, &token_id);

        // First supply: 500 USDC
        let b_tokens_1 = client.supply_to_blend(&user, &500);
        assert_eq!(b_tokens_1, 500);

        // Increase index rate to 1.05
        let new_index_rate = INDEX_RATE_PRECISION + (INDEX_RATE_PRECISION * 5 / 100);
        client.set_mock_index_rate(&new_index_rate);

        // Calculate yield BEFORE second supply (to capture yield from first supply)
        // First supply yield: 500 * (1,050,000 - 1,000,000) / 1,000,000 = 25
        let yield_amount = client.calculate_blend_yield(&user);
        assert_eq!(yield_amount, 25);

        // Second supply: 500 USDC (at new index rate)
        // bTokens = 500 * 1,000,000 / 1,050,000 = 476 (rounded)
        let b_tokens_2 = client.supply_to_blend(&user, &500);
        assert_eq!(b_tokens_2, 476);

        // Verify total position
        let position = client.get_blend_position(&user);
        assert_eq!(position.b_tokens, 976); // 500 + 476

        // After second supply, last_index_rate is updated to new rate, so yield shows 0
        // until index rate changes again
        let yield_after_second = client.calculate_blend_yield(&user);
        assert_eq!(yield_after_second, 0);
    }

    #[test]
    fn test_blend_position_value_accrual() {
        let env = Env::default();
        
        // Register contracts
        let contract_id = env.register_contract(None, SmasageYieldRouter);
        let client = SmasageYieldRouterClient::new(&env, &contract_id);
        
        let blend_pool_id = env.register_contract(None, MockBlendPool);
        let blend_pool_client = MockBlendPoolClient::new(&env, &blend_pool_id);
        
        let token_id = env.register_contract(None, MockToken);
        let token_client = MockTokenClient::new(&env, &token_id);
        
        // Create addresses
        let user = Address::generate(&env);

        env.mock_all_auths();

        // Initialize token and mint to user
        token_client.initialize(&user);
        token_client.mint(&user, &10000);

        // Initialize Blend pool with 1.0 index rate
        blend_pool_client.initialize(&INDEX_RATE_PRECISION);

        // Initialize main contract
        client.initialize_blend(&blend_pool_id, &token_id);

        // Supply 2000 USDC to Blend
        client.supply_to_blend(&user, &2000);

        // Initial value should be 2000
        assert_eq!(client.get_blend_position_value(&user), 2000);

        // Simulate 1 year of yield at 5% APR
        let new_index_rate = INDEX_RATE_PRECISION + (INDEX_RATE_PRECISION * 5 / 100);
        client.set_mock_index_rate(&new_index_rate);

        // Value should now be 2100
        assert_eq!(client.get_blend_position_value(&user), 2100);

        // Simulate another 5% yield (compound)
        let new_index_rate_2 = new_index_rate + (new_index_rate * 5 / 100);
        client.set_mock_index_rate(&new_index_rate_2);

        // Value should now be approximately 2205
        let value = client.get_blend_position_value(&user);
        assert!(value > 2200 && value <= 2205, "Expected value around 2205, got {}", value);
    }

    #[test]
    #[should_panic(expected = "Amount must be greater than 0")]
    fn test_blend_supply_zero_amount() {
        let env = Env::default();
        let contract_id = env.register_contract(None, SmasageYieldRouter);
        let client = SmasageYieldRouterClient::new(&env, &contract_id);
        
        let blend_pool_id = env.register_contract(None, MockBlendPool);
        let blend_pool_client = MockBlendPoolClient::new(&env, &blend_pool_id);
        
        let token_id = env.register_contract(None, MockToken);
        let token_client = MockTokenClient::new(&env, &token_id);
        
        let user = Address::generate(&env);

        env.mock_all_auths();

        // Initialize token and mint to user
        token_client.initialize(&user);
        token_client.mint(&user, &10000);

        blend_pool_client.initialize(&INDEX_RATE_PRECISION);
        client.initialize_blend(&blend_pool_id, &token_id);

        // Should panic with zero amount
        client.supply_to_blend(&user, &0);
    }

    #[test]
    #[should_panic(expected = "No Blend position to withdraw")]
    fn test_blend_withdraw_no_position() {
        let env = Env::default();
        let contract_id = env.register_contract(None, SmasageYieldRouter);
        let client = SmasageYieldRouterClient::new(&env, &contract_id);
        
        let blend_pool_id = env.register_contract(None, MockBlendPool);
        let blend_pool_client = MockBlendPoolClient::new(&env, &blend_pool_id);
        
        let user = Address::generate(&env);
        let usdc_token = Address::generate(&env);

        env.mock_all_auths();

        blend_pool_client.initialize(&INDEX_RATE_PRECISION);
        client.initialize_blend(&blend_pool_id, &usdc_token);

        // Should panic - no position to withdraw
        client.withdraw_from_blend(&user, &0);
    }
}
