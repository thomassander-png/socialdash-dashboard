/**
 * Facebook Database Query Helpers
 * 
 * This module provides query functions for reading Facebook data
 * from the external PostgreSQL database (Supabase).
 * 
 * Uses a separate PostgreSQL connection since the main app uses MySQL.
 */

import { Pool } from 'pg';

// Lazy-initialized PostgreSQL pool for Facebook data
let pgPool: Pool | null = null;

export function getFacebookPool(): Pool | null {
  return getPool();
}

function getPool(): Pool | null {
  if (!pgPool && process.env.FACEBOOK_DATABASE_URL) {
    try {
      pgPool = new Pool({
        connectionString: process.env.FACEBOOK_DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        max: 5,
        idleTimeoutMillis: 30000,
      });
    } catch (error) {
      console.warn("[Facebook DB] Failed to create pool:", error);
      return null;
    }
  }
  return pgPool;
}

export interface FacebookPage {
  page_id: string;
  name: string;
  created_at: Date;
}

export interface FacebookPost {
  post_id: string;
  page_id: string;
  created_time: Date;
  type: string | null;
  permalink: string | null;
  message: string | null;
  created_at: Date;
}

export interface PostMetrics {
  post_id: string;
  page_id: string;
  created_time: Date;
  type: string | null;
  permalink: string | null;
  message: string | null;
  snapshot_time: Date;
  reactions_total: number;
  comments_total: number;
  shares_total: number | null;
  reach: number | null;
  impressions: number | null;
  video_3s_views: number | null;
  shares_limited: boolean;
  interactions_total: number;
}

export interface MonthlyPageStats {
  page_id: string;
  month: Date;
  total_posts: number;
  total_reactions: number;
  total_comments: number;
  total_shares: number;
  total_reach: number;
  total_impressions: number;
  total_video_views: number;
  total_interactions: number;
  avg_reach_per_post: number;
  avg_interactions_per_post: number;
}

/**
 * Get all tracked Facebook pages
 */
export async function getPages(): Promise<FacebookPage[]> {
  const pool = getPool();
  if (!pool) return [];
  
  try {
    const result = await pool.query(`
      SELECT page_id, name, created_at
      FROM fb_pages
      ORDER BY name
    `);
    return result.rows as FacebookPage[];
  } catch (error) {
    console.error("[Facebook DB] Failed to get pages:", error);
    return [];
  }
}

/**
 * Get monthly aggregated stats for all pages
 */
export async function getMonthlyStats(month: string): Promise<MonthlyPageStats[]> {
  const pool = getPool();
  if (!pool) return [];
  
  // Parse month string (YYYY-MM) to first day of month
  const monthDate = `${month}-01`;
  
  try {
    const result = await pool.query(`
      SELECT 
        page_id,
        month,
        total_posts,
        total_reactions,
        total_comments,
        total_shares,
        total_reach,
        total_impressions,
        total_video_views,
        total_interactions,
        avg_reach_per_post,
        avg_interactions_per_post
      FROM view_fb_monthly_page_stats
      WHERE month = $1::date
      ORDER BY page_id
    `, [monthDate]);
    return result.rows as MonthlyPageStats[];
  } catch (error) {
    console.error("[Facebook DB] Failed to get monthly stats:", error);
    return [];
  }
}

/**
 * Get posts with latest metrics for a given month
 */
