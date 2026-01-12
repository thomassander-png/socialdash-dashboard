/**
 * PPTX Report Generator for Famefact Social Media Reporting
 * Generates premium monthly reports from cached Facebook and Instagram data.
 * Uses pptxgenjs for PowerPoint generation with native charts.
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const PptxGenJS = require('pptxgenjs');
import { getFacebookPool } from './facebook-db';

// Famefact Brand Colors - Premium Dark Theme
const COLORS = {
  dark: '0D0D0D',
  darkCard: '1A1A1A',
  accent: '00D4FF',
  accentGreen: '22C55E',
  accentRed: 'EF4444',
  accentPurple: '8B5CF6',
  accentOrange: 'F59E0B',
  white: 'FFFFFF',
  gray: '9CA3AF',
  lightGray: 'F3F4F6',
  border: '2D2D2D',
};

// German month names
const GERMAN_MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

function getGermanMonth(month: string): string {
  const [year, monthNum] = month.split('-').map(Number);
  return `${GERMAN_MONTHS[monthNum - 1]} ${year}`;
}

function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '0';
  const n = Number(num);
  return n.toLocaleString('de-DE');
}

function formatNumberShort(num: number | null | undefined): string {
  if (num === null || num === undefined) return '0';
  const n = Number(num);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('de-DE');
}

interface ReportConfig {
  clientName: string;
  reportMonth: string; // YYYY-MM format
}

interface FacebookStats {
  total_posts: number;
  total_reach: number;
  total_impressions: number;
  total_reactions: number;
  total_comments: number;
  total_shares: number;
  total_video_views: number;
  total_interactions: number;
  avg_reach_per_post: number;
}

interface FacebookPost {
  post_id: string;
  page_id: string;
  post_created_time: Date;
  post_type: string;
  permalink: string | null;
  message: string | null;
  reactions_total: number;
  comments_total: number;
  shares_total: number | null;
  reach: number | null;
  impressions: number | null;
  video_3s_views: number | null;
  interactions_total: number;
  media_url: string | null;
  thumbnail_url: string | null;
}

async function getFacebookData(month: string): Promise<{
  stats: FacebookStats | null;
  topImagePosts: FacebookPost[];
  topVideos: FacebookPost[];
}> {
  const pool = getFacebookPool();
  if (!pool) {
    return { stats: null, topImagePosts: [], topVideos: [] };
  }

  try {
    const monthDate = `${month}-01`;

    // Get monthly stats
    const statsResult = await pool.query(`
      SELECT 
        COUNT(DISTINCT post_id) as total_posts,
        COALESCE(SUM(reach), 0) as total_reach,
        COALESCE(SUM(impressions), 0) as total_impressions,
        COALESCE(SUM(reactions_total), 0) as total_reactions,
        COALESCE(SUM(comments_total), 0) as total_comments,
        COALESCE(SUM(shares_total), 0) as total_shares,
        COALESCE(SUM(video_3s_views), 0) as total_video_views,
        COALESCE(SUM(reactions_total), 0) + COALESCE(SUM(comments_total), 0) as total_interactions,
        CASE WHEN COUNT(DISTINCT post_id) > 0 
          THEN COALESCE(SUM(reach), 0) / COUNT(DISTINCT post_id) 
          ELSE 0 
        END as avg_reach_per_post
      FROM view_fb_monthly_post_metrics
      WHERE month = $1
    `, [monthDate]);

    const stats = statsResult.rows[0] || null;

    // Get top image posts
    const imagePostsResult = await pool.query(`
      SELECT * FROM view_fb_monthly_post_metrics 
      WHERE month = $1 
      AND post_type IN ('photo', 'image', 'link', 'status')
      ORDER BY interactions_total DESC
      LIMIT 9
    `, [monthDate]);

    // Get top videos
    const videosResult = await pool.query(`
      SELECT * FROM view_fb_monthly_post_metrics 
      WHERE month = $1 
      AND post_type IN ('video', 'reel')
      AND video_3s_views IS NOT NULL
      ORDER BY video_3s_views DESC NULLS LAST
      LIMIT 6
    `, [monthDate]);

    return {
      stats,
      topImagePosts: imagePostsResult.rows,
      topVideos: videosResult.rows,
    };
  } catch (error) {
    console.error('Error fetching Facebook data:', error);
    return { stats: null, topImagePosts: [], topVideos: [] };
  }
}

// Helper function to add a premium KPI card
function addKpiCard(
  slide: any,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  value: string,
  subtitle?: string,
  trend?: number
) {
  // Card background with subtle border
  slide.addShape('roundRect', {
    x,
    y,
    w,
    h,
    fill: { color: COLORS.darkCard },
    line: { color: COLORS.border, pt: 1 },
    rectRadius: 0.1,
  });

  // Title
  slide.addText(title, {
    x: x + 0.15,
    y: y + 0.15,
    w: w - 0.3,
    h: 0.3,
    fontSize: 10,
    color: COLORS.gray,
    fontFace: 'Arial',
  });

  // Value
  slide.addText(value, {
    x: x + 0.15,
    y: y + 0.45,
    w: w - 0.3,
    h: 0.5,
    fontSize: 24,
    bold: true,
    color: COLORS.white,
    fontFace: 'Arial',
  });

  // Trend indicator
  if (trend !== undefined) {
    const isPositive = trend >= 0;
    const trendColor = isPositive ? COLORS.accentGreen : COLORS.accentRed;
    const trendText = `${isPositive ? '↑' : '↓'} ${Math.abs(trend).toFixed(1)}%`;
    
    slide.addText(trendText, {
      x: x + w - 0.8,
      y: y + 0.15,
      w: 0.65,
      h: 0.25,
      fontSize: 9,
      bold: true,
      color: trendColor,
      align: 'right',
    });
  }

  // Subtitle
  if (subtitle) {
    slide.addText(subtitle, {
      x: x + 0.15,
      y: y + h - 0.35,
      w: w - 0.3,
      h: 0.25,
      fontSize: 8,
      color: COLORS.gray,
      fontFace: 'Arial',
    });
  }
}

// Helper function to add a premium post card
function addPostCard(
  slide: any,
  x: number,
  y: number,
  w: number,
  h: number,
  post: FacebookPost,
  rank: number
) {
  // Card background
  slide.addShape('roundRect', {
    x,
    y,
    w,
    h,
    fill: { color: COLORS.darkCard },
    line: { color: COLORS.border, pt: 1 },
    rectRadius: 0.1,
  });

  // Rank badge
  slide.addShape('roundRect', {
    x: x + 0.1,
    y: y + 0.1,
    w: 0.3,
    h: 0.3,
    fill: { color: COLORS.accent },
    rectRadius: 0.05,
  });
  slide.addText(`${rank}`, {
    x: x + 0.1,
    y: y + 0.1,
    w: 0.3,
    h: 0.3,
    fontSize: 11,
    bold: true,
    color: COLORS.dark,
    align: 'center',
    valign: 'middle',
  });

  // Date
  const postDate = new Date(post.post_created_time);
  const dateStr = postDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  slide.addText(dateStr, {
    x: x + 0.5,
    y: y + 0.1,
    w: w - 0.6,
    h: 0.3,
    fontSize: 9,
    color: COLORS.gray,
  });

  // Message preview
  const message = post.message 
    ? post.message.substring(0, 80) + (post.message.length > 80 ? '...' : '') 
    : 'Kein Text';
  slide.addText(message, {
    x: x + 0.1,
    y: y + 0.5,
    w: w - 0.2,
    h: h - 1.1,
    fontSize: 9,
    color: COLORS.white,
    valign: 'top',
  });

  // Metrics row at bottom
  const metricsY = y + h - 0.5;
  
  // Interactions
  slide.addText(`❤ ${formatNumberShort(post.interactions_total)}`, {
    x: x + 0.1,
    y: metricsY,
    w: (w - 0.2) / 2,
    h: 0.35,
    fontSize: 10,
    bold: true,
    color: COLORS.accent,
  });

  // Reach
  if (post.reach) {
    slide.addText(`👁 ${formatNumberShort(post.reach)}`, {
      x: x + 0.1 + (w - 0.2) / 2,
      y: metricsY,
      w: (w - 0.2) / 2,
      h: 0.35,
      fontSize: 10,
      color: COLORS.gray,
      align: 'right',
    });
  }
}

export async function generateReport(config: ReportConfig): Promise<Buffer> {
  const pptx = new PptxGenJS();
  
  // Set presentation properties
  pptx.author = 'Famefact';
  pptx.title = `Social Media Report - ${config.clientName} - ${getGermanMonth(config.reportMonth)}`;
  pptx.subject = 'Monthly Social Media Report';
  pptx.layout = 'LAYOUT_16x9';

  const germanMonth = getGermanMonth(config.reportMonth);

  // ==================== Cover Slide ====================
  const coverSlide = pptx.addSlide();
  coverSlide.background = { color: COLORS.dark };

  // Decorative accent line
  coverSlide.addShape('rect', {
    x: 0,
    y: 2.3,
    w: 13.33,
    h: 0.02,
    fill: { color: COLORS.accent },
  });

  coverSlide.addText('SOCIAL MEDIA', {
    x: 0.5,
    y: 2.5,
    w: '90%',
    h: 0.8,
    fontSize: 20,
    color: COLORS.gray,
    align: 'center',
    fontFace: 'Arial',
  });

  coverSlide.addText('REPORTING', {
    x: 0.5,
    y: 3.0,
    w: '90%',
    h: 1.2,
    fontSize: 56,
    bold: true,
    color: COLORS.white,
    align: 'center',
    fontFace: 'Arial',
  });

  coverSlide.addText(germanMonth, {
    x: 0.5,
    y: 4.3,
    w: '90%',
    h: 0.6,
    fontSize: 28,
    color: COLORS.accent,
    align: 'center',
    fontFace: 'Arial',
  });

  coverSlide.addText(config.clientName, {
    x: 0.5,
    y: 5.2,
    w: '90%',
    h: 0.5,
    fontSize: 16,
    color: COLORS.gray,
    align: 'center',
    fontFace: 'Arial',
  });

  // ==================== Facebook Section ====================
  const fbData = await getFacebookData(config.reportMonth);

  if (fbData.stats && fbData.stats.total_posts > 0) {
    // Facebook separator slide
    const fbSeparator = pptx.addSlide();
    fbSeparator.background = { color: COLORS.dark };
    
    // Facebook icon placeholder
    fbSeparator.addShape('ellipse', {
      x: 5.9,
      y: 2.5,
      w: 1.5,
      h: 1.5,
      fill: { color: '1877F2' },
    });
    fbSeparator.addText('f', {
      x: 5.9,
      y: 2.5,
      w: 1.5,
      h: 1.5,
      fontSize: 48,
      bold: true,
      color: COLORS.white,
      align: 'center',
      valign: 'middle',
      fontFace: 'Arial',
    });

    fbSeparator.addText('Facebook', {
      x: 0.5,
      y: 4.2,
      w: '90%',
      h: 1,
      fontSize: 48,
      bold: true,
      color: COLORS.white,
      align: 'center',
      fontFace: 'Arial',
    });

    fbSeparator.addText('Performance Übersicht', {
      x: 0.5,
      y: 5.0,
      w: '90%',
      h: 0.5,
      fontSize: 18,
      color: COLORS.gray,
      align: 'center',
      fontFace: 'Arial',
    });

    // ==================== Facebook KPI Slide ====================
    const fbKpiSlide = pptx.addSlide();
    fbKpiSlide.background = { color: COLORS.dark };
    
    fbKpiSlide.addText('Facebook Kennzahlen', {
      x: 0.5,
      y: 0.3,
      w: '90%',
      h: 0.6,
      fontSize: 24,
      bold: true,
      color: COLORS.white,
      fontFace: 'Arial',
    });

    fbKpiSlide.addText(germanMonth, {
      x: 0.5,
      y: 0.75,
      w: '90%',
      h: 0.35,
      fontSize: 12,
      color: COLORS.gray,
      fontFace: 'Arial',
    });

    const stats = fbData.stats;
    
    // KPI Cards - Row 1 (4 cards)
    const cardW = 2.9;
    const cardH = 1.3;
    const startX = 0.5;
    const startY = 1.3;
    const gapX = 0.2;
    const gapY = 0.2;

    addKpiCard(fbKpiSlide, startX, startY, cardW, cardH, 
      'Post-Reichweite', formatNumber(stats.total_reach), 'Unique Users erreicht');
    addKpiCard(fbKpiSlide, startX + cardW + gapX, startY, cardW, cardH, 
      'Impressionen', formatNumber(stats.total_impressions), 'Gesamte Aufrufe');
    addKpiCard(fbKpiSlide, startX + 2 * (cardW + gapX), startY, cardW, cardH, 
      'Interaktionen', formatNumber(stats.total_interactions), 'Reactions + Comments');
    addKpiCard(fbKpiSlide, startX + 3 * (cardW + gapX), startY, cardW, cardH, 
      'Ø Reichweite/Post', formatNumber(stats.avg_reach_per_post), 'Durchschnitt');

    // KPI Cards - Row 2 (4 cards)
    const row2Y = startY + cardH + gapY;
    addKpiCard(fbKpiSlide, startX, row2Y, cardW, cardH, 
      'Reactions', formatNumber(stats.total_reactions), 'Likes, Love, etc.');
    addKpiCard(fbKpiSlide, startX + cardW + gapX, row2Y, cardW, cardH, 
      'Kommentare', formatNumber(stats.total_comments), 'Nutzer-Kommentare');
    addKpiCard(fbKpiSlide, startX + 2 * (cardW + gapX), row2Y, cardW, cardH, 
      'Video Views', formatNumber(stats.total_video_views), '3-Sekunden Views');
    addKpiCard(fbKpiSlide, startX + 3 * (cardW + gapX), row2Y, cardW, cardH, 
      'Beiträge', String(stats.total_posts), 'Veröffentlichte Posts');

    // Shares card with "Limited" badge
    const sharesY = row2Y + cardH + gapY;
    addKpiCard(fbKpiSlide, startX, sharesY, cardW, cardH, 
      'Shares (Limited)', formatNumber(stats.total_shares), 'Eingeschränkt verfügbar');

    // Interaction rate card
    if (stats.total_reach > 0) {
      const rate = (stats.total_interactions / stats.total_reach) * 100;
      addKpiCard(fbKpiSlide, startX + cardW + gapX, sharesY, cardW, cardH, 
        'Interaktionsrate', `${rate.toFixed(2)}%`, 'Interaktionen / Reichweite');
    }

    // Native Bar Chart for KPI comparison
    const chartData = [
      { name: 'Reactions', value: Number(stats.total_reactions) },
      { name: 'Comments', value: Number(stats.total_comments) },
      { name: 'Shares', value: Number(stats.total_shares) },
    ];

    fbKpiSlide.addChart(pptx.ChartType.bar, [
      {
        name: 'Interaktionen',
        labels: chartData.map(d => d.name),
        values: chartData.map(d => d.value),
      }
    ], {
      x: startX + 2 * (cardW + gapX),
      y: sharesY,
      w: 2 * cardW + gapX,
      h: cardH + 0.5,
      chartColors: [COLORS.accent],
      showValue: true,
      dataLabelPosition: 'outEnd',
      dataLabelFontSize: 9,
      dataLabelColor: COLORS.white,
      barDir: 'bar',
      barGapWidthPct: 50,
      catAxisHidden: false,
      catAxisLabelColor: COLORS.gray,
      catAxisLabelFontSize: 9,
      valAxisHidden: true,
      showLegend: false,
      fill: COLORS.darkCard,
      border: { pt: 0 },
    });

    // Footnotes
    fbKpiSlide.addText([
      { text: '• Interaktionen = Reactions + Comments (Shares separat, da API-Einschränkung)', options: { fontSize: 8, color: COLORS.gray } },
      { text: '\n• Saves werden nicht angezeigt (nicht über Graph API verfügbar)', options: { fontSize: 8, color: COLORS.gray } },
    ], {
      x: 0.5,
      y: 6.3,
      w: '90%',
      h: 0.5,
    });

    // ==================== Top Posts Slide ====================
    if (fbData.topImagePosts.length > 0) {
      const topPostsSlide = pptx.addSlide();
      topPostsSlide.background = { color: COLORS.dark };
      
      topPostsSlide.addText('Top Beiträge nach Interaktionen', {
        x: 0.5,
        y: 0.3,
        w: '70%',
        h: 0.6,
        fontSize: 24,
        bold: true,
        color: COLORS.white,
        fontFace: 'Arial',
      });

      topPostsSlide.addText('Bilder & Links', {
        x: 0.5,
        y: 0.75,
        w: '70%',
        h: 0.35,
        fontSize: 12,
        color: COLORS.gray,
        fontFace: 'Arial',
      });

      // Post cards (3x2 grid)
      const postCardW = 3.9;
      const postCardH = 2.3;
      const postStartX = 0.5;
      const postStartY = 1.3;
      const postGap = 0.2;

      fbData.topImagePosts.slice(0, 6).forEach((post, i) => {
        const row = Math.floor(i / 3);
        const col = i % 3;
        const x = postStartX + col * (postCardW + postGap);
        const y = postStartY + row * (postCardH + postGap);
        addPostCard(topPostsSlide, x, y, postCardW, postCardH, post, i + 1);
      });

      // Footnote
      topPostsSlide.addText('Interaktionen = Reactions + Kommentare. Shares werden separat gezählt (API-Einschränkung).', {
        x: 0.5,
        y: 6.3,
        w: '90%',
        h: 0.3,
        fontSize: 8,
        color: COLORS.gray,
      });
    }

    // ==================== Videos Slide ====================
    if (fbData.topVideos.length > 0) {
      const videosSlide = pptx.addSlide();
      videosSlide.background = { color: COLORS.dark };
      
      videosSlide.addText('Top Videos nach Views', {
        x: 0.5,
        y: 0.3,
        w: '70%',
        h: 0.6,
        fontSize: 24,
        bold: true,
        color: COLORS.white,
        fontFace: 'Arial',
      });

      videosSlide.addText('3-Sekunden Video Views', {
        x: 0.5,
        y: 0.75,
        w: '70%',
        h: 0.35,
        fontSize: 12,
        color: COLORS.gray,
        fontFace: 'Arial',
      });

      // Video cards (3x2 grid)
      const videoCardW = 3.9;
      const videoCardH = 2.3;
      const videoStartX = 0.5;
      const videoStartY = 1.3;
      const videoGap = 0.2;

      fbData.topVideos.slice(0, 6).forEach((post, i) => {
        const row = Math.floor(i / 3);
        const col = i % 3;
        const x = videoStartX + col * (videoCardW + videoGap);
        const y = videoStartY + row * (videoCardH + videoGap);

        // Card background
        videosSlide.addShape('roundRect', {
          x,
          y,
          w: videoCardW,
          h: videoCardH,
          fill: { color: COLORS.darkCard },
          line: { color: COLORS.border, pt: 1 },
          rectRadius: 0.1,
        });

        // Rank badge
        videosSlide.addShape('roundRect', {
          x: x + 0.1,
          y: y + 0.1,
          w: 0.3,
          h: 0.3,
          fill: { color: COLORS.accentPurple },
          rectRadius: 0.05,
        });
        videosSlide.addText(`${i + 1}`, {
          x: x + 0.1,
          y: y + 0.1,
          w: 0.3,
          h: 0.3,
          fontSize: 11,
          bold: true,
          color: COLORS.white,
          align: 'center',
          valign: 'middle',
        });

        // Date
        const postDate = new Date(post.post_created_time);
        const dateStr = postDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        videosSlide.addText(dateStr, {
          x: x + 0.5,
          y: y + 0.1,
          w: videoCardW - 0.6,
          h: 0.3,
          fontSize: 9,
          color: COLORS.gray,
        });

        // Message preview
        const message = post.message 
          ? post.message.substring(0, 80) + (post.message.length > 80 ? '...' : '') 
          : 'Kein Text';
        videosSlide.addText(message, {
          x: x + 0.1,
          y: y + 0.5,
          w: videoCardW - 0.2,
          h: videoCardH - 1.1,
          fontSize: 9,
          color: COLORS.white,
          valign: 'top',
        });

        // Views
        videosSlide.addText(`▶ ${formatNumberShort(post.video_3s_views)} Views`, {
          x: x + 0.1,
          y: y + videoCardH - 0.5,
          w: videoCardW - 0.2,
          h: 0.35,
          fontSize: 10,
          bold: true,
          color: COLORS.accentPurple,
        });
      });
    }
  }

  // ==================== Fazit Slide ====================
  const fazitSlide = pptx.addSlide();
  fazitSlide.background = { color: COLORS.dark };
  
  fazitSlide.addText('Zusammenfassung', {
    x: 0.5,
    y: 0.3,
    w: '90%',
    h: 0.6,
    fontSize: 24,
    bold: true,
    color: COLORS.white,
    fontFace: 'Arial',
  });

  fazitSlide.addText(germanMonth, {
    x: 0.5,
    y: 0.75,
    w: '90%',
    h: 0.35,
    fontSize: 12,
    color: COLORS.gray,
    fontFace: 'Arial',
  });

  // Summary cards
  if (fbData.stats && fbData.stats.total_posts > 0) {
    const stats = fbData.stats;
    
    // Facebook summary card
    fazitSlide.addShape('roundRect', {
      x: 0.5,
      y: 1.3,
      w: 11.5,
      h: 2.5,
      fill: { color: COLORS.darkCard },
      line: { color: COLORS.border, pt: 1 },
      rectRadius: 0.1,
    });

    // Facebook icon
    fazitSlide.addShape('ellipse', {
      x: 0.7,
      y: 1.5,
      w: 0.6,
      h: 0.6,
      fill: { color: '1877F2' },
    });
    fazitSlide.addText('f', {
      x: 0.7,
      y: 1.5,
      w: 0.6,
      h: 0.6,
      fontSize: 20,
      bold: true,
      color: COLORS.white,
      align: 'center',
      valign: 'middle',
    });

    fazitSlide.addText('Facebook', {
      x: 1.5,
      y: 1.5,
      w: 3,
      h: 0.6,
      fontSize: 18,
      bold: true,
      color: COLORS.white,
      valign: 'middle',
    });

    // Summary text
    let summaryText = `Im ${germanMonth} wurden ${stats.total_posts} Beiträge veröffentlicht.\n\n`;
    summaryText += `Die Gesamtreichweite betrug ${formatNumber(stats.total_reach)} Nutzer `;
    summaryText += `mit ${formatNumber(stats.total_interactions)} Interaktionen.\n\n`;
    
    if (fbData.topImagePosts.length > 0) {
      const topPost = fbData.topImagePosts[0];
      summaryText += `Der erfolgreichste Beitrag erzielte ${formatNumber(topPost.interactions_total)} Interaktionen`;
      if (topPost.reach) {
        summaryText += ` bei einer Reichweite von ${formatNumber(topPost.reach)} Nutzern`;
      }
      summaryText += '.';
    }

    fazitSlide.addText(summaryText, {
      x: 0.7,
      y: 2.2,
      w: 11,
      h: 1.4,
      fontSize: 12,
      color: COLORS.white,
      valign: 'top',
      fontFace: 'Arial',
    });

    // Key metrics row
    const metricsY = 4.0;
    const metricW = 2.8;
    const metricGap = 0.2;

    // Metric 1: Posts
    fazitSlide.addText(String(stats.total_posts), {
      x: 0.5,
      y: metricsY,
      w: metricW,
      h: 0.5,
      fontSize: 28,
      bold: true,
      color: COLORS.accent,
      align: 'center',
    });
    fazitSlide.addText('Beiträge', {
      x: 0.5,
      y: metricsY + 0.5,
      w: metricW,
      h: 0.3,
      fontSize: 10,
      color: COLORS.gray,
      align: 'center',
    });

    // Metric 2: Reach
    fazitSlide.addText(formatNumberShort(stats.total_reach), {
      x: 0.5 + metricW + metricGap,
      y: metricsY,
      w: metricW,
      h: 0.5,
      fontSize: 28,
      bold: true,
      color: COLORS.accent,
      align: 'center',
    });
    fazitSlide.addText('Reichweite', {
      x: 0.5 + metricW + metricGap,
      y: metricsY + 0.5,
      w: metricW,
      h: 0.3,
      fontSize: 10,
      color: COLORS.gray,
      align: 'center',
    });

    // Metric 3: Interactions
    fazitSlide.addText(formatNumberShort(stats.total_interactions), {
      x: 0.5 + 2 * (metricW + metricGap),
      y: metricsY,
      w: metricW,
      h: 0.5,
      fontSize: 28,
      bold: true,
      color: COLORS.accent,
      align: 'center',
    });
    fazitSlide.addText('Interaktionen', {
      x: 0.5 + 2 * (metricW + metricGap),
      y: metricsY + 0.5,
      w: metricW,
      h: 0.3,
      fontSize: 10,
      color: COLORS.gray,
      align: 'center',
    });

    // Metric 4: Engagement Rate
    if (stats.total_reach > 0) {
      const rate = (stats.total_interactions / stats.total_reach) * 100;
      fazitSlide.addText(`${rate.toFixed(2)}%`, {
        x: 0.5 + 3 * (metricW + metricGap),
        y: metricsY,
        w: metricW,
        h: 0.5,
        fontSize: 28,
        bold: true,
        color: COLORS.accent,
        align: 'center',
      });
      fazitSlide.addText('Engagement', {
        x: 0.5 + 3 * (metricW + metricGap),
        y: metricsY + 0.5,
        w: metricW,
        h: 0.3,
        fontSize: 10,
        color: COLORS.gray,
        align: 'center',
      });
    }
  } else {
    fazitSlide.addText('Keine Daten für diesen Monat verfügbar.', {
      x: 0.75,
      y: 1.5,
      w: '85%',
      h: 2,
      fontSize: 16,
      color: COLORS.gray,
      valign: 'top',
    });
  }

  // ==================== Contact Slide ====================
  const contactSlide = pptx.addSlide();
  contactSlide.background = { color: COLORS.dark };

  // Decorative accent line
  contactSlide.addShape('rect', {
    x: 0,
    y: 2.3,
    w: 13.33,
    h: 0.02,
    fill: { color: COLORS.accent },
  });

  contactSlide.addText('Vielen Dank', {
    x: 0.5,
    y: 2.5,
    w: '90%',
    h: 1,
    fontSize: 48,
    bold: true,
    color: COLORS.white,
    align: 'center',
    fontFace: 'Arial',
  });

  contactSlide.addText(`Report erstellt für ${config.clientName}`, {
    x: 0.5,
    y: 3.8,
    w: '90%',
    h: 0.5,
    fontSize: 16,
    color: COLORS.gray,
    align: 'center',
    fontFace: 'Arial',
  });

  contactSlide.addText(germanMonth, {
    x: 0.5,
    y: 4.3,
    w: '90%',
    h: 0.5,
    fontSize: 14,
    color: COLORS.accent,
    align: 'center',
    fontFace: 'Arial',
  });

  // Footer
  contactSlide.addText('Powered by Famefact', {
    x: 0.5,
    y: 6.5,
    w: '90%',
    h: 0.3,
    fontSize: 10,
    color: COLORS.gray,
    align: 'center',
    fontFace: 'Arial',
  });

  // Generate the PPTX file
  const pptxData = await pptx.write({ outputType: 'nodebuffer' }) as Buffer;
  return pptxData;
}
