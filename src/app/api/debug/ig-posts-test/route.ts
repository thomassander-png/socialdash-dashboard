import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.FACEBOOK_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const month = searchParams.get('month') || '2025-12';
  const accountId = '17841406479455391'; // ANDskincare Instagram
  
  const startDate = `${month}-01`;
  const endDate = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() + 1, 1).toISOString().slice(0, 10);
  
  try {
    // Test the exact query from the report generator
    const result = await pool.query(`
      SELECT 
        p.media_id as post_id, p.caption as message, p.timestamp as created_time,
        p.media_type as type, p.permalink,
        COALESCE(m.likes, 0) as reactions_total,
        COALESCE(m.comments, 0) as comments_total,
        NULL as shares_total, m.reach, m.impressions,
        m.video_views as video_3s_views,
        COALESCE(p.thumbnail_url, p.media_url) as thumbnail_url,
        COALESCE(m.saves, 0) as saves
      FROM ig_posts p
      LEFT JOIN LATERAL (
        SELECT * FROM ig_post_metrics WHERE media_id = p.media_id ORDER BY snapshot_time DESC LIMIT 1
      ) m ON true
      WHERE p.account_id IN ($3)
        AND p.timestamp::date >= $1::date AND p.timestamp::date < $2::date
      ORDER BY (COALESCE(m.likes, 0) + COALESCE(m.comments, 0)) DESC
    `, [startDate, endDate, accountId]);
    
    return NextResponse.json({
      params: { startDate, endDate, accountId },
      postCount: result.rows.length,
      posts: result.rows.slice(0, 5)
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: String(error), params: { startDate, endDate, accountId } }, { status: 500 });
  }
}
