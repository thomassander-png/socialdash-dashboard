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
  
  // Current month dates
  const startDate = `${month}-01`;
  const endDate = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() + 1, 1).toISOString().slice(0, 10);
  
  // Previous month dates
  const prevMonthDate = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() - 1, 1);
  const prevStartDate = prevMonthDate.toISOString().slice(0, 10);
  const prevEndDate = startDate;
  
  try {
    // Build customer filter conditions
    let fbCustomerFilter = '';
    let igCustomerFilter = '';
    let igAccountCustomerFilter = '';
    
    // Get customer account IDs if customer is specified
    let fbPageIds: string[] = [];
    let igAccountIds: string[] = [];
    
    if (customer && customer !== 'all') {
      // Support both slug format (captrain-deutschland) and full name (Captrain Deutschland)
      const accountsResult = await pool.query(
        `SELECT ca.platform, ca.account_id 
         FROM customer_accounts ca
         JOIN customers c ON ca.customer_id = c.customer_id
         WHERE LOWER(REPLACE(c.name, ' ', '-')) = LOWER($1)
            OR LOWER(c.name) = LOWER($1)`,
        [customer]
      );
      
      fbPageIds = accountsResult.rows.filter(r => r.platform === 'facebook').map(r => r.account_id);
      igAccountIds = accountsResult.rows.filter(r => r.platform === 'instagram').map(r => r.account_id);
      
      if (fbPageIds.length > 0) {
        fbCustomerFilter = ` AND p.page_id = ANY($3::text[])`;
      }
      if (igAccountIds.length > 0) {
        igCustomerFilter = ` AND p.account_id = ANY($3::text[])`;
        igAccountCustomerFilter = ` AND account_id = ANY($3::text[])`;
      }
    }
    
    const params = customer && customer !== 'all' && fbPageIds.length > 0 
      ? [startDate, endDate, fbPageIds] 
      : [startDate, endDate];
    const prevParams = customer && customer !== 'all' && fbPageIds.length > 0 
      ? [prevStartDate, prevEndDate, fbPageIds] 
      : [prevStartDate, prevEndDate];
    
    const igParams = customer && customer !== 'all' && igAccountIds.length > 0 
      ? [startDate, endDate, igAccountIds] 
      : [startDate, endDate];
    const igPrevParams = customer && customer !== 'all' && igAccountIds.length > 0 
      ? [prevStartDate, prevEndDate, igAccountIds] 
      : [prevStartDate, prevEndDate];
    
    // Facebook query with all metrics - CURRENT MONTH
    const fbQuery = `
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
      ${fbCustomerFilter}
    `;
    
    // Facebook query - PREVIOUS MONTH
    const fbPrevQuery = `
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
      ${fbCustomerFilter}
    `;
    
    // Instagram query with all metrics - CURRENT MONTH
    const igQuery = `
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
      ${igCustomerFilter}
    `;
    
    // Instagram query - PREVIOUS MONTH
    const igPrevQuery = `
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
      ${igCustomerFilter}
    `;
    
    // Instagram Account Insights query (for profile_links_taps / Klicks)
    const igAccountQuery = `
      SELECT 
        COALESCE(SUM(profile_links_taps), 0) as profile_clicks,
        COALESCE(SUM(email_clicks), 0) as email_clicks,
        COALESCE(SUM(call_clicks), 0) as call_clicks,
        COALESCE(SUM(total_interactions), 0) as account_interactions,
        COALESCE(SUM(views), 0) as account_views
      FROM ig_account_insights
      WHERE snapshot_date >= $1::date AND snapshot_date < $2::date
      ${igAccountCustomerFilter}
    `;
    
    // Get Facebook Follower counts from fb_follower_history
    // Use the customer's page IDs directly if available
    let fbFollowerQuery: string;
    let fbPrevFollowerQuery: string;
    let fbFollowerParams: any[];
    let fbPrevFollowerParams: any[];
    
    if (fbPageIds.length > 0) {
      // Customer-specific query
      fbFollowerQuery = `
        SELECT COALESCE(SUM(followers_count), 0) as followers
        FROM (
          SELECT DISTINCT ON (page_id) page_id, followers_count
          FROM fb_follower_history
          WHERE page_id = ANY($1::text[])
            AND snapshot_date <= $2::date
          ORDER BY page_id, snapshot_date DESC
        ) latest
      `;
      fbPrevFollowerQuery = `
        SELECT COALESCE(SUM(followers_count), 0) as followers
        FROM (
          SELECT DISTINCT ON (page_id) page_id, followers_count
          FROM fb_follower_history
          WHERE page_id = ANY($1::text[])
            AND snapshot_date <= $2::date
          ORDER BY page_id, snapshot_date DESC
        ) latest
      `;
      fbFollowerParams = [fbPageIds, endDate];
      fbPrevFollowerParams = [fbPageIds, prevStartDate];
    } else {
      // All customers query
      fbFollowerQuery = `
        SELECT COALESCE(SUM(followers_count), 0) as followers
        FROM (
          SELECT DISTINCT ON (page_id) page_id, followers_count
          FROM fb_follower_history
          WHERE snapshot_date <= $1::date
          ORDER BY page_id, snapshot_date DESC
        ) latest
      `;
      fbPrevFollowerQuery = `
        SELECT COALESCE(SUM(followers_count), 0) as followers
        FROM (
          SELECT DISTINCT ON (page_id) page_id, followers_count
          FROM fb_follower_history
          WHERE snapshot_date <= $1::date
          ORDER BY page_id, snapshot_date DESC
        ) latest
      `;
      fbFollowerParams = [endDate];
      fbPrevFollowerParams = [prevStartDate];
    }
    
    // Get Instagram Follower counts from ig_follower_history
    let igFollowerQuery: string;
    let igPrevFollowerQuery: string;
    let igFollowerParams: any[];
    let igPrevFollowerParams: any[];
    
    if (igAccountIds.length > 0) {
      // Customer-specific query
      igFollowerQuery = `
        SELECT COALESCE(SUM(followers_count), 0) as followers
        FROM (
          SELECT DISTINCT ON (account_id) account_id, followers_count
          FROM ig_follower_history
          WHERE account_id = ANY($1::text[])
            AND snapshot_date <= $2::date
          ORDER BY account_id, snapshot_date DESC
        ) latest
      `;
      igPrevFollowerQuery = `
        SELECT COALESCE(SUM(followers_count), 0) as followers
        FROM (
          SELECT DISTINCT ON (account_id) account_id, followers_count
          FROM ig_follower_history
          WHERE account_id = ANY($1::text[])
            AND snapshot_date <= $2::date
          ORDER BY account_id, snapshot_date DESC
        ) latest
      `;
      igFollowerParams = [igAccountIds, endDate];
      igPrevFollowerParams = [igAccountIds, prevStartDate];
    } else {
      // All customers query
      igFollowerQuery = `
        SELECT COALESCE(SUM(followers_count), 0) as followers
        FROM (
          SELECT DISTINCT ON (account_id) account_id, followers_count
          FROM ig_follower_history
          WHERE snapshot_date <= $1::date
          ORDER BY account_id, snapshot_date DESC
        ) latest
      `;
      igPrevFollowerQuery = `
        SELECT COALESCE(SUM(followers_count), 0) as followers
        FROM (
          SELECT DISTINCT ON (account_id) account_id, followers_count
          FROM ig_follower_history
          WHERE snapshot_date <= $1::date
          ORDER BY account_id, snapshot_date DESC
        ) latest
      `;
      igFollowerParams = [endDate];
      igPrevFollowerParams = [prevStartDate];
    }
    
    // Execute queries in parallel
    const [
      fbResult, 
      fbPrevResult,
      igResult, 
      igPrevResult,
      igAccountResult,
      fbFollowerResult,
      fbPrevFollowerResult,
      igFollowerResult,
      igPrevFollowerResult
    ] = await Promise.all([
      pool.query(fbQuery, params),
      pool.query(fbPrevQuery, prevParams),
      pool.query(igQuery, igParams),
      pool.query(igPrevQuery, igPrevParams),
      pool.query(igAccountQuery, igParams).catch(() => ({ rows: [{}] })),
      pool.query(fbFollowerQuery, fbFollowerParams).catch((e) => { console.error('FB Follower Error:', e); return { rows: [{ followers: 0 }] }; }),
      pool.query(fbPrevFollowerQuery, fbPrevFollowerParams).catch((e) => { console.error('FB Prev Follower Error:', e); return { rows: [{ followers: 0 }] }; }),
      pool.query(igFollowerQuery, igFollowerParams).catch((e) => { console.error('IG Follower Error:', e); return { rows: [{ followers: 0 }] }; }),
      pool.query(igPrevFollowerQuery, igPrevFollowerParams).catch((e) => { console.error('IG Prev Follower Error:', e); return { rows: [{ followers: 0 }] }; }),
    ]);
    
    const fbStats = fbResult.rows[0] || { posts: 0, reactions: 0, comments: 0, shares: 0, reach: 0, impressions: 0, video_views: 0 };
    const fbPrevStats = fbPrevResult.rows[0] || { posts: 0, reactions: 0, comments: 0, shares: 0, reach: 0, impressions: 0, video_views: 0 };
    const igStats = igResult.rows[0] || { posts: 0, likes: 0, comments: 0, saves: 0, reach: 0, impressions: 0, plays: 0, shares: 0, profile_visits: 0 };
    const igPrevStats = igPrevResult.rows[0] || { posts: 0, likes: 0, comments: 0, saves: 0, reach: 0, impressions: 0, plays: 0, shares: 0, profile_visits: 0 };
    const igAccountStats = igAccountResult.rows[0] || { profile_clicks: 0, email_clicks: 0, call_clicks: 0, account_interactions: 0, account_views: 0 };
    
    const fbFollowers = parseInt(fbFollowerResult.rows[0]?.followers || 0);
    const fbPrevFollowers = parseInt(fbPrevFollowerResult.rows[0]?.followers || 0);
    const igFollowers = parseInt(igFollowerResult.rows[0]?.followers || 0);
    const igPrevFollowers = parseInt(igPrevFollowerResult.rows[0]?.followers || 0);
    
    const stats = {
      // Totals
      totalFollowers: fbFollowers + igFollowers,
      totalReach: parseInt(fbStats.reach) + parseInt(igStats.reach),
      totalInteractions: parseInt(fbStats.reactions) + parseInt(fbStats.comments) + parseInt(igStats.likes) + parseInt(igStats.comments),
      totalPosts: parseInt(fbStats.posts) + parseInt(igStats.posts),
      
      // Previous month totals
      prevTotalFollowers: fbPrevFollowers + igPrevFollowers,
      prevTotalReach: parseInt(fbPrevStats.reach) + parseInt(igPrevStats.reach),
      prevTotalInteractions: parseInt(fbPrevStats.reactions) + parseInt(fbPrevStats.comments) + parseInt(igPrevStats.likes) + parseInt(igPrevStats.comments),
      prevTotalPosts: parseInt(fbPrevStats.posts) + parseInt(igPrevStats.posts),
      
      // Facebook metrics - current
      fbFollowers: fbFollowers,
      fbPosts: parseInt(fbStats.posts),
      fbReactions: parseInt(fbStats.reactions),
      fbComments: parseInt(fbStats.comments),
      fbShares: parseInt(fbStats.shares),
      fbReach: parseInt(fbStats.reach),
      fbImpressions: parseInt(fbStats.impressions),
      fbVideoViews: parseInt(fbStats.video_views),
      fbInteractions: parseInt(fbStats.reactions) + parseInt(fbStats.comments),
      
      // Facebook metrics - previous month
      prevFbFollowers: fbPrevFollowers,
      prevFbPosts: parseInt(fbPrevStats.posts),
      prevFbReactions: parseInt(fbPrevStats.reactions),
      prevFbComments: parseInt(fbPrevStats.comments),
      prevFbShares: parseInt(fbPrevStats.shares),
      prevFbReach: parseInt(fbPrevStats.reach),
      prevFbImpressions: parseInt(fbPrevStats.impressions),
      prevFbVideoViews: parseInt(fbPrevStats.video_views),
      prevFbInteractions: parseInt(fbPrevStats.reactions) + parseInt(fbPrevStats.comments),
      
      // Instagram metrics - current
      igFollowers: igFollowers,
      igPosts: parseInt(igStats.posts),
      igLikes: parseInt(igStats.likes),
      igComments: parseInt(igStats.comments),
      igSaves: parseInt(igStats.saves),
      igShares: parseInt(igStats.shares),
      igReach: parseInt(igStats.reach),
      igImpressions: parseInt(igStats.impressions),
      igPlays: parseInt(igStats.plays),
      igProfileVisits: parseInt(igStats.profile_visits),
      igInteractions: parseInt(igStats.likes) + parseInt(igStats.comments),
      igProfileClicks: parseInt(igAccountStats.profile_clicks || 0),
      
      // Instagram metrics - previous month
      prevIgFollowers: igPrevFollowers,
      prevIgPosts: parseInt(igPrevStats.posts),
      prevIgLikes: parseInt(igPrevStats.likes),
      prevIgComments: parseInt(igPrevStats.comments),
      prevIgSaves: parseInt(igPrevStats.saves),
      prevIgShares: parseInt(igPrevStats.shares),
      prevIgReach: parseInt(igPrevStats.reach),
      prevIgImpressions: parseInt(igPrevStats.impressions),
      prevIgPlays: parseInt(igPrevStats.plays),
      prevIgProfileVisits: parseInt(igPrevStats.profile_visits),
      prevIgInteractions: parseInt(igPrevStats.likes) + parseInt(igPrevStats.comments),
      
      // Debug info
      _debug: {
        month,
        customer,
        fbPageIds,
        igAccountIds,
        endDate,
        prevStartDate
      }
    };
    
    return NextResponse.json(stats, { headers });
  } catch (error) {
    console.error('Stats API Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500, headers });
  }
}
