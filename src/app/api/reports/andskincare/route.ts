import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import PptxGenJS from 'pptxgenjs';

// ANDskincare specific configuration
const ANDSKINCARE_CONFIG = {
  customerName: 'ANDskincare',
  customerSlug: 'andskincare',
  facebookUrl: 'facebook.com/ANDskincare',
  instagramUrl: 'instagram.com/and_skincare',
  colors: {
    primary: '#A8D65C', // Green for posts
    secondary: '#9B59B6', // Purple for videos
    background: '#1a1a2e',
    darkBg: '#2D2D44',
    altBg: '#363652',
    text: '#FFFFFF',
    textMuted: '#AAAAAA',
    tableHeader: '#2ECC71',
    border: '#444466',
    facebook: '#4267B2',
    instagram: '#E1306C',
  }
};

interface PostData {
  post_id: string;
  message: string;
  created_time: Date;
  type: string;
  permalink: string;
  reactions_total: number;
  comments_total: number;
  shares_total: number | null;
  reach: number | null;
  impressions: number | null;
  video_3s_views: number | null;
  thumbnail_url?: string;
}

interface MonthlyKPI {
  month: string;
  posts_count: number;
  total_reactions: number;
  total_comments: number;
  total_reach: number;
  total_impressions: number;
  total_video_views: number;
  avg_reach: number;
  engagement_rate: number;
  followers?: number;
}

interface FollowerData {
  month: string;
  followers: number;
}

// Get the page IDs for ANDskincare from the database
async function getPageIds(platform: 'facebook' | 'instagram' = 'facebook'): Promise<string[]> {
  const result = await query<{ account_id: string }>(`
    SELECT ca.account_id 
    FROM customer_accounts ca 
    JOIN customers c ON ca.customer_id = c.customer_id 
    WHERE LOWER(REPLACE(c.name, ' ', '-')) = LOWER($1) 
      AND ca.platform = $2
  `, [ANDSKINCARE_CONFIG.customerSlug, platform]);
  
  return result.map(r => r.account_id);
}

async function getFacebookPosts(month: string, pageIds: string[]): Promise<PostData[]> {
  if (pageIds.length === 0) return [];
  
  const startDate = `${month}-01`;
  const placeholders = pageIds.map((_, i) => `$${i + 3}`).join(', ');
  
  const posts = await query<PostData>(`
    SELECT 
      p.post_id,
      p.message,
      p.created_time,
      p.type,
      p.permalink,
      COALESCE(m.reactions_total, 0) as reactions_total,
      COALESCE(m.comments_total, 0) as comments_total,
      m.shares_total,
      m.reach,
      m.impressions,
      m.video_3s_views,
      p.thumbnail_url
    FROM fb_posts p
    LEFT JOIN LATERAL (
      SELECT * FROM fb_post_metrics 
      WHERE post_id = p.post_id 
      ORDER BY snapshot_time DESC 
      LIMIT 1
    ) m ON true
    WHERE p.page_id IN (${placeholders})
      AND p.created_time >= $1
      AND p.created_time < $2::date + interval '1 month'
    ORDER BY p.created_time DESC
  `, [startDate, startDate, ...pageIds]);
  
  return posts;
}

async function getInstagramPosts(month: string, pageIds: string[]): Promise<PostData[]> {
  if (pageIds.length === 0) return [];
  
  const startDate = `${month}-01`;
  const placeholders = pageIds.map((_, i) => `$${i + 3}`).join(', ');
  
  try {
    const posts = await query<PostData>(`
      SELECT 
        p.media_id as post_id,
        p.caption as message,
        p.timestamp as created_time,
        p.media_type as type,
        p.permalink,
        COALESCE(m.like_count, 0) as reactions_total,
        COALESCE(m.comments_count, 0) as comments_total,
        NULL as shares_total,
        m.reach,
        m.impressions,
        m.video_views as video_3s_views,
        p.media_url as thumbnail_url
      FROM ig_posts p
      LEFT JOIN LATERAL (
        SELECT * FROM ig_post_metrics 
        WHERE media_id = p.media_id 
        ORDER BY snapshot_time DESC 
        LIMIT 1
      ) m ON true
      WHERE p.account_id IN (${placeholders})
        AND p.timestamp >= $1
        AND p.timestamp < $2::date + interval '1 month'
      ORDER BY p.timestamp DESC
    `, [startDate, startDate, ...pageIds]);
    
    return posts;
  } catch (error) {
    console.error('Error fetching Instagram posts:', error);
    return [];
  }
}

async function getFollowerData(months: string[], pageIds: string[], platform: 'facebook' | 'instagram'): Promise<FollowerData[]> {
  if (pageIds.length === 0) {
    return months.map(month => ({ month, followers: 0 }));
  }
  
  const followers: FollowerData[] = [];
  const placeholders = pageIds.map((_, i) => `$${i + 2}`).join(', ');
  const table = platform === 'facebook' ? 'fb_follower_snapshots' : 'ig_follower_snapshots';
  const idColumn = platform === 'facebook' ? 'page_id' : 'account_id';
  
  for (const month of months) {
    const endDate = new Date(month + '-01');
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(0); // Last day of month
    
    try {
      const result = await query<{ followers: string }>(`
        SELECT COALESCE(MAX(followers_count), 0) as followers
        FROM ${table}
        WHERE ${idColumn} IN (${placeholders})
          AND snapshot_time <= $1::date + interval '1 month'
        ORDER BY snapshot_time DESC
        LIMIT 1
      `, [month + '-01', ...pageIds]);
      
      followers.push({
        month,
        followers: parseInt(result[0]?.followers || '0') || 0
      });
    } catch (error) {
      console.error(`Error fetching ${platform} followers for ${month}:`, error);
      followers.push({ month, followers: 0 });
    }
  }
  
  return followers;
}

