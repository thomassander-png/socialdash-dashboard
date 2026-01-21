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
    // Get column structure
    const cols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'ig_follower_history'
      ORDER BY ordinal_position
    `);
    
    // Get sample data for ANDskincare
    const sample = await pool.query(`
      SELECT * FROM ig_follower_history 
      WHERE account_id = $1 
      ORDER BY recorded_at DESC 
      LIMIT 10
    `, [accountId]);
    
    // Also get current followers from ig_accounts
    const current = await pool.query(`
      SELECT followers_count FROM ig_accounts WHERE account_id = $1
    `, [accountId]);
    
    return NextResponse.json({
      columns: cols.rows,
      sample_data: sample.rows,
      current_followers: current.rows[0]?.followers_count || 0
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
