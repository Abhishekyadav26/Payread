// lib/contract/vault.ts — Payment vault contract interactions
// Holds payments from readers, authors can withdraw anytime

import { CONTRACTS, NETWORK } from './config';

interface VaultResponse {
  success: boolean;
  message: string;
  data?: unknown;
}

interface VaultBalance {
  author: string;
  balance: string;
  totalEarned: string;
  totalWithdrawn: string;
  lastWithdrawal: number;
}

interface WithdrawalHistory {
  amount: string;
  timestamp: number;
  txHash: string;
  destination: string;
}

interface VaultTransaction {
  id: string;
  type: 'deposit' | 'withdrawal';
  amount: string;
  author?: string;
  reader?: string;
  articleId?: number;
  timestamp: number;
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
}

/**
 * Get the current balance for an author in the vault
 * This is the amount available to withdraw
 */
export async function getAuthorBalance(
  userAddress: string,
  authorAddress: string,
): Promise<string> {
  try {
    const response = await fetch(`${NETWORK.SOROBAN_RPC}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'sorobanRpc_getAccount',
        params: {
          account: authorAddress,
        },
      }),
    });

    if (!response.ok) {
      console.error('Failed to get author balance:', response.statusText);
      return '0';
    }

    const result = (await response.json()) as VaultResponse;
    return String(result.data ?? '0');
  } catch (error) {
    console.error('Error getting author balance:', error);
    return '0';
  }
}

/**
 * Get detailed vault balance information for an author
 * Includes total earned, total withdrawn, and last withdrawal time
 */
export async function getAuthorVaultBalance(
  authorAddress: string,
): Promise<VaultBalance | null> {
  try {
    const response = await fetch(`${NETWORK.SOROBAN_RPC}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'sorobanRpc_getTransaction',
        params: {
          account: authorAddress,
        },
      }),
    });

    if (!response.ok) {
      console.error('Failed to get vault balance:', response.statusText);
      return null;
    }

    const result = (await response.json()) as VaultResponse;
    const balance = result.data as VaultBalance;
    return balance ?? null;
  } catch (error) {
    console.error('Error getting vault balance:', error);
    return null;
  }
}

/**
 * Deposit payment to vault for an author
 * Called when a reader pays for an article
 */
export async function depositToVault(
  authorAddress: string,
  amount: string,
  articleId: number,
  readerAddress: string,
): Promise<string | null> {
  try {
    const response = await fetch(`${NETWORK.SOROBAN_RPC}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'sorobanRpc_simulateTransaction',
        params: {
          transaction: {
            operations: [
              {
                type: 'invokeHostFunction',
                function: 'deposit',
                args: [authorAddress, amount, articleId, readerAddress],
              },
            ],
          },
        },
      }),
    });

    if (!response.ok) {
      console.error('Failed to deposit to vault:', response.statusText);
      return null;
    }

    const result = (await response.json()) as VaultResponse;
    return result.data as string | null;
  } catch (error) {
    console.error('Error depositing to vault:', error);
    return null;
  }
}

/**
 * Build withdrawal transaction for author to withdraw balance
 * Returns XDR transaction that needs to be signed
 */
export async function buildWithdrawTx(
  authorAddress: string,
): Promise<string> {
  try {
    const response = await fetch(`${NETWORK.SOROBAN_RPC}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'sorobanRpc_simulateTransaction',
        params: {
          transaction: {
            operations: [
              {
                type: 'invokeHostFunction',
                function: 'withdraw_all',
                args: [authorAddress],
              },
            ],
          },
        },
      }),
    });

    if (!response.ok) {
      console.error('Failed to build withdrawal transaction:', response.statusText);
      throw new Error('Failed to build withdrawal transaction');
    }

    const result = (await response.json()) as VaultResponse;
    const xdr = result.data as string;
    if (!xdr) {
      throw new Error('No transaction XDR returned');
    }
    return xdr;
  } catch (error) {
    console.error('Error building withdrawal transaction:', error);
    throw error;
  }
}

/**
 * Build partial withdrawal transaction
 * Allows withdrawing a specific amount instead of entire balance
 */