async function getMonthlyKPIs(months: string[], pageIds: string[], platform: 'facebook' | 'instagram' = 'facebook'): Promise<MonthlyKPI[]> {
  if (pageIds.length === 0) {
    return months.map(month => ({
      month,
      posts_count: 0,
      total_reactions: 0,
      total_comments: 0,
      total_reach: 0,
      total_impressions: 0,
      total_video_views: 0,
      avg_reach: 0,
      engagement_rate: 0,
      followers: 0,
    }));
  }
  
  const kpis: MonthlyKPI[] = [];
  const placeholders = pageIds.map((_, i) => `$${i + 2}`).join(', ');
  
  // Get follower data
  const followerData = await getFollowerData(months, pageIds, platform);
  
  for (let idx = 0; idx < months.length; idx++) {
    const month = months[idx];
    const startDate = `${month}-01`;
    
    if (platform === 'facebook') {
      const result = await query<{
        posts_count: string;
        total_reactions: string;
        total_comments: string;
        total_reach: string;
        total_impressions: string;
        total_video_views: string;
      }>(`
        SELECT 
          COUNT(DISTINCT p.post_id) as posts_count,
          COALESCE(SUM(m.reactions_total), 0) as total_reactions,
          COALESCE(SUM(m.comments_total), 0) as total_comments,
          COALESCE(SUM(m.reach), 0) as total_reach,
          COALESCE(SUM(m.impressions), 0) as total_impressions,
          COALESCE(SUM(m.video_3s_views), 0) as total_video_views
        FROM fb_posts p
        LEFT JOIN LATERAL (
          SELECT * FROM fb_post_metrics 
          WHERE post_id = p.post_id 
          ORDER BY snapshot_time DESC 
          LIMIT 1
        ) m ON true
        WHERE p.page_id IN (${placeholders})
          AND p.created_time >= $1::date
          AND p.created_time < $1::date + interval '1 month'
      `, [startDate, ...pageIds]);
      
      const data = result[0];
      const postsCount = parseInt(data.posts_count) || 0;
      const totalReach = parseInt(data.total_reach) || 0;
      const totalReactions = parseInt(data.total_reactions) || 0;
      const totalComments = parseInt(data.total_comments) || 0;
      
      kpis.push({
        month,
        posts_count: postsCount,
        total_reactions: totalReactions,
        total_comments: totalComments,
        total_reach: totalReach,
        total_impressions: parseInt(data.total_impressions) || 0,
        total_video_views: parseInt(data.total_video_views) || 0,
        avg_reach: postsCount > 0 ? Math.round(totalReach / postsCount) : 0,
        engagement_rate: totalReach > 0 ? ((totalReactions + totalComments) / totalReach) * 100 : 0,
        followers: followerData[idx]?.followers || 0,
      });
    } else {
      // Instagram
      try {
        const result = await query<{
          posts_count: string;
          total_reactions: string;
          total_comments: string;
          total_reach: string;
          total_impressions: string;
          total_video_views: string;
        }>(`
          SELECT 
            COUNT(DISTINCT p.media_id) as posts_count,
            COALESCE(SUM(m.like_count), 0) as total_reactions,
            COALESCE(SUM(m.comments_count), 0) as total_comments,
            COALESCE(SUM(m.reach), 0) as total_reach,
            COALESCE(SUM(m.impressions), 0) as total_impressions,
            COALESCE(SUM(m.video_views), 0) as total_video_views
          FROM ig_posts p
          LEFT JOIN LATERAL (
            SELECT * FROM ig_post_metrics 
            WHERE media_id = p.media_id 
            ORDER BY snapshot_time DESC 
            LIMIT 1
          ) m ON true
          WHERE p.account_id IN (${placeholders})
            AND p.timestamp >= $1::date
            AND p.timestamp < $1::date + interval '1 month'
        `, [startDate, ...pageIds]);
        
        const data = result[0];
        const postsCount = parseInt(data.posts_count) || 0;
        const totalReach = parseInt(data.total_reach) || 0;
        const totalReactions = parseInt(data.total_reactions) || 0;
        const totalComments = parseInt(data.total_comments) || 0;
        
        kpis.push({
          month,
          posts_count: postsCount,
          total_reactions: totalReactions,
          total_comments: totalComments,
          total_reach: totalReach,
          total_impressions: parseInt(data.total_impressions) || 0,
          total_video_views: parseInt(data.total_video_views) || 0,
          avg_reach: postsCount > 0 ? Math.round(totalReach / postsCount) : 0,
          engagement_rate: totalReach > 0 ? ((totalReactions + totalComments) / totalReach) * 100 : 0,
          followers: followerData[idx]?.followers || 0,
        });
      } catch (error) {
        console.error(`Error fetching Instagram KPIs for ${month}:`, error);
        kpis.push({
          month,
          posts_count: 0,
          total_reactions: 0,
          total_comments: 0,
          total_reach: 0,
          total_impressions: 0,
          total_video_views: 0,
          avg_reach: 0,
          engagement_rate: 0,
          followers: followerData[idx]?.followers || 0,
        });
      }
    }
  }
  
  return kpis;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function getMonthName(month: string): string {
  const [year, monthNum] = month.split('-');
  const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 
                  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  return `${months[parseInt(monthNum) - 1]} ${year}`;
}

function getShortMonthName(month: string): string {
  const [year, monthNum] = month.split('-');
  const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 
                  'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  return `${months[parseInt(monthNum) - 1]} ${year.slice(2)}`;
}

// Helper to add famefact branding to a slide
function addFamefactBranding(slide: PptxGenJS.Slide) {
  slide.addText('famefact', {
    x: 0.3,
    y: 5.1,
    w: 1.5,
    h: 0.3,
    fontSize: 12,
    color: 'A8D65C',
    fontFace: 'Arial',
  });
}

// Helper to create KPI table
function createKPITable(kpis: MonthlyKPI[], months: string[], platform: 'facebook' | 'instagram'): PptxGenJS.TableRow[] {
  const headerColor = platform === 'facebook' ? '2ECC71' : 'E1306C';
  
  const tableData: PptxGenJS.TableRow[] = [
    [
      { text: 'Kennzahl', options: { bold: true, fill: { color: headerColor }, color: 'FFFFFF', align: 'center', fontSize: 11 } },
      { text: getShortMonthName(months[0]), options: { bold: true, fill: { color: headerColor }, color: 'FFFFFF', align: 'center', fontSize: 11 } },
      { text: getShortMonthName(months[1]), options: { bold: true, fill: { color: headerColor }, color: 'FFFFFF', align: 'center', fontSize: 11 } },
      { text: getShortMonthName(months[2]), options: { bold: true, fill: { color: headerColor }, color: 'FFFFFF', align: 'center', fontSize: 11 } },
    ],
  ];
  
  // Add Follower row if data exists
  if (kpis.some(k => k.followers && k.followers > 0)) {
    tableData.push([
      { text: 'Follower', options: { fill: { color: '2D2D44' }, color: 'FFFFFF', align: 'center', fontSize: 10 } },
      { text: formatNumber(kpis[0]?.followers || 0), options: { fill: { color: '2D2D44' }, color: 'FFFFFF', align: 'center', fontSize: 10 } },
      { text: formatNumber(kpis[1]?.followers || 0), options: { fill: { color: '2D2D44' }, color: 'FFFFFF', align: 'center', fontSize: 10 } },
      { text: formatNumber(kpis[2]?.followers || 0), options: { fill: { color: '2D2D44' }, color: 'FFFFFF', align: 'center', fontSize: 10 } },
    ]);
  }
  
  // Standard KPI rows
  const rows = [
    { label: 'Beiträge', key: 'posts_count', bgColor: '363652' },
    { label: platform === 'facebook' ? 'Reaktionen' : 'Likes', key: 'total_reactions', bgColor: '2D2D44' },
    { label: 'Kommentare', key: 'total_comments', bgColor: '363652' },
    { label: 'Reichweite', key: 'total_reach', bgColor: '2D2D44' },
    { label: 'Ø Reichweite/Post', key: 'avg_reach', bgColor: '363652' },
    { label: 'Engagement Rate', key: 'engagement_rate', bgColor: '2D2D44', isPercent: true },
  ];
  
  rows.forEach(row => {
    tableData.push([
      { text: row.label, options: { fill: { color: row.bgColor }, color: 'FFFFFF', align: 'center', fontSize: 10 } },
      { 
        text: row.isPercent 
          ? ((kpis[0] as any)?.[row.key] || 0).toFixed(2) + '%'
          : formatNumber((kpis[0] as any)?.[row.key] || 0), 
        options: { fill: { color: row.bgColor }, color: 'FFFFFF', align: 'center', fontSize: 10 } 
      },
      { 
        text: row.isPercent 
          ? ((kpis[1] as any)?.[row.key] || 0).toFixed(2) + '%'
          : formatNumber((kpis[1] as any)?.[row.key] || 0), 
        options: { fill: { color: row.bgColor }, color: 'FFFFFF', align: 'center', fontSize: 10 } 
      },
      { 
        text: row.isPercent 
          ? ((kpis[2] as any)?.[row.key] || 0).toFixed(2) + '%'
          : formatNumber((kpis[2] as any)?.[row.key] || 0), 
        options: { fill: { color: row.bgColor }, color: 'FFFFFF', align: 'center', fontSize: 10 } 
      },
    ]);
  });
  
  return tableData;
}

// Helper to add post images above bar chart
async function addPostImagesAboveBars(
  slide: PptxGenJS.Slide, 
  posts: (PostData & { interactions: number })[], 
  startX: number,
  barWidth: number,
  imageY: number
) {
  const imageSize = 0.7;
  
  for (let i = 0; i < posts.length && i < 5; i++) {
    const post = posts[i];
    const xPos = startX + (i * barWidth) + (barWidth - imageSize) / 2;
    
    if (post.thumbnail_url) {
      try {
        // Add image placeholder with border
        slide.addShape('rect', {
          x: xPos,
          y: imageY,
          w: imageSize,
          h: imageSize,
          fill: { color: '2D2D44' },
          line: { color: '444466', width: 1 },
        });
        
        // Try to add the actual image
        slide.addImage({
          path: post.thumbnail_url,
          x: xPos,
          y: imageY,
          w: imageSize,
          h: imageSize,
        });
      } catch (error) {
        // If image fails, show placeholder
        slide.addText('📷', {
          x: xPos,
          y: imageY,
          w: imageSize,
          h: imageSize,
          fontSize: 20,
          align: 'center',
          valign: 'middle',
          color: '888888',
        });
      }
    } else {
      // No thumbnail - show placeholder
      slide.addShape('rect', {
        x: xPos,
        y: imageY,
        w: imageSize,
        h: imageSize,
        fill: { color: '2D2D44' },
        line: { color: '444466', width: 1 },
      });
      slide.addText('📷', {
        x: xPos,
        y: imageY,
        w: imageSize,
        h: imageSize,
        fontSize: 20,
        align: 'center',
        valign: 'middle',
        color: '888888',
      });
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);
    
    // Get page IDs for ANDskincare from database
    const fbPageIds = await getPageIds('facebook');
    const igPageIds = await getPageIds('instagram');
    console.log('ANDskincare FB Page IDs:', fbPageIds);
    console.log('ANDskincare IG Page IDs:', igPageIds);
    
    // Calculate months for KPI comparison
    const currentDate = new Date(month + '-01');
    const prevMonth1 = new Date(currentDate);
    prevMonth1.setMonth(prevMonth1.getMonth() - 1);
    const prevMonth2 = new Date(currentDate);
    prevMonth2.setMonth(prevMonth2.getMonth() - 2);
    
    const months = [
      prevMonth2.toISOString().slice(0, 7),
      prevMonth1.toISOString().slice(0, 7),
      month
    ];
    
    // Get Facebook data
    const fbPosts = await getFacebookPosts(month, fbPageIds);
    const fbKpis = await getMonthlyKPIs(months, fbPageIds, 'facebook');
    console.log('FB Posts found:', fbPosts.length);
    
    // Get Instagram data
    const igPosts = await getInstagramPosts(month, igPageIds);
    const igKpis = await getMonthlyKPIs(months, igPageIds, 'instagram');
    console.log('IG Posts found:', igPosts.length);
    
    // Create PowerPoint
    const pptx = new PptxGenJS();
    pptx.author = 'famefact GmbH';
    pptx.title = `${ANDSKINCARE_CONFIG.customerName} Social Media Report - ${getMonthName(month)}`;
    pptx.subject = 'Monthly Social Media Performance Report';
    pptx.company = 'famefact GmbH';
    
    // ==========================================
    // SLIDE 1: Cover
    // ==========================================
    const slide1 = pptx.addSlide();
    slide1.background = { color: ANDSKINCARE_CONFIG.colors.background };
    
    // ANDskincare Logo (3 circles with A-N-D)
    const circleY = 1.3;
    const circleSize = 0.9;
    const circleSpacing = 1.1;
    const startX = 3.35;
    
    ['A', 'N', 'D'].forEach((letter, i) => {
      slide1.addShape('ellipse', {
        x: startX + (i * circleSpacing),
        y: circleY,
        w: circleSize,
        h: circleSize,
        fill: { color: '808080' },
      });
      slide1.addText(letter, {
        x: startX + (i * circleSpacing),
        y: circleY,
        w: circleSize,
        h: circleSize,
        fontSize: 28,
        bold: true,
        color: 'FFFFFF',
        align: 'center',
        valign: 'middle',
      });
    });
    
    slide1.addText('SKINCARE', {
      x: 0,
      y: 2.4,
      w: '100%',
      h: 0.5,
      fontSize: 24,
      color: '808080',
      align: 'center',
      fontFace: 'Arial',
      charSpacing: 8,
    });
    
    slide1.addText('Social Media Reporting', {
      x: 0,
      y: 3.3,
      w: '100%',
      h: 0.6,
      fontSize: 36,
      bold: true,
      color: 'FFFFFF',
      align: 'center',
    });
    
    slide1.addText(getMonthName(month), {
      x: 0,
      y: 4.0,
      w: '100%',
      h: 0.5,
      fontSize: 22,
      color: 'CCCCCC',
      align: 'center',
    });
    
    addFamefactBranding(slide1);
    
    // ==========================================
    // SLIDE 2: Facebook Analysis Placeholder
    // ==========================================
    const slide2 = pptx.addSlide();
    slide2.background = { color: ANDSKINCARE_CONFIG.colors.background };
    
    slide2.addText('Facebook Analyse', {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.6,
      fontSize: 28,
      bold: true,
      color: 'FFFFFF',
    });
    
    slide2.addText(ANDSKINCARE_CONFIG.facebookUrl, {
      x: 0.5,
      y: 0.85,
      w: 9,
      h: 0.35,
      fontSize: 14,
      color: ANDSKINCARE_CONFIG.colors.facebook,
    });
    
    slide2.addShape('rect', {
      x: 0.5,
      y: 1.4,
      w: 9,
      h: 3.6,
      fill: { color: ANDSKINCARE_CONFIG.colors.darkBg },
      line: { color: ANDSKINCARE_CONFIG.colors.border, width: 1 },
    });
    
    slide2.addText('Screenshot der Facebook-Seite hier einfügen', {
      x: 0.5,
      y: 2.9,
      w: 9,
      h: 0.5,
      fontSize: 14,
      color: '888888',
      align: 'center',
    });
    
    addFamefactBranding(slide2);
    
    // ==========================================
    // SLIDE 3: Facebook KPI Table
    // ==========================================
    const slide3 = pptx.addSlide();
    slide3.background = { color: ANDSKINCARE_CONFIG.colors.background };
    
    slide3.addText('Facebook Kennzahlen', {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.6,
      fontSize: 28,
      bold: true,
      color: 'FFFFFF',
    });
    
    const fbTableData = createKPITable(fbKpis, months, 'facebook');
    
    slide3.addTable(fbTableData, {
      x: 0.5,
      y: 1.1,
      w: 9,
      colW: [2.5, 2.17, 2.17, 2.16],
      fontSize: 10,
      border: { type: 'solid', color: ANDSKINCARE_CONFIG.colors.border, pt: 0.5 },
    });
    
    addFamefactBranding(slide3);
    
    // ==========================================
    // SLIDE 4: Facebook Posts by Interactions
    // ==========================================
    const slide4 = pptx.addSlide();
    slide4.background = { color: ANDSKINCARE_CONFIG.colors.background };
    
    slide4.addText('Posts nach Interaktionen', {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.5,
      fontSize: 28,
      bold: true,
      color: 'FFFFFF',
    });
    
    const topFbPostsByInteractions = [...fbPosts]
      .map(p => ({
        ...p,
        interactions: (p.reactions_total || 0) + (p.comments_total || 0)
      }))
      .sort((a, b) => b.interactions - a.interactions)
      .slice(0, 5);
    
    if (topFbPostsByInteractions.length > 0) {
      // Add post images above the chart
      const barStartX = 1.0;
      const barWidth = 1.7;
      await addPostImagesAboveBars(slide4, topFbPostsByInteractions, barStartX, barWidth, 0.9);
      
      // Create bar chart
      const chartData = [{
        name: 'Interaktionen',
        labels: topFbPostsByInteractions.map((_, i) => `Post ${i + 1}`),
        values: topFbPostsByInteractions.map(p => p.interactions),
      }];
      
      slide4.addChart('bar', chartData, {
        x: 0.5,
        y: 1.7,
        w: 9,
        h: 3.0,
        barDir: 'col',
        chartColors: [ANDSKINCARE_CONFIG.colors.primary.replace('#', '')],
        showValue: true,
        dataLabelPosition: 'outEnd',
        dataLabelFontSize: 11,
        dataLabelColor: 'FFFFFF',
        dataLabelFontBold: true,
        catAxisLabelColor: 'FFFFFF',
        valAxisLabelColor: 'FFFFFF',
        catGridLine: { style: 'none' },
        valGridLine: { color: ANDSKINCARE_CONFIG.colors.border },
        valAxisHidden: true,
      });
      
      // Add date labels
      topFbPostsByInteractions.forEach((post, i) => {
        const date = new Date(post.created_time);
        const dateStr = `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.`;
        slide4.addText(dateStr, {
          x: barStartX + (i * barWidth),
          y: 4.75,
          w: barWidth,
          h: 0.25,
          fontSize: 9,
          color: ANDSKINCARE_CONFIG.colors.textMuted,
          align: 'center',
        });
      });
    } else {
      slide4.addText('Keine Post-Daten für diesen Monat verfügbar', {
        x: 0.5,
        y: 2.5,
        w: 9,
        h: 0.5,
        fontSize: 14,
        color: '888888',
        align: 'center',
      });
    }
    
    addFamefactBranding(slide4);
    
    // ==========================================
    // SLIDE 5: Facebook Videos by 3-Sec Views
    // ==========================================
    const slide5 = pptx.addSlide();
    slide5.background = { color: ANDSKINCARE_CONFIG.colors.background };
    
    slide5.addText('Videos nach 3-Sek-Aufrufen', {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.5,
      fontSize: 28,
      bold: true,
      color: 'FFFFFF',
    });
    
    // Filter videos (check multiple types)
    const fbVideoPosts = fbPosts
      .filter(p => {
        const type = (p.type || '').toLowerCase();
        return (type === 'video' || type === 'reel' || type.includes('video')) && 
               p.video_3s_views && p.video_3s_views > 0;
      })
      .map(p => ({ ...p, interactions: p.video_3s_views || 0 }))
      .sort((a, b) => b.interactions - a.interactions)
      .slice(0, 5);
    
    if (fbVideoPosts.length > 0) {
      const barStartX = 1.0;
      const barWidth = 1.7;
      await addPostImagesAboveBars(slide5, fbVideoPosts, barStartX, barWidth, 0.9);
      
      const videoChartData = [{
        name: '3-Sek-Aufrufe',
        labels: fbVideoPosts.map((_, i) => `Video ${i + 1}`),
        values: fbVideoPosts.map(p => p.video_3s_views || 0),
      }];
      
      slide5.addChart('bar', videoChartData, {
        x: 0.5,
        y: 1.7,
        w: 9,
        h: 3.0,
        barDir: 'col',
        chartColors: [ANDSKINCARE_CONFIG.colors.secondary.replace('#', '')],
        showValue: true,
        dataLabelPosition: 'outEnd',
        dataLabelFontSize: 11,
        dataLabelColor: 'FFFFFF',
        dataLabelFontBold: true,
        catAxisLabelColor: 'FFFFFF',
        valAxisLabelColor: 'FFFFFF',
        catGridLine: { style: 'none' },
        valGridLine: { color: ANDSKINCARE_CONFIG.colors.border },
        valAxisHidden: true,
      });
      
      fbVideoPosts.forEach((post, i) => {
        const date = new Date(post.created_time);
        const dateStr = `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.`;
        slide5.addText(dateStr, {
          x: barStartX + (i * barWidth),
          y: 4.75,
          w: barWidth,
          h: 0.25,
          fontSize: 9,
          color: ANDSKINCARE_CONFIG.colors.textMuted,
          align: 'center',
        });
      });
    } else {
      slide5.addText('Keine Video-Daten für diesen Monat verfügbar', {
        x: 0.5,
        y: 2.5,
        w: 9,
        h: 0.5,
        fontSize: 14,
        color: '888888',
        align: 'center',
      });
    }
    
    addFamefactBranding(slide5);
    
    // ==========================================
    // SLIDE 6: Facebook Top 3 Postings
    // ==========================================
    const slide6 = pptx.addSlide();
    slide6.background = { color: ANDSKINCARE_CONFIG.colors.background };
    
    slide6.addText('Top Postings Facebook', {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.5,
      fontSize: 28,
      bold: true,
      color: 'FFFFFF',
    });
    
    const top3FbPosts = topFbPostsByInteractions.slice(0, 3);
    
    if (top3FbPosts.length > 0) {
      top3FbPosts.forEach((post, i) => {
        const yPos = 1.0 + (i * 1.5);
        
        // Post card background
        slide6.addShape('rect', {
          x: 0.5,
          y: yPos,
          w: 9,
          h: 1.35,
          fill: { color: ANDSKINCARE_CONFIG.colors.darkBg },
          line: { color: ANDSKINCARE_CONFIG.colors.border, width: 1 },
        });
        
        // Thumbnail placeholder
        if (post.thumbnail_url) {
          try {
            slide6.addImage({
              path: post.thumbnail_url,
              x: 0.6,
              y: yPos + 0.1,
              w: 1.15,
              h: 1.15,
            });
          } catch {
            slide6.addShape('rect', {
              x: 0.6,
              y: yPos + 0.1,
              w: 1.15,
              h: 1.15,
              fill: { color: '363652' },
            });
          }
        } else {
          slide6.addShape('rect', {
            x: 0.6,
            y: yPos + 0.1,
            w: 1.15,
            h: 1.15,
            fill: { color: '363652' },
          });
          slide6.addText('📷', {
            x: 0.6,
            y: yPos + 0.1,
            w: 1.15,
            h: 1.15,
            fontSize: 28,
            align: 'center',
            valign: 'middle',
            color: '666666',
          });
        }
        
        // Rank badge
        slide6.addShape('ellipse', {
          x: 1.9,
          y: yPos + 0.15,
          w: 0.45,
          h: 0.45,
          fill: { color: ANDSKINCARE_CONFIG.colors.primary.replace('#', '') },
        });
        slide6.addText(`#${i + 1}`, {
          x: 1.9,
          y: yPos + 0.15,
          w: 0.45,
          h: 0.45,
          fontSize: 13,
          bold: true,
          color: '1a1a2e',
          align: 'center',
          valign: 'middle',
        });
        
        // Post message
        const message = post.message 
          ? post.message.substring(0, 120) + (post.message.length > 120 ? '...' : '') 
          : 'Kein Text';
        slide6.addText(message, {
          x: 2.45,
          y: yPos + 0.1,
          w: 5.5,
          h: 0.75,
          fontSize: 9,
          color: 'FFFFFF',
        });
        
        // Metrics row
        const date = new Date(post.created_time);
        const dateStr = `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`;
        slide6.addText(`📅 ${dateStr}   👍 ${formatNumber(post.reactions_total)}   💬 ${formatNumber(post.comments_total)}   👁 ${formatNumber(post.reach || 0)}`, {
          x: 2.45,
          y: yPos + 0.9,
          w: 5.5,
          h: 0.35,
          fontSize: 9,
          color: ANDSKINCARE_CONFIG.colors.textMuted,
        });
        
        // Interaction count
        slide6.addText(formatNumber(post.interactions), {
          x: 8.0,
          y: yPos + 0.35,
          w: 1.3,
          h: 0.65,
          fontSize: 22,
          bold: true,
          color: ANDSKINCARE_CONFIG.colors.primary.replace('#', ''),
          align: 'center',
        });
      });
    } else {
      slide6.addText('Keine Post-Daten für diesen Monat verfügbar', {
        x: 0.5,
        y: 2.5,
        w: 9,
        h: 0.5,
        fontSize: 14,
        color: '888888',
        align: 'center',
      });
    }
    
    addFamefactBranding(slide6);
    
    // ==========================================
    // SLIDE 7: Facebook Demographics Placeholder
    // ==========================================
    const slide7 = pptx.addSlide();
    slide7.background = { color: ANDSKINCARE_CONFIG.colors.background };
    
    slide7.addText('Facebook Demographie', {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.5,
      fontSize: 28,
      bold: true,
      color: 'FFFFFF',
    });
    
    slide7.addShape('rect', {
      x: 0.5,
      y: 1.0,
      w: 9,
      h: 4.0,
      fill: { color: ANDSKINCARE_CONFIG.colors.darkBg },
      line: { color: ANDSKINCARE_CONFIG.colors.border, width: 1 },
    });
    
    slide7.addText('Screenshot der Demographie-Daten hier einfügen\n(Alter & Geschlecht aus Facebook Insights)', {
      x: 0.5,
      y: 2.7,
      w: 9,
      h: 0.8,
      fontSize: 14,
      color: '888888',
      align: 'center',
    });
    
    addFamefactBranding(slide7);
    
    // ==========================================
    // INSTAGRAM SLIDES (8-13)
    // ==========================================
    
    // SLIDE 8: Instagram Analysis Placeholder
    const slide8 = pptx.addSlide();
    slide8.background = { color: ANDSKINCARE_CONFIG.colors.background };
    
    slide8.addText('Instagram Analyse', {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.6,
      fontSize: 28,
      bold: true,
      color: 'FFFFFF',
    });
    
    slide8.addText(ANDSKINCARE_CONFIG.instagramUrl, {
      x: 0.5,
      y: 0.85,
      w: 9,
      h: 0.35,
      fontSize: 14,
      color: ANDSKINCARE_CONFIG.colors.instagram,
    });
    
    slide8.addShape('rect', {
      x: 0.5,
      y: 1.4,
      w: 9,
      h: 3.6,
      fill: { color: ANDSKINCARE_CONFIG.colors.darkBg },
      line: { color: ANDSKINCARE_CONFIG.colors.border, width: 1 },
    });
    
    slide8.addText('Screenshot der Instagram-Seite hier einfügen', {
      x: 0.5,
      y: 2.9,
      w: 9,
      h: 0.5,
      fontSize: 14,
      color: '888888',
      align: 'center',
    });
    
    addFamefactBranding(slide8);
    
    // SLIDE 9: Instagram KPI Table
    const slide9 = pptx.addSlide();
    slide9.background = { color: ANDSKINCARE_CONFIG.colors.background };
    
    slide9.addText('Instagram Kennzahlen', {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.6,
      fontSize: 28,
      bold: true,
      color: 'FFFFFF',
    });
    
    const igTableData = createKPITable(igKpis, months, 'instagram');
    
    slide9.addTable(igTableData, {
      x: 0.5,
      y: 1.1,
      w: 9,
      colW: [2.5, 2.17, 2.17, 2.16],
      fontSize: 10,
      border: { type: 'solid', color: ANDSKINCARE_CONFIG.colors.border, pt: 0.5 },
    });
    
    addFamefactBranding(slide9);
    
    // SLIDE 10: Instagram Posts by Interactions
    const slide10 = pptx.addSlide();
    slide10.background = { color: ANDSKINCARE_CONFIG.colors.background };
    
    slide10.addText('Instagram Posts nach Interaktionen', {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.5,
      fontSize: 28,
      bold: true,
      color: 'FFFFFF',
    });
    
    const topIgPostsByInteractions = [...igPosts]
      .map(p => ({
        ...p,
        interactions: (p.reactions_total || 0) + (p.comments_total || 0)
      }))
      .sort((a, b) => b.interactions - a.interactions)
      .slice(0, 5);
    
    if (topIgPostsByInteractions.length > 0) {
      const barStartX = 1.0;
      const barWidth = 1.7;
      await addPostImagesAboveBars(slide10, topIgPostsByInteractions, barStartX, barWidth, 0.9);
      
      const chartData = [{
        name: 'Interaktionen',
        labels: topIgPostsByInteractions.map((_, i) => `Post ${i + 1}`),
        values: topIgPostsByInteractions.map(p => p.interactions),
      }];
      
      slide10.addChart('bar', chartData, {
        x: 0.5,
        y: 1.7,
        w: 9,
        h: 3.0,
        barDir: 'col',
        chartColors: [ANDSKINCARE_CONFIG.colors.instagram.replace('#', '')],
        showValue: true,
        dataLabelPosition: 'outEnd',
        dataLabelFontSize: 11,
        dataLabelColor: 'FFFFFF',
        dataLabelFontBold: true,
        catAxisLabelColor: 'FFFFFF',
        valAxisLabelColor: 'FFFFFF',
        catGridLine: { style: 'none' },
        valGridLine: { color: ANDSKINCARE_CONFIG.colors.border },
        valAxisHidden: true,
      });
      
      topIgPostsByInteractions.forEach((post, i) => {
        const date = new Date(post.created_time);
        const dateStr = `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.`;
        slide10.addText(dateStr, {
          x: barStartX + (i * barWidth),
          y: 4.75,
          w: barWidth,
          h: 0.25,
          fontSize: 9,
          color: ANDSKINCARE_CONFIG.colors.textMuted,
          align: 'center',
        });
      });
    } else {
      slide10.addText('Keine Instagram Post-Daten für diesen Monat verfügbar', {
        x: 0.5,
        y: 2.5,
        w: 9,
        h: 0.5,
        fontSize: 14,
        color: '888888',
        align: 'center',
      });
    }
    
    addFamefactBranding(slide10);
    
    // SLIDE 11: Instagram Reels by Views
    const slide11 = pptx.addSlide();
    slide11.background = { color: ANDSKINCARE_CONFIG.colors.background };
    
    slide11.addText('Instagram Reels nach Views', {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.5,
      fontSize: 28,
      bold: true,
      color: 'FFFFFF',
    });
    
    const igReels = igPosts
      .filter(p => {
        const type = (p.type || '').toLowerCase();
        return (type === 'video' || type === 'reel' || type.includes('reel')) && 
               p.video_3s_views && p.video_3s_views > 0;
      })
      .map(p => ({ ...p, interactions: p.video_3s_views || 0 }))
      .sort((a, b) => b.interactions - a.interactions)
      .slice(0, 5);
    
    if (igReels.length > 0) {
      const barStartX = 1.0;
      const barWidth = 1.7;
      await addPostImagesAboveBars(slide11, igReels, barStartX, barWidth, 0.9);
      
      const reelChartData = [{
        name: 'Views',
        labels: igReels.map((_, i) => `Reel ${i + 1}`),
        values: igReels.map(p => p.video_3s_views || 0),
      }];
      
      slide11.addChart('bar', reelChartData, {
        x: 0.5,
        y: 1.7,
        w: 9,
        h: 3.0,
        barDir: 'col',
        chartColors: ['9B59B6'],
        showValue: true,
        dataLabelPosition: 'outEnd',
        dataLabelFontSize: 11,
        dataLabelColor: 'FFFFFF',
        dataLabelFontBold: true,
        catAxisLabelColor: 'FFFFFF',
        valAxisLabelColor: 'FFFFFF',
        catGridLine: { style: 'none' },
        valGridLine: { color: ANDSKINCARE_CONFIG.colors.border },
        valAxisHidden: true,
      });
      
      igReels.forEach((post, i) => {
        const date = new Date(post.created_time);
        const dateStr = `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.`;
        slide11.addText(dateStr, {
          x: barStartX + (i * barWidth),
          y: 4.75,
          w: barWidth,
          h: 0.25,
          fontSize: 9,
          color: ANDSKINCARE_CONFIG.colors.textMuted,
          align: 'center',
        });
      });
    } else {
      slide11.addText('Keine Instagram Reel-Daten für diesen Monat verfügbar', {
        x: 0.5,
        y: 2.5,
        w: 9,
        h: 0.5,
        fontSize: 14,
        color: '888888',
        align: 'center',
      });
    }
    
    addFamefactBranding(slide11);
    
    // SLIDE 12: Instagram Top 3 Postings
    const slide12 = pptx.addSlide();
    slide12.background = { color: ANDSKINCARE_CONFIG.colors.background };
    
    slide12.addText('Top Postings Instagram', {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.5,
      fontSize: 28,
      bold: true,
      color: 'FFFFFF',
    });
    
    const top3IgPosts = topIgPostsByInteractions.slice(0, 3);
    
    if (top3IgPosts.length > 0) {
      top3IgPosts.forEach((post, i) => {
        const yPos = 1.0 + (i * 1.5);
        
        slide12.addShape('rect', {
          x: 0.5,
          y: yPos,
          w: 9,
          h: 1.35,
          fill: { color: ANDSKINCARE_CONFIG.colors.darkBg },
          line: { color: ANDSKINCARE_CONFIG.colors.border, width: 1 },
        });
        
        if (post.thumbnail_url) {
          try {
            slide12.addImage({
              path: post.thumbnail_url,
              x: 0.6,
              y: yPos + 0.1,
              w: 1.15,
              h: 1.15,
            });
          } catch {
            slide12.addShape('rect', {
              x: 0.6,
              y: yPos + 0.1,
              w: 1.15,
              h: 1.15,
              fill: { color: '363652' },
            });
          }
        } else {
          slide12.addShape('rect', {
            x: 0.6,
            y: yPos + 0.1,
            w: 1.15,
            h: 1.15,
            fill: { color: '363652' },
          });
        }
        
        slide12.addShape('ellipse', {
          x: 1.9,
          y: yPos + 0.15,
          w: 0.45,
          h: 0.45,
          fill: { color: ANDSKINCARE_CONFIG.colors.instagram.replace('#', '') },
        });
        slide12.addText(`#${i + 1}`, {
          x: 1.9,
          y: yPos + 0.15,
          w: 0.45,
          h: 0.45,
          fontSize: 13,
          bold: true,
          color: 'FFFFFF',
          align: 'center',
          valign: 'middle',
        });
        
        const message = post.message 
          ? post.message.substring(0, 120) + (post.message.length > 120 ? '...' : '') 
          : 'Kein Text';
        slide12.addText(message, {
          x: 2.45,
          y: yPos + 0.1,
          w: 5.5,
          h: 0.75,
          fontSize: 9,
          color: 'FFFFFF',
        });
        
        const date = new Date(post.created_time);
        const dateStr = `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`;
        slide12.addText(`📅 ${dateStr}   ❤️ ${formatNumber(post.reactions_total)}   💬 ${formatNumber(post.comments_total)}   👁 ${formatNumber(post.reach || 0)}`, {
          x: 2.45,
          y: yPos + 0.9,
          w: 5.5,
          h: 0.35,
          fontSize: 9,
          color: ANDSKINCARE_CONFIG.colors.textMuted,
        });
        
        slide12.addText(formatNumber(post.interactions), {
          x: 8.0,
          y: yPos + 0.35,
          w: 1.3,
          h: 0.65,
          fontSize: 22,
          bold: true,
          color: ANDSKINCARE_CONFIG.colors.instagram.replace('#', ''),
          align: 'center',
        });
      });
    } else {
      slide12.addText('Keine Instagram Post-Daten für diesen Monat verfügbar', {
        x: 0.5,
        y: 2.5,
        w: 9,
        h: 0.5,
        fontSize: 14,
        color: '888888',
        align: 'center',
      });
    }
    
    addFamefactBranding(slide12);
    
    // SLIDE 13: Instagram Demographics Placeholder
    const slide13 = pptx.addSlide();
    slide13.background = { color: ANDSKINCARE_CONFIG.colors.background };
    
    slide13.addText('Instagram Demographie', {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.5,
      fontSize: 28,
      bold: true,
      color: 'FFFFFF',
    });
    
    slide13.addShape('rect', {
      x: 0.5,
      y: 1.0,
      w: 9,
      h: 4.0,
      fill: { color: ANDSKINCARE_CONFIG.colors.darkBg },
      line: { color: ANDSKINCARE_CONFIG.colors.border, width: 1 },
    });
    
    slide13.addText('Screenshot der Demographie-Daten hier einfügen\n(Alter & Geschlecht aus Instagram Insights)', {
      x: 0.5,
      y: 2.7,
      w: 9,
      h: 0.8,
      fontSize: 14,
      color: '888888',
      align: 'center',
    });
    
    addFamefactBranding(slide13);
    
    // ==========================================
    // SLIDE 14: Outro / Contact
    // ==========================================
    const slide14 = pptx.addSlide();
    slide14.background = { color: ANDSKINCARE_CONFIG.colors.background };
    
    slide14.addText('Vielen Dank!', {
      x: 0,
      y: 1.5,
      w: '100%',
      h: 0.8,
      fontSize: 40,
      bold: true,
      color: 'FFFFFF',
      align: 'center',
    });
    
    slide14.addText('Bei Fragen stehen wir Ihnen gerne zur Verfügung.', {
      x: 0,
      y: 2.5,
      w: '100%',
      h: 0.5,
      fontSize: 16,
      color: ANDSKINCARE_CONFIG.colors.textMuted,
      align: 'center',
    });
    
    slide14.addText('famefact GmbH\nSocial Media Agentur Berlin', {
      x: 0,
      y: 3.3,
      w: '100%',
      h: 0.8,
      fontSize: 14,
      color: ANDSKINCARE_CONFIG.colors.primary.replace('#', ''),
      align: 'center',
    });
    
    slide14.addText('www.famefact.com', {
      x: 0,
      y: 4.2,
      w: '100%',
      h: 0.4,
      fontSize: 12,
      color: ANDSKINCARE_CONFIG.colors.textMuted,
      align: 'center',
    });
    
    addFamefactBranding(slide14);
    
    // Generate the PPTX
    const pptxBuffer = await pptx.write({ outputType: 'arraybuffer' }) as ArrayBuffer;
    
    return new NextResponse(pptxBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${ANDSKINCARE_CONFIG.customerName}_Report_${month}.pptx"`,
      },
    });
    
  } catch (error) {
    console.error('Error generating ANDskincare report:', error);
    return NextResponse.json({ 
      error: 'Failed to generate report', 
      details: String(error) 
    }, { status: 500 });
  }
}
