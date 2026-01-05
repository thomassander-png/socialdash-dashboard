import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const accounts = await query(`
      SELECT 
        ca.id, ca.customer_id, ca.platform, ca.account_id, ca.account_name, ca.is_active, ca.created_at,
        c.name as customer_name
      FROM customer_accounts ca
      LEFT JOIN customers c ON ca.customer_id = c.customer_id
      ORDER BY ca.platform, ca.account_name
    `);
    return NextResponse.json({ accounts });
  } catch (error) {
    console.error('Failed to fetch accounts:', error);
    return NextResponse.json({ accounts: [], error: 'Failed to fetch accounts' }, { status: 500 });
  }
}