export async function getMonthlyPosts(
  month: string,
  options: {
    pageId?: string;
    postType?: string;
    sortBy?: 'interactions' | 'reach' | 'date';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  } = {}
): Promise<PostMetrics[]> {
  const pool = getPool();
  if (!pool) return [];
  
  const { 
    pageId, 
    postType, 
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
  
  try {
    let query = `
      SELECT 
        post_id,
        page_id,
        created_time,
        type,
        permalink,
        message,
        snapshot_time,
        reactions_total,
        comments_total,
        shares_total,
        reach,
        impressions,
        video_3s_views,
        shares_limited,
        (COALESCE(reactions_total, 0) + COALESCE(comments_total, 0)) as interactions_total
      FROM view_fb_monthly_post_metrics
      WHERE month = $1::date
    `;
    
    const params: any[] = [monthDate];
    let paramIndex = 2;
    
    if (pageId) {
      query += ` AND page_id = $${paramIndex}`;
      params.push(pageId);
      paramIndex++;
    }
    
    if (postType) {
      query += ` AND type = $${paramIndex}`;
      params.push(postType);
      paramIndex++;
    }
    
    query += ` ORDER BY ${orderColumn} ${sortOrder.toUpperCase()} NULLS LAST`;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    return result.rows as PostMetrics[];
  } catch (error) {
    console.error("[Facebook DB] Failed to get monthly posts:", error);
    return [];
  }
}

/**
 * Get top performing posts for a month
 */
export async function getTopPosts(
  month: string,
  limit: number = 5
): Promise<PostMetrics[]> {
  return getMonthlyPosts(month, {
    sortBy: 'interactions',
    sortOrder: 'desc',
    limit
  });
}

/**
 * Get aggregated KPIs for a month across all pages
 */
export async function getMonthlyKPIs(month: string): Promise<{
  totalPosts: number;
  totalReactions: number;
  totalComments: number;
  totalInteractions: number;
  totalReach: number;
  totalImpressions: number;
  avgReachPerPost: number;
  avgInteractionsPerPost: number;
  totalShares: number;
  sharesLimited: boolean;
}> {
  const stats = await getMonthlyStats(month);
  
  if (stats.length === 0) {
    return {
      totalPosts: 0,
      totalReactions: 0,
      totalComments: 0,
      totalInteractions: 0,
      totalReach: 0,
      totalImpressions: 0,
      avgReachPerPost: 0,
      avgInteractionsPerPost: 0,
      totalShares: 0,
      sharesLimited: true
    };
  }
  
  const totals = stats.reduce((acc, s) => ({
    totalPosts: acc.totalPosts + Number(s.total_posts),
    totalReactions: acc.totalReactions + Number(s.total_reactions),
    totalComments: acc.totalComments + Number(s.total_comments),
    totalInteractions: acc.totalInteractions + Number(s.total_interactions),
    totalReach: acc.totalReach + Number(s.total_reach),
    totalImpressions: acc.totalImpressions + Number(s.total_impressions),
    totalShares: acc.totalShares + Number(s.total_shares),
  }), {
    totalPosts: 0,
    totalReactions: 0,
    totalComments: 0,
    totalInteractions: 0,
    totalReach: 0,
    totalImpressions: 0,
    totalShares: 0,
  });
  
  return {
    ...totals,
    avgReachPerPost: totals.totalPosts > 0 
      ? Math.round(totals.totalReach / totals.totalPosts) 
      : 0,
    avgInteractionsPerPost: totals.totalPosts > 0 
      ? Math.round((totals.totalInteractions / totals.totalPosts) * 100) / 100 
      : 0,
    sharesLimited: true // Shares are always potentially limited
  };
}

/**
 * Get available months with data
 */
export async function getAvailableMonths(): Promise<string[]> {
  const pool = getPool();
  if (!pool) return [];
  
  try {
    const result = await pool.query(`
      SELECT DISTINCT TO_CHAR(month, 'YYYY-MM') as month
      FROM view_fb_monthly_page_stats
      ORDER BY month DESC
      LIMIT 24
    `);
    return result.rows.map((r: any) => r.month);
  } catch (error) {
    console.error("[Facebook DB] Failed to get available months:", error);
    return [];
  }
}

/**
 * Health check - verify database connection and tables exist
 */
export async function checkDatabaseHealth(): Promise<{
  connected: boolean;
  tablesExist: boolean;
  postCount: number;
  snapshotCount: number;
  error?: string;
}> {
  const pool = getPool();
  
  if (!pool) {
    return {
      connected: false,
      tablesExist: false,
      postCount: 0,
      snapshotCount: 0,
      error: "FACEBOOK_DATABASE_URL not configured"
    };
  }
  
  try {
    // Check if tables exist and get counts
    const postResult = await pool.query(`SELECT COUNT(*) as count FROM fb_posts`);
    const snapshotResult = await pool.query(`SELECT COUNT(*) as count FROM fb_post_metrics`);
    
    return {
      connected: true,
      tablesExist: true,
      postCount: Number(postResult.rows[0]?.count || 0),
      snapshotCount: Number(snapshotResult.rows[0]?.count || 0)
    };
  } catch (error: any) {
    return {
      connected: true,
      tablesExist: false,
      postCount: 0,
      snapshotCount: 0,
      error: error.message
    };
  }
}
