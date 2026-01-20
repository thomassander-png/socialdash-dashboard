import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import PptxGenJS from 'pptxgenjs';

// ANDskincare specific configuration
const ANDSKINCARE_CONFIG = {
  customerName: 'ANDskincare',
  pageId: '103168941408498', // ANDskincare Facebook Page ID
  igAccountId: '17841403195498656', // ANDskincare Instagram Account ID
  colors: {
    primary: '#A8D65C', // Green for posts
    secondary: '#9B59B6', // Purple for videos
    background: '#1a1a2e',
    text: '#FFFFFF',
    tableHeader: '#2ECC71',
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
}

async function getFacebookPosts(month: string): Promise<PostData[]> {
  const startDate = `${month}-01`;
  const endDate = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]), 0).toISOString().split('T')[0];
  
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
    WHERE p.page_id = $1
      AND p.created_time >= $2
      AND p.created_time < $3::date + interval '1 month'
    ORDER BY p.created_time DESC
  `, [ANDSKINCARE_CONFIG.pageId, startDate, startDate]);
  
  return posts;
}

async function getMonthlyKPIs(months: string[]): Promise<MonthlyKPI[]> {
  const kpis: MonthlyKPI[] = [];
  
  for (const month of months) {
    const startDate = `${month}-01`;
    
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
      WHERE p.page_id = $1
        AND p.created_time >= $2::date
        AND p.created_time < $2::date + interval '1 month'
    `, [ANDSKINCARE_CONFIG.pageId, startDate]);
    
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
    });
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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);
    
    // Get data
    const posts = await getFacebookPosts(month);
    
    // Calculate previous months for KPI comparison
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
    
    const kpis = await getMonthlyKPIs(months);
    
    // Create PowerPoint
    const pptx = new PptxGenJS();
    pptx.author = 'famefact GmbH';
    pptx.title = `${ANDSKINCARE_CONFIG.customerName} Social Media Report - ${getMonthName(month)}`;
    pptx.subject = 'Monthly Social Media Performance Report';
    
    // Slide 1: Cover
    const slide1 = pptx.addSlide();
    slide1.background = { color: ANDSKINCARE_CONFIG.colors.background };
    
    // ANDskincare Logo (3 circles with A-N-D)
    const circleY = 1.5;
    const circleSize = 0.8;
    const circleSpacing = 1.0;
    const startX = 3.5;
    
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
        fontSize: 24,
        bold: true,
        color: 'FFFFFF',
        align: 'center',
        valign: 'middle',
      });
    });
    
    slide1.addText('SKINCARE', {
      x: 0,
      y: 2.5,
      w: '100%',
      h: 0.5,
      fontSize: 28,
      color: '808080',
      align: 'center',
      fontFace: 'Arial',
    });
    
    slide1.addText('Social Media Reporting', {
      x: 0,
      y: 3.5,
      w: '100%',
      h: 0.6,
      fontSize: 32,
      bold: true,
      color: 'FFFFFF',
      align: 'center',
    });
    
    slide1.addText(getMonthName(month), {
      x: 0,
      y: 4.2,
      w: '100%',
      h: 0.5,
      fontSize: 24,
      color: 'CCCCCC',
      align: 'center',
    });
    
    // famefact branding
    slide1.addText('famefact', {
      x: 0.3,
      y: 5.0,
      w: 2,
      h: 0.3,
      fontSize: 14,
      color: 'A8D65C',
      fontFace: 'Arial',
    });
    
    // Slide 2: Facebook Analysis Placeholder
    const slide2 = pptx.addSlide();
    slide2.background = { color: ANDSKINCARE_CONFIG.colors.background };
    
    slide2.addText('📘 Facebook Analyse', {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.6,
      fontSize: 28,
      bold: true,
      color: 'FFFFFF',
    });
    
    slide2.addText('facebook.com/ANDskincare', {
      x: 0.5,
      y: 0.9,
      w: 9,
      h: 0.4,
      fontSize: 16,
      color: '4267B2',
    });
    
    slide2.addShape('rect', {
      x: 0.5,
      y: 1.5,
      w: 9,
      h: 3.5,
      fill: { color: '2D2D44' },
      line: { color: '444466', width: 1 },
    });
    
    slide2.addText('Screenshot der Facebook-Seite hier einfügen', {
      x: 0.5,
      y: 2.8,
      w: 9,
      h: 0.5,
      fontSize: 14,
      color: '888888',
      align: 'center',
    });
    
    // Slide 3: Facebook KPI Table
    const slide3 = pptx.addSlide();
    slide3.background = { color: ANDSKINCARE_CONFIG.colors.background };
    
    slide3.addText('📊 Facebook Kennzahlen', {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.6,
      fontSize: 28,
      bold: true,
      color: 'FFFFFF',
    });
    
    // KPI Table
    const tableData = [
      [
        { text: 'Kennzahl', options: { bold: true, fill: { color: '2ECC71' }, color: 'FFFFFF' } },
        { text: getMonthName(months[0]), options: { bold: true, fill: { color: '2ECC71' }, color: 'FFFFFF' } },
        { text: getMonthName(months[1]), options: { bold: true, fill: { color: '2ECC71' }, color: 'FFFFFF' } },
        { text: getMonthName(months[2]), options: { bold: true, fill: { color: '2ECC71' }, color: 'FFFFFF' } },
      ],
      [
        { text: 'Beiträge', options: { fill: { color: '2D2D44' }, color: 'FFFFFF' } },
        { text: kpis[0]?.posts_count.toString() || '0', options: { fill: { color: '2D2D44' }, color: 'FFFFFF' } },
        { text: kpis[1]?.posts_count.toString() || '0', options: { fill: { color: '2D2D44' }, color: 'FFFFFF' } },
        { text: kpis[2]?.posts_count.toString() || '0', options: { fill: { color: '2D2D44' }, color: 'FFFFFF' } },
      ],
      [
        { text: 'Reaktionen', options: { fill: { color: '363652' }, color: 'FFFFFF' } },
        { text: formatNumber(kpis[0]?.total_reactions || 0), options: { fill: { color: '363652' }, color: 'FFFFFF' } },
        { text: formatNumber(kpis[1]?.total_reactions || 0), options: { fill: { color: '363652' }, color: 'FFFFFF' } },
        { text: formatNumber(kpis[2]?.total_reactions || 0), options: { fill: { color: '363652' }, color: 'FFFFFF' } },
      ],
      [
        { text: 'Kommentare', options: { fill: { color: '2D2D44' }, color: 'FFFFFF' } },
        { text: formatNumber(kpis[0]?.total_comments || 0), options: { fill: { color: '2D2D44' }, color: 'FFFFFF' } },
        { text: formatNumber(kpis[1]?.total_comments || 0), options: { fill: { color: '2D2D44' }, color: 'FFFFFF' } },
        { text: formatNumber(kpis[2]?.total_comments || 0), options: { fill: { color: '2D2D44' }, color: 'FFFFFF' } },
      ],
      [
        { text: 'Reichweite', options: { fill: { color: '363652' }, color: 'FFFFFF' } },
        { text: formatNumber(kpis[0]?.total_reach || 0), options: { fill: { color: '363652' }, color: 'FFFFFF' } },
        { text: formatNumber(kpis[1]?.total_reach || 0), options: { fill: { color: '363652' }, color: 'FFFFFF' } },
        { text: formatNumber(kpis[2]?.total_reach || 0), options: { fill: { color: '363652' }, color: 'FFFFFF' } },
      ],
      [
        { text: 'Ø Reichweite/Post', options: { fill: { color: '2D2D44' }, color: 'FFFFFF' } },
        { text: formatNumber(kpis[0]?.avg_reach || 0), options: { fill: { color: '2D2D44' }, color: 'FFFFFF' } },
        { text: formatNumber(kpis[1]?.avg_reach || 0), options: { fill: { color: '2D2D44' }, color: 'FFFFFF' } },
        { text: formatNumber(kpis[2]?.avg_reach || 0), options: { fill: { color: '2D2D44' }, color: 'FFFFFF' } },
      ],
      [
        { text: 'Engagement Rate', options: { fill: { color: '363652' }, color: 'FFFFFF' } },
        { text: (kpis[0]?.engagement_rate || 0).toFixed(2) + '%', options: { fill: { color: '363652' }, color: 'FFFFFF' } },
        { text: (kpis[1]?.engagement_rate || 0).toFixed(2) + '%', options: { fill: { color: '363652' }, color: 'FFFFFF' } },
        { text: (kpis[2]?.engagement_rate || 0).toFixed(2) + '%', options: { fill: { color: '363652' }, color: 'FFFFFF' } },
      ],
    ];
    
    slide3.addTable(tableData, {
      x: 0.5,
      y: 1.2,
      w: 9,
      colW: [2.5, 2.2, 2.2, 2.1],
      fontSize: 12,
      align: 'center',
      valign: 'middle',
      border: { type: 'solid', color: '444466', pt: 1 },
    });
    
    // Slide 4: Posts by Interactions (Bar Chart)
    const slide4 = pptx.addSlide();
    slide4.background = { color: ANDSKINCARE_CONFIG.colors.background };
    
    slide4.addText('📊 Posts nach Interaktionen', {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.6,
      fontSize: 28,
      bold: true,
      color: 'FFFFFF',
    });
    
    // Sort posts by interactions and take top 5
    const topPostsByInteractions = [...posts]
      .sort((a, b) => (b.reactions_total + b.comments_total) - (a.reactions_total + a.comments_total))
      .slice(0, 5);
    
    // Draw bar chart
    const barStartX = 0.8;
    const barStartY = 4.5;
    const barWidth = 1.5;
    const barSpacing = 0.3;
    const maxInteractions = Math.max(...topPostsByInteractions.map(p => p.reactions_total + p.comments_total), 1);
    const maxBarHeight = 2.5;
    
    topPostsByInteractions.forEach((post, i) => {
      const interactions = post.reactions_total + post.comments_total;
      const barHeight = (interactions / maxInteractions) * maxBarHeight;
      const barX = barStartX + (i * (barWidth + barSpacing));
      const barY = barStartY - barHeight;
      
      // Bar
      slide4.addShape('rect', {
        x: barX,
        y: barY,
        w: barWidth,
        h: barHeight,
        fill: { color: 'A8D65C' },
      });
      
      // Value label
      slide4.addText(formatNumber(interactions), {
        x: barX,
        y: barY - 0.4,
        w: barWidth,
        h: 0.3,
        fontSize: 12,
        bold: true,
        color: 'FFFFFF',
        align: 'center',
      });
      
      // Date label
      const postDate = new Date(post.created_time);
      slide4.addText(`${postDate.getDate()}.${(postDate.getMonth() + 1).toString().padStart(2, '0')}.`, {
        x: barX,
        y: barStartY + 0.1,
        w: barWidth,
        h: 0.3,
        fontSize: 10,
        color: 'CCCCCC',
        align: 'center',
      });
    });
    
    // Slide 5: Videos by 3-Second Views
    const slide5 = pptx.addSlide();
    slide5.background = { color: ANDSKINCARE_CONFIG.colors.background };
    
    slide5.addText('🎬 Videos nach 3-Sek-Aufrufen', {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.6,
      fontSize: 28,
      bold: true,
      color: 'FFFFFF',
    });
    
    // Filter videos and sort by views
    const videoPosts = posts
      .filter(p => p.type === 'video' && p.video_3s_views && p.video_3s_views > 0)
      .sort((a, b) => (b.video_3s_views || 0) - (a.video_3s_views || 0))
      .slice(0, 5);
    
    if (videoPosts.length > 0) {
      const maxViews = Math.max(...videoPosts.map(p => p.video_3s_views || 0), 1);
      
      videoPosts.forEach((post, i) => {
        const views = post.video_3s_views || 0;
        const barHeight = (views / maxViews) * maxBarHeight;
        const barX = barStartX + (i * (barWidth + barSpacing));
        const barY = barStartY - barHeight;
        
        // Bar (purple for videos)
        slide5.addShape('rect', {
          x: barX,
          y: barY,
          w: barWidth,
          h: barHeight,
          fill: { color: '9B59B6' },
        });
        
        // Value label
        slide5.addText(formatNumber(views), {
          x: barX,
          y: barY - 0.4,
          w: barWidth,
          h: 0.3,
          fontSize: 12,
          bold: true,
          color: 'FFFFFF',
          align: 'center',
        });
        
        // Date label
        const postDate = new Date(post.created_time);
        slide5.addText(`${postDate.getDate()}.${(postDate.getMonth() + 1).toString().padStart(2, '0')}.`, {
          x: barX,
          y: barStartY + 0.1,
          w: barWidth,
          h: 0.3,
          fontSize: 10,
          color: 'CCCCCC',
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
    
    // Slide 6: Top Postings
    const slide6 = pptx.addSlide();
    slide6.background = { color: ANDSKINCARE_CONFIG.colors.background };
    
    slide6.addText('🏆 Top Postings', {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.6,
      fontSize: 28,
      bold: true,
      color: 'FFFFFF',
    });
    
    const top3Posts = topPostsByInteractions.slice(0, 3);
    
    top3Posts.forEach((post, i) => {
      const cardX = 0.5 + (i * 3.2);
      const cardY = 1.2;
      const cardW = 3;
      const cardH = 3.5;
      
      // Card background
      slide6.addShape('rect', {
        x: cardX,
        y: cardY,
        w: cardW,
        h: cardH,
        fill: { color: '2D2D44' },
        line: { color: '444466', width: 1 },
      });
      
      // Rank badge
      slide6.addShape('ellipse', {
        x: cardX + 0.1,
        y: cardY + 0.1,
        w: 0.4,
        h: 0.4,
        fill: { color: 'A8D65C' },
      });
      slide6.addText((i + 1).toString(), {
        x: cardX + 0.1,
        y: cardY + 0.1,
        w: 0.4,
        h: 0.4,
        fontSize: 14,
        bold: true,
        color: '1a1a2e',
        align: 'center',
        valign: 'middle',
      });
      
      // Image placeholder
      slide6.addShape('rect', {
        x: cardX + 0.2,
        y: cardY + 0.6,
        w: cardW - 0.4,
        h: 1.8,
        fill: { color: '3D3D5C' },
      });
      slide6.addText('📷', {
        x: cardX + 0.2,
        y: cardY + 1.2,
        w: cardW - 0.4,
        h: 0.5,
        fontSize: 24,
        align: 'center',
      });
      
      // Metrics
      const interactions = post.reactions_total + post.comments_total;
      slide6.addText(`${formatNumber(interactions)} Interaktionen`, {
        x: cardX + 0.2,
        y: cardY + 2.5,
        w: cardW - 0.4,
        h: 0.3,
        fontSize: 12,
        bold: true,
        color: 'A8D65C',
        align: 'center',
      });
      
      slide6.addText(`👍 ${formatNumber(post.reactions_total)}  💬 ${formatNumber(post.comments_total)}`, {
        x: cardX + 0.2,
        y: cardY + 2.85,
        w: cardW - 0.4,
        h: 0.25,
        fontSize: 10,
        color: 'CCCCCC',
        align: 'center',
      });
      
      // Date
      const postDate = new Date(post.created_time);
      slide6.addText(`${postDate.getDate()}.${(postDate.getMonth() + 1).toString().padStart(2, '0')}.${postDate.getFullYear()}`, {
        x: cardX + 0.2,
        y: cardY + 3.15,
        w: cardW - 0.4,
        h: 0.25,
        fontSize: 9,
        color: '888888',
        align: 'center',
      });
    });
    
    // Slide 7: Demographics Placeholder
    const slide7 = pptx.addSlide();
    slide7.background = { color: ANDSKINCARE_CONFIG.colors.background };
    
    slide7.addText('👥 Demographie', {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.6,
      fontSize: 28,
      bold: true,
      color: 'FFFFFF',
    });
    
    slide7.addShape('rect', {
      x: 0.5,
      y: 1.2,
      w: 9,
      h: 3.8,
      fill: { color: '2D2D44' },
      line: { color: '444466', width: 1 },
    });
    
    slide7.addText('Screenshot der Demographie-Daten hier einfügen\n(Alter & Geschlecht aus Facebook Insights)', {
      x: 0.5,
      y: 2.8,
      w: 9,
      h: 0.8,
      fontSize: 14,
      color: '888888',
      align: 'center',
    });
    
    // Generate file
    const buffer = await pptx.write({ outputType: 'arraybuffer' }) as ArrayBuffer;
    
    // Return as downloadable file
    const filename = `ANDskincare_Report_${month}.pptx`;
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
    
  } catch (error) {
    console.error('Error generating ANDskincare report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