export async function buildPartialWithdrawTx(
  authorAddress: string,
  amount: string,
): Promise<string> {
  try {
    const response = await fetch(`${NETWORK.SOROBAN_RPC}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'sorobanRpc_simulateTransaction',
        params: {
          transaction: {
            operations: [
              {
                type: 'invokeHostFunction',
                function: 'withdraw',
                args: [authorAddress, amount],
              },
            ],
          },
        },
      }),
    });

    if (!response.ok) {
      console.error('Failed to build partial withdrawal:', response.statusText);
      throw new Error('Failed to build partial withdrawal');
    }

    const result = (await response.json()) as VaultResponse;
    const xdr = result.data as string;
    if (!xdr) {
      throw new Error('No transaction XDR returned');
    }
    return xdr;
  } catch (error) {
    console.error('Error building partial withdrawal:', error);
    throw error;
  }
}

/**
 * Get withdrawal history for an author
 * Shows all past withdrawals with amounts and dates
 */
export async function getWithdrawalHistory(
  authorAddress: string,
  limit: number = 50,
): Promise<WithdrawalHistory[]> {
  try {
    const response = await fetch(`${NETWORK.SOROBAN_RPC}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'sorobanRpc_getEvents',
        params: {
          filters: [
            {
              type: 'contract',
              contractId: CONTRACTS.PAYMENT_VAULT,
              topics: ['withdrawal', authorAddress],
            },
          ],
          pagination: {
            limit,
            cursor: '',
          },
        },
      }),
    });

    if (!response.ok) {
      console.error('Failed to get withdrawal history:', response.statusText);
      return [];
    }

    const result = (await response.json()) as VaultResponse;
    const history = result.data as WithdrawalHistory[];
    return history ?? [];
  } catch (error) {
    console.error('Error getting withdrawal history:', error);
    return [];
  }
}

/**
 * Get deposit history for an article
 * Shows all payments received by the article
 */
export async function getDepositHistory(
  articleId: number,
  limit: number = 100,
): Promise<VaultTransaction[]> {
  try {
    const response = await fetch(`${NETWORK.SOROBAN_RPC}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'sorobanRpc_getEvents',
        params: {
          filters: [
            {
              type: 'contract',
              contractId: CONTRACTS.PAYMENT_VAULT,
              topics: ['deposit', `article_${articleId}`],
            },
          ],
          pagination: {
            limit,
            cursor: '',
          },
        },
      }),
    });

    if (!response.ok) {
      console.error('Failed to get deposit history:', response.statusText);
      return [];
    }

    const result = (await response.json()) as VaultResponse;
    const history = result.data as VaultTransaction[];
    return history ?? [];
  } catch (error) {
    console.error('Error getting deposit history:', error);
    return [];
  }
}

/**
 * Get transaction history for a vault account
 * Shows all deposits and withdrawals
 */
export async function getVaultTransactionHistory(
  authorAddress: string,
  limit: number = 100,
): Promise<VaultTransaction[]> {
  try {
    const response = await fetch(`${NETWORK.SOROBAN_RPC}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'sorobanRpc_getEvents',
        params: {
          filters: [
            {
              type: 'contract',
              contractId: CONTRACTS.PAYMENT_VAULT,
              topics: [authorAddress],
            },
          ],
          pagination: {
            limit,
            cursor: '',
          },
        },
      }),
    });

    if (!response.ok) {
      console.error('Failed to get transaction history:', response.statusText);
      return [];
    }

    const result = (await response.json()) as VaultResponse;
    const history = result.data as VaultTransaction[];
    return history ?? [];
  } catch (error) {
    console.error('Error getting transaction history:', error);
    return [];
  }
}

/**
 * Check if an author has pending balance in vault
 * Used to show notification badges
 */
export async function hasWithdrawableBalance(
  authorAddress: string,
): Promise<boolean> {
  try {
    const balance = await getAuthorBalance(authorAddress, authorAddress);
    return parseFloat(balance) > 0;
  } catch (error) {
    console.error('Error checking withdrawable balance:', error);
    return false;
  }
}

/**
 * Get vault statistics for an author
 * Comprehensive vault info: total earned, withdrawn, pending, etc.
 */
export async function getAuthorVaultStats(
  authorAddress: string,
): Promise<{
  totalEarned: string;
  totalWithdrawn: string;
  currentBalance: string;
  withdrawalCount: number;
  lastWithdrawalTime: number | null;
  averageWithdrawal: string;
}> {
  try {
    const vaultBalance = await getAuthorVaultBalance(authorAddress);
    const withdrawalHistory = await getWithdrawalHistory(authorAddress);

    if (!vaultBalance) {
      return {
        totalEarned: '0',
        totalWithdrawn: '0',
        currentBalance: '0',
        withdrawalCount: 0,
        lastWithdrawalTime: null,
        averageWithdrawal: '0',
      };
    }

    const totalWithdrawn = withdrawalHistory.reduce(
      (sum, w) => sum + parseFloat(w.amount),
      0,
    );
    const averageWithdrawal =
      withdrawalHistory.length > 0
        ? (totalWithdrawn / withdrawalHistory.length).toFixed(7)
        : '0';

    return {
      totalEarned: vaultBalance.totalEarned,
      totalWithdrawn: String(totalWithdrawn.toFixed(7)),
      currentBalance: vaultBalance.balance,
      withdrawalCount: withdrawalHistory.length,
      lastWithdrawalTime: vaultBalance.lastWithdrawal,
      averageWithdrawal,
    };
  } catch (error) {
    console.error('Error getting vault stats:', error);
    return {
      totalEarned: '0',
      totalWithdrawn: '0',
      currentBalance: '0',
      withdrawalCount: 0,
      lastWithdrawalTime: null,
      averageWithdrawal: '0',
    };
  }
}

