#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, String, Symbol, IntoVal,
};

// Issue 2: Smart Contract - Stellar Path Payments & Yield Allocation (Blend Integration)

#[contracttype]
pub enum DataKey {
    Admin,
    UserBalance(Address),
    UserLPShares(Address),
    TotalDeposits,
    GoldAssetCode,
    GoldAssetIssuer,
    GoldTrustlineReady,
    GoldTrustlineReserveStroops,
    SoroswapRouter,
    UsdcAsset,
    PairedAsset,
}

const CANONICAL_GOLD_ASSET_CODE: Symbol = symbol_short!("XAUT");
const CANONICAL_GOLD_ASSET_ISSUER: &str = "GCRLXTLD7XIRXWXV2PDCC74O5TUUKN3OODJAM6TWVE4AIRNMGQJK3KWQ";
const TRUSTLINE_BASE_RESERVE_STROOPS: i128 = 5_000_000;

#[contract]
pub struct SmasageYieldRouter;

#[contractimpl]
impl SmasageYieldRouter {
    pub fn initialize(env: Env, admin: Address, usdc: Address) {
        if env.storage().persistent().has(&DataKey::Admin) {
            panic!("Already initialized");
        }
        admin.require_auth();
        env.storage().persistent().set(&DataKey::Admin, &admin);
        env.storage().persistent().set(&DataKey::UsdcAsset, &usdc);
    }

    pub fn configure_soroswap(env: Env, admin: Address, router: Address, paired_asset: Address) {
        let stored_admin: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Admin)
            .expect("Contract not initialized");
        assert!(admin == stored_admin, "Only admin can configure Soroswap");
        admin.require_auth();

        env.storage().persistent().set(&DataKey::SoroswapRouter, &router);
        env.storage().persistent().set(&DataKey::PairedAsset, &paired_asset);
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

    pub fn deposit(env: Env, from: Address, amount: i128, blend_percentage: u32, lp_percentage: u32) {
        from.require_auth();
        assert!(blend_percentage + lp_percentage <= 100, "Allocation exceeds 100%");
        
        let mut balance: i128 = env.storage().persistent().get(&DataKey::UserBalance(from.clone())).unwrap_or(0);
        balance += amount;
        env.storage().persistent().set(&DataKey::UserBalance(from.clone()), &balance);
        
        // Mock: Here we would route `blend_percentage` to the Blend protocol
        
        if lp_percentage > 0 {
            let lp_amount = (amount * lp_percentage as i128) / 100;
            let usdc_asset: Address = env.storage().persistent().get(&DataKey::UsdcAsset).expect("USDC not configured");
            let router_address: Address = env.storage().persistent().get(&DataKey::SoroswapRouter).expect("Soroswap Router not configured");
            let paired_asset: Address = env.storage().persistent().get(&DataKey::PairedAsset).expect("Paired Asset not configured");

            let half_usdc = lp_amount / 2;
            let remaining_usdc = lp_amount - half_usdc;

            // 1. Swap half USDC for Paired Asset (e.g. XLM)
            let mut path = soroban_sdk::Vec::new(&env);
            path.push_back(usdc_asset.clone());
            path.push_back(paired_asset.clone());

            let deadline = env.ledger().timestamp() + 300; // 5 minute deadline
            
            let swap_result: soroban_sdk::Vec<i128> = env.invoke_contract(
                &router_address,
                &soroban_sdk::Symbol::new(&env, "swap_exact_tokens_for_tokens"),
                soroban_sdk::vec![
                    &env,
                    half_usdc.into_val(&env),
                    0i128.into_val(&env),
                    path.into_val(&env),
                    env.current_contract_address().into_val(&env),
                    deadline.into_val(&env),
                ],
            );
            
            let paired_amount = swap_result.get(swap_result.len() - 1).unwrap();

            // 2. Add Liquidity
            let liquidity_result: (i128, i128, i128) = env.invoke_contract(
                &router_address,
                &soroban_sdk::Symbol::new(&env, "add_liquidity"),
                soroban_sdk::vec![
                    &env,
                    usdc_asset.into_val(&env),
                    paired_asset.into_val(&env),
                    remaining_usdc.into_val(&env),
                    paired_amount.into_val(&env),
                    0i128.into_val(&env),
                    0i128.into_val(&env),
                    env.current_contract_address().into_val(&env),
                    deadline.into_val(&env),
                ],
            );

            let lp_shares = liquidity_result.2;

            // 3. Track LP Shares for user
            let mut user_lp_shares: i128 = env.storage().persistent().get(&DataKey::UserLPShares(from.clone())).unwrap_or(0);
            user_lp_shares += lp_shares;
            env.storage().persistent().set(&DataKey::UserLPShares(from.clone()), &user_lp_shares);
        }
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

    pub fn get_lp_shares(env: Env, user: Address) -> i128 {
        env.storage().persistent().get(&DataKey::UserLPShares(user)).unwrap_or(0)
    }
}

// Basic Test Mock
#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Address, Env, String, Val};

