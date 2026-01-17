import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // List all tables
    const tables = await query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
    );

    // Check follower history tables
    const fbFollowerCount = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM fb_follower_history`
    ).catch(() => [{ count: '0' }]);

    const igFollowerCount = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM ig_follower_history`
    ).catch(() => [{ count: '0' }]);

    // Get sample data from follower tables
    const fbSample = await query<any>(
      `SELECT * FROM fb_follower_history ORDER BY snapshot_date DESC LIMIT 5`
    ).catch(() => []);

    const igSample = await query<any>(
      `SELECT * FROM ig_follower_history ORDER BY snapshot_date DESC LIMIT 5`
    ).catch(() => []);

    return NextResponse.json({
      tables: tables.map(t => t.tablename),
      followerData: {
        fb_follower_history: {
          count: parseInt(fbFollowerCount[0]?.count || '0'),
          sample: fbSample
        },
        ig_follower_history: {
          count: parseInt(igFollowerCount[0]?.count || '0'),
          sample: igSample
        }
      }
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
