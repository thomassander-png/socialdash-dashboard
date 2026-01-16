/**
 * Follower Database Query Helpers
 * 
 * This module provides query functions for reading follower growth data
 * from the external PostgreSQL database (Supabase).
 */
import { getFacebookPool } from './facebook-db';

export interface FollowerSnapshot {
  snapshot_date: Date;
  followers_count: number;
}

export interface FollowerGrowthData {
  account_id: string;
  account_name: string;
  platform: 'facebook' | 'instagram';
  current_followers: number;
  previous_followers: number;
  follower_growth: number;
  growth_percentage: number;
}

export interface MonthlyFollowerData {
  month: string;
  followers_start: number;
  followers_end: number;
  net_growth: number;
  growth_percentage: number;
}

export interface DailyFollowerData {
  date: string;
  followers_count: number;
  daily_change: number;
}

/**
 * Get follower history for a Facebook page within a date range
 */
export async function getFacebookFollowerHistory(
  pageId: string,
  startDate: string,
  endDate: string
): Promise<FollowerSnapshot[]> {
  const pool = getFacebookPool();
  if (!pool) return [];

  try {
    const result = await pool.query(`
      SELECT snapshot_date, followers_count
      FROM fb_follower_history
      WHERE page_id = $1
        AND snapshot_date >= $2
        AND snapshot_date <= $3
      ORDER BY snapshot_date ASC
    `, [pageId, startDate, endDate]);

    return result.rows.map(row => ({
      snapshot_date: new Date(row.snapshot_date),
      followers_count: parseInt(row.followers_count) || 0
    }));
  } catch (error) {
    console.error("[Follower DB] Failed to get FB follower history:", error);
    return [];
  }
}

/**
 * Get follower history for an Instagram account within a date range
 */
export async function getInstagramFollowerHistory(
  accountId: string,
  startDate: string,
  endDate: string
): Promise<FollowerSnapshot[]> {
  const pool = getFacebookPool();
  if (!pool) return [];

  try {
    const result = await pool.query(`
      SELECT snapshot_date, followers_count
      FROM ig_follower_history
      WHERE account_id = $1
        AND snapshot_date >= $2
        AND snapshot_date <= $3
      ORDER BY snapshot_date ASC
    `, [accountId, startDate, endDate]);

    return result.rows.map(row => ({
      snapshot_date: new Date(row.snapshot_date),
      followers_count: parseInt(row.followers_count) || 0
    }));
  } catch (error) {
    console.error("[Follower DB] Failed to get IG follower history:", error);
    return [];
  }
}

/**
 * Get monthly follower growth for a Facebook page
 */
export async function getFacebookMonthlyGrowth(
  pageId: string,
  month: string
): Promise<MonthlyFollowerData | null> {
  const pool = getFacebookPool();
  if (!pool) return null;

  const monthDate = `${month}-01`;

  try {
    const result = await pool.query(`
      WITH month_data AS (
        SELECT 
          -- First snapshot of the month (or last of previous month)
          (SELECT followers_count FROM fb_follower_history 
           WHERE page_id = $1 
           AND snapshot_date <= DATE_TRUNC('month', $2::date) + INTERVAL '1 day'
           ORDER BY snapshot_date DESC LIMIT 1) as followers_start,
          -- Last snapshot of the month
          (SELECT followers_count FROM fb_follower_history 
           WHERE page_id = $1 
           AND snapshot_date >= DATE_TRUNC('month', $2::date)
           AND snapshot_date < DATE_TRUNC('month', $2::date) + INTERVAL '1 month'
           ORDER BY snapshot_date DESC LIMIT 1) as followers_end
      )
      SELECT 
        COALESCE(followers_start, 0) as followers_start,
        COALESCE(followers_end, followers_start, 0) as followers_end,
        COALESCE(followers_end, 0) - COALESCE(followers_start, 0) as net_growth,
        CASE 
          WHEN COALESCE(followers_start, 0) > 0 
          THEN ROUND(((COALESCE(followers_end, 0) - COALESCE(followers_start, 0))::numeric / followers_start) * 100, 2)
          ELSE 0 
        END as growth_percentage
      FROM month_data
    `, [pageId, monthDate]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      month,
      followers_start: parseInt(row.followers_start) || 0,
      followers_end: parseInt(row.followers_end) || 0,
      net_growth: parseInt(row.net_growth) || 0,
      growth_percentage: parseFloat(row.growth_percentage) || 0
    };
  } catch (error) {
    console.error("[Follower DB] Failed to get FB monthly growth:", error);
    return null;
  }
}

