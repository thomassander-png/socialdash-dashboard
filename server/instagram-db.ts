/**
 * Instagram Database Query Helpers
 * 
 * This module provides query functions for reading Instagram data
 * from the external PostgreSQL database (Supabase).
 */

import { getFacebookPool } from './facebook-db';

export interface InstagramAccount {
  account_id: string;
  username: string | null;
  name: string | null;
  created_at: Date;
}

export interface InstagramPost {
  post_id: string;
  account_id: string;
  created_time: Date;
  media_type: string | null;
  permalink: string | null;
  caption: string | null;
  media_url: string | null;
  created_at: Date;
}

export interface InstagramPostMetrics {
  post_id: string;
  account_id: string;
  created_time: Date;
  media_type: string | null;
  permalink: string | null;
  caption: string | null;
  media_url: string | null;
  snapshot_time: Date;
  likes_count: number;
  comments_count: number;
  reach: number | null;
  impressions: number | null;
  saved: number | null;
  plays: number | null;
  interactions_total: number;
}

export interface MonthlyAccountStats {
  account_id: string;
  month: Date;
  total_posts: number;
  total_likes: number;
  total_comments: number;
  total_reach: number;
  total_impressions: number;
  total_saved: number;
  total_plays: number;
  total_interactions: number;
  avg_reach_per_post: number;
  avg_interactions_per_post: number;
}

/**
 * Get all tracked Instagram accounts
 */
export async function getInstagramAccounts(): Promise<InstagramAccount[]> {
  const pool = getFacebookPool();
  if (!pool) return [];
  
  try {
    const result = await pool.query(`
      SELECT account_id, username, name, created_at
      FROM ig_accounts
      ORDER BY username
    `);
    return result.rows as InstagramAccount[];
  } catch (error) {
    console.error("[Instagram DB] Failed to get accounts:", error);
    return [];
  }
}

/**
 * Get monthly aggregated stats for all Instagram accounts
 */