/**
 * Check if author can withdraw
 * Validates balance and withdrawal rules
 */
export async function canAuthorWithdraw(
  authorAddress: string,
): Promise<{
  canWithdraw: boolean;
  reason: string;
  balance: string;
}> {
  try {
    const balance = await getAuthorBalance(authorAddress, authorAddress);
    const balanceAmount = parseFloat(balance);

    if (balanceAmount <= 0) {
      return {
        canWithdraw: false,
        reason: 'No balance to withdraw',
        balance: '0',
      };
    }

    // Check if there's a minimum withdrawal amount (e.g., 0.1 XLM)
    if (balanceAmount < 0.1) {
      return {
        canWithdraw: false,
        reason: 'Balance below minimum withdrawal (0.1 XLM)',
        balance,
      };
    }

    return {
      canWithdraw: true,
      reason: 'Ready to withdraw',
      balance,
    };
  } catch (error) {
    console.error('Error checking withdrawal eligibility:', error);
    return {
      canWithdraw: false,
      reason: 'Error checking balance',
      balance: '0',
    };
  }
}

/**
 * Estimate fees for withdrawal
 * Returns estimate of network and platform fees
 */
export async function estimateWithdrawalFees(
  amount: string,
): Promise<{
  networkFee: string;
  platformFee: string;
  totalFees: string;
  netAmount: string;
}> {
  try {
    // Network fee estimate (in stroops, typically 100-1000)
    const networkFeeStroops = 1000;
    const networkFee = (networkFeeStroops / 10_000_000).toFixed(7);

    // Platform fee estimate (e.g., 0.5% for withdrawals)
    const amountNum = parseFloat(amount);
    const platformFeePercent = 0.005; // 0.5%
    const platformFee = (amountNum * platformFeePercent).toFixed(7);

    const totalFeesNum = parseFloat(networkFee) + parseFloat(platformFee);
    const netAmountNum = amountNum - totalFeesNum;

    return {
      networkFee,
      platformFee,
      totalFees: totalFeesNum.toFixed(7),
      netAmount: Math.max(0, netAmountNum).toFixed(7),
    };
  } catch (error) {
    console.error('Error estimating fees:', error);
    return {
      networkFee: '0.0001',
      platformFee: '0',
      totalFees: '0.0001',
      netAmount: '0',
    };
  }
}

/**
 * Get vault contract info
 * Returns contract address and version
 */
export async function getVaultContractInfo(): Promise<{
  contractId: string;
  version: string;
  name: string;
  description: string;
}> {
  try {
    const response = await fetch(`${NETWORK.SOROBAN_RPC}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'sorobanRpc_getContract',
        params: {
          contractId: CONTRACTS.PAYMENT_VAULT,
        },
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get vault contract info');
    }

    return {
      contractId: CONTRACTS.PAYMENT_VAULT,
      version: '1.0.0',
      name: 'PayRead Payment Vault',
      description: 'Holds article payments, authors withdraw anytime',
    };
  } catch (error) {
    console.error('Error getting vault contract info:', error);
    throw error;
  }
}

/**
 * Subscribe to withdrawal events for an author
 * Real-time updates when withdrawals occur
 */
export function subscribeToWithdrawals(
  authorAddress: string,
  callback: (withdrawal: WithdrawalHistory) => void,
): () => void {
  // Set up polling interval (in production, use websockets)
  const interval = setInterval(async () => {
    try {
      const history = await getWithdrawalHistory(authorAddress, 1);
      if (history.length > 0) {
        callback(history[0]);
      }
    } catch (error) {
      console.error('Error polling withdrawals:', error);
    }
  }, 5000); // Poll every 5 seconds

  // Return unsubscribe function
  return () => clearInterval(interval);
}

/**
 * Calculate earnings breakdown by article
 * Shows which articles earned the most
 */
export async function getEarningsByArticle(
  authorAddress: string,
): Promise<Array<{ articleId: number; amount: string; paymentCount: number }>> {
  try {
    const history = await getVaultTransactionHistory(authorAddress);

    // Group by article and sum
    const byArticle: Record<
      number,
      { amount: number; count: number }
    > = {};

    history.forEach((tx) => {
      if (tx.type === 'deposit' && tx.articleId) {
        if (!byArticle[tx.articleId]) {
          byArticle[tx.articleId] = { amount: 0, count: 0 };
        }
        byArticle[tx.articleId].amount += parseFloat(tx.amount);
        byArticle[tx.articleId].count += 1;
      }
    });

    // Convert to array and sort by amount
    const result = Object.entries(byArticle)
      .map(([articleId, data]) => ({
        articleId: parseInt(articleId, 10),
        amount: data.amount.toFixed(7),
        paymentCount: data.count,
      }))
      .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));

    return result;
  } catch (error) {
    console.error('Error getting earnings by article:', error);
    return [];
  }
}