/**
 * Get monthly follower growth for an Instagram account
 */
export async function getInstagramMonthlyGrowth(
  accountId: string,
  month: string
): Promise<MonthlyFollowerData | null> {
  const pool = getFacebookPool();
  if (!pool) return null;

  const monthDate = `${month}-01`;

  try {
    const result = await pool.query(`
      WITH month_data AS (
        SELECT 
          -- First snapshot of the month (or last of previous month)
          (SELECT followers_count FROM ig_follower_history 
           WHERE account_id = $1 
           AND snapshot_date <= DATE_TRUNC('month', $2::date) + INTERVAL '1 day'
           ORDER BY snapshot_date DESC LIMIT 1) as followers_start,
          -- Last snapshot of the month
          (SELECT followers_count FROM ig_follower_history 
           WHERE account_id = $1 
           AND snapshot_date >= DATE_TRUNC('month', $2::date)
           AND snapshot_date < DATE_TRUNC('month', $2::date) + INTERVAL '1 month'
           ORDER BY snapshot_date DESC LIMIT 1) as followers_end
      )
      SELECT 
        COALESCE(followers_start, 0) as followers_start,
        COALESCE(followers_end, followers_start, 0) as followers_end,
        COALESCE(followers_end, 0) - COALESCE(followers_start, 0) as net_growth,
        CASE 
          WHEN COALESCE(followers_start, 0) > 0 
          THEN ROUND(((COALESCE(followers_end, 0) - COALESCE(followers_start, 0))::numeric / followers_start) * 100, 2)
          ELSE 0 
        END as growth_percentage
      FROM month_data
    `, [accountId, monthDate]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      month,
      followers_start: parseInt(row.followers_start) || 0,
      followers_end: parseInt(row.followers_end) || 0,
      net_growth: parseInt(row.net_growth) || 0,
      growth_percentage: parseFloat(row.growth_percentage) || 0
    };
  } catch (error) {
    console.error("[Follower DB] Failed to get IG monthly growth:", error);
    return null;
  }
}

/**
 * Get follower growth for all accounts of a customer
 */
export async function getCustomerFollowerGrowth(
  customerId: string,
  month: string
): Promise<FollowerGrowthData[]> {
  const pool = getFacebookPool();
  if (!pool) return [];

  const monthDate = `${month}-01`;

  try {
    // Get Facebook pages for customer
    const fbResult = await pool.query(`
      SELECT 
        ca.account_id,
        fp.name as account_name,
        'facebook' as platform,
        COALESCE((
          SELECT followers_count FROM fb_follower_history 
          WHERE page_id = ca.account_id 
          AND snapshot_date >= DATE_TRUNC('month', $2::date)
          AND snapshot_date < DATE_TRUNC('month', $2::date) + INTERVAL '1 month'
          ORDER BY snapshot_date DESC LIMIT 1
        ), 0) as current_followers,
        COALESCE((
          SELECT followers_count FROM fb_follower_history 
          WHERE page_id = ca.account_id 
          AND snapshot_date >= DATE_TRUNC('month', $2::date - INTERVAL '1 month')
          AND snapshot_date < DATE_TRUNC('month', $2::date)
          ORDER BY snapshot_date DESC LIMIT 1
        ), 0) as previous_followers
      FROM customer_accounts ca
      JOIN fb_pages fp ON ca.account_id = fp.page_id
      WHERE ca.customer_id = $1 AND ca.platform = 'facebook'
    `, [customerId, monthDate]);

    // Get Instagram accounts for customer
    const igResult = await pool.query(`
      SELECT 
        ca.account_id,
        COALESCE(ia.username, ia.name, ca.account_id) as account_name,
        'instagram' as platform,
        COALESCE((
          SELECT followers_count FROM ig_follower_history 
          WHERE account_id = ca.account_id 
          AND snapshot_date >= DATE_TRUNC('month', $2::date)
          AND snapshot_date < DATE_TRUNC('month', $2::date) + INTERVAL '1 month'
          ORDER BY snapshot_date DESC LIMIT 1
        ), 0) as current_followers,
        COALESCE((
          SELECT followers_count FROM ig_follower_history 
          WHERE account_id = ca.account_id 
          AND snapshot_date >= DATE_TRUNC('month', $2::date - INTERVAL '1 month')
          AND snapshot_date < DATE_TRUNC('month', $2::date)
          ORDER BY snapshot_date DESC LIMIT 1
        ), 0) as previous_followers
      FROM customer_accounts ca
      LEFT JOIN ig_accounts ia ON ca.account_id = ia.account_id
      WHERE ca.customer_id = $1 AND ca.platform = 'instagram'
    `, [customerId, monthDate]);

    const results: FollowerGrowthData[] = [];

    for (const row of [...fbResult.rows, ...igResult.rows]) {
      const current = parseInt(row.current_followers) || 0;
      const previous = parseInt(row.previous_followers) || 0;
      const growth = current - previous;
      const percentage = previous > 0 ? Math.round((growth / previous) * 10000) / 100 : 0;

      results.push({
        account_id: row.account_id,
        account_name: row.account_name || row.account_id,
        platform: row.platform as 'facebook' | 'instagram',
        current_followers: current,
        previous_followers: previous,
        follower_growth: growth,
        growth_percentage: percentage
      });
    }

    return results;
  } catch (error) {
    console.error("[Follower DB] Failed to get customer follower growth:", error);
    return [];
  }
}

