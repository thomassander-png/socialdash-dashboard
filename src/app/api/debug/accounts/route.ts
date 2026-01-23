import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (accountId) {
      // Search for specific account
      const accounts = await query<{
        customer_id: string;
        customer_name: string;
        account_id: string;
        platform: string;
      }>(`
        SELECT 
          ca.customer_id,
          c.name as customer_name,
          ca.account_id,
          ca.platform
        FROM customer_accounts ca
        LEFT JOIN customers c ON ca.customer_id = c.customer_id
        WHERE ca.account_id = $1
      `, [accountId]);

      return NextResponse.json({ accounts });
    }

    // List all accounts
    const accounts = await query<{
      customer_id: string;
      customer_name: string;
      account_id: string;
      platform: string;
    }>(`
      SELECT 
        ca.customer_id,
        c.name as customer_name,
        ca.account_id,
        ca.platform
      FROM customer_accounts ca
      LEFT JOIN customers c ON ca.customer_id = c.customer_id
      ORDER BY c.name, ca.platform
    `);

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch accounts', details: errorMessage }, { status: 500 });
  }
}
