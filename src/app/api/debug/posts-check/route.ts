import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // Count posts in fb_posts
    const fbPostCount = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM fb_posts`
    ).catch(() => [{ count: '0' }]);

    // Count posts in ig_posts
    const igPostCount = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM ig_posts`
    ).catch(() => [{ count: '0' }]);

    // Get date range of fb_posts
    const fbDateRange = await query<{ min_date: string; max_date: string }>(
      `SELECT MIN(created_time) as min_date, MAX(created_time) as max_date FROM fb_posts`
    ).catch(() => [{ min_date: null, max_date: null }]);

    // Get date range of ig_posts
    const igDateRange = await query<{ min_date: string; max_date: string }>(
      `SELECT MIN(timestamp) as min_date, MAX(timestamp) as max_date FROM ig_posts`
    ).catch(() => [{ min_date: null, max_date: null }]);

    // Get sample fb_posts with all image fields
    const fbSample = await query<any>(
      `SELECT post_id, page_id, message, type, created_time, thumbnail_url, media_url, og_image_url, image_url, preview_source 
       FROM fb_posts ORDER BY created_time DESC LIMIT 5`
    ).catch(() => []);

    // Get sample ig_posts with all image fields
    const igSample = await query<any>(
      `SELECT media_id, account_id, caption, media_type, timestamp, thumbnail_url, media_url, image_url, preview_source 
       FROM ig_posts ORDER BY timestamp DESC LIMIT 5`
    ).catch(() => []);

    // Count posts per month for fb_posts
    const fbPostsPerMonth = await query<{ month: string; count: string }>(
      `SELECT TO_CHAR(created_time, 'YYYY-MM') as month, COUNT(*) as count 
       FROM fb_posts 
       GROUP BY TO_CHAR(created_time, 'YYYY-MM') 
       ORDER BY month DESC 
       LIMIT 12`
    ).catch(() => []);

    // Count posts per month for ig_posts
    const igPostsPerMonth = await query<{ month: string; count: string }>(
      `SELECT TO_CHAR(timestamp, 'YYYY-MM') as month, COUNT(*) as count 
       FROM ig_posts 
       GROUP BY TO_CHAR(timestamp, 'YYYY-MM') 
       ORDER BY month DESC 
       LIMIT 12`
    ).catch(() => []);

    return NextResponse.json({
      fb_posts: {
        total_count: parseInt(fbPostCount[0]?.count || '0'),
        date_range: fbDateRange[0],
        posts_per_month: fbPostsPerMonth,
        sample: fbSample
      },
      ig_posts: {
        total_count: parseInt(igPostCount[0]?.count || '0'),
        date_range: igDateRange[0],
        posts_per_month: igPostsPerMonth,
        sample: igSample
      }
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
