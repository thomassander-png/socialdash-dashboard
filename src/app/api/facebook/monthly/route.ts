import { NextResponse } from 'next/server';
import { getFacebookKPIs } from '@/lib/facebook';
import { getCurrentMonth } from '@/lib/utils';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month') || getCurrentMonth();
  
  try {
    const kpis = await getFacebookKPIs(month);
    return NextResponse.json(kpis);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
