import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import PptxGenJS from 'pptxgenjs';
import {
  generateReport,
  SLIDE_REGISTRY,
  AGENCY,
  DEFAULT_REPORT_CONFIG,
} from '@/lib/report-slides';
import type {
  CustomerData,
  PostData,
  MonthlyKPI,
  MonthlyAdData,
  SlideContext,
  ReportConfig,
} from '@/lib/report-slides/types';
import { sanitizeFilename, getMonthName, prefetchImages } from '@/lib/report-slides/helpers';

// ============================================
// DATA FETCHING FUNCTIONS
// ============================================

async function getCustomerData(customerId: string): Promise<CustomerData | null> {
  let result = await query<CustomerData>(`
    SELECT customer_id, name, LOWER(REPLACE(name, ' ', '-')) as slug,
      logo_url, primary_color, is_active
    FROM customers WHERE customer_id::text = $1 LIMIT 1
  `, [customerId]);

  if (!result[0]) {
    result = await query<CustomerData>(`
      SELECT customer_id, name, LOWER(REPLACE(name, ' ', '-')) as slug,
        logo_url, primary_color, is_active
      FROM customers WHERE LOWER(REPLACE(name, ' ', '-')) = LOWER($1) LIMIT 1
    `, [customerId]);
  }
  return result[0] || null;
}

async function getPageIds(customerId: string, platform: 'facebook' | 'instagram'): Promise<string[]> {
  const result = await query<{ account_id: string }>(`
    SELECT ca.account_id FROM customer_accounts ca
    WHERE ca.customer_id = $1 AND ca.platform = $2
  `, [customerId, platform]);
  return result.map(r => r.account_id);
}

async function getFacebookPosts(month: string, pageIds: string[]): Promise<PostData[]> {
  if (pageIds.length === 0) return [];
  const startDate = `${month}-01`;
  const placeholders = pageIds.map((_, i) => `$${i + 3}`).join(', ');
  return query<PostData>(`
    SELECT p.post_id, p.message, p.created_time, p.type, p.permalink,
      COALESCE(m.reactions_total, 0) as reactions_total,
      COALESCE(m.comments_total, 0) as comments_total,
      m.shares_total, m.reach, m.impressions, m.video_3s_views, p.thumbnail_url
    FROM fb_posts p
    LEFT JOIN LATERAL (
      SELECT * FROM fb_post_metrics WHERE post_id = p.post_id ORDER BY snapshot_time DESC LIMIT 1
    ) m ON true
    WHERE p.page_id IN (${placeholders})
      AND p.created_time >= $1 AND p.created_time < $2::date + interval '1 month'
    ORDER BY p.created_time DESC
  `, [startDate, startDate, ...pageIds]);
}

async function getInstagramPosts(month: string, pageIds: string[]): Promise<PostData[]> {
  if (pageIds.length === 0) return [];
  const startDate = `${month}-01`;
  const endDate = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() + 1, 1).toISOString().slice(0, 10);
  const placeholders = pageIds.map((_, i) => `$${i + 3}`).join(', ');
  try {
    return await query<PostData>(`
      SELECT p.media_id as post_id, p.caption as message, p.timestamp as created_time,
        p.media_type as type, p.permalink,
        COALESCE(m.likes, 0) as reactions_total,
        COALESCE(m.comments, 0) as comments_total,
        NULL as shares_total, m.reach, m.impressions,
        NULL as video_3s_views,
        COALESCE(p.thumbnail_url, p.media_url) as thumbnail_url,
        p.media_url as media_url,
        COALESCE(m.saves, 0) as saves
      FROM ig_posts p
      LEFT JOIN LATERAL (
        SELECT * FROM ig_post_metrics WHERE media_id = p.media_id ORDER BY snapshot_time DESC LIMIT 1
      ) m ON true
      WHERE p.account_id IN (${placeholders})
        AND p.timestamp::date >= $1::date AND p.timestamp::date < $2::date
      ORDER BY (COALESCE(m.likes, 0) + COALESCE(m.comments, 0)) DESC
    `, [startDate, endDate, ...pageIds]);
  } catch (error) {
    console.error('Error fetching Instagram posts:', error);
    return [];
  }
}

