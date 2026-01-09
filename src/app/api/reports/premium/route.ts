import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { generatePremiumReport, ReportData } from '@/lib/premium-report-generator';

// Types for database queries
interface CustomerRow {
  customer_id: string;
  name: string;
  slug: string;
}

interface AccountRow {
  account_id: string;
  platform: string;
}

interface FBMetricsRow {
  post_id: string;
  page_id: string;
  created_time: string;
  type: string;
  permalink: string;
  message: string;
  reactions_total: number;
  comments_total: number;
  shares_total: number;
  reach: number;
  impressions: number;
  video_3s_views: number;
  interactions_total: number;
  cached_image_url: string;
}

interface IGMetricsRow {
  media_id: string;
  account_id: string;
  timestamp: string;
  media_type: string;
  permalink: string;
  caption: string;
  likes: number;
  comments: number;
  saves: number;
  reach: number;
  impressions: number;
  plays: number;
  interactions_total: number;
  cached_image_url: string;
}

interface FBKPIRow {
  month: string;
  total_reach: number;
  total_impressions: number;
  total_interactions: number;
  total_reactions: number;
  total_comments: number;
  total_shares: number;
  total_video_views: number;
  post_count: number;
  avg_reach_per_post: number;
}

interface IGKPIRow {
  month: string;
  total_reach: number;
  total_impressions: number;
  total_interactions: number;
  total_likes: number;
  total_comments: number;
  total_saves: number;
  total_plays: number;
  post_count: number;
  avg_reach_per_post: number;
}

