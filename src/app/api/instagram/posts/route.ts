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
      customerFilter = ` AND p.account_id IN (
        SELECT ca.account_id 
        FROM customer_accounts ca 
        JOIN customers c ON ca.customer_id = c.customer_id 
        WHERE LOWER(REPLACE(c.name, ' ', '-')) = LOWER($3) 
        AND ca.platform = 'instagram'
      )`;
      params.push(customer);
    }
    
    const query = `
      SELECT 
        p.media_id as post_id,
        p.account_id as page_id,
        p.caption as message,
        p.media_type as type,
        p.timestamp as created_time,
        p.permalink,
        COALESCE(p.thumbnail_url, p.media_url, p.image_url) as original_thumbnail_url,
        p.media_url,
        p.image_url,
        -- All available metrics from Meta Partner API
        COALESCE(m.likes, 0) as reactions_total,
        COALESCE(m.likes, 0) as likes,
        COALESCE(m.comments, 0) as comments_total,
        COALESCE(m.comments, 0) as comments,
        COALESCE(m.saves, 0) as saves,
        COALESCE(m.shares, 0) as shares,
        COALESCE(m.reach, 0) as reach,
        COALESCE(m.impressions, 0) as impressions,
        COALESCE(m.plays, 0) as plays,
        COALESCE(m.profile_visits, 0) as profile_visits
      FROM ig_posts p
      LEFT JOIN LATERAL (
        SELECT * FROM ig_post_metrics 
        WHERE media_id = p.media_id 
        ORDER BY snapshot_time DESC 
        LIMIT 1
      ) m ON true
      WHERE p.timestamp::date >= $1::date AND p.timestamp::date < $2::date
      ${customerFilter}
      ORDER BY (COALESCE(m.likes, 0) + COALESCE(m.comments, 0)) DESC 
      LIMIT 100
    `;
    
    const result = await pool.query(query, params);
    
    // Replace expired CDN URLs with permanent image proxy URLs
    const posts = result.rows.map(post => ({
      ...post,
      thumbnail_url: post.post_id ? `/api/image-proxy?id=${post.post_id}&platform=instagram` : post.original_thumbnail_url,
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
    console.error('Error fetching Instagram posts:', error);
    return NextResponse.json({ 
      posts: [], 
      error: String(error),
      meta: { month, startDate, endDate, customer: customer || 'all' }
    }, { status: 500, headers });
  }
}
