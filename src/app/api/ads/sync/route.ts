import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const META_API_VERSION = process.env.META_API_VERSION || 'v21.0';
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

async function fetchMeta(endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(`${META_BASE_URL}${endpoint}`);
  url.searchParams.set('access_token', META_ACCESS_TOKEN || '');
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  const response = await fetch(url.toString());
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Meta API Error: ${response.status} - ${JSON.stringify(error)}`);
  }
  return response.json();
}

function getActionValue(actions: Array<{ action_type: string; value: string }> | undefined, actionType: string): number {
  if (!actions) return 0;
  const action = actions.find(a => a.action_type === actionType);
  return action ? parseInt(action.value) : 0;
}

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // Verify cron secret or allow manual trigger
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isManual = request.nextUrl.searchParams.get('manual') === 'true';
  
  if (!isManual && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!META_ACCESS_TOKEN) {
    return NextResponse.json({ error: 'META_ACCESS_TOKEN not configured' }, { status: 500 });
  }

  const month = request.nextUrl.searchParams.get('month') || new Date().toISOString().slice(0, 7);
  const startDate = `${month}-01`;
  const endDate = new Date(
    new Date(startDate).getFullYear(),
    new Date(startDate).getMonth() + 1,
    0
  ).toISOString().slice(0, 10);

  try {
    // Ensure table exists
    await query(`
      CREATE TABLE IF NOT EXISTS ads_cache (
        id SERIAL PRIMARY KEY,
        month VARCHAR(7) NOT NULL,
        data JSONB NOT NULL,
        synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(month)
      )
    `);

    // Step 1: Get all ad accounts
    const adAccountsResponse = await fetchMeta('/me/adaccounts', {
      fields: 'id,name,account_id,currency,account_status',
      limit: '100'
    });

    const adAccounts = (adAccountsResponse.data || []).filter(
      (a: any) => a.account_status === 1
    );

    const timeRange = JSON.stringify({ since: startDate, until: endDate });

    // Step 2: Fetch insights per account in parallel
    const accountPromises = adAccounts.map(async (account: any) => {
      try {
        const [accountInsightsRes, campaignsRes] = await Promise.all([
          fetchMeta(`/${account.id}/insights`, {
            fields: 'impressions,reach,clicks,spend,cpc,cpm,ctr,actions',
            time_range: timeRange,
            level: 'account'
          }).catch(() => ({ data: [] })),
          fetchMeta(`/${account.id}/insights`, {
            fields: 'campaign_id,campaign_name,impressions,reach,clicks,spend,cpc,cpm,ctr,actions,cost_per_action_type,objective',
            time_range: timeRange,
            level: 'campaign',
            limit: '500'
          }).catch(() => ({ data: [] }))
        ]);

        const accountData = accountInsightsRes.data?.[0] || null;
        const campaignInsights = campaignsRes.data || [];

        const campaigns = campaignInsights.map((insight: any) => ({
          id: insight.campaign_id,
          name: insight.campaign_name,
          status: 'ACTIVE',
          objective: insight.objective || '',
          account_name: account.name,
          account_id: account.account_id,
          currency: account.currency,
          insight: {
            impressions: parseInt(insight.impressions || '0'),
            reach: parseInt(insight.reach || '0'),
            clicks: parseInt(insight.clicks || '0'),
            spend: parseFloat(insight.spend || '0'),
            cpc: parseFloat(insight.cpc || '0'),
            cpm: parseFloat(insight.cpm || '0'),
            ctr: parseFloat(insight.ctr || '0'),
            conversions: getActionValue(insight.actions, 'offsite_conversion'),
            leads: getActionValue(insight.actions, 'lead'),
            link_clicks: getActionValue(insight.actions, 'link_click'),
            post_engagement: getActionValue(insight.actions, 'post_engagement'),
            page_likes: getActionValue(insight.actions, 'like'),
          }
        }));

        const accountSummary = accountData ? {
          account_id: account.account_id,
          account_name: account.name,
          currency: account.currency,
          impressions: parseInt(accountData.impressions || '0'),
          reach: parseInt(accountData.reach || '0'),
          clicks: parseInt(accountData.clicks || '0'),
          spend: parseFloat(accountData.spend || '0'),
          cpc: parseFloat(accountData.cpc || '0'),
          cpm: parseFloat(accountData.cpm || '0'),
          ctr: parseFloat(accountData.ctr || '0'),
          conversions: getActionValue(accountData.actions, 'offsite_conversion'),
          leads: getActionValue(accountData.actions, 'lead'),
          link_clicks: getActionValue(accountData.actions, 'link_click'),
        } : null;

        return { campaigns, accountSummary };
      } catch (e) {
        console.error(`Error fetching account ${account.id}:`, e);
        return { campaigns: [], accountSummary: null };
      }
    });

    const results = await Promise.all(accountPromises);
    const allCampaigns = results.flatMap(r => r.campaigns);
    const accountSummaries = results.map(r => r.accountSummary).filter(Boolean);

    const totals = {
      totalSpend: accountSummaries.reduce((sum: number, a: any) => sum + a.spend, 0),
      totalImpressions: accountSummaries.reduce((sum: number, a: any) => sum + a.impressions, 0),
      totalReach: accountSummaries.reduce((sum: number, a: any) => sum + a.reach, 0),
      totalClicks: accountSummaries.reduce((sum: number, a: any) => sum + a.clicks, 0),
      totalConversions: accountSummaries.reduce((sum: number, a: any) => sum + a.conversions, 0),
      totalLeads: accountSummaries.reduce((sum: number, a: any) => sum + a.leads, 0),
      avgCPC: accountSummaries.length > 0
        ? accountSummaries.reduce((sum: number, a: any) => sum + a.spend, 0) /
          Math.max(accountSummaries.reduce((sum: number, a: any) => sum + a.clicks, 0), 1)
        : 0,
      avgCPM: accountSummaries.length > 0
        ? (accountSummaries.reduce((sum: number, a: any) => sum + a.spend, 0) /
          Math.max(accountSummaries.reduce((sum: number, a: any) => sum + a.impressions, 0), 1)) * 1000
        : 0,
      avgCTR: accountSummaries.length > 0
        ? (accountSummaries.reduce((sum: number, a: any) => sum + a.clicks, 0) /
          Math.max(accountSummaries.reduce((sum: number, a: any) => sum + a.impressions, 0), 1)) * 100
        : 0,
    };

    allCampaigns.sort((a: any, b: any) => (b.insight?.spend || 0) - (a.insight?.spend || 0));

    const cacheData = {
      month,
      startDate,
      endDate,
      adAccounts: adAccounts.map((a: any) => ({
        id: a.id,
        name: a.name,
        account_id: a.account_id,
        currency: a.currency,
      })),
      accountSummaries,
      campaigns: allCampaigns,
      totals,
    };

    // Upsert into cache
    await query(`
      INSERT INTO ads_cache (month, data, synced_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (month) DO UPDATE SET data = $2, synced_at = NOW()
    `, [month, JSON.stringify(cacheData)]);

    return NextResponse.json({
      success: true,
      month,
      campaignCount: allCampaigns.length,
      accountCount: adAccounts.length,
      totalSpend: totals.totalSpend,
    });
  } catch (error: any) {
    console.error('Ads Sync Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
