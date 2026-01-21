import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.FACEBOOK_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const customer = searchParams.get('customer') || 'andskincare';
  
  try {
    // Get customer info
    const customerResult = await pool.query(`
      SELECT * FROM customers WHERE LOWER(REPLACE(name, ' ', '-')) = LOWER($1)
    `, [customer]);
    
    // Get all accounts for this customer
    const accountsResult = await pool.query(`
      SELECT ca.*, c.name as customer_name 
      FROM customer_accounts ca 
      JOIN customers c ON ca.customer_id = c.customer_id 
      WHERE LOWER(REPLACE(c.name, ' ', '-')) = LOWER($1)
    `, [customer]);
    
    // Get all Instagram accounts in the system
    const allIgAccounts = await pool.query(`
      SELECT DISTINCT account_id FROM ig_posts LIMIT 20
    `);
    
    // Get Instagram post count for this customer's accounts
    const igAccountIds = accountsResult.rows
      .filter(r => r.platform === 'instagram')
      .map(r => r.account_id);
    
    let igPostCount = 0;
    if (igAccountIds.length > 0) {
      const placeholders = igAccountIds.map((_, i) => `$${i + 1}`).join(', ');
      const postCountResult = await pool.query(`
        SELECT COUNT(*) as count FROM ig_posts WHERE account_id IN (${placeholders})
      `, igAccountIds);
      igPostCount = parseInt(postCountResult.rows[0]?.count || '0');
    }
    
    return NextResponse.json({
      customer: customerResult.rows[0] || null,
      accounts: accountsResult.rows,
      instagram_account_ids: igAccountIds,
      ig_post_count: igPostCount,
      all_ig_accounts_in_db: allIgAccounts.rows.map(r => r.account_id)
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
