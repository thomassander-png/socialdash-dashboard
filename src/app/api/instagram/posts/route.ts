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
    let query = `
      SELECT 
        p.media_id as post_id,
        p.account_id as page_id,
        p.caption as message,
        p.media_type as type,
        p.timestamp as created_time,
        p.permalink,
        p.thumbnail_url,
        COALESCE(m.likes, 0) as reactions_total,
        COALESCE(m.likes, 0) as likes,
        COALESCE(m.comments, 0) as comments_total,
        COALESCE(m.saves, 0) as saves,
        m.reach,
        m.impressions
      FROM ig_posts p
      LEFT JOIN LATERAL (
        SELECT * FROM ig_post_metrics 
        WHERE media_id = p.media_id 
        ORDER BY snapshot_time DESC 
        LIMIT 1
      ) m ON true
      WHERE p.timestamp::date >= $1::date AND p.timestamp::date < $2::date
    `;
    
    const params: any[] = [startDate, endDate];
    
    if (customer && customer !== 'all') {
      query += ` AND p.account_id IN (
        SELECT a.account_id FROM accounts a
        JOIN customers c ON a.customer_id = c.id
        WHERE c.slug = $3
      )`;
      params.push(customer);
    }
    
    query += ` ORDER BY (COALESCE(m.likes, 0) + COALESCE(m.comments, 0)) DESC LIMIT 100`;
    
    const result = await pool.query(query, params);
    
    return NextResponse.json({ posts: result.rows }, { headers });
  } catch (error) {
    console.error('Error fetching Instagram posts:', error);
    return NextResponse.json({ posts: [], error: String(error) }, { status: 500, headers });
  }
}