export async function POST(request: NextRequest) {
  try {
    const { customerId, month } = await request.json();

    if (!customerId || !month) {
      return NextResponse.json({ error: 'customerId and month are required' }, { status: 400 });
    }

    // Get customer info
    const customerResult = await query<CustomerRow>(
      `SELECT customer_id, name, slug FROM customers WHERE customer_id = $1`,
      [customerId]
    );

    if (customerResult.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const customer = customerResult[0];

    // Get assigned accounts
    const accountsResult = await query<AccountRow>(
      `SELECT account_id, platform FROM customer_accounts WHERE customer_id = $1`,
      [customerId]
    );

    const fbPageIds = accountsResult.filter(a => a.platform === 'facebook').map(a => a.account_id);
    const igAccountIds = accountsResult.filter(a => a.platform === 'instagram').map(a => a.account_id);

    // Calculate date ranges for 3 months
    const [year, monthNum] = month.split('-').map(Number);
    const currentMonth = `${year}-${String(monthNum).padStart(2, '0')}`;
    const prevMonth1 = monthNum === 1 
      ? `${year - 1}-12` 
      : `${year}-${String(monthNum - 1).padStart(2, '0')}`;
    const prevMonth2 = monthNum <= 2 
      ? `${year - 1}-${String(12 + monthNum - 2).padStart(2, '0')}` 
      : `${year}-${String(monthNum - 2).padStart(2, '0')}`;

    // Build report data
    const reportData: ReportData = {
      customer: {
        name: customer.name,
        slug: customer.slug,
      },
      month: currentMonth,
      prevMonth1,
      prevMonth2,
    };

    // ============ FACEBOOK DATA ============
    if (fbPageIds.length > 0) {
      const fbKPIs: NonNullable<ReportData['facebook']>['kpis'] = [];
      
      // Get Facebook KPIs for 3 months
      for (const m of [currentMonth, prevMonth1, prevMonth2]) {
        const kpiResult = await query<FBKPIRow>(`
          SELECT 
            '${m}' as month,
            COALESCE(SUM(reach), 0)::int as total_reach,
            COALESCE(SUM(impressions), 0)::int as total_impressions,
            COALESCE(SUM(reactions_total + comments_total), 0)::int as total_interactions,
            COALESCE(SUM(reactions_total), 0)::int as total_reactions,
            COALESCE(SUM(comments_total), 0)::int as total_comments,
            COALESCE(SUM(shares_total), 0)::int as total_shares,
            COALESCE(SUM(video_3s_views), 0)::int as total_video_views,
            COUNT(DISTINCT post_id)::int as post_count,
            CASE WHEN COUNT(DISTINCT post_id) > 0 
              THEN (COALESCE(SUM(reach), 0) / COUNT(DISTINCT post_id))::int 
              ELSE 0 END as avg_reach_per_post
          FROM view_fb_monthly_post_metrics
          WHERE page_id = ANY($1) AND month = $2::date
        `, [fbPageIds, `${m}-01`]);
        
        if (kpiResult.length > 0) {
          const kpi = kpiResult[0];
          fbKPIs.push({
            month: m,
            reach: kpi.total_reach,
            impressions: kpi.total_impressions,
            interactions: kpi.total_interactions,
            reactions: kpi.total_reactions,
            comments: kpi.total_comments,
            shares: kpi.total_shares,
            videoViews: kpi.total_video_views,
            postCount: kpi.post_count,
            avgReach: kpi.avg_reach_per_post,
          });
        }
      }

      // Get top Facebook posts (images) by interactions
      const fbPostsResult = await query<FBMetricsRow>(`
        SELECT 
          m.post_id, m.page_id, m.created_time, m.type, m.permalink, m.message,
          m.reactions_total, m.comments_total, COALESCE(m.shares_total, 0) as shares_total,
          COALESCE(m.reach, 0) as reach, COALESCE(m.impressions, 0) as impressions,
          COALESCE(m.video_3s_views, 0) as video_3s_views,
          (COALESCE(m.reactions_total, 0) + COALESCE(m.comments_total, 0)) as interactions_total,
          COALESCE(u.cached_url, '') as cached_image_url
        FROM view_fb_monthly_post_metrics m
        LEFT JOIN fb_media_urls u ON m.post_id = u.post_id
        WHERE m.page_id = ANY($1) 
          AND m.month = $2::date
          AND m.type IN ('photo', 'link', 'status')
        ORDER BY interactions_total DESC
        LIMIT 10
      `, [fbPageIds, `${currentMonth}-01`]);

      const fbPosts = fbPostsResult.map(p => ({
        postId: p.post_id,
        date: p.created_time,
        type: p.type,
        message: p.message || '',
        reactions: p.reactions_total,
        comments: p.comments_total,
        shares: p.shares_total,
        reach: p.reach,
        impressions: p.impressions,
        videoViews: p.video_3s_views,
        interactions: p.interactions_total,
        imageUrl: p.cached_image_url,
      }));

      // Get top Facebook videos
      const fbVideosResult = await query<FBMetricsRow>(`
        SELECT 
          m.post_id, m.page_id, m.created_time, m.type, m.permalink, m.message,
          m.reactions_total, m.comments_total, COALESCE(m.shares_total, 0) as shares_total,
          COALESCE(m.reach, 0) as reach, COALESCE(m.impressions, 0) as impressions,
          COALESCE(m.video_3s_views, 0) as video_3s_views,
          (COALESCE(m.reactions_total, 0) + COALESCE(m.comments_total, 0)) as interactions_total,
          COALESCE(u.cached_url, '') as cached_image_url
        FROM view_fb_monthly_post_metrics m
        LEFT JOIN fb_media_urls u ON m.post_id = u.post_id
        WHERE m.page_id = ANY($1) 
          AND m.month = $2::date
          AND m.type = 'video'
        ORDER BY video_3s_views DESC
        LIMIT 10
      `, [fbPageIds, `${currentMonth}-01`]);

      const fbVideos = fbVideosResult.map(v => ({
        postId: v.post_id,
        date: v.created_time,
        message: v.message || '',
        videoViews: v.video_3s_views,
        reach: v.reach,
        interactions: v.interactions_total,
        imageUrl: v.cached_image_url,
      }));

      reportData.facebook = {
        kpis: fbKPIs,
        posts: fbPosts,
        videos: fbVideos,
      };
    }

    // ============ INSTAGRAM DATA ============
    if (igAccountIds.length > 0) {
      const igKPIs: NonNullable<ReportData['instagram']>['kpis'] = [];
      
      // Get Instagram KPIs for 3 months
      for (const m of [currentMonth, prevMonth1, prevMonth2]) {
        const kpiResult = await query<IGKPIRow>(`
          SELECT 
            '${m}' as month,
            COALESCE(SUM(reach), 0)::int as total_reach,
            COALESCE(SUM(impressions), 0)::int as total_impressions,
            COALESCE(SUM(likes + comments + saves), 0)::int as total_interactions,
            COALESCE(SUM(likes), 0)::int as total_likes,
            COALESCE(SUM(comments), 0)::int as total_comments,
            COALESCE(SUM(saves), 0)::int as total_saves,
            COALESCE(SUM(plays), 0)::int as total_plays,
            COUNT(DISTINCT media_id)::int as post_count,
            CASE WHEN COUNT(DISTINCT media_id) > 0 
              THEN (COALESCE(SUM(reach), 0) / COUNT(DISTINCT media_id))::int 
              ELSE 0 END as avg_reach_per_post
          FROM view_ig_monthly_post_metrics
          WHERE account_id = ANY($1) AND month = $2::date
        `, [igAccountIds, `${m}-01`]);
        
        if (kpiResult.length > 0) {
          const kpi = kpiResult[0];
          igKPIs.push({
            month: m,
            reach: kpi.total_reach,
            impressions: kpi.total_impressions,
            interactions: kpi.total_interactions,
            likes: kpi.total_likes,
            comments: kpi.total_comments,
            saves: kpi.total_saves,
            plays: kpi.total_plays,
            postCount: kpi.post_count,
            avgReach: kpi.avg_reach_per_post,
          });
        }
      }

      // Get top Instagram posts (images)
      const igPostsResult = await query<IGMetricsRow>(`
        SELECT 
          m.media_id, m.account_id, m.timestamp, m.media_type, m.permalink, m.caption,
          COALESCE(m.likes, 0) as likes, COALESCE(m.comments, 0) as comments,
          COALESCE(m.saves, 0) as saves, COALESCE(m.reach, 0) as reach,
          COALESCE(m.impressions, 0) as impressions, COALESCE(m.plays, 0) as plays,
          (COALESCE(m.likes, 0) + COALESCE(m.comments, 0) + COALESCE(m.saves, 0)) as interactions_total,
          COALESCE(u.cached_url, '') as cached_image_url
        FROM view_ig_monthly_post_metrics m
        LEFT JOIN ig_media_urls u ON m.media_id = u.media_id
        WHERE m.account_id = ANY($1) 
          AND m.month = $2::date
          AND m.media_type IN ('IMAGE', 'CAROUSEL_ALBUM')
        ORDER BY interactions_total DESC
        LIMIT 10
      `, [igAccountIds, `${currentMonth}-01`]);

      const igPosts = igPostsResult.map(p => ({
        mediaId: p.media_id,
        date: p.timestamp,
        type: p.media_type,
        caption: p.caption || '',
        likes: p.likes,
        comments: p.comments,
        saves: p.saves,
        reach: p.reach,
        impressions: p.impressions,
        plays: p.plays,
        interactions: p.interactions_total,
        imageUrl: p.cached_image_url,
      }));

      // Get top Instagram reels
      const igReelsResult = await query<IGMetricsRow>(`
        SELECT 
          m.media_id, m.account_id, m.timestamp, m.media_type, m.permalink, m.caption,
          COALESCE(m.likes, 0) as likes, COALESCE(m.comments, 0) as comments,
          COALESCE(m.saves, 0) as saves, COALESCE(m.reach, 0) as reach,
          COALESCE(m.impressions, 0) as impressions, COALESCE(m.plays, 0) as plays,
          (COALESCE(m.likes, 0) + COALESCE(m.comments, 0) + COALESCE(m.saves, 0)) as interactions_total,
          COALESCE(u.cached_url, '') as cached_image_url
        FROM view_ig_monthly_post_metrics m
        LEFT JOIN ig_media_urls u ON m.media_id = u.media_id
        WHERE m.account_id = ANY($1) 
          AND m.month = $2::date
          AND m.media_type IN ('VIDEO', 'REELS')
        ORDER BY plays DESC
        LIMIT 10
      `, [igAccountIds, `${currentMonth}-01`]);

      const igReels = igReelsResult.map(r => ({
        mediaId: r.media_id,
        date: r.timestamp,
        caption: r.caption || '',
        plays: r.plays,
        likes: r.likes,
        comments: r.comments,
        saves: r.saves,
        reach: r.reach,
        interactions: r.interactions_total,
        imageUrl: r.cached_image_url,
      }));

      reportData.instagram = {
        kpis: igKPIs,
        posts: igPosts,
        reels: igReels,
      };
    }

    // Generate premium report
    const pptxBuffer = await generatePremiumReport(reportData);

    return new NextResponse(new Uint8Array(pptxBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${customer.slug}_${currentMonth}_premium_report.pptx"`,
      },
    });

  } catch (error) {
    console.error('Premium report generation error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate premium report', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
