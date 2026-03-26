import { SorobanRpc, Address } from '@stellar/stellar-sdk';

/**
 * Smasage Balance Reader
 * Reads on-chain state from the Soroban contract to provide portfolio data
 * for the frontend dashboard and AI agent decision-making.
 */

const SOROBAN_RPC_URL = process.env.SOROBAN_RPC_URL || 'https://soroban-test.stellar.org';
const SMASAGE_CONTRACT_ID = process.env.SMASAGE_CONTRACT_ID || '';

const server = new SorobanRpc.Server(SOROBAN_RPC_URL);

/**
 * Read user's USDC balance from the Smasage contract
 */
export async function getUserBalance(userAddress: string): Promise<number> {
  try {
    const contractAddress = new Address(SMASAGE_CONTRACT_ID);
    const userAddr = new Address(userAddress);

    const response = await server.invokeContract({
      contractId: contractAddress.toString(),
      method: 'get_balance',
      args: [userAddr.toScVal()],
    });

    return response.valueOf() as number;
  } catch (error) {
    console.error('Error fetching USDC balance:', error);
    return 0;
  }
}

/**
 * Read user's Gold (XAUT) balance from the Smasage contract
 */
export async function getUserGoldBalance(userAddress: string): Promise<number> {
  try {
    const contractAddress = new Address(SMASAGE_CONTRACT_ID);
    const userAddr = new Address(userAddress);

    const response = await server.invokeContract({
      contractId: contractAddress.toString(),
      method: 'get_gold_balance',
      args: [userAddr.toScVal()],
    });

    return response.valueOf() as number;
  } catch (error) {
    console.error('Error fetching Gold balance:', error);
    return 0;
  }
}

/**
 * Read user's LP shares balance from the Smasage contract
 */
export async function getUserLPShares(userAddress: string): Promise<number> {
  try {
    const contractAddress = new Address(SMASAGE_CONTRACT_ID);
    const userAddr = new Address(userAddress);

    const response = await server.invokeContract({
      contractId: contractAddress.toString(),
      method: 'get_lp_shares',
      args: [userAddr.toScVal()],
    });

    return response.valueOf() as number;
  } catch (error) {
    console.error('Error fetching LP shares:', error);
    return 0;
  }
}

/**
 * Get complete portfolio snapshot for a user
 */
export async function getPortfolioSnapshot(userAddress: string) {
  const [usdcBalance, goldBalance, lpShares] = await Promise.all([
    getUserBalance(userAddress),
    getUserGoldBalance(userAddress),
    getUserLPShares(userAddress),
  ]);

  return {
    usdcBalance,
    goldBalance,
    lpShares,
    totalValue: usdcBalance + goldBalance + lpShares,
    timestamp: new Date().toISOString(),
  };
}

// Example usage
async function main() {
  if (!SMASAGE_CONTRACT_ID) {
    console.log('⚠️  SMASAGE_CONTRACT_ID not set. Using mock data for demonstration.');
    
    // Mock data for testing
    const mockUser = 'GCI3KDRBQZLJ3WDNT7Y6VZLKZB4U5NP2HMQXK7PQWZ3LMRST5UVWX4YZ';
    console.log('\n📊 Mock Portfolio Snapshot:');
    console.log({
      usdcBalance: 1540.23,
      goldBalance: 256.78,
      lpShares: 769.45,
      totalValue: 2566.46,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const userAddress = process.env.USER_ADDRESS;
  if (!userAddress) {
    console.error('❌ USER_ADDRESS environment variable required');
    return;
  }

  console.log(`\n🔍 Fetching portfolio for ${userAddress}...`);
  const snapshot = await getPortfolioSnapshot(userAddress);
  
  console.log('\n📊 Portfolio Snapshot:');
  console.log(`   USDC Balance: $${snapshot.usdcBalance.toFixed(2)}`);
  console.log(`   Gold (XAUT): $${snapshot.goldBalance.toFixed(2)}`);
  console.log(`   LP Shares: $${snapshot.lpShares.toFixed(2)}`);
  console.log(`   Total Value: $${snapshot.totalValue.toFixed(2)}`);
  console.log(`   Updated: ${snapshot.timestamp}`);
}

main();
