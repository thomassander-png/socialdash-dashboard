import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.FACEBOOK_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function GET() {
  try {
    // Find all Instagram-related tables
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND (table_name LIKE 'ig_%' OR table_name LIKE 'instagram%')
      ORDER BY table_name
    `);
    
    // Get ig_accounts structure if it exists
    let igAccountsColumns: any[] = [];
    let igAccountsSample: any[] = [];
    
    try {
      const cols = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'ig_accounts'
        ORDER BY ordinal_position
      `);
      igAccountsColumns = cols.rows;
      
      const sample = await pool.query(`SELECT * FROM ig_accounts LIMIT 3`);
      igAccountsSample = sample.rows;
    } catch (e) {
      // Table doesn't exist
    }
    
    return NextResponse.json({
      instagram_tables: tables.rows.map(r => r.table_name),
      ig_accounts_columns: igAccountsColumns,
      ig_accounts_sample: igAccountsSample
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
