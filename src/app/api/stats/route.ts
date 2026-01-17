import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.FACEBOOK_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);
  const customer = searchParams.get('customer');
  
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
  };
  
  const startDate = `${month}-01`;
  const endDate = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() + 1, 1).toISOString().slice(0, 10);
  
  try {
    // Facebook query with all metrics
    let fbQuery = `
      SELECT 
        COUNT(DISTINCT p.post_id) as posts,
        COALESCE(SUM(m.reactions_total), 0) as reactions,
        COALESCE(SUM(m.comments_total), 0) as comments,
        COALESCE(SUM(m.shares_total), 0) as shares,
        COALESCE(SUM(m.reach), 0) as reach,
        COALESCE(SUM(m.impressions), 0) as impressions,
        COALESCE(SUM(m.video_3s_views), 0) as video_views
      FROM fb_posts p
      LEFT JOIN LATERAL (
        SELECT * FROM fb_post_metrics 
        WHERE post_id = p.post_id 
        ORDER BY snapshot_time DESC 
        LIMIT 1
      ) m ON true
      WHERE p.created_time::date >= $1::date AND p.created_time::date < $2::date
    `;
    
    // Instagram query with all metrics
    let igQuery = `
      SELECT 
        COUNT(DISTINCT p.media_id) as posts,
        COALESCE(SUM(m.likes), 0) as likes,
        COALESCE(SUM(m.comments), 0) as comments,
        COALESCE(SUM(m.saves), 0) as saves,
        COALESCE(SUM(m.reach), 0) as reach,
        COALESCE(SUM(m.impressions), 0) as impressions,
        COALESCE(SUM(m.plays), 0) as plays,
        COALESCE(SUM(m.shares), 0) as shares,
        COALESCE(SUM(m.profile_visits), 0) as profile_visits
      FROM ig_posts p
      LEFT JOIN LATERAL (
        SELECT * FROM ig_post_metrics 
        WHERE media_id = p.media_id 
        ORDER BY snapshot_time DESC 
        LIMIT 1
      ) m ON true
      WHERE p.timestamp::date >= $1::date AND p.timestamp::date < $2::date
    `;
    
    // Instagram Account Insights query (for profile_links_taps / Klicks)
    let igAccountQuery = `
      SELECT 
        COALESCE(SUM(profile_links_taps), 0) as profile_clicks,
        COALESCE(SUM(email_clicks), 0) as email_clicks,
        COALESCE(SUM(call_clicks), 0) as call_clicks,
        COALESCE(SUM(total_interactions), 0) as account_interactions,
        COALESCE(SUM(views), 0) as account_views
      FROM ig_account_insights
      WHERE snapshot_date >= $1::date AND snapshot_date < $2::date
    `;
    
    // Add customer filter if specified
    if (customer && customer !== 'all') {
      fbQuery += ` AND p.page_id IN (SELECT ca.account_id FROM customer_accounts ca JOIN customers c ON ca.customer_id = c.customer_id WHERE LOWER(REPLACE(c.name, ' ', '-')) = LOWER($3) AND ca.platform = 'facebook')`;
      igQuery += ` AND p.account_id IN (SELECT ca.account_id FROM customer_accounts ca JOIN customers c ON ca.customer_id = c.customer_id WHERE LOWER(REPLACE(c.name, ' ', '-')) = LOWER($3) AND ca.platform = 'instagram')`;
      igAccountQuery += ` AND account_id IN (SELECT ca.account_id FROM customer_accounts ca JOIN customers c ON ca.customer_id = c.customer_id WHERE LOWER(REPLACE(c.name, ' ', '-')) = LOWER($3) AND ca.platform = 'instagram')`;
    }
    
    const params = customer && customer !== 'all' ? [startDate, endDate, customer] : [startDate, endDate];
    
    // Execute queries in parallel
    const [fbResult, igResult, igAccountResult] = await Promise.all([
      pool.query(fbQuery, params),
      pool.query(igQuery, params),
      pool.query(igAccountQuery, params).catch(() => ({ rows: [{}] })) // Fallback if table doesn't exist
    ]);
    
    const fbStats = fbResult.rows[0] || { posts: 0, reactions: 0, comments: 0, shares: 0, reach: 0, impressions: 0, video_views: 0 };
    const igStats = igResult.rows[0] || { posts: 0, likes: 0, comments: 0, saves: 0, reach: 0, impressions: 0, plays: 0, shares: 0, profile_visits: 0 };
    const igAccountStats = igAccountResult.rows[0] || { profile_clicks: 0, email_clicks: 0, call_clicks: 0, account_interactions: 0, account_views: 0 };
    
    const stats = {
      // Totals
      totalFollowers: 0,
      totalReach: parseInt(fbStats.reach) + parseInt(igStats.reach),
      totalInteractions: parseInt(fbStats.reactions) + parseInt(fbStats.comments) + parseInt(igStats.likes) + parseInt(igStats.comments),
      totalPosts: parseInt(fbStats.posts) + parseInt(igStats.posts),
      
      // Facebook metrics
      fbFollowers: 0,
      fbPosts: parseInt(fbStats.posts),
      fbReactions: parseInt(fbStats.reactions),
      fbComments: parseInt(fbStats.comments),
      fbShares: parseInt(fbStats.shares),
      fbReach: parseInt(fbStats.reach),
      fbImpressions: parseInt(fbStats.impressions),
      fbVideoViews: parseInt(fbStats.video_views),
      fbInteractions: parseInt(fbStats.reactions) + parseInt(fbStats.comments),
      
      // Instagram metrics
      igFollowers: 0,
      igPosts: parseInt(igStats.posts),
      igLikes: parseInt(igStats.likes),
      igComments: parseInt(igStats.comments),
      igSaves: parseInt(igStats.saves),
      igReach: parseInt(igStats.reach),
      igImpressions: parseInt(igStats.impressions),
      igPlays: parseInt(igStats.plays),
      igShares: parseInt(igStats.shares),
      igProfileVisits: parseInt(igStats.profile_visits),
      igInteractions: parseInt(igStats.likes) + parseInt(igStats.comments),
      
      // Instagram Account Insights (Klicks)
      igProfileClicks: parseInt(igAccountStats.profile_clicks || 0),
      igEmailClicks: parseInt(igAccountStats.email_clicks || 0),
      igCallClicks: parseInt(igAccountStats.call_clicks || 0),
      igAccountInteractions: parseInt(igAccountStats.account_interactions || 0),
      igAccountViews: parseInt(igAccountStats.account_views || 0),
    };
    
    return NextResponse.json(stats, { headers });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: String(error) }, { status: 500, headers });
  }
}
