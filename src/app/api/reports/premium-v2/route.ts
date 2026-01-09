/**
 * PREMIUM REPORT API V2
 * 
 * Generiert Spitzenklasse-Reports mit:
 * - Kundenspezifischen Farben
 * - Allen KPIs (Facebook + Instagram)
 * - 16:9 Format
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getFacebookKPIs, getFacebookPosts } from '@/lib/facebook';
import { getInstagramKPIs, getInstagramPosts } from '@/lib/instagram';
import { generatePremiumReportV2, ReportData, FacebookKPIs, InstagramKPIs, PostData } from '@/lib/premium-report-generator-v2';

export const maxDuration = 60;

// Type definitions
interface CustomerRow {
  customer_id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
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
    
    // Get customer
    const customers = await query(`
      SELECT customer_id, name, slug, logo_url, primary_color, secondary_color
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
    
    // Parse month for previous months
    const [year, monthNum] = month.split('-').map(Number);
    const currentMonth = `${year}-${String(monthNum).padStart(2, '0')}`;
    const prevMonth = monthNum === 1 
      ? `${year - 1}-12` 
      : `${year}-${String(monthNum - 1).padStart(2, '0')}`;
    const prevPrevMonth = monthNum <= 2 
      ? `${year - 1}-${String(12 + monthNum - 2).padStart(2, '0')}` 
      : `${year}-${String(monthNum - 2).padStart(2, '0')}`;
    
    // Build report data
    const reportData: ReportData = {
      customer: {
        name: customer.name,
        slug: customer.slug,
        logoUrl: customer.logo_url || undefined,
        primaryColor: customer.primary_color || '#1E3A8A',
        secondaryColor: customer.secondary_color || '#3B82F6',
      },
      month: currentMonth,
    };
    
    // Get Facebook data using existing functions
    try {
      const fbKpisCurrent = await getFacebookKPIs(currentMonth);
      const fbKpisPrev = await getFacebookKPIs(prevMonth);
      const fbKpisPrevPrev = await getFacebookKPIs(prevPrevMonth);
      const fbPosts = await getFacebookPosts(currentMonth, 'interactions', 100);
      
      const mapFbKpis = (kpis: typeof fbKpisCurrent, targetMonth: string): FacebookKPIs => ({
        month: targetMonth,
        followerTotal: 0,
        followerGrowth: 0,
        reachTotal: Number(kpis.total_reach) || 0,
        reachOrganic: Number(kpis.total_reach) || 0,
        reachPaid: 0,
        avgReachPerPost: Number(kpis.avg_reach_per_post) || 0,
        interactions: Number(kpis.total_interactions) || 0,
        reactions: Number(kpis.total_reactions) || 0,
        comments: Number(kpis.total_comments) || 0,
        shares: 0,
        videoViews3s: 0,
        interactionRate: Number(kpis.total_reach) > 0 
          ? (Number(kpis.total_interactions) / Number(kpis.total_reach)) * 100 
          : 0,
        postCount: Number(kpis.total_posts) || 0,
      });
      
      const fbPostsData: PostData[] = fbPosts.map(p => ({
        id: p.post_id,
        date: String(p.created_time),
        imageUrl: p.image_url || undefined,
        reach: Number(p.reach) || 0,
        interactions: Number(p.interactions) || 0,
        videoViews: 0,
        type: (p.type === 'video' ? 'video' : 'image') as 'image' | 'video',
      }));
      
      const fbVideos = fbPostsData.filter(p => p.type === 'video');
      
      reportData.facebook = {
        kpis: [
          mapFbKpis(fbKpisCurrent, currentMonth),
          mapFbKpis(fbKpisPrev, prevMonth),
          mapFbKpis(fbKpisPrevPrev, prevPrevMonth),
        ],
        posts: fbPostsData,
        videos: fbVideos,
      };
    } catch (fbError) {
      console.error('Facebook data error:', fbError);
    }
    
    // Get Instagram data using existing functions
    try {
      const igKpisCurrent = await getInstagramKPIs(currentMonth);
      const igKpisPrev = await getInstagramKPIs(prevMonth);
      const igKpisPrevPrev = await getInstagramKPIs(prevPrevMonth);
      const igPosts = await getInstagramPosts(currentMonth, 'interactions', 100);
      
      const mapIgKpis = (kpis: typeof igKpisCurrent, targetMonth: string): InstagramKPIs => ({
        month: targetMonth,
        followerTotal: 0,
        followerGrowth: 0,
        reachTotal: Number(kpis.total_reach) || 0,
        reachOrganic: Number(kpis.total_reach) || 0,
        reachPaid: 0,
        avgReachPerPost: Number(kpis.avg_reach_per_post) || 0,
        interactions: Number(kpis.total_interactions) || 0,
        likes: Number(kpis.total_likes) || 0,
        comments: Number(kpis.total_comments) || 0,
        saves: Number(kpis.total_saves) || 0,
        videoViews: Number(kpis.total_plays) || 0,
        views3sPaid: 0,
        interactionRate: Number(kpis.total_reach) > 0 
          ? (Number(kpis.total_interactions) / Number(kpis.total_reach)) * 100 
          : 0,
        postCount: Number(kpis.total_posts) || 0,
      });
      
      const igPostsData: PostData[] = igPosts.map(p => ({
        id: p.media_id,
        date: String(p.timestamp),
        imageUrl: p.image_url || undefined,
        reach: Number(p.reach) || 0,
        interactions: Number(p.interactions) || 0,
        saves: Number(p.saves) || 0,
        videoViews: Number(p.plays) || 0,
        type: (p.media_type === 'VIDEO' || p.media_type === 'REELS' ? 'reel' : 'image') as 'image' | 'video' | 'carousel' | 'reel',
      }));
      
      const igReels = igPostsData.filter(p => p.type === 'reel');
      const igImages = igPostsData.filter(p => p.type !== 'reel');
      
      reportData.instagram = {
        kpis: [
          mapIgKpis(igKpisCurrent, currentMonth),
          mapIgKpis(igKpisPrev, prevMonth),
          mapIgKpis(igKpisPrevPrev, prevPrevMonth),
        ],
        posts: igImages,
        reels: igReels,
      };
    } catch (igError) {
      console.error('Instagram data error:', igError);
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
