import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { customer_id } = await request.json();
    const accountId = parseInt(params.id);
    
    await query(`
      UPDATE customer_accounts SET customer_id = $1 WHERE id = $2
    `, [customer_id, accountId]);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to assign account:', error);
    return NextResponse.json({ error: 'Failed to assign account' }, { status: 500 });
  }
}
