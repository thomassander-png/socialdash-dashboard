/**
 * PPTX Report Generator for Famefact Social Media Reporting
 * Generates monthly reports from cached Facebook and Instagram data.
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const PptxGenJS = require('pptxgenjs');
import { getFacebookPool } from './facebook-db';

// Famefact Brand Colors
const COLORS = {
  dark: '1A1A2E',
  cyan: '00D4FF',
  white: 'FFFFFF',
  gray: '6B7080',
  lightGray: 'F3F4F6',
  cardBg: '2D2D44',
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

  coverSlide.addText('Social Media Reporting', {
    x: 0.5,
    y: 2.5,
    w: '90%',
    h: 1,
    fontSize: 48,
    bold: true,
    color: COLORS.white,
    align: 'center',
  });

  coverSlide.addText(germanMonth, {
    x: 0.5,
    y: 3.8,
    w: '90%',
    h: 0.8,
    fontSize: 32,
    color: COLORS.cyan,
    align: 'center',
  });

  coverSlide.addText(config.clientName, {
    x: 0.5,
    y: 4.8,
    w: '90%',
    h: 0.5,
    fontSize: 20,
    color: COLORS.gray,
    align: 'center',
  });

  // ==================== Facebook Section ====================
  const fbData = await getFacebookData(config.reportMonth);

  if (fbData.stats && fbData.stats.total_posts > 0) {
    // Facebook separator slide
    const fbSeparator = pptx.addSlide();
    fbSeparator.background = { color: COLORS.dark };
    fbSeparator.addText('Facebook', {
      x: 0.5,
      y: 3,
      w: '90%',
      h: 1.5,
      fontSize: 56,
      bold: true,
      color: COLORS.cyan,
      align: 'center',
    });

    // Facebook KPI slide
    const fbKpiSlide = pptx.addSlide();
    fbKpiSlide.background = { color: COLORS.dark };
    
    fbKpiSlide.addText('Facebook Kennzahlen', {
      x: 0.5,
      y: 0.3,
      w: '90%',
      h: 0.8,
      fontSize: 28,
      bold: true,
      color: COLORS.white,
    });

    const stats = fbData.stats;
    const kpis: Array<Array<{text: string}>> = [
      [{ text: 'KPI' }, { text: germanMonth }],
      [{ text: 'Post-Reichweite' }, { text: formatNumber(stats.total_reach) }],
      [{ text: 'Ø Reichweite pro Post' }, { text: formatNumber(stats.avg_reach_per_post) }],
      [{ text: 'Interaktionen' }, { text: formatNumber(stats.total_interactions) }],
      [{ text: 'Reactions' }, { text: formatNumber(stats.total_reactions) }],
      [{ text: 'Kommentare' }, { text: formatNumber(stats.total_comments) }],
      [{ text: 'Video Views (3-Sek)' }, { text: formatNumber(stats.total_video_views) }],
      [{ text: 'Anzahl Postings' }, { text: String(stats.total_posts) }],
      [{ text: 'Shares (Limited)' }, { text: formatNumber(stats.total_shares) }],
    ];

    // Calculate interaction rate
    if (stats.total_reach > 0) {
      const rate = (stats.total_interactions / stats.total_reach) * 100;
      kpis.push([{ text: 'Interaktionsrate' }, { text: `${rate.toFixed(2)}%` }]);
    }

    fbKpiSlide.addTable(kpis, {
      x: 1,
      y: 1.3,
      w: 8,
      colW: [5, 3],
      border: { type: 'solid', color: COLORS.cardBg, pt: 1 },
      fill: { color: COLORS.cardBg },
      color: COLORS.white,
      fontSize: 11,
      fontFace: 'Arial',
      valign: 'middle',
      align: 'left',
    });

    // Footnotes
    fbKpiSlide.addText([
      { text: 'Interaktionsrate = Interaktionen / Post-Reichweite × 100', options: { fontSize: 8, color: COLORS.gray } },
      { text: '\nInteraktionen = Reactions + Comments (Shares separat, da eingeschränkt)', options: { fontSize: 8, color: COLORS.gray } },
    ], {
      x: 0.5,
      y: 6.5,
      w: '90%',
      h: 0.5,
    });

    // Top Posts slide
    if (fbData.topImagePosts.length > 0) {
      const topPostsSlide = pptx.addSlide();
      topPostsSlide.background = { color: COLORS.dark };
      
      topPostsSlide.addText('Postings nach Interaktion – Bilder', {
        x: 0.5,
        y: 0.3,
        w: '90%',
        h: 0.8,
        fontSize: 28,
        bold: true,
        color: COLORS.white,
      });

      // Add post cards (3x2 grid)
      const cardWidth = 4;
      const cardHeight = 2.5;
      const startX = 0.5;
      const startY = 1.3;
      const gap = 0.2;

      fbData.topImagePosts.slice(0, 6).forEach((post, i) => {
        const row = Math.floor(i / 3);
        const col = i % 3;
        const x = startX + col * (cardWidth + gap);
        const y = startY + row * (cardHeight + gap);

        // Card background
        topPostsSlide.addShape('rect', {
          x,
          y,
          w: cardWidth,
          h: cardHeight,
          fill: { color: COLORS.cardBg },
          line: { color: COLORS.cardBg },
        });

        // Date
        const postDate = new Date(post.post_created_time);
        const dateStr = postDate.toLocaleDateString('de-DE');
        topPostsSlide.addText(dateStr, {
          x: x + 0.1,
          y: y + 0.1,
          w: cardWidth - 0.2,
          h: 0.3,
          fontSize: 9,
          color: COLORS.gray,
        });

        // Message preview
        const message = post.message ? post.message.substring(0, 100) + (post.message.length > 100 ? '...' : '') : 'Kein Text';
        topPostsSlide.addText(message, {
          x: x + 0.1,
          y: y + 0.5,
          w: cardWidth - 0.2,
          h: 1.5,
          fontSize: 10,
          color: COLORS.white,
          valign: 'top',
        });

        // Interactions
        topPostsSlide.addText(`❤ ${formatNumber(post.interactions_total)} Interaktionen`, {
          x: x + 0.1,
          y: y + cardHeight - 0.5,
          w: cardWidth - 0.2,
          h: 0.4,
          fontSize: 11,
          bold: true,
          color: COLORS.cyan,
        });
      });

      // Footnote
      topPostsSlide.addText('In die Interaktionen fallen Reactions und Kommentare. Shares separat (limited).', {
        x: 0.5,
        y: 6.5,
        w: '90%',
        h: 0.3,
        fontSize: 8,
        color: COLORS.gray,
      });
    }

    // Videos slide
    if (fbData.topVideos.length > 0) {
      const videosSlide = pptx.addSlide();
      videosSlide.background = { color: COLORS.dark };
      
      videosSlide.addText('Videos nach 3-sekündige Video Views', {
        x: 0.5,
        y: 0.3,
        w: '90%',
        h: 0.8,
        fontSize: 28,
        bold: true,
        color: COLORS.white,
      });

      const cardWidth = 4;
      const cardHeight = 2.5;
      const startX = 0.5;
      const startY = 1.3;
      const gap = 0.2;

      fbData.topVideos.slice(0, 6).forEach((post, i) => {
        const row = Math.floor(i / 3);
        const col = i % 3;
        const x = startX + col * (cardWidth + gap);
        const y = startY + row * (cardHeight + gap);

        // Card background
        videosSlide.addShape('rect', {
          x,
          y,
          w: cardWidth,
          h: cardHeight,
          fill: { color: COLORS.cardBg },
          line: { color: COLORS.cardBg },
        });

        // Date
        const postDate = new Date(post.post_created_time);
        const dateStr = postDate.toLocaleDateString('de-DE');
        videosSlide.addText(dateStr, {
          x: x + 0.1,
          y: y + 0.1,
          w: cardWidth - 0.2,
          h: 0.3,
          fontSize: 9,
          color: COLORS.gray,
        });

        // Message preview
        const message = post.message ? post.message.substring(0, 100) + (post.message.length > 100 ? '...' : '') : 'Kein Text';
        videosSlide.addText(message, {
          x: x + 0.1,
          y: y + 0.5,
          w: cardWidth - 0.2,
          h: 1.5,
          fontSize: 10,
          color: COLORS.white,
          valign: 'top',
        });

        // Views
        videosSlide.addText(`👁 ${formatNumber(post.video_3s_views)} Views`, {
          x: x + 0.1,
          y: y + cardHeight - 0.5,
          w: cardWidth - 0.2,
          h: 0.4,
          fontSize: 11,
          bold: true,
          color: COLORS.cyan,
        });
      });
    }
  }

  // ==================== Fazit Slide ====================
  const fazitSlide = pptx.addSlide();
  fazitSlide.background = { color: COLORS.dark };
  
  fazitSlide.addText('Fazit', {
    x: 0.5,
    y: 0.3,
    w: '90%',
    h: 0.8,
    fontSize: 28,
    bold: true,
    color: COLORS.white,
  });

  let fazitText = '';
  if (fbData.stats && fbData.stats.total_posts > 0) {
    const stats = fbData.stats;
    fazitText += `Facebook: Im ${germanMonth} wurden ${stats.total_posts} Beiträge veröffentlicht. `;
    fazitText += `Die Gesamtreichweite betrug ${formatNumber(stats.total_reach)} `;
    fazitText += `mit ${formatNumber(stats.total_interactions)} Interaktionen. `;
    
    if (fbData.topImagePosts.length > 0) {
      const topPost = fbData.topImagePosts[0];
      fazitText += `Der Top-Post erzielte ${formatNumber(topPost.interactions_total)} Interaktionen.`;
    }
  } else {
    fazitText = 'Keine Daten für diesen Monat verfügbar.';
  }

  fazitSlide.addText(fazitText, {
    x: 0.75,
    y: 1.5,
    w: '85%',
    h: 4,
    fontSize: 16,
    color: COLORS.white,
    valign: 'top',
  });

  // ==================== Contact Slide ====================
  const contactSlide = pptx.addSlide();
  contactSlide.background = { color: COLORS.dark };

  contactSlide.addText('Vielen Dank', {
    x: 0.5,
    y: 2.5,
    w: '90%',
    h: 1,
    fontSize: 48,
    bold: true,
    color: COLORS.cyan,
    align: 'center',
  });

  contactSlide.addText(`Report erstellt für ${config.clientName}`, {
    x: 0.5,
    y: 4,
    w: '90%',
    h: 0.5,
    fontSize: 18,
    color: COLORS.gray,
    align: 'center',
  });

  contactSlide.addText(germanMonth, {
    x: 0.5,
    y: 4.5,
    w: '90%',
    h: 0.5,
    fontSize: 14,
    color: COLORS.gray,
    align: 'center',
  });

  // Generate the PPTX file
  const pptxData = await pptx.write({ outputType: 'nodebuffer' }) as Buffer;
  return pptxData;
}
