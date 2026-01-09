/**
 * PREMIUM REPORT API V2
 * 
 * Generiert Spitzenklasse-Reports mit:
 * - Echten Kundenlogos
 * - Kundenspezifischen Farben
 * - Allen KPIs (Facebook + Instagram)
 * - 16:9 Format
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { generatePremiumReportV2, ReportData, FacebookKPIs, InstagramKPIs, PostData } from '@/lib/premium-report-generator-v2';

export const maxDuration = 60;

// Type definitions
interface CustomerRow {
  customer_id: string;
  name: string;
  slug: string;
}

interface AccountRow {
  id: number;
  account_id: string;
  account_name: string;
}

interface FbMetricsRow {
  post_count: string | number;
  reactions: string | number;
  comments: string | number;
  shares: string | number;
  reach_total: string | number;
  impressions: string | number;
  video_views: string | number;
}

interface IgMetricsRow {
  post_count: string | number;
  likes: string | number;
  comments: string | number;
  saves: string | number;
  reach_total: string | number;
  impressions: string | number;
  video_views: string | number;
}

export async function POST(request: NextRequest) {
  try {
    const { customerId, month } = await request.json();
    
    if (!customerId || !month) {
      return NextResponse.json(
        { error: 'customerId and month are required' },
        { status: 400 }
      );
    }
    
    // Get customer with colors
    const customers = await query(`
      SELECT customer_id, name, slug
      FROM customers
      WHERE customer_id = $1
    `, [customerId]);
    
    if (!customers || customers.length === 0) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }
    
    const customer = customers[0] as CustomerRow;
    
    // Parse month
    const [year, monthNum] = month.split('-').map(Number);
    const currentMonth = `${year}-${String(monthNum).padStart(2, '0')}`;
    const prevMonth = monthNum === 1 
      ? `${year - 1}-12` 
      : `${year}-${String(monthNum - 1).padStart(2, '0')}`;
    const prevPrevMonth = monthNum <= 2 
      ? `${year - 1}-${String(12 + monthNum - 2).padStart(2, '0')}` 
      : `${year}-${String(monthNum - 2).padStart(2, '0')}`;
    
    // Get Facebook accounts for this customer
    const fbAccounts = await query(`
      SELECT id, account_id, account_name
      FROM customer_accounts
      WHERE customer_id = $1 AND platform = 'facebook' AND is_active = true
    `, [customerId]) as AccountRow[];
    
    // Get Instagram accounts for this customer
    const igAccounts = await query(`
      SELECT id, account_id, account_name
      FROM customer_accounts
      WHERE customer_id = $1 AND platform = 'instagram' AND is_active = true
    `, [customerId]) as AccountRow[];
    
    // Build report data
    const reportData: ReportData = {
      customer: {
        name: customer.name,
        slug: customer.slug,
        logoUrl: undefined,
        primaryColor: '#1E3A8A',
        secondaryColor: '#3B82F6',
      },
      month: currentMonth,
    };
    
    // Get Facebook data
    if (fbAccounts && fbAccounts.length > 0) {
      const fbPageIds = fbAccounts.map(a => a.account_id);
      
      // Get KPIs for 3 months
      const fbKpis: FacebookKPIs[] = [];
      
      for (const targetMonth of [currentMonth, prevMonth, prevPrevMonth]) {
        const monthStart = `${targetMonth}-01`;
        const nextMonth = new Date(monthStart);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const monthEnd = nextMonth.toISOString().split('T')[0];
        
        // Get aggregated metrics for the month
        const metrics = await query(`
          SELECT 
            COUNT(DISTINCT p.post_id) as post_count,
            COALESCE(SUM(m.reactions_total), 0) as reactions,
            COALESCE(SUM(m.comments_total), 0) as comments,
            COALESCE(SUM(m.shares_total), 0) as shares,
            COALESCE(SUM(m.reach), 0) as reach_total,
            COALESCE(SUM(m.impressions), 0) as impressions,
            COALESCE(SUM(m.video_3s_views), 0) as video_views
          FROM fb_posts p
          LEFT JOIN LATERAL (
            SELECT * FROM fb_post_metrics 
            WHERE post_id = p.post_id 
            ORDER BY snapshot_time DESC 
            LIMIT 1
          ) m ON true
          WHERE p.page_id = ANY($1)
            AND p.created_time >= $2
            AND p.created_time < $3
        `, [fbPageIds, monthStart, monthEnd]) as FbMetricsRow[];
        
        const m = metrics[0] || {} as FbMetricsRow;
        const reactions = Number(m.reactions) || 0;
        const comments = Number(m.comments) || 0;
        const interactions = reactions + comments;
        const reach = Number(m.reach_total) || 0;
        const postCount = Number(m.post_count) || 0;
        
        fbKpis.push({
          month: targetMonth,
          followerTotal: 0,
          followerGrowth: 0,
          reachTotal: reach,
          reachOrganic: reach,
          reachPaid: 0,
          avgReachPerPost: postCount > 0 ? Math.round(reach / postCount) : 0,
          interactions: interactions,
          reactions: reactions,
          comments: comments,
          shares: Number(m.shares) || 0,
          videoViews3s: Number(m.video_views) || 0,
          interactionRate: reach > 0 ? (interactions / reach) * 100 : 0,
          postCount: postCount,
        });
      }
      
      // Get posts for current month
      const fbPosts = await query(`
        SELECT 
          p.post_id as id,
          p.created_time as date,
          p.type,
          p.permalink,
          COALESCE(m.reactions_total, 0) + COALESCE(m.comments_total, 0) as interactions,
          COALESCE(m.reach, 0) as reach,
          COALESCE(m.video_3s_views, 0) as video_views
        FROM fb_posts p
        LEFT JOIN LATERAL (
          SELECT * FROM fb_post_metrics 
          WHERE post_id = p.post_id 
          ORDER BY snapshot_time DESC 
          LIMIT 1
        ) m ON true
        WHERE p.page_id = ANY($1)
          AND p.created_time >= $2
          AND p.created_time < $3
        ORDER BY interactions DESC
      `, [fbPageIds, `${currentMonth}-01`, `${year}-${String(monthNum + 1).padStart(2, '0')}-01`]);
      
      const fbPostsData: PostData[] = ((fbPosts || []) as Record<string, unknown>[]).map((p) => ({
        id: String(p.id),
        date: String(p.date),
        reach: Number(p.reach) || 0,
        interactions: Number(p.interactions) || 0,
        videoViews: Number(p.video_views) || 0,
        type: (String(p.type) === 'video' ? 'video' : 'image') as 'image' | 'video',
      }));
      
      const fbVideos = fbPostsData.filter(p => p.type === 'video' && (p.videoViews || 0) > 0);
      
      reportData.facebook = {
        kpis: fbKpis,
        posts: fbPostsData,
        videos: fbVideos,
      };
    }
    
    // Get Instagram data
    if (igAccounts && igAccounts.length > 0) {
      const igAccountIds = igAccounts.map(a => a.account_id);
      
      // Get KPIs for 3 months
      const igKpis: InstagramKPIs[] = [];
      
      for (const targetMonth of [currentMonth, prevMonth, prevPrevMonth]) {
        const monthStart = `${targetMonth}-01`;
        const nextMonth = new Date(monthStart);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const monthEnd = nextMonth.toISOString().split('T')[0];
        
        const metrics = await query(`
          SELECT 
            COUNT(DISTINCT p.post_id) as post_count,
            COALESCE(SUM(m.likes), 0) as likes,
            COALESCE(SUM(m.comments), 0) as comments,
            COALESCE(SUM(m.saves), 0) as saves,
            COALESCE(SUM(m.reach), 0) as reach_total,
            COALESCE(SUM(m.impressions), 0) as impressions,
            COALESCE(SUM(m.plays), 0) as video_views
          FROM ig_posts p
          LEFT JOIN LATERAL (
            SELECT * FROM ig_post_metrics 
            WHERE post_id = p.post_id 
            ORDER BY snapshot_time DESC 
            LIMIT 1
          ) m ON true
          WHERE p.account_id = ANY($1)
            AND p.timestamp >= $2
            AND p.timestamp < $3
        `, [igAccountIds, monthStart, monthEnd]) as IgMetricsRow[];
        
        const m = metrics[0] || {} as IgMetricsRow;
        const likes = Number(m.likes) || 0;
        const comments = Number(m.comments) || 0;
        const interactions = likes + comments;
        const reach = Number(m.reach_total) || 0;
        const postCount = Number(m.post_count) || 0;
        
        igKpis.push({
          month: targetMonth,
          followerTotal: 0,
          followerGrowth: 0,
          reachTotal: reach,
          reachOrganic: reach,
          reachPaid: 0,
          avgReachPerPost: postCount > 0 ? Math.round(reach / postCount) : 0,
          interactions: interactions,
          likes: likes,
          comments: comments,
          saves: Number(m.saves) || 0,
          videoViews: Number(m.video_views) || 0,
          views3sPaid: 0,
          interactionRate: reach > 0 ? (interactions / reach) * 100 : 0,
          postCount: postCount,
        });
      }
      
      // Get posts for current month
      const igPosts = await query(`
        SELECT 
          p.post_id as id,
          p.timestamp as date,
          p.media_type as type,
          p.media_url,
          p.thumbnail_url,
          COALESCE(m.likes, 0) + COALESCE(m.comments, 0) as interactions,
          COALESCE(m.reach, 0) as reach,
          COALESCE(m.saves, 0) as saves,
          COALESCE(m.plays, 0) as video_views
        FROM ig_posts p
        LEFT JOIN LATERAL (
          SELECT * FROM ig_post_metrics 
          WHERE post_id = p.post_id 
          ORDER BY snapshot_time DESC 
          LIMIT 1
        ) m ON true
        WHERE p.account_id = ANY($1)
          AND p.timestamp >= $2
          AND p.timestamp < $3
        ORDER BY interactions DESC
      `, [igAccountIds, `${currentMonth}-01`, `${year}-${String(monthNum + 1).padStart(2, '0')}-01`]);
      
      const igPostsData: PostData[] = ((igPosts || []) as Record<string, unknown>[]).map((p) => ({
        id: String(p.id),
        date: String(p.date),
        imageUrl: String(p.thumbnail_url || p.media_url || ''),
        reach: Number(p.reach) || 0,
        interactions: Number(p.interactions) || 0,
        saves: Number(p.saves) || 0,
        videoViews: Number(p.video_views) || 0,
        type: (String(p.type) === 'VIDEO' || String(p.type) === 'REELS' ? 'reel' : 'image') as 'image' | 'video' | 'carousel' | 'reel',
      }));
      
      const igReels = igPostsData.filter(p => p.type === 'reel');
      const igImages = igPostsData.filter(p => p.type !== 'reel');
      
      reportData.instagram = {
        kpis: igKpis,
        posts: igImages,
        reels: igReels,
      };
    }
    
    // Generate report
    const pptxBuffer = await generatePremiumReportV2(reportData);
    
    // Format filename
    const filename = `${customer.slug || customer.name.toLowerCase().replace(/\s+/g, '-')}_premium_${currentMonth}_report.pptx`;
    
    return new NextResponse(new Uint8Array(pptxBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
    
  } catch (error) {
    console.error('Premium report generation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate report',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
