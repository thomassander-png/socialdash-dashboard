import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return NextResponse.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: String(error) }, { status: 500 });
  }
}
