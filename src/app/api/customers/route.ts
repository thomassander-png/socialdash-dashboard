import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const customers = await query<{
      id: number;
      name: string;
      slug: string;
      logo_url: string | null;
      primary_color: string | null;
    }>(`
      SELECT c.id, c.name, c.slug, c.logo_url, c.primary_color
      FROM customers c
      WHERE EXISTS (
        SELECT 1 FROM customer_accounts ca WHERE ca.customer_id = c.id
      )
      ORDER BY c.name
    `);

    return NextResponse.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}
