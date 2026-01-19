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
    // Get Facebook posts with latest metrics using subquery
    let fbQuery = `
      SELECT 
        p.post_id,
        p.message,
        p.type,
        p.created_time,
        p.permalink,
        p.page_id,
        COALESCE((
          SELECT m.reach FROM fb_post_metrics m 
          WHERE m.post_id = p.post_id 
          ORDER BY m.snapshot_time DESC LIMIT 1
        ), 0) as reach,
        COALESCE((
          SELECT m.impressions FROM fb_post_metrics m 
          WHERE m.post_id = p.post_id 
          ORDER BY m.snapshot_time DESC LIMIT 1
        ), 0) as impressions,
        COALESCE((
          SELECT m.reactions_total FROM fb_post_metrics m 
          WHERE m.post_id = p.post_id 
          ORDER BY m.snapshot_time DESC LIMIT 1
        ), 0) as reactions_total,
        COALESCE((
          SELECT m.comments_total FROM fb_post_metrics m 
          WHERE m.post_id = p.post_id 
          ORDER BY m.snapshot_time DESC LIMIT 1
        ), 0) as comments_total,
        COALESCE((
          SELECT m.shares_total FROM fb_post_metrics m 
          WHERE m.post_id = p.post_id 
          ORDER BY m.snapshot_time DESC LIMIT 1
        ), 0) as shares_total,
        COALESCE((
          SELECT m.video_3s_views FROM fb_post_metrics m 
          WHERE m.post_id = p.post_id 
          ORDER BY m.snapshot_time DESC LIMIT 1
        ), 0) as video_3s_views
      FROM fb_posts p
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
    
    // Get Instagram posts with latest metrics using subquery
    let igQuery = `
      SELECT 
        p.post_id,
        p.caption as message,
        p.media_type as type,
        p.timestamp as created_time,
        p.permalink,
        p.account_id,
        COALESCE((
          SELECT m.reach FROM ig_post_metrics m 
          WHERE m.post_id = p.post_id 
          ORDER BY m.snapshot_time DESC LIMIT 1
        ), 0) as reach,
        COALESCE((
          SELECT m.impressions FROM ig_post_metrics m 
          WHERE m.post_id = p.post_id 
          ORDER BY m.snapshot_time DESC LIMIT 1
        ), 0) as impressions,
        COALESCE((
          SELECT m.likes FROM ig_post_metrics m 
          WHERE m.post_id = p.post_id 
          ORDER BY m.snapshot_time DESC LIMIT 1
        ), 0) as likes,
        COALESCE((
          SELECT m.comments FROM ig_post_metrics m 
          WHERE m.post_id = p.post_id 
          ORDER BY m.snapshot_time DESC LIMIT 1
        ), 0) as comments,
        COALESCE((
          SELECT m.shares FROM ig_post_metrics m 
          WHERE m.post_id = p.post_id 
          ORDER BY m.snapshot_time DESC LIMIT 1
        ), 0) as shares,
        COALESCE((
          SELECT m.saved FROM ig_post_metrics m 
          WHERE m.post_id = p.post_id 
          ORDER BY m.snapshot_time DESC LIMIT 1
        ), 0) as saved,
        COALESCE((
          SELECT m.plays FROM ig_post_metrics m 
          WHERE m.post_id = p.post_id 
          ORDER BY m.snapshot_time DESC LIMIT 1
        ), 0) as plays
      FROM ig_posts p
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
