import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.FACEBOOK_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);
  const customer = searchParams.get('customer');
  
  const startDate = `${month}-01`;
  const endDate = new Date(new Date(startDate).setMonth(new Date(startDate).getMonth() + 1)).toISOString().slice(0, 10);
  
  try {
    let query = `
      SELECT 
        p.post_id,
        p.page_id,
        p.message,
        p.type,
        p.created_time,
        p.permalink,
        p.thumbnail_url,
        COALESCE(m.reactions_total, 0) as reactions_total,
        COALESCE(m.comments_total, 0) as comments_total,
        m.shares_total,
        m.reach,
        m.impressions
      FROM fb_posts p
      LEFT JOIN LATERAL (
        SELECT * FROM fb_post_metrics 
        WHERE post_id = p.post_id 
        ORDER BY snapshot_time DESC 
        LIMIT 1
      ) m ON true
      WHERE p.created_time >= $1 AND p.created_time < $2
    `;
    
    const params: any[] = [startDate, endDate];
    
    if (customer && customer !== 'all') {
      query += ` AND p.page_id IN (
        SELECT a.account_id FROM accounts a
        JOIN customers c ON a.customer_id = c.id
        WHERE c.slug = $3
      )`;
      params.push(customer);
    }
    
    query += ` ORDER BY (COALESCE(m.reactions_total, 0) + COALESCE(m.comments_total, 0)) DESC`;
    
    const result = await pool.query(query, params);
    
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching Facebook posts:', error);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}
