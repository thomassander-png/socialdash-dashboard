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
    
    // Return ALL fields of matching campaigns
    const customerCampaigns = campaigns.filter((c: any) => 
      AD_ACCOUNT_MAP[c.account_id] === customerSlug
    );
    
    // Also check what months are available in ads_cache
    const allMonths = await query<{ month: string }>('SELECT month FROM ads_cache ORDER BY month DESC');
    
    // Also check fb_post_metrics for this customer to debug impressions
    const fbPageIds = await query<{ account_id: string }>(
      "SELECT ca.account_id FROM customer_accounts ca JOIN customers c ON ca.customer_id = c.customer_id WHERE LOWER(REPLACE(c.name, ' ', '-')) = LOWER($1) AND ca.platform = 'facebook'",
      [customerSlug]
    );
    
    let samplePosts: any[] = [];
    if (fbPageIds.length > 0) {
      const pageId = fbPageIds[0].account_id;
      samplePosts = await query(
        "SELECT post_id, page_id, reactions_total, comments_total, shares_total, reach, impressions, video_views, snapshot_time FROM fb_post_metrics WHERE page_id = $1 AND snapshot_time >= $2 AND snapshot_time < $3 ORDER BY snapshot_time DESC LIMIT 5",
        [pageId, month + '-01', month === '2026-01' ? '2026-02-01' : '2026-01-01']
      );
    }
    
    return NextResponse.json({
      month,
      customer: customerSlug,
      totalCampaigns: campaigns.length,
      availableMonths: allMonths.map(m => m.month),
      customerCampaigns,
      fbPageIds: fbPageIds.map(p => p.account_id),
      sampleFbPosts: samplePosts,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
