import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const month = request.nextUrl.searchParams.get('month') || '2026-01';
  const customerSlug = request.nextUrl.searchParams.get('customer') || 'asphericon';
  try {
    const result = await query<{ data: any, month: string }>('SELECT month, data FROM ads_cache WHERE month = $1', [month]);
    if (!result[0]) return NextResponse.json({ error: 'No ads data for month', month });
    
    const data = result[0].data;
    const campaigns = data.campaigns || [];
    
    const AD_ACCOUNT_MAP: Record<string, string> = {
      '64446085': 'andskincare',
      '289778171212746': 'contipark',
      '1908114009405295': 'captrain-deutschland',
      '589986474813245': 'pelikan',
      '456263405094069': 'famefact-gmbh',
      '969976773634901': 'asphericon',
      '594963889574701': 'pelikan',
      '1812018146005238': 'fensterart',
      '778746264991304': 'vergleich.org',
    };
    
    const customerCampaigns = campaigns.filter((c: any) => 
      AD_ACCOUNT_MAP[c.account_id] === customerSlug
    );
    
    const allMonths = await query<{ month: string }>('SELECT month FROM ads_cache ORDER BY month DESC');
    
    // FB posts with metrics
    const fbPageIds = await query<{ account_id: string }>(
      "SELECT ca.account_id FROM customer_accounts ca JOIN customers c ON ca.customer_id = c.customer_id WHERE LOWER(REPLACE(c.name, ' ', '-')) = LOWER($1) AND ca.platform = 'facebook'",
      [customerSlug]
    );
    
    let sampleFbPosts: any[] = [];
    if (fbPageIds.length > 0) {
      const pageId = fbPageIds[0].account_id;
      sampleFbPosts = await query(
        `SELECT p.post_id, p.page_id, p.created_time, LEFT(p.message, 80) as message,
                m.reactions_total, m.comments_total, m.shares_total, 
                m.reach, m.impressions, m.video_3s_views,
                m.snapshot_time
         FROM fb_posts p 
         JOIN fb_post_metrics m ON p.post_id = m.post_id
         WHERE p.page_id = $1 
           AND p.created_time >= $2 
           AND p.created_time < $3
         ORDER BY p.created_time DESC`,
        [pageId, month + '-01', '2026-02-01']
      );
    }

    // IG posts with metrics (uses media_id, not post_id)
    const igPageIds = await query<{ account_id: string }>(
      "SELECT ca.account_id FROM customer_accounts ca JOIN customers c ON ca.customer_id = c.customer_id WHERE LOWER(REPLACE(c.name, ' ', '-')) = LOWER($1) AND ca.platform = 'instagram'",
      [customerSlug]
    );

    let sampleIgPosts: any[] = [];
    if (igPageIds.length > 0) {
      const igId = igPageIds[0].account_id;
      sampleIgPosts = await query(
        `SELECT p.media_id, p.account_id, p.timestamp, LEFT(p.caption, 80) as caption,
                m.reach, m.impressions, m.likes, m.comments, m.saves, m.shares, m.plays,
                m.snapshot_time
         FROM ig_posts p 
         JOIN ig_post_metrics m ON p.media_id = m.media_id
         WHERE p.account_id = $1 
           AND p.timestamp >= $2 
           AND p.timestamp < $3
         ORDER BY p.timestamp DESC`,
        [igId, month + '-01', '2026-02-01']
      );
    }
    
    return NextResponse.json({
      month,
      customer: customerSlug,
      totalCampaigns: campaigns.length,
      availableMonths: allMonths.map(m => m.month),
      customerCampaigns,
      fbPageIds: fbPageIds.map(p => p.account_id),
      igPageIds: igPageIds.map(p => p.account_id),
      sampleFbPosts,
      sampleIgPosts,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
