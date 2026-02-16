import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.FACEBOOK_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

/**
 * Image Proxy for Facebook/Instagram post images.
 * 
 * Facebook CDN URLs contain temporary tokens (oh=, oe=) that expire.
 * This proxy fetches the stored CDN URL from the database and streams the image.
 * If the CDN URL has expired (403), it returns a placeholder.
 * 
 * Usage: /api/image-proxy?id=<post_id>&platform=facebook|instagram
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const postId = searchParams.get('id');
  const platform = searchParams.get('platform') || 'facebook';

  if (!postId) {
    return NextResponse.json({ error: 'Missing post ID' }, { status: 400 });
  }

  try {
    let imageUrl: string | null = null;

    if (platform === 'instagram') {
      // Instagram: get media_url or thumbnail_url from ig_posts
      const result = await pool.query(
        `SELECT media_url, thumbnail_url, og_image_url 
         FROM ig_posts WHERE post_id = $1 LIMIT 1`,
        [postId]
      );
      if (result.rows.length > 0) {
        const row = result.rows[0];
        imageUrl = row.media_url || row.thumbnail_url || row.og_image_url;
      }
    } else {
      // Facebook: get thumbnail_url, og_image_url from fb_posts
      const result = await pool.query(
        `SELECT thumbnail_url, og_image_url, media_url, image_url 
         FROM fb_posts WHERE post_id = $1 LIMIT 1`,
        [postId]
      );
      if (result.rows.length > 0) {
        const row = result.rows[0];
        imageUrl = row.thumbnail_url || row.og_image_url || row.media_url || row.image_url;
      }
    }

    if (!imageUrl) {
      return NextResponse.json({ error: 'No image found for this post' }, { status: 404 });
    }

    // Fetch the image from the CDN URL
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SocialDash/1.0)',
      },
    });

    if (!imageResponse.ok) {
      // CDN URL expired - return a 1x1 transparent pixel as fallback
      const transparentPixel = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );
      return new NextResponse(transparentPixel, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=60',
        },
      });
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
