import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { customer_ids } = await request.json();
    
    if (!customer_ids || !Array.isArray(customer_ids) || customer_ids.length === 0) {
      return NextResponse.json({ error: 'customer_ids array required' }, { status: 400 });
    }

    // Deactivate customers by setting is_active = false
    const placeholders = customer_ids.map((_: string, i: number) => `$${i + 1}`).join(', ');
    const result = await query(
      `UPDATE customers SET is_active = false WHERE customer_id IN (${placeholders}) RETURNING customer_id, name`,
      customer_ids
    );

    return NextResponse.json({ 
      success: true, 
      deactivated: result,
      count: result.length 
    });
  } catch (error) {
    console.error('Error deactivating customers:', error);
    return NextResponse.json({ error: 'Failed to deactivate customers' }, { status: 500 });
  }
}
