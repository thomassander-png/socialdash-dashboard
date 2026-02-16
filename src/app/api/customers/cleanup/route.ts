import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// One-time cleanup: deactivate customers that should not appear in the dashboard
const CUSTOMERS_TO_DEACTIVATE = [
  '0fa85c90-1105-44d1-b103-b348472444e5',  // ABDA Apotheken
  'dcfe3d48-836d-4403-ac1a-072d48dedbce',  // CASIO G-SHOCK
  '2aa2d744-d1e8-4123-adef-8dae4bf8ee7e',  // Vivantes
];

export async function GET() {
  try {
    const placeholders = CUSTOMERS_TO_DEACTIVATE.map((_, i) => `$${i + 1}`).join(', ');
    const result = await query(
      `UPDATE customers SET is_active = false WHERE customer_id IN (${placeholders}) RETURNING customer_id, name`,
      CUSTOMERS_TO_DEACTIVATE
    );

    return NextResponse.json({ 
      success: true, 
      deactivated: result,
      message: `${result.length} customers deactivated`
    });
  } catch (error) {
    console.error('Error in cleanup:', error);
    return NextResponse.json({ error: 'Failed to cleanup customers' }, { status: 500 });
  }
}
