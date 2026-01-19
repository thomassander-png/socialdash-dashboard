import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.FACEBOOK_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function GET() {
  try {
    // Get columns for fb_post_metrics
    const fbMetricsCols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'fb_post_metrics' 
      ORDER BY ordinal_position
    `);

    // Get columns for ig_post_metrics
    const igMetricsCols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'ig_post_metrics' 
      ORDER BY ordinal_position
    `);

    // Get columns for fb_posts
    const fbPostsCols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'fb_posts' 
      ORDER BY ordinal_position
    `);

    // Get columns for ig_posts
    const igPostsCols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'ig_posts' 
      ORDER BY ordinal_position
    `);

    return NextResponse.json({
      fb_post_metrics: fbMetricsCols.rows,
      ig_post_metrics: igMetricsCols.rows,
      fb_posts: fbPostsCols.rows,
      ig_posts: igPostsCols.rows
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}
