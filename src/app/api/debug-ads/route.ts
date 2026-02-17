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
    
    // Show first campaign with full structure
    const sample = campaigns.slice(0, 2).map((c: any) => ({
      name: c.name,
      account_id: c.account_id,
      insights: c.insights?.data?.[0] ? {
        spend: c.insights.data[0].spend,
        impressions: c.insights.data[0].impressions,
        reach: c.insights.data[0].reach,
        clicks: c.insights.data[0].clicks,
        actions: c.insights.data[0].actions?.slice(0, 15),
        action_types: c.insights.data[0].actions?.map((a: any) => a.action_type),
      } : 'no insights',
    }));
    
    // Find asphericon campaigns (account_id = 969976773634901)
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
    ).map((c: any) => ({
      name: c.name,
      account_id: c.account_id,
      spend: c.insights?.data?.[0]?.spend,
      impressions: c.insights?.data?.[0]?.impressions,
      reach: c.insights?.data?.[0]?.reach,
      clicks: c.insights?.data?.[0]?.clicks,
      actions: c.insights?.data?.[0]?.actions,
    }));
    
    // Also check what months are available in ads_cache
    const allMonths = await query<{ month: string }>('SELECT month FROM ads_cache ORDER BY month DESC');
    
    return NextResponse.json({
      month,
      customer: customerSlug,
      totalCampaigns: campaigns.length,
      availableMonths: allMonths.map(m => m.month),
      sampleCampaigns: sample,
      customerCampaigns,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