async function getFollowerData(months: string[], pageIds: string[], platform: 'facebook' | 'instagram'): Promise<{month: string, followers: number}[]> {
  if (pageIds.length === 0) return months.map(m => ({ month: m, followers: 0 }));
  const table = platform === 'facebook' ? 'fb_follower_snapshots' : 'ig_follower_history';
  const idCol = platform === 'facebook' ? 'page_id' : 'account_id';
  const dateCol = platform === 'facebook' ? 'snapshot_time' : 'snapshot_date';
  const placeholders = pageIds.map((_, i) => `$${i + 2}`).join(', ');
  const results: {month: string, followers: number}[] = [];
  for (const month of months) {
    try {
      const result = await query<{ followers: string }>(`
        SELECT COALESCE(MAX(followers_count), 0) as followers
        FROM ${table}
        WHERE ${idCol} IN (${placeholders})
          AND ${dateCol} <= $1::date + interval '1 month'
      `, [month + '-01', ...pageIds]);
      results.push({ month, followers: parseInt(result[0]?.followers || '0') || 0 });
    } catch {
      results.push({ month, followers: 0 });
    }
  }
  return results;
}

async function getMonthlyKPIs(months: string[], pageIds: string[], platform: 'facebook' | 'instagram'): Promise<MonthlyKPI[]> {
  if (pageIds.length === 0) {
    return months.map(m => ({
      month: m, posts_count: 0, total_reactions: 0, total_comments: 0, total_shares: 0,
      total_reach: 0, total_impressions: 0, total_video_views: 0, total_saves: 0,
      avg_reach: 0, engagement_rate: 0, followers: 0, new_followers: 0
    }));
  }
  const followerData = await getFollowerData(months, pageIds, platform);
  const kpis: MonthlyKPI[] = [];
  const placeholders = pageIds.map((_, i) => `$${i + 2}`).join(', ');
  for (let idx = 0; idx < months.length; idx++) {
    const month = months[idx];
    const startDate = `${month}-01`;
    try {
      if (platform === 'facebook') {
        const result = await query<any>(`
          SELECT COUNT(DISTINCT p.post_id) as posts_count,
            COALESCE(SUM(m.reactions_total), 0) as total_reactions,
            COALESCE(SUM(m.comments_total), 0) as total_comments,
            COALESCE(SUM(m.shares_total), 0) as total_shares,
            COALESCE(SUM(m.reach), 0) as total_reach,
            COALESCE(SUM(m.impressions), 0) as total_impressions,
            COALESCE(SUM(m.video_3s_views), 0) as total_video_views
          FROM fb_posts p
          LEFT JOIN LATERAL (
            SELECT * FROM fb_post_metrics WHERE post_id = p.post_id ORDER BY snapshot_time DESC LIMIT 1
          ) m ON true
          WHERE p.page_id IN (${placeholders})
            AND p.created_time >= $1::date AND p.created_time < $1::date + interval '1 month'
        `, [startDate, ...pageIds]);
        const d = result[0];
        const postsCount = parseInt(d.posts_count) || 0;
        const totalReach = parseInt(d.total_reach) || 0;
        const totalReactions = parseInt(d.total_reactions) || 0;
        const totalComments = parseInt(d.total_comments) || 0;
        const totalShares = parseInt(d.total_shares) || 0;
        const followers = followerData[idx]?.followers || 0;
        const prevFollowers = idx > 0 ? followerData[idx - 1]?.followers || 0 : followers;
        kpis.push({
          month, posts_count: postsCount,
          total_reactions: totalReactions, total_comments: totalComments, total_shares: totalShares,
          total_reach: totalReach, total_impressions: parseInt(d.total_impressions) || 0,
          total_video_views: parseInt(d.total_video_views) || 0, total_saves: 0,
          avg_reach: postsCount > 0 ? Math.round(totalReach / postsCount) : 0,
          engagement_rate: totalReach > 0 ? ((totalReactions + totalComments + totalShares) / totalReach) * 100 : 0,
          followers, new_followers: followers - prevFollowers
        });
      } else {
        const result = await query<any>(`
          SELECT COUNT(DISTINCT p.media_id) as posts_count,
            COALESCE(SUM(m.likes), 0) as total_reactions,
            COALESCE(SUM(m.comments), 0) as total_comments,
            COALESCE(SUM(m.reach), 0) as total_reach,
            COALESCE(SUM(m.impressions), 0) as total_impressions,
            0 as total_video_views,
            COALESCE(SUM(m.saves), 0) as total_saves
          FROM ig_posts p
          LEFT JOIN LATERAL (
            SELECT * FROM ig_post_metrics WHERE media_id = p.media_id ORDER BY snapshot_time DESC LIMIT 1
          ) m ON true
          WHERE p.account_id IN (${placeholders})
            AND p.timestamp >= $1::date AND p.timestamp < $1::date + interval '1 month'
        `, [startDate, ...pageIds]);
        const d = result[0];
        const postsCount = parseInt(d.posts_count) || 0;
        const totalReach = parseInt(d.total_reach) || 0;
        const totalReactions = parseInt(d.total_reactions) || 0;
        const totalComments = parseInt(d.total_comments) || 0;
        const totalSaves = parseInt(d.total_saves) || 0;
        const followers = followerData[idx]?.followers || 0;
        const prevFollowers = idx > 0 ? followerData[idx - 1]?.followers || 0 : followers;
        kpis.push({
          month, posts_count: postsCount,
          total_reactions: totalReactions, total_comments: totalComments, total_shares: 0,
          total_reach: totalReach, total_impressions: parseInt(d.total_impressions) || 0,
          total_video_views: parseInt(d.total_video_views) || 0, total_saves: totalSaves,
          avg_reach: postsCount > 0 ? Math.round(totalReach / postsCount) : 0,
          engagement_rate: totalReach > 0 ? ((totalReactions + totalComments + totalSaves) / totalReach) * 100 : 0,
          followers, new_followers: followers - prevFollowers
        });
      }
    } catch (error) {
      console.error(`Error fetching KPIs for ${month}:`, error);
      kpis.push({
        month, posts_count: 0, total_reactions: 0, total_comments: 0, total_shares: 0,
        total_reach: 0, total_impressions: 0, total_video_views: 0, total_saves: 0,
        avg_reach: 0, engagement_rate: 0, followers: followerData[idx]?.followers || 0, new_followers: 0
      });
    }
  }
  return kpis;
}

