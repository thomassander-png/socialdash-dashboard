import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const customer = searchParams.get('customer') || 'ANDskincare';
  const month = searchParams.get('month') || '2025-12';
  
  try {
    // Get page IDs for customer
    const pageIds = await query<{ account_id: string }>(`
      SELECT ca.account_id 
      FROM customer_accounts ca 
      JOIN customers c ON ca.customer_id = c.customer_id 
      WHERE LOWER(REPLACE(c.name, ' ', '-')) = LOWER($1) 
        AND ca.platform = 'facebook'
    `, [customer.toLowerCase().replace(' ', '-')]);
    
    if (pageIds.length === 0) {
      return NextResponse.json({ error: 'No page IDs found for customer', customer });
    }
    
    const ids = pageIds.map(p => p.account_id);
    const placeholders = ids.map((_, i) => `$${i + 2}`).join(', ');
    const startDate = `${month}-01`;
    
    // Get all video posts with their metrics
    const videoPosts = await query<{
      post_id: string;
      type: string;
      created_time: string;
      message: string;
      video_3s_views: number | null;
      reactions_total: number;
      reach: number | null;
    }>(`
      SELECT 
        p.post_id,
        p.type,
        p.created_time,
        LEFT(p.message, 100) as message,
        m.video_3s_views,
        m.reactions_total,
        m.reach
      FROM fb_posts p
      LEFT JOIN LATERAL (
        SELECT * FROM fb_post_metrics 
        WHERE post_id = p.post_id 
        ORDER BY snapshot_time DESC 
        LIMIT 1
      ) m ON true
      WHERE p.page_id IN (${placeholders})
        AND p.created_time >= $1::date
        AND p.created_time < $1::date + interval '1 month'
        AND (p.type = 'video' OR p.type = 'reel' OR p.type ILIKE '%video%')
      ORDER BY p.created_time DESC
    `, [startDate, ...ids]);
    
    // Also check raw metrics table
    const rawMetrics = await query<{
      post_id: string;
      video_3s_views: number | null;
      snapshot_time: string;
    }>(`
      SELECT 
        m.post_id,
        m.video_3s_views,
        m.snapshot_time
      FROM fb_post_metrics m
      JOIN fb_posts p ON m.post_id = p.post_id
      WHERE p.page_id IN (${placeholders})
        AND p.created_time >= $1::date
        AND p.created_time < $1::date + interval '1 month'
        AND (p.type = 'video' OR p.type = 'reel' OR p.type ILIKE '%video%')
      ORDER BY m.snapshot_time DESC
      LIMIT 20
    `, [startDate, ...ids]);
    
    return NextResponse.json({
      customer,
      month,
      pageIds: ids,
      videoPostsCount: videoPosts.length,
      videoPosts,
      rawMetricsCount: rawMetrics.length,
      rawMetrics,
    });
  } catch (error) {
    console.error('Debug video metrics error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
