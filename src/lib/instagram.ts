import { query } from './db';
import { getMonthDateRange } from './utils';
import { IGPostWithMetrics, IGKPIs } from './types';

export async function getInstagramKPIs(month: string): Promise<IGKPIs> {
  const { start, end } = getMonthDateRange(month);
  
  const sql = `
    SELECT 
      COUNT(DISTINCT p.media_id) as total_posts,
      COALESCE(SUM(m.likes), 0) as total_likes,
      COALESCE(SUM(m.comments), 0) as total_comments,
      COALESCE(SUM(m.likes + m.comments), 0) as total_interactions,
      SUM(m.saves) as total_saves,
      SUM(m.reach) as total_reach,
      SUM(m.plays) as total_plays,
      CASE WHEN COUNT(DISTINCT p.media_id) > 0 THEN AVG(m.reach) ELSE NULL END as avg_reach_per_post,
      CASE WHEN COUNT(DISTINCT p.media_id) > 0 THEN AVG(m.likes + m.comments) ELSE 0 END as avg_interactions_per_post
    FROM ig_posts p
    LEFT JOIN LATERAL (
      SELECT * FROM ig_post_metrics 
      WHERE media_id = p.media_id 
      ORDER BY snapshot_time DESC 
      LIMIT 1
    ) m ON true
    WHERE p.timestamp >= $1 AND p.timestamp <= $2
  `;
  
  const result = await query<IGKPIs>(sql, [start.toISOString(), end.toISOString()]);
  return result[0] || {
    total_posts: 0,
    total_likes: 0,
    total_comments: 0,
    total_interactions: 0,
    total_saves: null,
    total_reach: null,
    total_plays: null,
    avg_reach_per_post: null,
    avg_interactions_per_post: 0
  };
}

export async function getInstagramPosts(month: string, sort: string = 'interactions', limit: number = 100): Promise<IGPostWithMetrics[]> {
  const { start, end } = getMonthDateRange(month);
  
  let orderBy = 'interactions DESC';
  if (sort === 'reach') orderBy = 'm.reach DESC NULLS LAST';
  if (sort === 'plays') orderBy = 'm.plays DESC NULLS LAST';
  if (sort === 'date') orderBy = 'p.timestamp DESC';
  
  const sql = `
    SELECT 
      p.media_id,
      p.account_id,
      p.media_type,
      p.caption,
      p.permalink,
      p.timestamp,
      COALESCE(p.thumbnail_url, p.media_url) as image_url,
      COALESCE(m.likes, 0) as likes,
      COALESCE(m.comments, 0) as comments,
      m.saves,
      m.reach,
      m.plays,
      COALESCE(m.likes, 0) + COALESCE(m.comments, 0) as interactions
    FROM ig_posts p
    LEFT JOIN LATERAL (
      SELECT * FROM ig_post_metrics 
      WHERE media_id = p.media_id 
      ORDER BY snapshot_time DESC 
      LIMIT 1
    ) m ON true
    WHERE p.timestamp >= $1 AND p.timestamp <= $2
    ORDER BY ${orderBy}
    LIMIT $3
  `;
  
  return query<IGPostWithMetrics>(sql, [start.toISOString(), end.toISOString(), limit]);
}

export async function getInstagramTopPosts(month: string, limit: number = 5): Promise<IGPostWithMetrics[]> {
  return getInstagramPosts(month, 'interactions', limit);
}
