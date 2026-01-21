import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.FACEBOOK_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const accountId = searchParams.get('account_id') || '17841406479455391';
  
  try {
    // Check if ig_follower_snapshots table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'ig_follower_snapshots'
      ) as exists
    `);
    
    if (!tableCheck.rows[0].exists) {
      return NextResponse.json({
        error: 'Table ig_follower_snapshots does not exist',
        suggestion: 'The Instagram follower data may be stored in a different table'
      });
    }
    
    // Get follower snapshots
    const result = await pool.query(`
      SELECT * FROM ig_follower_snapshots 
      WHERE account_id = $1 
      ORDER BY snapshot_time DESC 
      LIMIT 10
    `, [accountId]);
    
    // Also check ig_accounts table for follower count
    const accountResult = await pool.query(`
      SELECT * FROM ig_accounts WHERE account_id = $1
    `, [accountId]);
    
    return NextResponse.json({
      table_exists: true,
      snapshots: result.rows,
      account_info: accountResult.rows[0] || null
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