// ============================================
// ADS DATA PROCESSING
// ============================================

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

const CAMPAIGN_CUSTOMER_OVERRIDES: { pattern: RegExp; customerSlug: string }[] = [
  { pattern: /herlitz/i, customerSlug: 'herlitz' },
  { pattern: /famefact.*reach.*herlitz|herlitz.*schulranzen/i, customerSlug: 'herlitz' },
];

function getCampaignCustomer(campaign: any): string {
  for (const override of CAMPAIGN_CUSTOMER_OVERRIDES) {
    if (override.pattern.test(campaign.name || '')) return override.customerSlug;
  }
  return AD_ACCOUNT_MAP[campaign.account_id] || 'unknown';
}

function getCampaignPlatform(campaign: any): 'facebook' | 'instagram' | 'unknown' {
  const name = (campaign.name || campaign.campaign_name || '').toUpperCase();
  if (name.startsWith('FB_') || name.includes('FACEBOOK')) return 'facebook';
  if (name.startsWith('IG_') || name.includes('INSTAGRAM')) return 'instagram';
  return 'unknown';
}

function getCampaignMonth(campaign: any): string | null {
  const name = campaign.name || campaign.campaign_name || '';
  const dateMatch = name.match(/(\d{2})\.(\d{2})\.(\d{2})/);
  if (dateMatch) {
    const [, , monthNum, yearShort] = dateMatch;
    return `20${yearShort}-${monthNum}`;
  }
  const monthMatch = name.match(/(\d{2})\/(\d{2,4})/);
  if (monthMatch) {
    const [, monthNum, yearPart] = monthMatch;
    const year = yearPart.length === 2 ? `20${yearPart}` : yearPart;
    return `${year}-${monthNum}`;
  }
  return null;
}

function filterCampaignsByMonth(campaigns: any[], reportMonth: string): any[] {
  return campaigns.filter(c => {
    const campaignMonth = getCampaignMonth(c);
    if (campaignMonth) return campaignMonth === reportMonth;
    return true;
  });
}

