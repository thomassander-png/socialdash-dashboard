import { NextRequest, NextResponse } from 'next/server';

const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const META_API_VERSION = process.env.META_API_VERSION || 'v21.0';

/**
 * Image Proxy for Facebook/Instagram post images.
 * Facebook CDN URLs expire after ~1 hour (403 Forbidden).
 * This proxy fetches fresh image URLs from the Meta Graph API using the current access token.
 * 
 * Usage: /api/image-proxy?id=<post_id>&platform=facebook|instagram
 * 
 * For Facebook: Uses /{post_id}?fields=full_picture to get the image URL
 * For Instagram: Uses /{media_id}?fields=media_url,thumbnail_url to get the image URL
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const postId = searchParams.get('id');
  const platform = searchParams.get('platform') || 'facebook';

  if (!postId) {
    return NextResponse.json({ error: 'Missing post ID' }, { status: 400 });
  }

  if (!META_ACCESS_TOKEN) {
    return NextResponse.json({ error: 'META_ACCESS_TOKEN not configured' }, { status: 500 });
  }

  try {
    let imageUrl: string | null = null;

    if (platform === 'instagram') {
      // Instagram: get media_url or thumbnail_url
      const response = await fetch(
        `https://graph.facebook.com/${META_API_VERSION}/${postId}?fields=media_url,thumbnail_url&access_token=${META_ACCESS_TOKEN}`
      );
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error('Instagram image proxy error:', error);
        return NextResponse.json({ error: 'Failed to fetch image' }, { status: response.status });
      }
      const data = await response.json();
      imageUrl = data.media_url || data.thumbnail_url;
    } else {
      // Facebook: get full_picture
      const response = await fetch(
        `https://graph.facebook.com/${META_API_VERSION}/${postId}?fields=full_picture&access_token=${META_ACCESS_TOKEN}`
      );
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error('Facebook image proxy error:', error);
        return NextResponse.json({ error: 'Failed to fetch image' }, { status: response.status });
      }
      const data = await response.json();
      imageUrl = data.full_picture;
    }

    if (!imageUrl) {
      return NextResponse.json({ error: 'No image available' }, { status: 404 });
    }

    // Fetch the actual image and stream it back
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch image content' }, { status: 502 });
    }

    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    const imageBuffer = await imageResponse.arrayBuffer();

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    console.error('Image proxy error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
