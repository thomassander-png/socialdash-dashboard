import { NextRequest, NextResponse } from 'next/server';

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
    console.error('Meta API Error:', JSON.stringify(error));
    throw new Error(`Meta API Error: ${response.status}`);
  }

  return response.json();
}

function getActionValue(actions: Array<{ action_type: string; value: string }> | undefined, actionType: string): number {
  if (!actions) return 0;
  const action = actions.find(a => a.action_type === actionType);
  return action ? parseInt(action.value) : 0;
}

function getActionCostValue(costs: Array<{ action_type: string; value: string }> | undefined, actionType: string): number {
  if (!costs) return 0;
  const cost = costs.find(c => c.action_type === actionType);
  return cost ? parseFloat(cost.value) : 0;
}

export const maxDuration = 60; // Vercel Pro: up to 60s

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);

  if (!META_ACCESS_TOKEN) {
    return NextResponse.json(
      { error: 'META_ACCESS_TOKEN not configured' },
      { status: 500 }
    );
  }

  const startDate = `${month}-01`;
  const endDate = new Date(
    new Date(startDate).getFullYear(),
    new Date(startDate).getMonth() + 1,
    0
  ).toISOString().slice(0, 10);

  try {
    // Step 1: Get all ad accounts
    const adAccountsResponse = await fetchMeta('/me/adaccounts', {
      fields: 'id,name,account_id,currency,account_status',
      limit: '100'
    });

    const adAccounts = (adAccountsResponse.data || []).filter(
      (a: any) => a.account_status === 1
    );

    // Step 2: Fetch account insights + campaigns WITH insights in parallel for all accounts
    const timeRange = JSON.stringify({ since: startDate, until: endDate });

    const accountPromises = adAccounts.map(async (account: any) => {
      try {
        // Parallel: account insights + campaigns with nested insights
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

        // Map campaign insights
        const campaigns = campaignInsights.map((insight: any) => ({
          id: insight.campaign_id,
          name: insight.campaign_name,
          status: 'ACTIVE', // from insights = had activity
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
            cost_per_lead: getActionCostValue(insight.cost_per_action_type, 'lead'),
            cost_per_conversion: getActionCostValue(insight.cost_per_action_type, 'offsite_conversion'),
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

    // Calculate totals
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

    // Sort campaigns by spend (highest first)
    allCampaigns.sort((a: any, b: any) => (b.insight?.spend || 0) - (a.insight?.spend || 0));

    return NextResponse.json({
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
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
      }
    });
  } catch (error: any) {
    console.error('Ads API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch ads data' },
      { status: 500 }
    );
  }
}
