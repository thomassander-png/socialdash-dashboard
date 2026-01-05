import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { is_active } = await request.json();
    const customerId = parseInt(params.id);
    
    await query(`
      UPDATE customers SET is_active = $1 WHERE customer_id = $2
    `, [is_active, customerId]);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update customer:', error);
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const customerId = parseInt(params.id);
    
    await query(`DELETE FROM customers WHERE customer_id = $1`, [customerId]);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete customer:', error);
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 });
  }
}
