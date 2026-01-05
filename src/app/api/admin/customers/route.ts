import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const customers = await query(`
      SELECT customer_id, name, slug, is_active, created_at
      FROM customers
      ORDER BY name ASC
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
