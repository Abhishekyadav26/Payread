// lib/contract/read_token.ts — READ token contract interactions
// Handles minting and checking READ pass ownership

import { CONTRACTS, NETWORK } from './config';

interface ReadTokenResponse {
  success: boolean;
  message: string;
  data?: unknown;
}

/**
 * Check if an address has a READ pass for a specific article
 * A READ pass is minted when a reader pays for access to an article
 */
export async function checkReadPass(
  userAddress: string,
  articleId: number,
): Promise<boolean> {
  try {
    // Call the read_token contract to check if user has READ pass
    // The READ pass is an NFT minted to the reader's wallet when they pay
    const response = await fetch(`${NETWORK.SOROBAN_RPC}/invoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'has_read_pass',
        params: {
          reader: userAddress,
          article_id: articleId,
        },
      }),
    });

    if (!response.ok) {
      console.error('Failed to check READ pass:', response.statusText);
      return false;
    }

    const result = (await response.json()) as ReadTokenResponse;
    return result.success && Boolean(result.data);
  } catch (error) {
    console.error('Error checking READ pass:', error);
    return false;
  }
}/**
 * Get the balance of READ tokens for a user
 * READ tokens represent paid article access
 */
export async function getReadTokenBalance(
  userAddress: string,
): Promise<string> {
  try {
    const response = await fetch(`${NETWORK.SOROBAN_RPC}/invoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'balance_of',
        params: {
          id: userAddress,
        },
      }),
    });

    if (!response.ok) {
      console.error('Failed to get READ token balance:', response.statusText);
      return '0';
    }

    const result = (await response.json()) as ReadTokenResponse;
    return String(result.data ?? '0');
  } catch (error) {
    console.error('Error getting READ token balance:', error);
    return '0';
  }
}

/**
 * Get metadata for a specific READ token (article access record)
 */
export async function getReadTokenMetadata(
  articleId: number,
): Promise<{
  id: number;
  title: string;
  author: string;
  purchasePrice: string;
} | null> {
  try {
    const response = await fetch(`${NETWORK.SOROBAN_RPC}/invoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'token_metadata',
        params: {
          token_id: articleId,
        },
      }),
    });

    if (!response.ok) {
      console.error('Failed to get READ token metadata:', response.statusText);
      return null;
    }

    const result = (await response.json()) as ReadTokenResponse;
    const metadata = result.data as {
      id: number;
      title: string;
      author: string;
      purchasePrice: string;
    } | null;
    return metadata ?? null;
  } catch (error) {
    console.error('Error getting READ token metadata:', error);
    return null;
  }
}

/**
 * Get all READ passes owned by a user
 * Returns array of article IDs that the user has access to
 */
export async function getUserReadPasses(
  userAddress: string,
): Promise<number[]> {
  try {
    const response = await fetch(`${NETWORK.SOROBAN_RPC}/invoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'get_user_passes',
        params: {
          user: userAddress,
        },
      }),
    });

    if (!response.ok) {
      console.error('Failed to get user READ passes:', response.statusText);
      return [];
    }

    const result = (await response.json()) as ReadTokenResponse;
    return (result.data as number[]) ?? [];
  } catch (error) {
    console.error('Error getting user READ passes:', error);
    return [];
  }
}

/**
 * Verify READ pass ownership for an article
 * Used to determine if user has paid access before showing content
 */
export async function verifyReadPassOwnership(
  userAddress: string,
  articleId: number,
): Promise<{
  owned: boolean;
  purchaseDate?: number;
  expiryDate?: number;
}> {
  try {
    const response = await fetch(`${NETWORK.SOROBAN_RPC}/invoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'verify_pass',
        params: {
          reader: userAddress,
          article_id: articleId,
        },
      }),
    });

    if (!response.ok) {
      console.error('Failed to verify READ pass:', response.statusText);
      return { owned: false };
    }

    const result = (await response.json()) as ReadTokenResponse;
    const verification = result.data as {
      owned: boolean;
      purchaseDate?: number;
      expiryDate?: number;
    };
    return verification ?? { owned: false };
  } catch (error) {
    console.error('Error verifying READ pass:', error);
    return { owned: false };
  }
}

/**
 * Get transfer history for a READ token
 * Shows who has owned the pass and when
 */
export async function getReadPassTransferHistory(
  articleId: number,
): Promise<Array<{
  from: string;
  to: string;
  timestamp: number;
  txHash: string;
}>> {
  try {
    const response = await fetch(`${NETWORK.SOROBAN_RPC}/invoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'transfer_history',
        params: {
          token_id: articleId,
        },
      }),
    });

    if (!response.ok) {
      console.error('Failed to get transfer history:', response.statusText);
      return [];
    }

    const result = (await response.json()) as ReadTokenResponse;
    return (result.data as Array<{
      from: string;
      to: string;
      timestamp: number;
      txHash: string;
    }>) ?? [];
  } catch (error) {
    console.error('Error getting transfer history:', error);
    return [];
  }
}

/**
 * Check if multiple addresses have READ passes for an article
 * Useful for batch verification
 */
export async function checkMultipleReadPasses(
  addresses: string[],
  articleId: number,
): Promise<Record<string, boolean>> {
  try {
    const checks = await Promise.all(
      addresses.map(async (addr) => ({
        address: addr,
        hasAccess: await checkReadPass(addr, articleId),
      })),
    );

    return checks.reduce(
      (acc, { address, hasAccess }) => {
        acc[address] = hasAccess;
        return acc;
      },
      {} as Record<string, boolean>,
    );
  } catch (error) {
    console.error('Error checking multiple READ passes:', error);
    return addresses.reduce(
      (acc, addr) => {
        acc[addr] = false;
        return acc;
      },
      {} as Record<string, boolean>,
    );
  }
}
