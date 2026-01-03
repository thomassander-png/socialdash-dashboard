import { NextResponse } from 'next/server';
import { getInstagramPosts } from '@/lib/instagram';
import { getCurrentMonth } from '@/lib/utils';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month') || getCurrentMonth();
  const sort = searchParams.get('sort') || 'interactions';
  const limit = parseInt(searchParams.get('limit') || '100');
  
  try {
    const posts = await getInstagramPosts(month, sort, limit);
    return NextResponse.json(posts);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
