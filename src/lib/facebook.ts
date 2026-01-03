import { query } from './db';
import { getMonthDateRange } from './utils';
import { FBPostWithMetrics, FBKPIs } from './types';

export async function getFacebookKPIs(month: string): Promise<FBKPIs> {
  const { start, end } = getMonthDateRange(month);
  
  const sql = `
    SELECT 
      COUNT(DISTINCT p.post_id) as total_posts,
      COALESCE(SUM(m.reactions_total), 0) as total_reactions,
      COALESCE(SUM(m.comments_total), 0) as total_comments,
      COALESCE(SUM(m.reactions_total + m.comments_total), 0) as total_interactions,
      SUM(m.reach) as total_reach,
      SUM(m.impressions) as total_impressions,
      CASE WHEN COUNT(DISTINCT p.post_id) > 0 THEN AVG(m.reach) ELSE NULL END as avg_reach_per_post,
      CASE WHEN COUNT(DISTINCT p.post_id) > 0 THEN AVG(m.reactions_total + m.comments_total) ELSE 0 END as avg_interactions_per_post
    FROM fb_posts p
    LEFT JOIN LATERAL (
      SELECT * FROM fb_post_metrics 
      WHERE post_id = p.post_id 
      ORDER BY snapshot_time DESC 
      LIMIT 1
    ) m ON true
    WHERE p.created_time >= $1 AND p.created_time <= $2
  `;
  
  const result = await query<FBKPIs>(sql, [start.toISOString(), end.toISOString()]);
  return result[0] || {
    total_posts: 0,
    total_reactions: 0,
    total_comments: 0,
    total_interactions: 0,
    total_reach: null,
    total_impressions: null,
    avg_reach_per_post: null,
    avg_interactions_per_post: 0
  };
}

export async function getFacebookPosts(month: string, sort: string = 'interactions', limit: number = 100): Promise<FBPostWithMetrics[]> {
  const { start, end } = getMonthDateRange(month);
  
  let orderBy = 'interactions DESC';
  if (sort === 'reach') orderBy = 'm.reach DESC NULLS LAST';
  if (sort === 'date') orderBy = 'p.created_time DESC';
  
  const sql = `
    SELECT 
      p.post_id,
      p.page_id,
      p.created_time,
      p.type,
      p.permalink,
      p.message,
      COALESCE(m.reactions_total, 0) as reactions_total,
      COALESCE(m.comments_total, 0) as comments_total,
      m.shares_total,
      m.reach,
      m.impressions,
      COALESCE(m.reactions_total, 0) + COALESCE(m.comments_total, 0) as interactions
    FROM fb_posts p
    LEFT JOIN LATERAL (
      SELECT * FROM fb_post_metrics 
      WHERE post_id = p.post_id 
      ORDER BY snapshot_time DESC 
      LIMIT 1
    ) m ON true
    WHERE p.created_time >= $1 AND p.created_time <= $2
    ORDER BY ${orderBy}
    LIMIT $3
  `;
  
  return query<FBPostWithMetrics>(sql, [start.toISOString(), end.toISOString(), limit]);
}

export async function getFacebookTopPosts(month: string, limit: number = 5): Promise<FBPostWithMetrics[]> {
  return getFacebookPosts(month, 'interactions', limit);
}