/**
 * Get daily follower data for a month (for chart visualization)
 */
export async function getDailyFollowerData(
  accountId: string,
  platform: 'facebook' | 'instagram',
  month: string
): Promise<DailyFollowerData[]> {
  const pool = getFacebookPool();
  if (!pool) return [];

  const monthStart = `${month}-01`;
  const table = platform === 'facebook' ? 'fb_follower_history' : 'ig_follower_history';
  const idColumn = platform === 'facebook' ? 'page_id' : 'account_id';

  try {
    const result = await pool.query(`
      WITH daily_data AS (
        SELECT 
          snapshot_date::text as date,
          followers_count,
          LAG(followers_count) OVER (ORDER BY snapshot_date) as prev_followers
        FROM ${table}
        WHERE ${idColumn} = $1
          AND snapshot_date >= DATE_TRUNC('month', $2::date)
          AND snapshot_date < DATE_TRUNC('month', $2::date) + INTERVAL '1 month'
        ORDER BY snapshot_date
      )
      SELECT 
        date,
        followers_count,
        COALESCE(followers_count - prev_followers, 0) as daily_change
      FROM daily_data
    `, [accountId, monthStart]);

    return result.rows.map(row => ({
      date: row.date,
      followers_count: parseInt(row.followers_count) || 0,
      daily_change: parseInt(row.daily_change) || 0
    }));
  } catch (error) {
    console.error("[Follower DB] Failed to get daily follower data:", error);
    return [];
  }
}

/**
 * Get monthly follower history for the last N months
 */
export async function getMonthlyFollowerHistory(
  accountId: string,
  platform: 'facebook' | 'instagram',
  months: number = 12
): Promise<MonthlyFollowerData[]> {
  const pool = getFacebookPool();
  if (!pool) return [];

  const table = platform === 'facebook' ? 'fb_follower_history' : 'ig_follower_history';
  const idColumn = platform === 'facebook' ? 'page_id' : 'account_id';

  try {
    const result = await pool.query(`
      WITH monthly_snapshots AS (
        SELECT 
          DATE_TRUNC('month', snapshot_date) as month,
          MAX(followers_count) FILTER (WHERE snapshot_date = (
            SELECT MAX(snapshot_date) FROM ${table} t2 
            WHERE t2.${idColumn} = $1 
            AND DATE_TRUNC('month', t2.snapshot_date) = DATE_TRUNC('month', ${table}.snapshot_date)
          )) as followers_end
        FROM ${table}
        WHERE ${idColumn} = $1
          AND snapshot_date >= CURRENT_DATE - INTERVAL '${months} months'
        GROUP BY DATE_TRUNC('month', snapshot_date)
        ORDER BY month
      ),
      with_prev AS (
        SELECT 
          TO_CHAR(month, 'YYYY-MM') as month,
          COALESCE(LAG(followers_end) OVER (ORDER BY month), followers_end) as followers_start,
          followers_end,
          followers_end - COALESCE(LAG(followers_end) OVER (ORDER BY month), followers_end) as net_growth
        FROM monthly_snapshots
      )
      SELECT 
        month,
        followers_start,
        followers_end,
        net_growth,
        CASE 
          WHEN followers_start > 0 
          THEN ROUND((net_growth::numeric / followers_start) * 100, 2)
          ELSE 0 
        END as growth_percentage
      FROM with_prev
      ORDER BY month DESC
    `, [accountId]);

    return result.rows.map(row => ({
      month: row.month,
      followers_start: parseInt(row.followers_start) || 0,
      followers_end: parseInt(row.followers_end) || 0,
      net_growth: parseInt(row.net_growth) || 0,
      growth_percentage: parseFloat(row.growth_percentage) || 0
    }));
  } catch (error) {
    console.error("[Follower DB] Failed to get monthly follower history:", error);
    return [];
  }
}

