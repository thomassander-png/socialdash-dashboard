import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.FACEBOOK_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ─── Campaign → Customer Mapping ────────────────────────────────────
// Maps Meta Ads account_id to customer name (default assignment)
const AD_ACCOUNT_CUSTOMER_MAP: Record<string, string> = {
  '64446085': 'ANDskincare',
  '289778171212746': 'CONTIPARK',
  '1908114009405295': 'Captrain Deutschland',
  '589986474813245': 'Pelikan',
  '456263405094069': 'famefact GmbH',
  '969976773634901': 'asphericon',
  '594963889574701': 'Pelikan', // Shared account: Pelikan + Herlitz
  '1812018146005238': 'fensterart',
  '778746264991304': 'Vergleich.org',
};

// Campaign-name overrides: campaigns matching these patterns get reassigned
const CAMPAIGN_CUSTOMER_OVERRIDES: { pattern: RegExp; targetName: string }[] = [
  { pattern: /herlitz/i, targetName: 'Herlitz' },
  { pattern: /famefact.*herlitz|herlitz.*famefact/i, targetName: 'Herlitz' },
];

/** Determine the customer name for a campaign */
function getCampaignCustomerName(campaign: any): string | null {
  for (const override of CAMPAIGN_CUSTOMER_OVERRIDES) {
    if (override.pattern.test(campaign.name)) {
      return override.targetName;
    }
  }
  return AD_ACCOUNT_CUSTOMER_MAP[campaign.account_id] || null;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);

  try {
    const client = await pool.connect();
    try {
      // Read from cache
      const result = await client.query(
        'SELECT data, synced_at FROM ads_cache WHERE month = $1',
        [month]
      );

      if (result.rows.length > 0) {
        const row = result.rows[0];
        const rawData = row.data;

        // Group campaigns by customer (not by account)
        const customerMap = new Map<string, { name: string; campaigns: any[]; spend: number; impressions: number; reach: number; clicks: number; conversions: number; leads: number; link_clicks: number }>();

        for (const campaign of (rawData.campaigns || [])) {
          const customerName = getCampaignCustomerName(campaign);
          if (!customerName) continue; // Skip unmapped campaigns

          if (!customerMap.has(customerName)) {
            customerMap.set(customerName, {
              name: customerName,
              campaigns: [],
              spend: 0,
              impressions: 0,
              reach: 0,
              clicks: 0,
              conversions: 0,
              leads: 0,
              link_clicks: 0,
            });
          }

          const entry = customerMap.get(customerName)!;
          entry.campaigns.push(campaign);
          entry.spend += campaign.insight?.spend || 0;
          entry.impressions += campaign.insight?.impressions || 0;
          entry.reach += campaign.insight?.reach || 0;
          entry.clicks += campaign.insight?.clicks || 0;
          entry.conversions += campaign.insight?.conversions || 0;
          entry.leads += campaign.insight?.leads || 0;
          entry.link_clicks += campaign.insight?.link_clicks || 0;
        }

        // Build customer summaries sorted by spend desc
        const customerSummaries = Array.from(customerMap.values())
          .map(c => ({
            customer_name: c.name,
            campaigns: c.campaigns.sort((a: any, b: any) => (b.insight?.spend || 0) - (a.insight?.spend || 0)),
            spend: c.spend,
            impressions: c.impressions,
            reach: c.reach,
            clicks: c.clicks,
            conversions: c.conversions,
            leads: c.leads,
            link_clicks: c.link_clicks,
            cpc: c.clicks > 0 ? c.spend / c.clicks : 0,
            cpm: c.impressions > 0 ? (c.spend / c.impressions) * 1000 : 0,
            ctr: c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0,
            campaign_count: c.campaigns.length,
          }))
          .sort((a, b) => b.spend - a.spend);

        return NextResponse.json({
          month,
          // Keep original data for backward compatibility
          adAccounts: rawData.adAccounts || [],
          accountSummaries: rawData.accountSummaries || [],
          campaigns: rawData.campaigns || [],
          // NEW: Customer-grouped data
          customerSummaries,
          totals: rawData.totals || {
            totalSpend: 0, totalImpressions: 0, totalReach: 0, totalClicks: 0,
            totalConversions: 0, totalLeads: 0, avgCPC: 0, avgCPM: 0, avgCTR: 0,
          },
          synced_at: row.synced_at,
          cached: true,
        }, {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
          }
        });
      }

      // No cached data available
      return NextResponse.json({
        month,
        adAccounts: [],
        accountSummaries: [],
        campaigns: [],
        customerSummaries: [],
        totals: {
          totalSpend: 0, totalImpressions: 0, totalReach: 0, totalClicks: 0,
          totalConversions: 0, totalLeads: 0, avgCPC: 0, avgCPM: 0, avgCTR: 0,
        },
        cached: false,
        needsSync: true,
        message: 'Keine gecachten Daten vorhanden. Bitte klicke auf "Sync" um die Daten von Meta zu laden.',
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Ads API Error:', error);
    if (error.message?.includes('does not exist')) {
      return NextResponse.json({
        month,
        adAccounts: [],
        accountSummaries: [],
        campaigns: [],
        customerSummaries: [],
        totals: {
          totalSpend: 0, totalImpressions: 0, totalReach: 0, totalClicks: 0,
          totalConversions: 0, totalLeads: 0, avgCPC: 0, avgCPM: 0, avgCTR: 0,
        },
        cached: false,
        needsSync: true,
        message: 'Ads-Cache noch nicht initialisiert. Bitte klicke auf "Sync".',
      });
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch ads data' },
      { status: 500 }
    );
  }
}