function getLocalCampaignMetric(campaign: any, metric: string): number {
  if (campaign.insights?.data?.[0]) {
    const ins = campaign.insights.data[0];
    if (metric === 'spend') return parseFloat(ins.spend || '0');
    if (metric === 'impressions') return parseInt(ins.impressions || '0');
    if (metric === 'reach') return parseInt(ins.reach || '0');
    if (metric === 'clicks') return parseInt(ins.clicks || '0');
    if (metric === 'post_engagement' || metric === 'video_views' || metric === 'link_clicks') {
      const actions = ins.actions || [];
      const action = actions.find((a: any) => a.action_type === metric);
      return action ? parseInt(action.value || '0') : 0;
    }
  }
  const insight = campaign.insight || {};
  return parseFloat(insight[metric]) || parseFloat(campaign[metric]) || 0;
}

function processAdsData(months: string[], adsResults: any[], customerSlug: string): MonthlyAdData[] {
  const latestAdsData = (adsResults[2] as any[])?.[0]?.data || (adsResults[1] as any[])?.[0]?.data || (adsResults[0] as any[])?.[0]?.data || { campaigns: [] };
  const allCustomerCampaigns = (latestAdsData.campaigns || []).filter((c: any) => getCampaignCustomer(c) === customerSlug);

  return months.map((m, idx) => {
    const customerCampaigns = filterCampaignsByMonth(allCustomerCampaigns, m);
    const monthAdsData = (adsResults[idx] as any[])?.[0]?.data || { campaigns: [] };
    const monthSpecificCampaigns = (monthAdsData.campaigns || []).filter((c: any) =>
      getCampaignCustomer(c) === customerSlug && getCampaignMonth(c) === null
    );
    const mergedCampaigns = [
      ...customerCampaigns.filter((c: any) => getCampaignMonth(c) !== null),
      ...monthSpecificCampaigns,
    ];
    const seen = new Set<string>();
    const dedupedCampaigns = mergedCampaigns.filter((c: any) => {
      const id = c.id || c.campaign_id || c.name;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    const fbCampaigns = dedupedCampaigns.filter((c: any) => getCampaignPlatform(c) === 'facebook');
    const igCampaigns = dedupedCampaigns.filter((c: any) => getCampaignPlatform(c) === 'instagram');
    const unknownCampaigns = dedupedCampaigns.filter((c: any) => getCampaignPlatform(c) === 'unknown');
    const calcTotal = (camps: any[], metric: string) =>
      camps.reduce((sum: number, c: any) => sum + getLocalCampaignMetric(c, metric), 0);

    return {
      month: m, campaigns: dedupedCampaigns,
      fbCampaigns: [...fbCampaigns, ...unknownCampaigns], igCampaigns,
      totalSpend: calcTotal(dedupedCampaigns, 'spend'),
      fbSpend: calcTotal([...fbCampaigns, ...unknownCampaigns], 'spend'),
      igSpend: calcTotal(igCampaigns, 'spend'),
      totalImpressions: calcTotal(dedupedCampaigns, 'impressions'),
      fbImpressions: calcTotal([...fbCampaigns, ...unknownCampaigns], 'impressions'),
      igImpressions: calcTotal(igCampaigns, 'impressions'),
      totalReach: calcTotal(dedupedCampaigns, 'reach'),
      fbReach: calcTotal([...fbCampaigns, ...unknownCampaigns], 'reach'),
      igReach: calcTotal(igCampaigns, 'reach'),
      totalClicks: calcTotal(dedupedCampaigns, 'clicks'),
      fbClicks: calcTotal([...fbCampaigns, ...unknownCampaigns], 'clicks'),
      igClicks: calcTotal(igCampaigns, 'clicks'),
      totalEngagement: calcTotal(dedupedCampaigns, 'post_engagement'),
      fbEngagement: calcTotal([...fbCampaigns, ...unknownCampaigns], 'post_engagement'),
      igEngagement: calcTotal(igCampaigns, 'post_engagement'),
      totalVideoViews: calcTotal(dedupedCampaigns, 'video_views'),
      fbVideoViews: calcTotal([...fbCampaigns, ...unknownCampaigns], 'video_views'),
      igVideoViews: calcTotal(igCampaigns, 'video_views'),
      totalLinkClicks: calcTotal(dedupedCampaigns, 'link_clicks'),
      fbLinkClicks: calcTotal([...fbCampaigns, ...unknownCampaigns], 'link_clicks'),
      igLinkClicks: calcTotal(igCampaigns, 'link_clicks'),
    };
  });
}

// ============================================
// MAIN REPORT ENDPOINT
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const { customerId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);

    // Parse config from query parameter (sent from frontend localStorage)
    let config: ReportConfig = { ...DEFAULT_REPORT_CONFIG };
    const configParam = searchParams.get('config');
    if (configParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(configParam));
        config = {
          platforms: { ...DEFAULT_REPORT_CONFIG.platforms, ...parsed.platforms },
          slides: { ...DEFAULT_REPORT_CONFIG.slides, ...parsed.slides },
          kpis: { ...DEFAULT_REPORT_CONFIG.kpis, ...parsed.kpis },
          notes: parsed.notes || '',
        };
      } catch (e) {
        console.warn('Failed to parse config, using defaults:', e);
      }
    }

    // Get customer data
    const customer = await getCustomerData(customerId);
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const primaryColor = customer.primary_color?.replace('#', '') || AGENCY.colors.primary;
    const secondaryColor = AGENCY.colors.secondary;

    // Get page IDs
    const fbPageIds = await getPageIds(customer.customer_id, 'facebook');
    const igPageIds = await getPageIds(customer.customer_id, 'instagram');
    console.log(`[Report] Customer: ${customer.name}, FB Pages: ${fbPageIds.length}, IG Pages: ${igPageIds.length}`);

    // Calculate 3-month range
    const currentDate = new Date(month + '-01');
    const months = [
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 2, 1).toISOString().slice(0, 7),
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1).toISOString().slice(0, 7),
      month
    ];

    // Fetch all data (only fetch what's needed based on config)
    const emptyKpis = months.map(m => ({
      month: m, posts_count: 0, total_reactions: 0, total_comments: 0, total_shares: 0,
      total_reach: 0, total_impressions: 0, total_video_views: 0, total_saves: 0,
      avg_reach: 0, engagement_rate: 0, followers: 0, new_followers: 0
    }));

    const [fbPosts, fbKpis, igPosts, igKpis, ...adsResults] = await Promise.all([
      config.platforms.facebook ? getFacebookPosts(month, fbPageIds) : Promise.resolve([]),
      config.platforms.facebook ? getMonthlyKPIs(months, fbPageIds, 'facebook') : Promise.resolve(emptyKpis),
      config.platforms.instagram ? getInstagramPosts(month, igPageIds) : Promise.resolve([]),
      config.platforms.instagram ? getMonthlyKPIs(months, igPageIds, 'instagram') : Promise.resolve(emptyKpis),
      ...months.map(m => query<{ data: any }>('SELECT data FROM ads_cache WHERE month = $1', [m]).catch(() => [])),
    ]);

    // Process ads data
    const emptyAds = months.map(m => ({
      month: m, campaigns: [], fbCampaigns: [], igCampaigns: [],
      totalSpend: 0, fbSpend: 0, igSpend: 0,
      totalImpressions: 0, fbImpressions: 0, igImpressions: 0,
      totalReach: 0, fbReach: 0, igReach: 0,
      totalClicks: 0, fbClicks: 0, igClicks: 0,
      totalEngagement: 0, fbEngagement: 0, igEngagement: 0,
      totalVideoViews: 0, fbVideoViews: 0, igVideoViews: 0,
      totalLinkClicks: 0, fbLinkClicks: 0, igLinkClicks: 0,
    }));

    const monthlyAdsData = config.platforms.ads
      ? processAdsData(months, adsResults, customer.slug)
      : emptyAds;

    console.log(`[Report] FB Posts: ${fbPosts.length}, IG Posts: ${igPosts.length}, Ads: ${monthlyAdsData[2]?.campaigns?.length || 0}`);
    console.log(`[Report] Enabled slides:`, Object.entries(config.slides).filter(([, v]) => v).map(([k]) => k).join(', '));

    // Create PowerPoint
    const pptx = new PptxGenJS();
    pptx.author = 'famefact GmbH';
    pptx.title = `${customer.name} Social Media Report - ${getMonthName(month)}`;
    pptx.company = 'famefact GmbH';
    pptx.layout = 'LAYOUT_16x9';

    // Pre-fetch all images as base64 for reliable embedding
    // Use the image-proxy for post images (handles expired CDN URLs automatically)
    const baseUrl = request.url.split('/api/')[0];
    const imageUrls: string[] = [];
    const proxyUrlMap = new Map<string, string>(); // maps proxy URL -> original thumbnail_url
    
    if (customer.logo_url) imageUrls.push(customer.logo_url);
    
    // For FB post images, use the image-proxy which handles expired CDN URLs
    for (const post of (fbPosts as PostData[])) {
      if (post.thumbnail_url && post.post_id) {
        const proxyUrl = `${baseUrl}/api/image-proxy?id=${encodeURIComponent(post.post_id)}&platform=facebook`;
        imageUrls.push(proxyUrl);
        proxyUrlMap.set(proxyUrl, post.thumbnail_url);
      }
    }
    // For IG post images, use the image-proxy too (same approach as FB - handles expired CDN URLs)
    for (const post of (igPosts as any[])) {
      if (post.post_id) {
        const proxyUrl = `${baseUrl}/api/image-proxy?id=${encodeURIComponent(post.post_id)}&platform=instagram`;
        imageUrls.push(proxyUrl);
        if (post.thumbnail_url) {
          proxyUrlMap.set(proxyUrl, post.thumbnail_url);
        }
      }
    }
    
    console.log(`[Report] Pre-fetching ${imageUrls.length} images via proxy...`);
    const rawCache = await prefetchImages(imageUrls);
    
    // Map proxy URLs back to original thumbnail_urls so slide modules can find them
    const imageCache = new Map<string, string>();
    for (const [url, data] of rawCache) {
      imageCache.set(url, data);
      // Also map the original thumbnail_url to the same data
      const originalUrl = proxyUrlMap.get(url);
      if (originalUrl && !imageCache.has(originalUrl)) {
        imageCache.set(originalUrl, data);
      }
    }
    // Also add logo if it was fetched
    if (customer.logo_url && rawCache.has(customer.logo_url)) {
      imageCache.set(customer.logo_url, rawCache.get(customer.logo_url)!);
    }
    
    console.log(`[Report] Successfully cached ${imageCache.size} images (${rawCache.size} unique fetches)`);

    // Build slide context
    const ctx: SlideContext = {
      pptx, customer, month, months,
      primaryColor, secondaryColor,
      fbPosts: fbPosts as PostData[],
      igPosts: igPosts as PostData[],
      fbKpis: fbKpis as MonthlyKPI[],
      igKpis: igKpis as MonthlyKPI[],
      monthlyAdsData: monthlyAdsData as MonthlyAdData[],
      pageNumber: 1,
      config,
      imageCache,
    };

    // Generate all slides based on config
    const slideCount = generateReport(ctx);
    console.log(`[Report] Generated ${slideCount} slides for ${customer.name}`);

    // Generate file
    const buffer = await pptx.write({ outputType: 'nodebuffer' }) as Buffer;
    const [year, monthNum] = month.split('-');
    const monthNames = ['Januar', 'Februar', 'Maerz', 'April', 'Mai', 'Juni',
                        'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
    const monthName = monthNames[parseInt(monthNum) - 1];
    const safeCustomerName = sanitizeFilename(customer.name);
    const filename = `${safeCustomerName}_Social_Media_Report_${monthName}_${year}.pptx`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json({ error: 'Failed to generate report', details: String(error) }, { status: 500 });
  }
}

// ============================================
// METADATA ENDPOINT: List available slides
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (body.action === 'list-slides') {
      const slides = SLIDE_REGISTRY.map(s => ({
        id: s.id, name: s.name, description: s.description,
        platform: s.platform, category: s.category, order: s.order,
      }));
      return NextResponse.json({ slides, defaultConfig: DEFAULT_REPORT_CONFIG });
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process request', details: String(error) }, { status: 500 });
  }
}
