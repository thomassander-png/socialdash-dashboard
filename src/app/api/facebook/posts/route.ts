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
    // Build customer filter
    let customerFilter = '';
    const params: (string | number)[] = [startDate, endDate];
    
    if (customer && customer !== 'all') {
      customerFilter = ` AND p.page_id IN (
        SELECT ca.account_id 
        FROM customer_accounts ca 
        JOIN customers c ON ca.customer_id = c.customer_id 
        WHERE LOWER(REPLACE(c.name, ' ', '-')) = LOWER($3) 
        AND ca.platform = 'facebook'
      )`;
      params.push(customer);
    }
    
    const query = `
      SELECT 
        p.post_id,
        p.page_id,
        p.message,
        p.type,
        p.created_time,
        p.permalink,
        COALESCE(p.thumbnail_url, p.og_image_url, p.media_url, p.image_url) as original_thumbnail_url,
        p.og_image_url,
        p.media_url,
        p.image_url,
        COALESCE(m.reactions_total, 0) as reactions_total,
        COALESCE(m.comments_total, 0) as comments_total,
        COALESCE(m.shares_total, 0) as shares_total,
        COALESCE(m.reach, 0) as reach,
        COALESCE(m.impressions, 0) as impressions,
        COALESCE(m.video_3s_views, 0) as video_views
      FROM fb_posts p
      LEFT JOIN LATERAL (
        SELECT * FROM fb_post_metrics 
        WHERE post_id = p.post_id 
        ORDER BY snapshot_time DESC 
        LIMIT 1
      ) m ON true
      WHERE p.created_time::date >= $1::date AND p.created_time::date < $2::date
      ${customerFilter}
      ORDER BY (COALESCE(m.reactions_total, 0) + COALESCE(m.comments_total, 0)) DESC 
      LIMIT 100
    `;
    
    const result = await pool.query(query, params);
    
    // Replace expired CDN URLs with permanent image proxy URLs
    const posts = result.rows.map(post => ({
      ...post,
      thumbnail_url: post.post_id ? `/api/image-proxy?id=${post.post_id}&platform=facebook` : post.original_thumbnail_url,
    }));
    
    return NextResponse.json({ 
      posts,
      meta: {
        month,
        startDate,
        endDate,
        customer: customer || 'all',
        count: posts.length
      }
    }, { headers });
  } catch (error) {
    console.error('Error fetching Facebook posts:', error);
    return NextResponse.json({ 
      posts: [], 
      error: String(error),
      meta: { month, startDate, endDate, customer: customer || 'all' }
    }, { status: 500, headers });
  }
}
