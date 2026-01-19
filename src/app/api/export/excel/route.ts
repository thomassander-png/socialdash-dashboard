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
  
  const [year, monthNum] = month.split('-').map(Number);
  const startDate = new Date(year, monthNum - 1, 1);
  const endDate = new Date(year, monthNum, 0, 23, 59, 59);
  
  try {
    // Get Facebook posts with metrics
    let fbQuery = `
      SELECT 
        p.post_id,
        p.message,
        p.type,
        p.created_time,
        p.permalink,
        COALESCE(m.reach, 0) as reach,
        COALESCE(m.impressions, 0) as impressions,
        COALESCE(m.reactions_total, 0) as reactions_total,
        COALESCE(m.comments_total, 0) as comments_total,
        COALESCE(m.shares_total, 0) as shares_total,
        COALESCE(m.video_3s_views, 0) as video_3s_views,
        pg.name as page_name
      FROM fb_posts p
      LEFT JOIN LATERAL (
        SELECT * FROM fb_post_metrics 
        WHERE post_id = p.post_id 
        ORDER BY snapshot_time DESC 
        LIMIT 1
      ) m ON true
      LEFT JOIN fb_pages pg ON p.page_id = pg.page_id
      WHERE p.created_time >= $1 AND p.created_time <= $2
    `;
    
    const fbParams: any[] = [startDate.toISOString(), endDate.toISOString()];
    
    if (customer && customer !== 'all') {
      fbQuery += ` AND EXISTS (
        SELECT 1 FROM customer_accounts ca 
        JOIN customers c ON ca.customer_id = c.id 
        WHERE ca.platform = 'facebook' 
        AND ca.account_id = p.page_id 
        AND c.slug = $3
      )`;
      fbParams.push(customer);
    }
    
    fbQuery += ` ORDER BY p.created_time ASC`;
    
    const fbResult = await pool.query(fbQuery, fbParams);
    
    // Get Instagram posts with metrics
    let igQuery = `
      SELECT 
        p.post_id,
        p.caption as message,
        p.media_type as type,
        p.timestamp as created_time,
        p.permalink,
        COALESCE(m.reach, 0) as reach,
        COALESCE(m.impressions, 0) as impressions,
        COALESCE(m.likes, 0) as likes,
        COALESCE(m.comments, 0) as comments,
        COALESCE(m.shares, 0) as shares,
        COALESCE(m.saved, 0) as saved,
        COALESCE(m.plays, 0) as plays,
        a.username as account_name
      FROM ig_posts p
      LEFT JOIN LATERAL (
        SELECT * FROM ig_post_metrics 
        WHERE post_id = p.post_id 
        ORDER BY snapshot_time DESC 
        LIMIT 1
      ) m ON true
      LEFT JOIN ig_accounts a ON p.account_id = a.account_id
      WHERE p.timestamp >= $1 AND p.timestamp <= $2
    `;
    
    const igParams: any[] = [startDate.toISOString(), endDate.toISOString()];
    
    if (customer && customer !== 'all') {
      igQuery += ` AND EXISTS (
        SELECT 1 FROM customer_accounts ca 
        JOIN customers c ON ca.customer_id = c.id 
        WHERE ca.platform = 'instagram' 
        AND ca.account_id = p.account_id 
        AND c.slug = $3
      )`;
      igParams.push(customer);
    }
    
    igQuery += ` ORDER BY p.timestamp ASC`;
    
    const igResult = await pool.query(igQuery, igParams);
    
    // Format data for Excel export
    const fbPosts = fbResult.rows.map(row => ({
      platform: 'Facebook',
      reach: row.reach || 0,
      likes: row.reactions_total || 0,
      comments: row.comments_total || 0,
      shares: row.shares_total || 0,
      saved: 0, // Not available for Facebook
      link_clicks: 0, // Not available without Ads API
      video_3s: row.video_3s_views || 0,
      interactions: (row.reactions_total || 0) + (row.comments_total || 0),
      date: row.created_time,
      format: row.type || 'post',
      message: row.message || '',
      permalink: row.permalink || ''
    }));
    
    const igPosts = igResult.rows.map(row => ({
      platform: 'Instagram',
      reach: row.reach || 0,
      likes: row.likes || 0,
      comments: row.comments || 0,
      shares: row.shares || 0,
      saved: row.saved || 0,
      link_clicks: 0, // From account insights
      profile_views: 0, // From account insights
      video_3s: row.plays || 0,
      interactions: (row.likes || 0) + (row.comments || 0),
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
    
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
