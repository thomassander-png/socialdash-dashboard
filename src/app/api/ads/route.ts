import { NextRequest, NextResponse } from 'next/server';

const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const META_API_VERSION = process.env.META_API_VERSION || 'v21.0';
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

interface AdAccount {
  id: string;
  name: string;
  account_id: string;
  currency: string;
  account_status: number;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  daily_budget?: string;
  lifetime_budget?: string;
  insights?: {
    data: CampaignInsight[];
  };
}

interface CampaignInsight {
  campaign_name: string;
  impressions: string;
  reach: string;
  clicks: string;
  spend: string;
  cpc: string;
  cpm: string;
  ctr: string;
  actions?: Array<{ action_type: string; value: string }>;
  cost_per_action_type?: Array<{ action_type: string; value: string }>;
  date_start: string;
  date_stop: string;
}

interface AccountInsight {
  impressions: string;
  reach: string;
  clicks: string;
  spend: string;
  cpc: string;
  cpm: string;
  ctr: string;
  actions?: Array<{ action_type: string; value: string }>;
  date_start: string;
  date_stop: string;
}

async function fetchMeta(endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(`${META_BASE_URL}${endpoint}`);
  url.searchParams.set('access_token', META_ACCESS_TOKEN || '');
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url.toString(), {
    next: { revalidate: 300 } // Cache for 5 minutes
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error('Meta API Error:', error);
    throw new Error(`Meta API Error: ${response.status} - ${JSON.stringify(error)}`);
  }

  return response.json();
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);
  const customer = searchParams.get('customer');

  if (!META_ACCESS_TOKEN) {
    return NextResponse.json(
      { error: 'META_ACCESS_TOKEN not configured' },
      { status: 500 }
    );
  }

  // Calculate date range for the month
  const startDate = `${month}-01`;
  const endDate = new Date(
    new Date(startDate).getFullYear(),
    new Date(startDate).getMonth() + 1,
    0 // last day of month
  ).toISOString().slice(0, 10);

  try {
    // Step 1: Get all ad accounts
    const adAccountsResponse = await fetchMeta('/me/adaccounts', {
      fields: 'id,name,account_id,currency,account_status',
      limit: '100'
    });

    const adAccounts: AdAccount[] = adAccountsResponse.data || [];
    const activeAccounts = adAccounts.filter(a => a.account_status === 1);

    // Step 2: For each active ad account, get campaigns with insights
    const allCampaigns: any[] = [];
    const accountSummaries: any[] = [];

    for (const account of activeAccounts) {
      try {
        // Get account-level insights for the month
        const accountInsights = await fetchMeta(`/${account.id}/insights`, {
          fields: 'impressions,reach,clicks,spend,cpc,cpm,ctr,actions',
          time_range: JSON.stringify({
            since: startDate,
            until: endDate
          }),
          level: 'account'
        });

        const accountData = accountInsights.data?.[0] || null;

        // Get campaigns with insights
        const campaignsResponse = await fetchMeta(`/${account.id}/campaigns`, {
          fields: 'id,name,status,objective,daily_budget,lifetime_budget',
          limit: '100',
          filtering: JSON.stringify([{
            field: 'effective_status',
            operator: 'IN',
            value: ['ACTIVE', 'PAUSED', 'COMPLETED']
          }])
        });

        const campaigns: Campaign[] = campaignsResponse.data || [];

        // Get insights for each campaign
        for (const campaign of campaigns) {
          try {
            const insightsResponse = await fetchMeta(`/${campaign.id}/insights`, {
              fields: 'campaign_name,impressions,reach,clicks,spend,cpc,cpm,ctr,actions,cost_per_action_type',
              time_range: JSON.stringify({
                since: startDate,
                until: endDate
              })
            });

            const insight = insightsResponse.data?.[0];
            if (insight) {
              allCampaigns.push({
                ...campaign,
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
              });
            }
          } catch (e) {
            // Campaign might not have insights for this period
            console.log(`No insights for campaign ${campaign.id}`);
          }
        }

        if (accountData) {
          accountSummaries.push({
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
          });
        }
      } catch (e) {
        console.error(`Error fetching data for account ${account.id}:`, e);
      }
    }

    // Calculate totals
    const totals = {
      totalSpend: accountSummaries.reduce((sum, a) => sum + a.spend, 0),
      totalImpressions: accountSummaries.reduce((sum, a) => sum + a.impressions, 0),
      totalReach: accountSummaries.reduce((sum, a) => sum + a.reach, 0),
      totalClicks: accountSummaries.reduce((sum, a) => sum + a.clicks, 0),
      totalConversions: accountSummaries.reduce((sum, a) => sum + a.conversions, 0),
      totalLeads: accountSummaries.reduce((sum, a) => sum + a.leads, 0),
      avgCPC: accountSummaries.length > 0
        ? accountSummaries.reduce((sum, a) => sum + a.cpc, 0) / accountSummaries.length
        : 0,
      avgCPM: accountSummaries.length > 0
        ? accountSummaries.reduce((sum, a) => sum + a.cpm, 0) / accountSummaries.length
        : 0,
      avgCTR: accountSummaries.length > 0
        ? accountSummaries.reduce((sum, a) => sum + a.ctr, 0) / accountSummaries.length
        : 0,
    };

    // Sort campaigns by spend (highest first)
    allCampaigns.sort((a, b) => (b.insight?.spend || 0) - (a.insight?.spend || 0));

    return NextResponse.json({
      month,
      startDate,
      endDate,
      adAccounts: activeAccounts.map(a => ({
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
