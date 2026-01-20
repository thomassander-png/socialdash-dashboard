import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const month = searchParams.get('month') || '2025-12';
  
  try {
    // Get ANDskincare page IDs
    const pageIds = await query<{ account_id: string }>(`
      SELECT ca.account_id 
      FROM customer_accounts ca 
      JOIN customers c ON ca.customer_id = c.customer_id 
      WHERE LOWER(REPLACE(c.name, ' ', '-')) = LOWER('andskincare') 
        AND ca.platform = 'facebook'
    `, []);
    
    if (pageIds.length === 0) {
      return NextResponse.json({ error: 'No page IDs found' });
    }
    
    const ids = pageIds.map(p => p.account_id);
    const placeholders = ids.map((_, i) => `$${i + 2}`).join(', ');
    const startDate = `${month}-01`;
    
    // Get all posts
    const posts = await query<{
      post_id: string;
      type: string;
      created_time: string;
      reach: number | null;
      video_3s_views: number | null;
    }>(`
      SELECT 
        p.post_id,
        p.type,
        p.created_time,
        m.reach,
        m.video_3s_views
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
      ORDER BY p.created_time DESC
    `, [startDate, ...ids]);
    
    // Filter videos like the report generator does
    const videoPosts = posts
      .filter(p => {
        const type = (p.type || '').toLowerCase();
        return type === 'video' || type === 'reel' || type.includes('video');
      })
      .map(p => ({ 
        ...p, 
        videoMetric: (p.video_3s_views && p.video_3s_views > 0) ? p.video_3s_views : (p.reach || 0)
      }))
      .sort((a, b) => b.videoMetric - a.videoMetric)
      .slice(0, 6);
    
    return NextResponse.json({
      month,
      totalPosts: posts.length,
      postTypes: posts.reduce((acc, p) => {
        acc[p.type] = (acc[p.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      videoPostsCount: videoPosts.length,
      videoPosts: videoPosts.map(p => ({
        post_id: p.post_id,
        type: p.type,
        reach: p.reach,
        video_3s_views: p.video_3s_views,
        videoMetric: p.videoMetric,
      })),
    });
  } catch (error) {
    console.error('Debug video filter error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
