import { NextRequest, NextResponse } from 'next/server';
import { SLIDE_REGISTRY, DEFAULT_REPORT_CONFIG } from '@/lib/report-slides';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (body.action === 'list-slides') {
      const slides = SLIDE_REGISTRY.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        platform: s.platform,
        category: s.category,
        order: s.order,
      }));
      return NextResponse.json({ slides, defaultConfig: DEFAULT_REPORT_CONFIG });
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process request', details: String(error) }, { status: 500 });
  }
}
