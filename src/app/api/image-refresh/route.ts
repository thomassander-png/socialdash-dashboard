import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Refresh thumbnail URLs by scraping og:image from Facebook/Instagram permalinks
// This solves the expired CDN token problem permanently

async function scrapeOgImage(permalink: string): Promise<string | null> {
  try {
    const response = await fetch(permalink, {
      headers: {
        'User-Agent': 'facebookexternalhit/1.1',
      },
      redirect: 'follow',
    });
    
    if (!response.ok) return null;
    
    const html = await response.text();
    
    // Extract og:image content
    const ogImageMatch = html.match(/property="og:image"\s+content="([^"]+)"/);
    if (ogImageMatch) {
      // Decode HTML entities
      return ogImageMatch[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    }
    
    return null;
  } catch (error) {
    console.error(`Failed to scrape ${permalink}:`, error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get('platform') || 'both';
  const limit = parseInt(searchParams.get('limit') || '50');
  const month = searchParams.get('month');
  
  const results = {
    facebook: { updated: 0, failed: 0, skipped: 0 },
    instagram: { updated: 0, failed: 0, skipped: 0 },
  };

  // Refresh Facebook posts
  if (platform === 'both' || platform === 'facebook') {
    try {
      let fbQuery = `
        SELECT post_id, permalink, thumbnail_url 
        FROM fb_posts 
        WHERE permalink IS NOT NULL AND permalink != ''
      `;
      const params: any[] = [];
      
      if (month) {
        fbQuery += ` AND TO_CHAR(created_time, 'YYYY-MM') = $1`;
        params.push(month);
      }
      
      fbQuery += ` ORDER BY created_time DESC LIMIT $${params.length + 1}`;
      params.push(limit);
      
      const posts = await query<{ post_id: string; permalink: string; thumbnail_url: string | null }>(
        fbQuery, params
      );
      
      for (const post of posts) {
        if (!post.permalink) {
          results.facebook.skipped++;
          continue;
        }
        
        const newUrl = await scrapeOgImage(post.permalink);
        
        if (newUrl) {
          await query(
            'UPDATE fb_posts SET thumbnail_url = $1 WHERE post_id = $2',
            [newUrl, post.post_id]
          );
          results.facebook.updated++;
        } else {
          results.facebook.failed++;
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error('Facebook refresh error:', error);
    }
  }

  // Refresh Instagram posts
  if (platform === 'both' || platform === 'instagram') {
    try {
      let igQuery = `
        SELECT post_id, permalink, thumbnail_url 
        FROM ig_posts 
        WHERE permalink IS NOT NULL AND permalink != ''
      `;
      const params: any[] = [];
      
      if (month) {
        igQuery += ` AND TO_CHAR(timestamp, 'YYYY-MM') = $1`;
        params.push(month);
      }
      
      igQuery += ` ORDER BY timestamp DESC LIMIT $${params.length + 1}`;
      params.push(limit);
      
      const posts = await query<{ post_id: string; permalink: string; thumbnail_url: string | null }>(
        igQuery, params
      );
      
      for (const post of posts) {
        if (!post.permalink) {
          results.instagram.skipped++;
          continue;
        }
        
        // For Instagram, try scraping the permalink
        const newUrl = await scrapeOgImage(post.permalink);
        
        if (newUrl) {
          await query(
            'UPDATE ig_posts SET thumbnail_url = $1 WHERE post_id = $2',
            [newUrl, post.post_id]
          );
          results.instagram.updated++;
        } else {
          results.instagram.failed++;
        }
        
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error('Instagram refresh error:', error);
    }
  }

  return NextResponse.json({
    success: true,
    results,
    message: `Refreshed: FB ${results.facebook.updated}/${results.facebook.updated + results.facebook.failed}, IG ${results.instagram.updated}/${results.instagram.updated + results.instagram.failed}`,
  });
}