export async function getInstagramMonthlyStats(month: string): Promise<MonthlyAccountStats[]> {
  const pool = getFacebookPool();
  if (!pool) return [];
  
  const monthDate = `${month}-01`;
  
  try {
    // First check if the view exists
    const viewCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.views 
        WHERE table_name = 'view_ig_monthly_account_stats'
      ) as exists
    `);
    
    if (!viewCheck.rows[0]?.exists) {
      // Fallback: aggregate from raw tables
      const result = await pool.query(`
        WITH latest_metrics AS (
          SELECT DISTINCT ON (m.post_id)
            m.post_id,
            p.account_id,
            DATE_TRUNC('month', p.created_time) as month,
            m.likes_count,
            m.comments_count,
            m.reach,
            m.impressions,
            m.saved,
            COALESCE(m.likes_count, 0) + COALESCE(m.comments_count, 0) as interactions
          FROM ig_post_metrics m
          JOIN ig_posts p ON m.post_id = p.post_id
          WHERE DATE_TRUNC('month', p.created_time) = $1::date
          ORDER BY m.post_id, m.snapshot_time DESC
        )
        SELECT 
          account_id,
          month,
          COUNT(*) as total_posts,
          COALESCE(SUM(likes_count), 0) as total_likes,
          COALESCE(SUM(comments_count), 0) as total_comments,
          COALESCE(SUM(reach), 0) as total_reach,
          COALESCE(SUM(impressions), 0) as total_impressions,
          COALESCE(SUM(saved), 0) as total_saved,
          0 as total_plays,
          COALESCE(SUM(interactions), 0) as total_interactions,
          CASE WHEN COUNT(*) > 0 THEN COALESCE(SUM(reach), 0) / COUNT(*) ELSE 0 END as avg_reach_per_post,
          CASE WHEN COUNT(*) > 0 THEN COALESCE(SUM(interactions), 0)::float / COUNT(*) ELSE 0 END as avg_interactions_per_post
        FROM latest_metrics
        GROUP BY account_id, month
        ORDER BY account_id
      `, [monthDate]);
      return result.rows as MonthlyAccountStats[];
    }
    
    const result = await pool.query(`
      SELECT 
        account_id,
        month,
        total_posts,
        total_likes,
        total_comments,
        total_reach,
        total_impressions,
        total_saved,
        COALESCE(total_plays, 0) as total_plays,
        total_interactions,
        avg_reach_per_post,
        avg_interactions_per_post
      FROM view_ig_monthly_account_stats
      WHERE month = $1::date
      ORDER BY account_id
    `, [monthDate]);
    return result.rows as MonthlyAccountStats[];
  } catch (error) {
    console.error("[Instagram DB] Failed to get monthly stats:", error);
    return [];
  }
}

/**
 * Get Instagram posts with latest metrics for a given month
 */
export async function getInstagramMonthlyPosts(
  month: string,
  options: {
    accountId?: string;
    mediaType?: string;
    sortBy?: 'interactions' | 'reach' | 'date' | 'likes' | 'saves';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  } = {}
): Promise<InstagramPostMetrics[]> {
  const pool = getFacebookPool();
  if (!pool) return [];
  
  const { 
    accountId, 
    mediaType, 
    sortBy = 'interactions', 
    sortOrder = 'desc',
    limit = 50,
    offset = 0
  } = options;
  
  const monthDate = `${month}-01`;
  
  // Build dynamic ORDER BY
  let orderColumn = 'interactions_total';
  if (sortBy === 'reach') orderColumn = 'reach';
  if (sortBy === 'date') orderColumn = 'created_time';
  if (sortBy === 'likes') orderColumn = 'likes_count';
  if (sortBy === 'saves') orderColumn = 'saved';
  
  try {
    let query = `
      WITH latest_metrics AS (
        SELECT DISTINCT ON (m.post_id)
          m.post_id,
          p.account_id,
          p.created_time,
          p.media_type,
          p.permalink,
          p.caption,
          p.media_url,
          m.snapshot_time,
          m.likes_count,
          m.comments_count,
          m.reach,
          m.impressions,
          m.saved,
          (COALESCE(m.likes_count, 0) + COALESCE(m.comments_count, 0)) as interactions_total
        FROM ig_post_metrics m
        JOIN ig_posts p ON m.post_id = p.post_id
        WHERE DATE_TRUNC('month', p.created_time) = $1::date
        ORDER BY m.post_id, m.snapshot_time DESC
      )
      SELECT * FROM latest_metrics
      WHERE 1=1
    `;
    
    const params: any[] = [monthDate];
    let paramIndex = 2;
    
    if (accountId) {
      query += ` AND account_id = $${paramIndex}`;
      params.push(accountId);
      paramIndex++;
    }
    
    if (mediaType) {
      query += ` AND media_type = $${paramIndex}`;
      params.push(mediaType);
      paramIndex++;
    }
    
    query += ` ORDER BY ${orderColumn} ${sortOrder.toUpperCase()} NULLS LAST`;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    return result.rows as InstagramPostMetrics[];
  } catch (error) {
    console.error("[Instagram DB] Failed to get monthly posts:", error);
    return [];
  }
}

/**
 * Get top performing Instagram posts for a month
 */
export async function getInstagramTopPosts(
  month: string,
  limit: number = 5
): Promise<InstagramPostMetrics[]> {
  return getInstagramMonthlyPosts(month, {
    sortBy: 'interactions',
    sortOrder: 'desc',
    limit
  });
}

/**
 * Get aggregated KPIs for a month across all Instagram accounts
 */
export async function getInstagramMonthlyKPIs(month: string): Promise<{
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  totalInteractions: number;
  totalReach: number;
  totalImpressions: number;
  totalSaved: number;
  totalPlays: number;
  avgReachPerPost: number;
  avgInteractionsPerPost: number;
}> {
  const stats = await getInstagramMonthlyStats(month);
  
  if (stats.length === 0) {
    return {
      totalPosts: 0,
      totalLikes: 0,
      totalComments: 0,
      totalInteractions: 0,
      totalReach: 0,
      totalImpressions: 0,
      totalSaved: 0,
      totalPlays: 0,
      avgReachPerPost: 0,
      avgInteractionsPerPost: 0
    };
  }
  
  const totals = stats.reduce((acc, s) => ({
    totalPosts: acc.totalPosts + Number(s.total_posts),
    totalLikes: acc.totalLikes + Number(s.total_likes),
    totalComments: acc.totalComments + Number(s.total_comments),
    totalInteractions: acc.totalInteractions + Number(s.total_interactions),
    totalReach: acc.totalReach + Number(s.total_reach),
    totalImpressions: acc.totalImpressions + Number(s.total_impressions),
    totalSaved: acc.totalSaved + Number(s.total_saved),
    totalPlays: acc.totalPlays + Number(s.total_plays),
  }), {
    totalPosts: 0,
    totalLikes: 0,
    totalComments: 0,
    totalInteractions: 0,
    totalReach: 0,
    totalImpressions: 0,
    totalSaved: 0,
    totalPlays: 0,
  });
  
  return {
    ...totals,
    avgReachPerPost: totals.totalPosts > 0 
      ? Math.round(totals.totalReach / totals.totalPosts) 
      : 0,
    avgInteractionsPerPost: totals.totalPosts > 0 
      ? Math.round((totals.totalInteractions / totals.totalPosts) * 100) / 100 
      : 0
  };
}

/**
 * Get available months with Instagram data
 */
export async function getInstagramAvailableMonths(): Promise<string[]> {
  const pool = getFacebookPool();
  if (!pool) return [];
  
  try {
    const result = await pool.query(`
      SELECT DISTINCT TO_CHAR(DATE_TRUNC('month', created_time), 'YYYY-MM') as month
      FROM ig_posts
      ORDER BY month DESC
      LIMIT 24
    `);
    return result.rows.map((r: any) => r.month);
  } catch (error) {
    console.error("[Instagram DB] Failed to get available months:", error);
    return [];
  }
}
