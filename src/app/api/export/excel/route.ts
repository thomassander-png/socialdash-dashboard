import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.FACEBOOK_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);
  const customer = searchParams.get('customer');
  
  const startDate = `${month}-01`;
  const endDate = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() + 1, 1).toISOString().slice(0, 10);
  
  try {
    // Get Facebook posts with metrics
    let fbQuery = `
      SELECT 
        p.post_id,
        p.page_id,
        p.message,
        p.type,
        p.created_time,
        p.permalink,
        COALESCE(m.reactions_total, 0) as reactions_total,
        COALESCE(m.comments_total, 0) as comments_total,
        COALESCE(m.shares_total, 0) as shares_total,
        COALESCE(m.reach, 0) as reach,
        COALESCE(m.impressions, 0) as impressions,
        COALESCE(m.video_3s_views, 0) as video_3s_views
      FROM fb_posts p
      LEFT JOIN LATERAL (
        SELECT * FROM fb_post_metrics 
        WHERE fb_post_metrics.post_id = p.post_id 
        ORDER BY snapshot_time DESC 
        LIMIT 1
      ) m ON true
      WHERE p.created_time::date >= $1::date AND p.created_time::date < $2::date
    `;
    
    const fbParams: any[] = [startDate, endDate];
    
    if (customer && customer !== 'all') {
      fbQuery += ` AND p.page_id IN (SELECT ca.account_id FROM customer_accounts ca JOIN customers c ON ca.customer_id = c.customer_id WHERE LOWER(REPLACE(c.name, ' ', '-')) = LOWER($3) AND ca.platform = 'facebook')`;
      fbParams.push(customer);
    }
    
    fbQuery += ` ORDER BY p.created_time ASC`;
    
    const fbResult = await pool.query(fbQuery, fbParams);
    
    // Get Instagram posts with metrics - using media_id instead of post_id
    let igQuery = `
      SELECT 
        p.media_id,
        p.account_id,
        p.caption as message,
        p.media_type as type,
        p.timestamp as created_time,
        p.permalink,
        COALESCE(m.likes, 0) as likes,
        COALESCE(m.comments, 0) as comments,
        COALESCE(m.shares, 0) as shares,
        COALESCE(m.saves, 0) as saved,
        COALESCE(m.reach, 0) as reach,
        COALESCE(m.impressions, 0) as impressions,
        COALESCE(m.plays, 0) as plays
      FROM ig_posts p
      LEFT JOIN LATERAL (
        SELECT * FROM ig_post_metrics 
        WHERE ig_post_metrics.media_id = p.media_id 
        ORDER BY snapshot_time DESC 
        LIMIT 1
      ) m ON true
      WHERE p.timestamp::date >= $1::date AND p.timestamp::date < $2::date
    `;
    
    const igParams: any[] = [startDate, endDate];
    
    if (customer && customer !== 'all') {
      igQuery += ` AND p.account_id IN (SELECT ca.account_id FROM customer_accounts ca JOIN customers c ON ca.customer_id = c.customer_id WHERE LOWER(REPLACE(c.name, ' ', '-')) = LOWER($3) AND ca.platform = 'instagram')`;
      igParams.push(customer);
    }
    
    igQuery += ` ORDER BY p.timestamp ASC`;
    
    const igResult = await pool.query(igQuery, igParams);
    
    // Format data for Excel export
    const fbPosts = fbResult.rows.map(row => ({
      platform: 'Facebook',
      reach: Number(row.reach) || 0,
      likes: Number(row.reactions_total) || 0,
      comments: Number(row.comments_total) || 0,
      shares: Number(row.shares_total) || 0,
      saved: 0, // Not available for Facebook
      link_clicks: 0, // Not available without Ads API
      video_3s: Number(row.video_3s_views) || 0,
      interactions: (Number(row.reactions_total) || 0) + (Number(row.comments_total) || 0),
      date: row.created_time,
      format: row.type || 'post',
      message: row.message || '',
      permalink: row.permalink || ''
    }));
    
    const igPosts = igResult.rows.map(row => ({
      platform: 'Instagram',
      reach: Number(row.reach) || 0,
      likes: Number(row.likes) || 0,
      comments: Number(row.comments) || 0,
      shares: Number(row.shares) || 0,
      saved: Number(row.saved) || 0,
      link_clicks: 0, // From account insights
      profile_views: 0, // From account insights
      video_3s: Number(row.plays) || 0,
      interactions: (Number(row.likes) || 0) + (Number(row.comments) || 0),
      date: row.created_time,
      format: row.type || 'IMAGE',
      message: row.message || '',
      permalink: row.permalink || ''
    }));
    
    // Calculate totals
    const fbTotals = {
      reach: fbPosts.reduce((sum, p) => sum + p.reach, 0),
      likes: fbPosts.reduce((sum, p) => sum + p.likes, 0),
      comments: fbPosts.reduce((sum, p) => sum + p.comments, 0),
      shares: fbPosts.reduce((sum, p) => sum + p.shares, 0),
      saved: 0,
      link_clicks: 0,
      video_3s: fbPosts.reduce((sum, p) => sum + p.video_3s, 0),
      interactions: fbPosts.reduce((sum, p) => sum + p.interactions, 0)
    };
    
    const igTotals = {
      reach: igPosts.reduce((sum, p) => sum + p.reach, 0),
      likes: igPosts.reduce((sum, p) => sum + p.likes, 0),
      comments: igPosts.reduce((sum, p) => sum + p.comments, 0),
      shares: igPosts.reduce((sum, p) => sum + p.shares, 0),
      saved: igPosts.reduce((sum, p) => sum + p.saved, 0),
      link_clicks: 0,
      profile_views: 0,
      video_3s: igPosts.reduce((sum, p) => sum + p.video_3s, 0),
      interactions: igPosts.reduce((sum, p) => sum + p.interactions, 0)
    };
    
    return NextResponse.json({
      month,
      customer: customer || 'all',
      facebook: {
        posts: fbPosts,
        totals: fbTotals
      },
      instagram: {
        posts: igPosts,
        totals: igTotals
      }
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
      }
    });
    
  } catch (error: any) {
    console.error('Export error:', error?.message || error);
    return NextResponse.json({ error: 'Export failed', details: error?.message }, { status: 500 });
  }
}