    // Mock contract for Soroswap Router
    #[contract]
    pub struct MockSoroswapRouter;

    #[contractimpl]
    impl MockSoroswapRouter {
        pub fn swap_exact_tokens_for_tokens(
            env: Env,
            amount_in: i128,
            _amount_out_min: i128,
            _path: soroban_sdk::Vec<Address>,
            _to: Address,
            _deadline: u64,
        ) -> soroban_sdk::Vec<i128> {
            // Mock: 1 USDC = 2 XLM
            let mut result = soroban_sdk::Vec::new(&env);
            result.push_back(amount_in);
            result.push_back(amount_in * 2);
            result
        }

        pub fn add_liquidity(
            _env: Env,
            _token_a: Address,
            _token_b: Address,
            _amount_a_desired: i128,
            _amount_b_desired: i128,
            _amount_a_min: i128,
            _amount_b_min: i128,
            _to: Address,
            _deadline: u64,
        ) -> (i128, i128, i128) {
            // Mock: Returns (amount_a, amount_b, lp_shares)
            // For simplicity, lp_shares = amount_a
            (100, 200, 100) 
        }
    }

    #[test]
    fn test_initialize_gold_trustline() {
        let env = Env::default();
        let usdc = Address::generate(&env);
        let contract_id = env.register(SmasageYieldRouter, ());
        let client = SmasageYieldRouterClient::new(&env, &contract_id);

        let admin = Address::generate(&env);

        env.mock_all_auths();

        client.initialize(&admin, &usdc);
        client.init_gold_trustline(&admin, &5_000_000);

        let (asset_code, asset_issuer) = client.get_gold_asset();
        assert_eq!(asset_code, symbol_short!("XAUT"));
        assert_eq!(
            asset_issuer,
            String::from_str(&env, "GCRLXTLD7XIRXWXV2PDCC74O5TUUKN3OODJAM6TWVE4AIRNMGQJK3KWQ")
        );
        assert!(client.is_gold_trustline_ready());
        assert_eq!(client.get_gold_reserve_stroops(), 5_000_000);
    }

    #[test]
    fn test_deposit_withdraw() {
        let env = Env::default();
        let usdc = Address::generate(&env);
        let contract_id = env.register(SmasageYieldRouter, ());
        let client = SmasageYieldRouterClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let admin = Address::generate(&env);
        
        env.mock_all_auths();

        client.initialize(&admin, &usdc);

        // 60% Blend, 30% LP, 10% Gold (mocked conceptually)
        // We haven't configured Soroswap yet, so lp_percentage must be 0 or it will panic
        client.deposit(&user, &1000, &60, &0);
        
        assert_eq!(client.get_balance(&user), 1000);
        
        client.withdraw(&user, &500);
        assert_eq!(client.get_balance(&user), 500);
    }

    #[test]
    fn test_soroswap_lp_integration() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let user = Address::generate(&env);
        let usdc_addr = Address::generate(&env);
        let xlm_addr = Address::generate(&env);

        let router_id = env.register(MockSoroswapRouter, ());
        
        let contract_id = env.register(SmasageYieldRouter, ());
        let client = SmasageYieldRouterClient::new(&env, &contract_id);

        client.initialize(&admin, &usdc_addr);
        client.configure_soroswap(&admin, &router_id, &xlm_addr);

        // Deposit 1000 USDC, 50% to LP
        // Logic should:
        // 1. Take 500 USDC for LP.
        // 2. Swap 250 USDC for XLM -> Mock returns 500 XLM.
        // 3. Add liquidity with 250 USDC and 500 XLM -> Mock returns 100 LP shares (hardcoded in mock).
        client.deposit(&user, &1000, &0, &50);

        assert_eq!(client.get_balance(&user), 1000);
        assert_eq!(client.get_lp_shares(&user), 100); 
    }
}
