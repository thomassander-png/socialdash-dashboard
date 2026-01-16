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
  
  // Set cache headers for 5 minutes
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
  };
  
  const startDate = `${month}-01`;
  const endDate = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() + 1, 1).toISOString().slice(0, 10);
  
  try {
    let fbQuery = `
      SELECT 
        COUNT(DISTINCT p.post_id) as posts,
        COALESCE(SUM(m.reactions_total), 0) as reactions,
        COALESCE(SUM(m.comments_total), 0) as comments,
        COALESCE(SUM(m.reach), 0) as reach
      FROM fb_posts p
      LEFT JOIN LATERAL (
        SELECT * FROM fb_post_metrics 
        WHERE post_id = p.post_id 
        ORDER BY snapshot_time DESC 
        LIMIT 1
      ) m ON true
      WHERE p.created_time::date >= $1::date AND p.created_time::date < $2::date
    `;
    
    let igQuery = `
      SELECT 
        COUNT(DISTINCT p.media_id) as posts,
        COALESCE(SUM(m.likes), 0) as likes,
        COALESCE(SUM(m.comments), 0) as comments,
        COALESCE(SUM(m.saves), 0) as saves,
        COALESCE(SUM(m.reach), 0) as reach
      FROM ig_posts p
      LEFT JOIN LATERAL (
        SELECT * FROM ig_post_metrics 
        WHERE media_id = p.media_id 
        ORDER BY snapshot_time DESC 
        LIMIT 1
      ) m ON true
      WHERE p.timestamp::date >= $1::date AND p.timestamp::date < $2::date
    `;
    
    const params = [startDate, endDate];
    
    if (customer && customer !== 'all') {
      fbQuery += ` AND p.page_id IN (SELECT a.account_id FROM accounts a JOIN customers c ON a.customer_id = c.id WHERE c.slug = $3)`;
      igQuery += ` AND p.account_id IN (SELECT a.account_id FROM accounts a JOIN customers c ON a.customer_id = c.id WHERE c.slug = $3)`;
      params.push(customer);
    }
    
    // Execute queries in parallel
    const [fbResult, igResult] = await Promise.all([
      pool.query(fbQuery, params),
      pool.query(igQuery, params)
    ]);
    
    const fbStats = fbResult.rows[0] || { posts: 0, reactions: 0, comments: 0, reach: 0 };
    const igStats = igResult.rows[0] || { posts: 0, likes: 0, comments: 0, saves: 0, reach: 0 };
    
    const stats = {
      totalFollowers: 0,
      totalReach: parseInt(fbStats.reach) + parseInt(igStats.reach),
      totalInteractions: parseInt(fbStats.reactions) + parseInt(fbStats.comments) + parseInt(igStats.likes) + parseInt(igStats.comments),
      totalPosts: parseInt(fbStats.posts) + parseInt(igStats.posts),
      fbFollowers: 0,
      fbReactions: parseInt(fbStats.reactions),
      fbComments: parseInt(fbStats.comments),
      fbReach: parseInt(fbStats.reach),
      fbPosts: parseInt(fbStats.posts),
      igFollowers: 0,
      igLikes: parseInt(igStats.likes),
      igComments: parseInt(igStats.comments),
      igSaves: parseInt(igStats.saves),
      igReach: parseInt(igStats.reach),
      igPosts: parseInt(igStats.posts)
    };
    
    return NextResponse.json(stats, { headers });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: String(error) }, { status: 500, headers });
  }
}
