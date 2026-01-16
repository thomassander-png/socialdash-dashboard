import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const customers = await query<{
      customer_id: string;
      name: string;
      slug: string;
      is_active: boolean;
    }>(`
      SELECT 
        c.customer_id, 
        c.name, 
        LOWER(REPLACE(c.name, ' ', '-')) as slug,
        c.is_active
      FROM customers c
      WHERE c.is_active = true
        AND EXISTS (
          SELECT 1 FROM customer_accounts ca WHERE ca.customer_id = c.customer_id
        )
      ORDER BY c.name
    `);

    return NextResponse.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}
