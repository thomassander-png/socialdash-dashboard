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
 * This proxy:
 * 1. Fetches the stored CDN URL from the database
 * 2. If the CDN URL works → streams the image
 * 3. If the CDN URL expired (403) → scrapes a fresh og:image from the permalink
 * 4. Updates the DB with the fresh URL for future requests
 * 
 * Usage: /api/image-proxy?id=<post_id>&platform=facebook|instagram
 */

async function scrapeOgImage(permalink: string): Promise<string | null> {
  try {
    const response = await fetch(permalink, {
      headers: { 'User-Agent': 'facebookexternalhit/1.1' },
      redirect: 'follow',
    });
    if (!response.ok) return null;
    const html = await response.text();
    const match = html.match(/property="og:image"\s+content="([^"]+)"/);
    if (match) {
      return match[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const postId = searchParams.get('id');
  const platform = searchParams.get('platform') || 'facebook';

  if (!postId) {
    return NextResponse.json({ error: 'Missing post ID' }, { status: 400 });
  }

  try {
    let imageUrl: string | null = null;
    let permalink: string | null = null;

    if (platform === 'instagram') {
      // Try media_id first (primary key), then post_id as fallback
      let result = await pool.query(
        `SELECT media_url, thumbnail_url, og_image_url, permalink 
         FROM ig_posts WHERE media_id = $1 LIMIT 1`,
        [postId]
      );
      if (result.rows.length === 0) {
        result = await pool.query(
          `SELECT media_url, thumbnail_url, og_image_url, permalink 
           FROM ig_posts WHERE post_id = $1 LIMIT 1`,
          [postId]
        );
      }
      if (result.rows.length > 0) {
        const row = result.rows[0];
        imageUrl = row.media_url || row.thumbnail_url || row.og_image_url;
        permalink = row.permalink;
      }
    } else {
      const result = await pool.query(
        `SELECT thumbnail_url, og_image_url, media_url, image_url, permalink 
         FROM fb_posts WHERE post_id = $1 LIMIT 1`,
        [postId]
      );
      if (result.rows.length > 0) {
        const row = result.rows[0];
        imageUrl = row.thumbnail_url || row.og_image_url || row.media_url || row.image_url;
        permalink = row.permalink;
      }
    }

    if (!imageUrl && !permalink) {
      return NextResponse.json({ error: 'No image found for this post' }, { status: 404 });
    }

    // Try fetching the stored CDN URL
    let imageResponse: Response | null = null;
    if (imageUrl) {
      try {
        imageResponse = await fetch(imageUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SocialDash/1.0)' },
        });
        if (!imageResponse.ok) {
          imageResponse = null; // CDN URL expired
        }
      } catch {
        imageResponse = null;
      }
    }

    // If CDN URL expired, try scraping a fresh one from the permalink
    if (!imageResponse && permalink) {
      const freshUrl = await scrapeOgImage(permalink);
      if (freshUrl) {
        // Update the DB with the fresh URL
        const table = platform === 'instagram' ? 'ig_posts' : 'fb_posts';
        const idCol = platform === 'instagram' ? 'media_id' : 'post_id';
        await pool.query(
          `UPDATE ${table} SET thumbnail_url = $1 WHERE ${idCol} = $2`,
          [freshUrl, postId]
        ).catch(() => {}); // Don't fail if update fails

        // Fetch the fresh image
        try {
          imageResponse = await fetch(freshUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SocialDash/1.0)' },
          });
          if (!imageResponse.ok) imageResponse = null;
        } catch {
          imageResponse = null;
        }
      }
    }

    // If we still don't have an image, return placeholder
    if (!imageResponse) {
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
