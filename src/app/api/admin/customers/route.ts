import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const customers = await query(`
      SELECT 
        c.customer_id, c.name, c.slug, c.is_active, c.created_at,
        COALESCE(fb.count, 0)::int as fb_account_count,
        COALESCE(ig.count, 0)::int as ig_account_count
      FROM customers c
      LEFT JOIN (
        SELECT customer_id, COUNT(*) as count 
        FROM customer_accounts 
        WHERE platform = 'facebook' AND is_active = true
        GROUP BY customer_id
      ) fb ON c.customer_id = fb.customer_id
      LEFT JOIN (
        SELECT customer_id, COUNT(*) as count 
        FROM customer_accounts 
        WHERE platform = 'instagram' AND is_active = true
        GROUP BY customer_id
      ) ig ON c.customer_id = ig.customer_id
      ORDER BY c.name ASC
    `);
    return NextResponse.json({ customers });
  } catch (error) {
    console.error('Failed to fetch customers:', error);
    return NextResponse.json({ customers: [], error: 'Failed to fetch customers' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, slug } = await request.json();
    
    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
    }
    
    const result = await query(`
      INSERT INTO customers (name, slug, is_active)
      VALUES ($1, $2, true)
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      RETURNING *
    `, [name, slug]);
    
    return NextResponse.json({ customer: result[0] });
  } catch (error) {
    console.error('Failed to create customer:', error);
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
  }
}
