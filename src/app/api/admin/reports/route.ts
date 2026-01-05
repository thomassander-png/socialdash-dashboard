import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const reports = await query(`
      SELECT 
        r.report_id, r.customer_id, r.month, r.status, r.pptx_url, r.pdf_url, r.generated_at,
        c.name as customer_name
      FROM reports r
      LEFT JOIN customers c ON r.customer_id = c.customer_id
      ORDER BY r.month DESC, c.name ASC
    `);
    return NextResponse.json({ reports });
  } catch (error) {
    console.error('Failed to fetch reports:', error);
    return NextResponse.json({ reports: [], error: 'Failed to fetch reports' }, { status: 500 });
  }
}
