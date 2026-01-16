import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);
  const customer = searchParams.get('customer');

  try {
    // Get customer accounts if customer is specified
    let fbPageIds: string[] = [];
    let igAccountIds: string[] = [];

    if (customer && customer !== 'all') {
      const accounts = await query<{ platform: string; account_id: string }>(
        `SELECT platform, account_id FROM customer_accounts ca
         JOIN customers c ON ca.customer_id = c.customer_id
         WHERE LOWER(REPLACE(c.name, ' ', '-')) = LOWER($1)`,
        [customer]
      );
      fbPageIds = accounts.filter(a => a.platform === 'facebook').map(a => a.account_id);
      igAccountIds = accounts.filter(a => a.platform === 'instagram').map(a => a.account_id);
    }

    // Facebook Stats - using view_fb_post_latest_metrics if available, otherwise subquery
    const fbStatsQuery = `
      WITH latest_metrics AS (
        SELECT DISTINCT ON (fpm.post_id) 
          fpm.post_id,
          fpm.reactions_total,
          fpm.comments_total,
          fpm.reach
        FROM fb_post_metrics fpm
        ORDER BY fpm.post_id, fpm.snapshot_time DESC
      )
      SELECT 
        COALESCE(SUM(lm.reactions_total), 0) as reactions,
        COALESCE(SUM(lm.comments_total), 0) as comments,
        COALESCE(SUM(lm.reach), 0) as reach,
        COUNT(DISTINCT p.post_id) as posts
      FROM fb_posts p
      LEFT JOIN latest_metrics lm ON lm.post_id = p.post_id
      WHERE TO_CHAR(p.created_time, 'YYYY-MM') = $1
      ${fbPageIds.length > 0 ? `AND p.page_id = ANY($2)` : ''}
    `;
    const fbParams = fbPageIds.length > 0 ? [month, fbPageIds] : [month];
    const fbStats = await query<{ reactions: string; comments: string; reach: string; posts: string }>(
      fbStatsQuery, fbParams
    );

    // Instagram Stats - using similar approach
    const igStatsQuery = `
      WITH latest_metrics AS (
        SELECT DISTINCT ON (ipm.post_id) 
          ipm.post_id,
          ipm.likes_count,
          ipm.comments_count,
          ipm.saved,
          ipm.reach
        FROM ig_post_metrics ipm
        ORDER BY ipm.post_id, ipm.snapshot_time DESC
      )
      SELECT 
        COALESCE(SUM(lm.likes_count), 0) as likes,
        COALESCE(SUM(lm.comments_count), 0) as comments,
        COALESCE(SUM(lm.saved), 0) as saves,
        COALESCE(SUM(lm.reach), 0) as reach,
        COUNT(DISTINCT p.post_id) as posts
      FROM ig_posts p
      LEFT JOIN latest_metrics lm ON lm.post_id = p.post_id
      WHERE TO_CHAR(p.created_time, 'YYYY-MM') = $1
      ${igAccountIds.length > 0 ? `AND p.account_id = ANY($2)` : ''}
    `;
    const igParams = igAccountIds.length > 0 ? [month, igAccountIds] : [month];
    const igStats = await query<{ likes: string; comments: string; saves: string; reach: string; posts: string }>(
      igStatsQuery, igParams
    );

    // Follower counts (latest)
    const fbFollowersQuery = `
      SELECT COALESCE(SUM(follower_count), 0) as followers
      FROM (
        SELECT DISTINCT ON (page_id) follower_count
        FROM fb_follower_history
        ${fbPageIds.length > 0 ? `WHERE page_id = ANY($1)` : ''}
        ORDER BY page_id, snapshot_date DESC
      ) latest
    `;
    const fbFollowers = await query<{ followers: string }>(
      fbFollowersQuery, fbPageIds.length > 0 ? [fbPageIds] : []
    );

    const igFollowersQuery = `
      SELECT COALESCE(SUM(follower_count), 0) as followers
      FROM (
        SELECT DISTINCT ON (account_id) follower_count
        FROM ig_follower_history
        ${igAccountIds.length > 0 ? `WHERE account_id = ANY($1)` : ''}
        ORDER BY account_id, snapshot_date DESC
      ) latest
    `;
    const igFollowers = await query<{ followers: string }>(
      igFollowersQuery, igAccountIds.length > 0 ? [igAccountIds] : []
    );

    const fb = fbStats[0] || { reactions: '0', comments: '0', reach: '0', posts: '0' };
    const ig = igStats[0] || { likes: '0', comments: '0', saves: '0', reach: '0', posts: '0' };
    const fbF = fbFollowers[0] || { followers: '0' };
    const igF = igFollowers[0] || { followers: '0' };

    return NextResponse.json({
      totalFollowers: parseInt(fbF.followers) + parseInt(igF.followers),
      totalReach: parseInt(fb.reach) + parseInt(ig.reach),
      totalInteractions: parseInt(fb.reactions) + parseInt(fb.comments) + parseInt(ig.likes) + parseInt(ig.comments),
      totalPosts: parseInt(fb.posts) + parseInt(ig.posts),
      fbFollowers: parseInt(fbF.followers),
      fbReactions: parseInt(fb.reactions),
      fbComments: parseInt(fb.comments),
      fbReach: parseInt(fb.reach),
      fbPosts: parseInt(fb.posts),
      igFollowers: parseInt(igF.followers),
      igLikes: parseInt(ig.likes),
      igComments: parseInt(ig.comments),
      igSaves: parseInt(ig.saves),
      igReach: parseInt(ig.reach),
      igPosts: parseInt(ig.posts),
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