/**
 * Get aggregated follower growth for all accounts (overview)
 */
export async function getAllAccountsFollowerGrowth(
  month: string
): Promise<FollowerGrowthData[]> {
  const pool = getFacebookPool();
  if (!pool) return [];

  const monthDate = `${month}-01`;

  try {
    // Get all Facebook pages with follower data
    const fbResult = await pool.query(`
      SELECT DISTINCT ON (fp.page_id)
        fp.page_id as account_id,
        fp.name as account_name,
        'facebook' as platform,
        COALESCE((
          SELECT followers_count FROM fb_follower_history 
          WHERE page_id = fp.page_id 
          AND snapshot_date >= DATE_TRUNC('month', $1::date)
          AND snapshot_date < DATE_TRUNC('month', $1::date) + INTERVAL '1 month'
          ORDER BY snapshot_date DESC LIMIT 1
        ), 0) as current_followers,
        COALESCE((
          SELECT followers_count FROM fb_follower_history 
          WHERE page_id = fp.page_id 
          AND snapshot_date >= DATE_TRUNC('month', $1::date - INTERVAL '1 month')
          AND snapshot_date < DATE_TRUNC('month', $1::date)
          ORDER BY snapshot_date DESC LIMIT 1
        ), 0) as previous_followers
      FROM fb_pages fp
      WHERE EXISTS (
        SELECT 1 FROM fb_follower_history fh WHERE fh.page_id = fp.page_id
      )
    `, [monthDate]);

    // Get all Instagram accounts with follower data
    const igResult = await pool.query(`
      SELECT DISTINCT ON (ia.account_id)
        ia.account_id,
        COALESCE(ia.username, ia.name, ia.account_id) as account_name,
        'instagram' as platform,
        COALESCE((
          SELECT followers_count FROM ig_follower_history 
          WHERE account_id = ia.account_id 
          AND snapshot_date >= DATE_TRUNC('month', $1::date)
          AND snapshot_date < DATE_TRUNC('month', $1::date) + INTERVAL '1 month'
          ORDER BY snapshot_date DESC LIMIT 1
        ), 0) as current_followers,
        COALESCE((
          SELECT followers_count FROM ig_follower_history 
          WHERE account_id = ia.account_id 
          AND snapshot_date >= DATE_TRUNC('month', $1::date - INTERVAL '1 month')
          AND snapshot_date < DATE_TRUNC('month', $1::date)
          ORDER BY snapshot_date DESC LIMIT 1
        ), 0) as previous_followers
      FROM ig_accounts ia
      WHERE EXISTS (
        SELECT 1 FROM ig_follower_history ih WHERE ih.account_id = ia.account_id
      )
    `, [monthDate]);

    const results: FollowerGrowthData[] = [];

    for (const row of [...fbResult.rows, ...igResult.rows]) {
      const current = parseInt(row.current_followers) || 0;
      const previous = parseInt(row.previous_followers) || 0;
      const growth = current - previous;
      const percentage = previous > 0 ? Math.round((growth / previous) * 10000) / 100 : 0;

      // Only include accounts with actual data
      if (current > 0 || previous > 0) {
        results.push({
          account_id: row.account_id,
          account_name: row.account_name || row.account_id,
          platform: row.platform as 'facebook' | 'instagram',
          current_followers: current,
          previous_followers: previous,
          follower_growth: growth,
          growth_percentage: percentage
        });
      }
    }

    return results.sort((a, b) => b.follower_growth - a.follower_growth);
  } catch (error) {
    console.error("[Follower DB] Failed to get all accounts follower growth:", error);
    return [];
  }
}
