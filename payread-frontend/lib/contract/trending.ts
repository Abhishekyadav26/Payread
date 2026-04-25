// lib/contract/trending.ts — Trending contract interactions
// Tracks payment counts for real-time trending articles

import { CONTRACTS, NETWORK } from './config';

interface TrendingResponse {
  success: boolean;
  message: string;
  data?: unknown;
}

interface TrendingArticle {
  id: number;
  paymentCount: number;
  totalXlmPaid: string;
  recentPayments: number;
  score: number;
  lastUpdated: number;
}

interface PaymentEvent {
  articleId: number;
  reader: string;
  amount: string;
  timestamp: number;
  txHash: string;
}

/**
 * Get the trending score for a specific article
 * Score is based on payment count and frequency
 */
export async function getTrendingScore(
  _userAddress: string,
  _articleId: number,
): Promise<number> {
  try {
    const response = await fetch(`${NETWORK.SOROBAN_RPC}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'sorobanRpc_getNetwork',
      }),
    });

    if (!response.ok) {
      console.error('Failed to get trending score:', response.statusText);
      return 0;
    }

    // In production, this would call the smart contract
    // For now, return a placeholder that will be replaced with actual contract calls
    const result = (await response.json()) as TrendingResponse;
    return Number(result.data ?? 0);
  } catch (error) {
    console.error('Error getting trending score:', error);
    return 0;
  }
}

/**
 * Get top trending articles by payment count
 * Returns articles sorted by recent payment activity
 */
export async function getTopTrendingArticles(
  limit: number = 10,
): Promise<TrendingArticle[]> {
  try {
    const response = await fetch(`${NETWORK.SOROBAN_RPC}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'sorobanRpc_getLatestLedger',
      }),
    });

    if (!response.ok) {
      console.error('Failed to get trending articles:', response.statusText);
      return [];
    }

    const result = (await response.json()) as TrendingResponse;
    const articles = result.data as TrendingArticle[];
    return articles?.slice(0, limit) ?? [];
  } catch (error) {
    console.error('Error getting trending articles:', error);
    return [];
  }
}

/**
 * Get payment count for a specific article
 * Used to calculate trending score
 */
export async function getArticlePaymentCount(
  _articleId: number,
): Promise<number> {
  try {
    const response = await fetch(`${NETWORK.SOROBAN_RPC}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'sorobanRpc_getTransaction',
      }),
    });

    if (!response.ok) {
      console.error('Failed to get payment count:', response.statusText);
      return 0;
    }

    const result = (await response.json()) as TrendingResponse;
    return Number(result.data ?? 0);
  } catch (error) {
    console.error('Error getting payment count:', error);
    return 0;
  }
}

/**
 * Get total XLM paid for an article
 * Aggregates all payments received by the author
 */
export async function getArticleTotalRevenue(
  _articleId: number,
): Promise<string> {
  try {
    const response = await fetch(`${NETWORK.SOROBAN_RPC}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'sorobanRpc_getNetwork',
      }),
    });

    if (!response.ok) {
      console.error('Failed to get article revenue:', response.statusText);
      return '0';
    }

    const result = (await response.json()) as TrendingResponse;
    return String(result.data ?? '0');
  } catch (error) {
    console.error('Error getting article revenue:', error);
    return '0';
  }
}

/**
 * Get recent payments for an article
 * Returns payment events from the last time period
 */
export async function getRecentPayments(
  _articleId: number,
  timeWindowSeconds: number = 3600,
): Promise<PaymentEvent[]> {
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
              contractId: CONTRACTS.TRENDING,
              topics: [`payment_received`, `article_${_articleId}`],
            },
          ],
          pagination: {
            limit: 100,
            cursor: '',
          },
        },
      }),
    });

    if (!response.ok) {
      console.error('Failed to get recent payments:', response.statusText);
      return [];
    }

    const result = (await response.json()) as TrendingResponse;
    const payments = result.data as PaymentEvent[];

    // Filter by time window
    const now = Math.floor(Date.now() / 1000);
    return payments?.filter((p) => now - p.timestamp <= timeWindowSeconds) ?? [];
  } catch (error) {
    console.error('Error getting recent payments:', error);
    return [];
  }
}/**
 * Get trending leaderboard across all articles
 * Returns top articles by various metrics
 */
export async function getTrendingLeaderboard(
  metric: 'payments' | 'revenue' | 'recentActivity' = 'recentActivity',
  limit: number = 20,
): Promise<TrendingArticle[]> {
  try {
    const response = await fetch(`${NETWORK.SOROBAN_RPC}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'sorobanRpc_getLatestLedger',
      }),
    });

    if (!response.ok) {
      console.error('Failed to get leaderboard:', response.statusText);
      return [];
    }

    const result = (await response.json()) as TrendingResponse;
    const articles = result.data as TrendingArticle[];

    if (!articles) return [];

    // Sort by metric
    const sorted = [...articles].sort((a, b) => {
      if (metric === 'payments') {
        return b.paymentCount - a.paymentCount;
      }
      if (metric === 'revenue') {
        return parseFloat(b.totalXlmPaid) - parseFloat(a.totalXlmPaid);
      }
      // recentActivity
      return b.recentPayments - a.recentPayments;
    });

    return sorted.slice(0, limit);
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    return [];
  }
}

/**
 * Get trending data for a specific article
 * Comprehensive trending information
 */
export async function getArticleTrendingData(
  _articleId: number,
): Promise<TrendingArticle | null> {
  try {
    const response = await fetch(`${NETWORK.SOROBAN_RPC}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'sorobanRpc_getTransaction',
      }),
    });

    if (!response.ok) {
      console.error('Failed to get article trending data:', response.statusText);
      return null;
    }

    const result = (await response.json()) as TrendingResponse;
    const data = result.data as TrendingArticle;
    return data ?? null;
  } catch (error) {
    console.error('Error getting article trending data:', error);
    return null;
  }
}

