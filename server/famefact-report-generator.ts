/**
 * FAMEFACT STANDARD REPORT GENERATOR
 * Generates PPTX reports matching the famefact template exactly.
 * 
 * Key features:
 * - White background (not dark theme)
 * - KPI tables (not cards)
 * - Images INSIDE bars (not above)
 * - Rectangular bars (no rounded corners)
 * - Outline platform icons
 * - Standard footer with famefact icon and page number
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const PptxGenJS = require('pptxgenjs');
import { getFacebookPool } from './facebook-db';

// ==================== COLORS ====================
const COLORS = {
  // Brand Colors
  famefact: '2962AE',
  
  // Platform Colors
  facebook: '1877F2',
  instagram: 'E1306C',
  
  // Table Colors
  headerBg: '1a3a5c',
  headerText: 'FFFFFF',
  rowEven: 'FFFFFF',
  rowOdd: 'F8F9FA',
  
  // Text Colors
  textPrimary: '000000',
  textSecondary: '666666',
  textGray: '999999',
  
  // Background
  slideBg: 'FFFFFF',
  outroBg: '000000',
  
  // Borders
  border: 'CCCCCC',
  gridLine: 'EEEEEE',
};

// ==================== GERMAN MONTHS ====================
const GERMAN_MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

function getGermanMonth(month: string): string {
  const [year, monthNum] = month.split('-').map(Number);
  return `${GERMAN_MONTHS[monthNum - 1]} ${year}`;
}

function getMonthName(month: string): string {
  const [, monthNum] = month.split('-').map(Number);
  return GERMAN_MONTHS[monthNum - 1];
}

// ==================== NUMBER FORMATTING ====================
function formatNum(num: number | null | undefined, prefix = ''): string {
  if (num === null || num === undefined) return '-';
  const n = Number(num);
  if (isNaN(n)) return '-';
  return prefix + n.toLocaleString('de-DE');
}

function formatPercent(num: number | null | undefined): string {
  if (num === null || num === undefined) return '-';
  const n = Number(num);
  if (isNaN(n)) return '-';
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' %';
}

function formatCurrency(num: number | null | undefined): string {
  if (num === null || num === undefined) return '-';
  const n = Number(num);
  if (isNaN(n)) return '-';
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function formatDate(dateStr: string | Date, format = 'DD.MM.YYYY'): string {
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  if (format === 'DD.MM.') return `${day}.${month}.`;
  if (format === 'DD.MM.YY') return `${day}.${month}.${String(year).slice(-2)}`;
  return `${day}.${month}.${year}`;
}

// ==================== INTERFACES ====================
interface ReportConfig {
  clientName: string;
  clientLogoUrl?: string;
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
  organic_reach?: number;
  paid_reach?: number;
  follower_growth?: number;
  follower_total?: number;
  interaction_rate?: number;
  ad_spend?: number;
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

// ==================== SLIDE DIMENSIONS ====================
const SLIDE = {
  width: 10,
  height: 5.63,
  margin: 0.5,
  footerY: 5.2,
};

// ==================== FOOTER ====================
function addStandardFooter(slide: any, pageNumber: number) {
  // famefact icon (hexagon placeholder - using text for now)
  slide.addText('⬡', {
    x: 0.3,
    y: SLIDE.footerY,
    w: 0.3,
    h: 0.3,
    fontSize: 14,
    color: COLORS.famefact,
    fontFace: 'Arial',
  });
  
  // Page number (right)
  slide.addText(String(pageNumber), {
    x: SLIDE.width - 0.8,
    y: SLIDE.footerY,
    w: 0.5,
    h: 0.3,
    align: 'right',
    fontSize: 10,
    color: COLORS.textGray,
    fontFace: 'Arial',
  });
}

// ==================== PLATFORM ICON ====================
function addPlatformIcon(slide: any, platform: 'facebook' | 'instagram', x: number, y: number, size: number) {
  // Outline circle
  slide.addShape('ellipse', {
    x,
    y,
    w: size,
    h: size,
    line: { color: COLORS.textPrimary, pt: 2 },
    fill: { type: 'none' },
  });
  
  // Platform symbol
  if (platform === 'facebook') {
    slide.addText('f', {
      x,
      y,
      w: size,
      h: size,
      align: 'center',
      valign: 'middle',
      fontSize: size * 28,
      fontFace: 'Arial',
      bold: true,
      color: COLORS.textPrimary,
    });
  } else {
    // Instagram camera icon (simplified)
    slide.addText('📷', {
      x,
      y,
      w: size,
      h: size,
      align: 'center',
      valign: 'middle',
      fontSize: size * 20,
    });
  }
}

// ==================== KPI TABLE ====================
function addKpiTable(
  slide: any,
  title: string,
  platform: 'facebook' | 'instagram',
  currentMonth: string,
  prevMonth: string,
  prevPrevMonth: string,
  data: FacebookStats,
  prevData: FacebookStats | null,
  prevPrevData: FacebookStats | null
) {
  // Platform icon (small)
  addPlatformIcon(slide, platform, 0.5, 0.4, 0.5);
  
  // Title
  slide.addText(title, {
    x: 1.1,
    y: 0.4,
    w: 8,
    h: 0.5,
    fontSize: 24,
    bold: true,
    color: COLORS.textPrimary,
    fontFace: 'Arial',
  });
  
  // Build table data
  const tableData = [
    ['KPI', getMonthName(currentMonth), prevMonth ? getMonthName(prevMonth) : '-', prevPrevMonth ? getMonthName(prevPrevMonth) : '-'],
    ['Follower Wachstum', formatNum(data.follower_growth, data.follower_growth && data.follower_growth > 0 ? '+' : ''), prevData ? formatNum(prevData.follower_growth, prevData.follower_growth && prevData.follower_growth > 0 ? '+' : '') : '-', '-'],
    ['Follower total', formatNum(data.follower_total), prevData ? formatNum(prevData.follower_total) : '-', '-'],
    ['Post-Reichweite', formatNum(data.total_reach), prevData ? formatNum(prevData.total_reach) : '-', '-'],
    ['Organische Reichweite', formatNum(data.organic_reach), prevData ? formatNum(prevData.organic_reach) : '-', '-'],
    ['Bezahlte Reichweite', formatNum(data.paid_reach), prevData ? formatNum(prevData.paid_reach) : '-', '-'],
    ['⊘ Reichweite pro Post', formatNum(data.avg_reach_per_post), prevData ? formatNum(prevData.avg_reach_per_post) : '-', '-'],
    ['Interaktionen', formatNum(data.total_interactions), prevData ? formatNum(prevData.total_interactions) : '-', '-'],
    ['Video Views (3-Sek)', formatNum(data.total_video_views), prevData ? formatNum(prevData.total_video_views) : '-', '-'],
    ['Interaktionsrate*', formatPercent(data.interaction_rate), prevData ? formatPercent(prevData.interaction_rate) : '-', '-'],
    ['Anzahl an Postings', String(data.total_posts), prevData ? String(prevData.total_posts) : '-', '-'],
    ['PPA Ausgaben in €', formatCurrency(data.ad_spend), prevData ? formatCurrency(prevData.ad_spend) : '-', '-'],
  ];
  
  // Create table
  slide.addTable(tableData, {
    x: 0.5,
    y: 1.1,
    w: 9,
    colW: [2.8, 2, 2, 2],
    border: { type: 'solid', pt: 0.5, color: COLORS.border },
    fontFace: 'Arial',
    fontSize: 10,
    rowH: 0.32,
    fill: { type: 'solid', color: COLORS.rowEven },
    color: COLORS.textPrimary,
    valign: 'middle',
  });
  
  // Style header row
  // Note: pptxgenjs doesn't support per-row styling in addTable, so we overlay
  slide.addShape('rect', {
    x: 0.5,
    y: 1.1,
    w: 9,
    h: 0.32,
    fill: { color: COLORS.headerBg },
    line: { type: 'none' },
  });
  
  // Header text
  const headers = ['KPI', getMonthName(currentMonth), prevMonth ? getMonthName(prevMonth) : '-', prevPrevMonth ? getMonthName(prevPrevMonth) : '-'];
  const colWidths = [2.8, 2, 2, 2];
  let xPos = 0.5;
  headers.forEach((header, i) => {
    slide.addText(header, {
      x: xPos,
      y: 1.1,
      w: colWidths[i],
      h: 0.32,
      align: i === 0 ? 'left' : 'center',
      valign: 'middle',
      fontSize: 10,
      bold: true,
      color: COLORS.headerText,
      fontFace: 'Arial',
      margin: i === 0 ? [0, 0, 0, 0.1] : 0,
    });
    xPos += colWidths[i];
  });
  
  // Footnote
  slide.addText('*Die Interaktionsrate berechnet sich mit den Interaktionen geteilt durch die Post-Reichweite mal hundert.', {
    x: 0.5,
    y: 4.9,
    w: 9,
    h: 0.25,
    fontSize: 8,
    color: COLORS.textSecondary,
    fontFace: 'Arial',
  });
}

// ==================== BAR CHART WITH IMAGES ====================
function addBarChartWithImages(
  slide: any,
  title: string,
  subtitle: string,
  platform: 'facebook' | 'instagram',
  posts: FacebookPost[],
  valueField: 'interactions_total' | 'video_3s_views',
  pageNumber: number
) {
  // Platform icon (small)
  addPlatformIcon(slide, platform, 0.5, 0.3, 0.4);
  
  // Title
  slide.addText(title, {
    x: 1.0,
    y: 0.3,
    w: 8,
    h: 0.4,
    fontSize: 18,
    bold: true,
    color: COLORS.textPrimary,
    fontFace: 'Arial',
  });
  
  // Subtitle
  slide.addText(subtitle, {
    x: 1.0,
    y: 0.65,
    w: 8,
    h: 0.25,
    fontSize: 10,
    color: COLORS.textSecondary,
    fontFace: 'Arial',
  });
  
  const topPosts = posts.slice(0, 4);
  if (topPosts.length === 0) {
    slide.addText('Keine Daten verfügbar', {
      x: 0.5,
      y: 2.5,
      w: 9,
      h: 0.5,
      align: 'center',
      fontSize: 14,
      color: COLORS.textSecondary,
    });
    addStandardFooter(slide, pageNumber);
    return;
  }
  
  // Chart dimensions
  const chartLeft = 1.2;
  const chartBottom = 4.5;
  const chartWidth = 8;
  const maxBarHeight = 3.2;
  const barWidth = 1.0;
  const barSpacing = 1.8;
  
  // Calculate max value for Y-axis
  const values = topPosts.map(p => Number(p[valueField]) || 0);
  const maxValue = Math.max(...values, 1);
  
  // Y-axis values (5 steps)
  const yAxisSteps = 5;
  const stepValue = Math.ceil(maxValue / yAxisSteps / 100) * 100;
  
  // Draw Y-axis lines and labels
  for (let i = 0; i <= yAxisSteps; i++) {
    const value = i * stepValue;
    const y = chartBottom - (i / yAxisSteps) * maxBarHeight;
    
    // Horizontal grid line
    slide.addShape('line', {
      x: chartLeft - 0.1,
      y: y,
      w: chartWidth,
      h: 0,
      line: { color: COLORS.gridLine, pt: 0.5 },
    });
    
    // Y-axis label
    slide.addText(formatNum(value), {
      x: 0.2,
      y: y - 0.12,
      w: 0.9,
      h: 0.25,
      align: 'right',
      fontSize: 9,
      color: COLORS.textSecondary,
      fontFace: 'Arial',
    });
  }
  
  // Draw bars and images
  const platformColor = platform === 'facebook' ? COLORS.facebook : COLORS.instagram;
  
  topPosts.forEach((post, index) => {
    const value = Number(post[valueField]) || 0;
    const barHeight = (value / (stepValue * yAxisSteps)) * maxBarHeight;
    const barX = chartLeft + (index * barSpacing) + 0.3;
    const barY = chartBottom - barHeight;
    
    // Draw bar (RECTANGULAR - no rounded corners!)
    slide.addShape('rect', {
      x: barX,
      y: barY,
      w: barWidth,
      h: barHeight,
      fill: { color: platformColor },
      line: { type: 'none' },
    });
    
    // Image INSIDE the bar (centered, near top)
    const imgSize = 0.7;
    const imgX = barX + (barWidth - imgSize) / 2;
    const imgY = barY + 0.1;  // 0.1 inches from top of bar
    
    if (post.media_url || post.thumbnail_url) {
      slide.addImage({
        path: post.thumbnail_url || post.media_url,
        x: imgX,
        y: imgY,
        w: imgSize,
        h: imgSize,
        sizing: { type: 'cover', w: imgSize, h: imgSize },
      });
    }
    
    // Value label above bar
    slide.addText(formatNum(value), {
      x: barX - 0.1,
      y: barY - 0.3,
      w: barWidth + 0.2,
      h: 0.25,
      align: 'center',
      fontSize: 10,
      bold: true,
      color: COLORS.textPrimary,
      fontFace: 'Arial',
    });
    
    // Date below bar
    slide.addText(formatDate(post.post_created_time, 'DD.MM.YYYY'), {
      x: barX - 0.2,
      y: chartBottom + 0.1,
      w: barWidth + 0.4,
      h: 0.25,
      align: 'center',
      fontSize: 9,
      color: COLORS.textSecondary,
      fontFace: 'Arial',
    });
  });
  
  // Footnote
  const footnote = valueField === 'interactions_total' 
    ? 'In die Interaktionen fallen Likes, Kommentare und Shares.*'
    : 'Video Views = 3-sekündige Videoaufrufe';
  slide.addText(footnote, {
    x: 0.5,
    y: 4.95,
    w: 9,
    h: 0.2,
    fontSize: 8,
    color: COLORS.textSecondary,
    fontFace: 'Arial',
  });
  
  addStandardFooter(slide, pageNumber);
}

// ==================== DATA LOADING ====================
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
        COUNT(DISTINCT p.post_id) as total_posts,
        COALESCE(SUM(m.reach), 0) as total_reach,
        COALESCE(SUM(m.impressions), 0) as total_impressions,
        COALESCE(SUM(m.reactions_total), 0) as total_reactions,
        COALESCE(SUM(m.comments_total), 0) as total_comments,
        COALESCE(SUM(CASE WHEN m.shares_limited = false THEN m.shares_total ELSE 0 END), 0) as total_shares,
        COALESCE(SUM(m.video_3s_views), 0) as total_video_views,
        COALESCE(SUM(m.reactions_total + m.comments_total), 0) as total_interactions,
        CASE WHEN COUNT(DISTINCT p.post_id) > 0 
          THEN COALESCE(SUM(m.reach), 0) / COUNT(DISTINCT p.post_id) 
          ELSE 0 
        END as avg_reach_per_post
      FROM fb_posts p
      LEFT JOIN LATERAL (
        SELECT * FROM fb_post_metrics 
        WHERE post_id = p.post_id 
        ORDER BY snapshot_time DESC 
        LIMIT 1
      ) m ON true
      WHERE DATE_TRUNC('month', p.created_time) = DATE_TRUNC('month', $1::date)
    `, [monthDate]);

    // Get top image posts
    const imagePostsResult = await pool.query(`
      SELECT 
        p.post_id,
        p.page_id,
        p.created_time as post_created_time,
        p.type as post_type,
        p.permalink,
        p.message,
        m.reactions_total,
        m.comments_total,
        m.shares_total,
        m.reach,
        m.impressions,
        m.video_3s_views,
        (m.reactions_total + m.comments_total) as interactions_total,
        p.media_url,
        p.thumbnail_url
      FROM fb_posts p
      LEFT JOIN LATERAL (
        SELECT * FROM fb_post_metrics 
        WHERE post_id = p.post_id 
        ORDER BY snapshot_time DESC 
        LIMIT 1
      ) m ON true
      WHERE DATE_TRUNC('month', p.created_time) = DATE_TRUNC('month', $1::date)
        AND p.type IN ('photo', 'link', 'status', 'album')
      ORDER BY (m.reactions_total + m.comments_total) DESC
      LIMIT 4
    `, [monthDate]);

    // Get top videos
    const videosResult = await pool.query(`
      SELECT 
        p.post_id,
        p.page_id,
        p.created_time as post_created_time,
        p.type as post_type,
        p.permalink,
        p.message,
        m.reactions_total,
        m.comments_total,
        m.shares_total,
        m.reach,
        m.impressions,
        m.video_3s_views,
        (m.reactions_total + m.comments_total) as interactions_total,
        p.media_url,
        p.thumbnail_url
      FROM fb_posts p
      LEFT JOIN LATERAL (
        SELECT * FROM fb_post_metrics 
        WHERE post_id = p.post_id 
        ORDER BY snapshot_time DESC 
        LIMIT 1
      ) m ON true
      WHERE DATE_TRUNC('month', p.created_time) = DATE_TRUNC('month', $1::date)
        AND p.type = 'video'
      ORDER BY m.video_3s_views DESC NULLS LAST
      LIMIT 4
    `, [monthDate]);

    const stats = statsResult.rows[0] as FacebookStats;
    
    // Calculate interaction rate
    if (stats && stats.total_reach > 0) {
      stats.interaction_rate = (stats.total_interactions / stats.total_reach) * 100;
    }

    return {
      stats,
      topImagePosts: imagePostsResult.rows as FacebookPost[],
      topVideos: videosResult.rows as FacebookPost[],
    };
  } catch (error) {
    console.error('Error fetching Facebook data:', error);
    return { stats: null, topImagePosts: [], topVideos: [] };
  }
}

// ==================== MAIN GENERATOR ====================
export async function generateFamefactReport(config: ReportConfig): Promise<Buffer> {
  const pptx = new PptxGenJS();
  
  // Set presentation properties
  pptx.author = 'famefact';
  pptx.title = `Social Media Report - ${config.clientName} - ${getGermanMonth(config.reportMonth)}`;
  pptx.subject = 'Monthly Social Media Report';
  pptx.layout = 'LAYOUT_16x9';

  const germanMonth = getGermanMonth(config.reportMonth);
  const monthName = getMonthName(config.reportMonth);
  let pageNumber = 1;

  // ==================== SLIDE 1: COVER ====================
  const coverSlide = pptx.addSlide();
  coverSlide.background = { color: COLORS.slideBg };

  // Customer logo (if available)
  if (config.clientLogoUrl) {
    coverSlide.addImage({
      path: config.clientLogoUrl,
      x: 3.5,
      y: 1.5,
      w: 3,
      h: 1.5,
      sizing: { type: 'contain', w: 3, h: 1.5 },
    });
  } else {
    // Placeholder text for logo
    coverSlide.addText(config.clientName, {
      x: 0,
      y: 1.8,
      w: '100%',
      h: 0.8,
      align: 'center',
      fontSize: 36,
      bold: true,
      color: COLORS.textPrimary,
      fontFace: 'Arial',
    });
  }

  coverSlide.addText('Social Media Reporting', {
    x: 0,
    y: 3.2,
    w: '100%',
    h: 0.5,
    align: 'center',
    fontSize: 24,
    color: COLORS.textPrimary,
    fontFace: 'Arial',
  });

  coverSlide.addText(germanMonth, {
    x: 0,
    y: 3.7,
    w: '100%',
    h: 0.5,
    align: 'center',
    fontSize: 18,
    color: COLORS.textSecondary,
    fontFace: 'Arial',
  });
  // No footer on cover

  // ==================== FACEBOOK SECTION ====================
  const fbData = await getFacebookData(config.reportMonth);
  
  // Calculate previous months
  const [year, month] = config.reportMonth.split('-').map(Number);
  const prevMonth = month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, '0')}`;
  const prevPrevMonth = month <= 2 
    ? `${year - 1}-${String(12 + month - 2).padStart(2, '0')}` 
    : `${year}-${String(month - 2).padStart(2, '0')}`;

  if (fbData.stats && fbData.stats.total_posts > 0) {
    pageNumber++;
    
    // ==================== SLIDE 2: FACEBOOK SEPARATOR ====================
    const fbSeparator = pptx.addSlide();
    fbSeparator.background = { color: COLORS.slideBg };
    
    // Large platform icon (outline)
    addPlatformIcon(fbSeparator, 'facebook', 4.25, 0.8, 1.5);
    
    fbSeparator.addText('Facebook', {
      x: 0,
      y: 2.5,
      w: '100%',
      h: 0.8,
      align: 'center',
      fontSize: 36,
      bold: true,
      color: COLORS.textPrimary,
      fontFace: 'Arial',
    });
    
    addStandardFooter(fbSeparator, pageNumber);
    pageNumber++;

    // ==================== SLIDE 3: FACEBOOK KPI TABLE ====================
    const fbKpiSlide = pptx.addSlide();
    fbKpiSlide.background = { color: COLORS.slideBg };
    
    // Get previous month data for comparison
    const prevFbData = await getFacebookData(prevMonth);
    
    addKpiTable(
      fbKpiSlide,
      'Facebook Kennzahlen',
      'facebook',
      config.reportMonth,
      prevMonth,
      prevPrevMonth,
      fbData.stats,
      prevFbData.stats,
      null
    );
    
    addStandardFooter(fbKpiSlide, pageNumber);
    pageNumber++;

    // ==================== SLIDE 4: FACEBOOK TOP POSTS ====================
    if (fbData.topImagePosts.length > 0) {
      const fbPostsSlide = pptx.addSlide();
      fbPostsSlide.background = { color: COLORS.slideBg };
      
      addBarChartWithImages(
        fbPostsSlide,
        'Postings nach Interaktion: Bilder',
        'In die Interaktionen fallen Likes, Kommentare und Shares.*',
        'facebook',
        fbData.topImagePosts,
        'interactions_total',
        pageNumber
      );
      pageNumber++;
    }

    // ==================== SLIDE 5: FACEBOOK TOP VIDEOS ====================
    if (fbData.topVideos.length > 0) {
      const fbVideosSlide = pptx.addSlide();
      fbVideosSlide.background = { color: COLORS.slideBg };
      
      addBarChartWithImages(
        fbVideosSlide,
        'Videos nach 3-sekündige Video Views',
        '',
        'facebook',
        fbData.topVideos,
        'video_3s_views',
        pageNumber
      );
      pageNumber++;
    }
  }

  // ==================== SLIDE 12: FAZIT ====================
  const fazitSlide = pptx.addSlide();
  fazitSlide.background = { color: COLORS.slideBg };
  
  fazitSlide.addText(`Fazit ${monthName}`, {
    x: 0,
    y: 0.3,
    w: '100%',
    h: 0.6,
    align: 'center',
    fontSize: 24,
    bold: true,
    color: COLORS.textPrimary,
    fontFace: 'Arial',
  });
  
  // Facebook section
  if (fbData.stats) {
    addPlatformIcon(fazitSlide, 'facebook', 0.5, 1.0, 0.4);
    
    fazitSlide.addText('FACEBOOK:', {
      x: 1.0,
      y: 1.0,
      w: 8,
      h: 0.35,
      fontSize: 12,
      bold: true,
      color: COLORS.textPrimary,
      fontFace: 'Arial',
    });
    
    const fbFazitText = `Der ${monthName} zeigte eine positive Entwicklung. Die Post-Reichweite lag bei ${formatNum(fbData.stats.total_reach)} Personen. Mit insgesamt ${formatNum(fbData.stats.total_interactions)} Interaktionen und ${formatNum(fbData.stats.total_video_views)} Video Views (3-Sekunden-Views) bestätigte sich, dass die Inhalte gut von der Community angenommen wurden. Die Interaktionsrate lag bei ${formatPercent(fbData.stats.interaction_rate)}.`;
    
    fazitSlide.addText(fbFazitText, {
      x: 0.5,
      y: 1.4,
      w: 9,
      h: 1.5,
      fontSize: 10,
      color: COLORS.textPrimary,
      fontFace: 'Arial',
      valign: 'top',
    });
  }
  
  addStandardFooter(fazitSlide, pageNumber);
  pageNumber++;

  // ==================== SLIDE 13: OUTRO ====================
  const outroSlide = pptx.addSlide();
  outroSlide.background = { color: COLORS.outroBg };
  
  // famefact logo text (placeholder)
  outroSlide.addText('famefact', {
    x: 0.5,
    y: 0.4,
    w: 2,
    h: 0.4,
    fontSize: 18,
    bold: true,
    color: COLORS.headerText,
    fontFace: 'Arial',
  });
  
  outroSlide.addText('first in socialtainment', {
    x: 0.5,
    y: 0.8,
    w: 2.5,
    h: 0.25,
    fontSize: 9,
    italic: true,
    color: '9ACD32',
    fontFace: 'Arial',
  });
  
  // Contact info
  const contactLines = [
    { text: 'Robert Arnold', bold: true, size: 16 },
    { text: 'Teamleader Social Media', bold: false, size: 11 },
    { text: '', bold: false, size: 10 },
    { text: 'track by track GmbH', bold: false, size: 10 },
    { text: 'Schliemannstraße 23', bold: false, size: 10 },
    { text: 'D-10437 Berlin', bold: false, size: 10 },
    { text: '', bold: false, size: 10 },
    { text: 'E-Mail: robert.arnold@famefact.com', bold: false, size: 10 },
  ];
  
  let yPos = 2.5;
  contactLines.forEach(line => {
    if (line.text) {
      outroSlide.addText(line.text, {
        x: 0.5,
        y: yPos,
        w: 5,
        h: 0.35,
        fontSize: line.size,
        bold: line.bold,
        color: COLORS.headerText,
        fontFace: 'Arial',
      });
    }
    yPos += 0.35;
  });
  // No footer on outro

  // Generate the PPTX file
  const pptxBuffer = await pptx.write({ outputType: 'nodebuffer' });
  return pptxBuffer as Buffer;
}

export default generateFamefactReport;