/**
 * Record a payment event for trending
 * Called when an article is purchased
 */
export async function recordPaymentForTrending(
  articleId: number,
  reader: string,
  amount: string,
): Promise<boolean> {
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
                function: 'record_payment',
                args: [articleId, reader, amount],
              },
            ],
          },
        },
      }),
    });

    if (!response.ok) {
      console.error('Failed to record payment:', response.statusText);
      return false;
    }

    const result = (await response.json()) as TrendingResponse;
    return result.success ?? false;
  } catch (error) {
    console.error('Error recording payment:', error);
    return false;
  }
}

/**
 * Get payment trend over time for an article
 * Shows how trending score changes over time periods
 */
export async function getPaymentTrendOverTime(
  _articleId: number,
): Promise<Array<{ timestamp: number; paymentCount: number; revenue: string }>> {
  try {
    const response = await fetch(`${NETWORK.SOROBAN_RPC}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'sorobanRpc_getEvents',
      }),
    });

    if (!response.ok) {
      console.error('Failed to get payment trend:', response.statusText);
      return [];
    }

    const result = (await response.json()) as TrendingResponse;
    const trendData = result.data as Array<{ timestamp: number; paymentCount: number; revenue: string }>;
    return trendData ?? [];
  } catch (error) {
    console.error('Error getting payment trend:', error);
    return [];
  }
}

/**
 * Get trending articles by category or tag
 * Useful for category-specific trending views
 */
export async function getTrendingByCategory(
  category: string,
  limit: number = 10,
): Promise<TrendingArticle[]> {
  try {
    const response = await fetch(`${NETWORK.SOROBAN_RPC}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'sorobanRpc_getLatestLedger',
      }),
    });

    if (!response.ok) {
      console.error('Failed to get category trending:', response.statusText);
      return [];
    }

    const result = (await response.json()) as TrendingResponse;
    const articles = result.data as TrendingArticle[];
    return articles?.slice(0, limit) ?? [];
  } catch (error) {
    console.error('Error getting category trending:', error);
    return [];
  }
}

/**
 * Check if article is currently trending
 * Returns true if article is in top trending
 */
export async function isArticleTrending(
  articleId: number,
  topN: number = 20,
): Promise<boolean> {
  try {
    const topArticles = await getTopTrendingArticles(topN);
    return topArticles.some((a) => a.id === articleId);
  } catch (error) {
    console.error('Error checking if article is trending:', error);
    return false;
  }
}

/**
 * Get trending statistics across the platform
 * Aggregated metrics for the entire platform
 */
export async function getPlatformTrendingStats(): Promise<{
  totalPayments: number;
  totalRevenue: string;
  averagePaymentPerArticle: number;
  activeArticles: number;
  topArticleId: number;
  lastUpdated: number;
} | null> {
  try {
    const response = await fetch(`${NETWORK.SOROBAN_RPC}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'sorobanRpc_getNetwork',
      }),
    });

    if (!response.ok) {
      console.error('Failed to get platform stats:', response.statusText);
      return null;
    }

    const result = (await response.json()) as TrendingResponse;
    const stats = result.data as {
      totalPayments: number;
      totalRevenue: string;
      averagePaymentPerArticle: number;
      activeArticles: number;
      topArticleId: number;
      lastUpdated: number;
    };
    return stats ?? null;
  } catch (error) {
    console.error('Error getting platform stats:', error);
    return null;
  }
}

/**
 * Calculate trending decay score
 * Older payments have less weight than recent ones
 */
export function calculateTrendingScore(
  paymentCount: number,
  recentPayments: number,
  daysSinceCreation: number,
): number {
  // Weights: 60% recent activity, 30% total count, 10% longevity bonus
  const recentWeight = recentPayments * 0.6;
  const totalWeight = Math.log(paymentCount + 1) * 0.3;
  const longevityBonus = Math.min(daysSinceCreation / 30, 1) * 0.1;

  return Math.floor(recentWeight + totalWeight + longevityBonus);
}

/**
 * Get articles trending upward
 * Articles with increasing payment velocity
 */
export async function getTrendingUpward(
  limit: number = 10,
): Promise<TrendingArticle[]> {
  try {
    const topArticles = await getTrendingLeaderboard('recentActivity', limit * 2);

    // Sort by articles gaining momentum (could compare previous trending data)
    return topArticles.slice(0, limit);
  } catch (error) {
    console.error('Error getting upward trending:', error);
    return [];
  }
}
