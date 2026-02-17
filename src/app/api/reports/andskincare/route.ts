import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import PptxGenJS from 'pptxgenjs';

// ANDskincare specific configuration - HIGH-END AGENCY LEVEL design
const CONFIG = {
  customerName: 'ANDskincare',
  customerSlug: 'andskincare',
  facebookUrl: 'facebook.com/ANDskincare',
  instagramHandle: 'and.skincare',
  // Global styling - Typography hierarchy
  fontFamily: 'Inter',
  fontFamilyFallback: 'Arial',
  // Premium margins (0.5 inch on all sides)
  margin: 0.5,
  // Brand colors
  colors: {
    // Primary brand colors
    primary: '84CC16',       // Lime green (Facebook accent)
    secondary: 'A855F7',     // Purple (Instagram accent)
    // famefact brand colors
    green: 'A8D65C',         // Posts bars
    purple: 'B8A9C9',        // Videos/Reels bars
    // Premium background (not pure white)
    background: 'F9F9F9',    // Light gray background
    // Basic colors
    white: 'FFFFFF',
    black: '000000',
    gray: '666666',
    lightGray: 'F5F5F5',
    darkGray: '333333',
    mediumGray: '999999',
    // Table colors
    tableHeader: '84CC16',   // Primary green header
    tableHeaderIG: 'A855F7', // Purple header for Instagram
    // Trend colors
    trendUp: '22C55E',       // Green for positive trends
    trendDown: 'EF4444',     // Red for negative trends
    trendNeutral: 'EAB308',  // Yellow for neutral (2-5%)
    // Demographics colors
    lightBlue: '7DD3E1',     // Women
    darkBlue: '2B7A8C',      // Men
    // Branding line
    brandingLine: '84CC16',  // Top branding line color
    // Shadow color
    shadow: 'E0E0E0',
  },
  // Contact info for outro slide
  contact: {
    name: 'Sophie Rettig',
    title: 'Social Media Managerin',
    company: 'track by track GmbH',
    address: 'Schliemannstraße 23',
    city: 'D-10437 Berlin',
    email: 'sophie.rettig@famefact.com',
    phone: '+49 157 51639979',
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
  saves?: number | null;
}

interface MonthlyKPI {
  month: string;
  posts_count: number;
  total_reactions: number;
  total_comments: number;
  total_shares: number;
  total_reach: number;
  total_impressions: number;
  total_video_views: number;
  total_saves: number;
  avg_reach: number;
  engagement_rate: number;
  followers: number;
  new_followers: number;
}

// Get page IDs for ANDskincare
async function getPageIds(platform: 'facebook' | 'instagram'): Promise<string[]> {
  const result = await query<{ account_id: string }>(`
    SELECT ca.account_id 
    FROM customer_accounts ca 
    JOIN customers c ON ca.customer_id = c.customer_id 
    WHERE LOWER(REPLACE(c.name, ' ', '-')) = LOWER($1) 
      AND ca.platform = $2
  `, [CONFIG.customerSlug, platform]);
  return result.map(r => r.account_id);
}

// Get Facebook posts for a month
async function getFacebookPosts(month: string, pageIds: string[]): Promise<PostData[]> {
  if (pageIds.length === 0) return [];
  const startDate = `${month}-01`;
  const placeholders = pageIds.map((_, i) => `$${i + 3}`).join(', ');
  
  const posts = await query<PostData>(`
    SELECT 
      p.post_id, p.message, p.created_time, p.type, p.permalink,
      COALESCE(m.reactions_total, 0) as reactions_total,
      COALESCE(m.comments_total, 0) as comments_total,
      m.shares_total, m.reach, m.impressions, m.video_3s_views,
      p.thumbnail_url
    FROM fb_posts p
    LEFT JOIN LATERAL (
      SELECT * FROM fb_post_metrics WHERE post_id = p.post_id ORDER BY snapshot_time DESC LIMIT 1
    ) m ON true
    WHERE p.page_id IN (${placeholders})
      AND p.created_time >= $1 AND p.created_time < $2::date + interval '1 month'
    ORDER BY p.created_time DESC
  `, [startDate, startDate, ...pageIds]);
  return posts;
}

// Get Instagram posts for a month
async function getInstagramPosts(month: string, pageIds: string[]): Promise<PostData[]> {
  if (pageIds.length === 0) return [];
  const startDate = `${month}-01`;
  const endDate = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() + 1, 1).toISOString().slice(0, 10);
  const placeholders = pageIds.map((_, i) => `$${i + 3}`).join(', ');
  
  try {
    const posts = await query<PostData>(`
      SELECT 
        p.media_id as post_id, p.caption as message, p.timestamp as created_time,
        p.media_type as type, p.permalink,
        COALESCE(m.likes, 0) as reactions_total,
        COALESCE(m.comments, 0) as comments_total,
        NULL as shares_total, m.reach, m.impressions,
        NULL as video_3s_views,
        COALESCE(p.thumbnail_url, p.media_url) as thumbnail_url,
        COALESCE(m.saves, 0) as saves
      FROM ig_posts p
      LEFT JOIN LATERAL (
        SELECT * FROM ig_post_metrics WHERE media_id = p.media_id ORDER BY snapshot_time DESC LIMIT 1
      ) m ON true
      WHERE p.account_id IN (${placeholders})
        AND p.timestamp::date >= $1::date AND p.timestamp::date < $2::date
      ORDER BY (COALESCE(m.likes, 0) + COALESCE(m.comments, 0)) DESC
    `, [startDate, endDate, ...pageIds]);
    return posts;
  } catch (error) {
    console.error('Error fetching Instagram posts:', error);
    return [];
  }
}

// Get follower data for multiple months
async function getFollowerData(months: string[], pageIds: string[], platform: 'facebook' | 'instagram'): Promise<{month: string, followers: number}[]> {
  if (pageIds.length === 0) return months.map(m => ({ month: m, followers: 0 }));
  
  const table = platform === 'facebook' ? 'fb_follower_history' : 'ig_follower_history';
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

// Get monthly KPIs
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
          SELECT 
            COUNT(DISTINCT p.post_id) as posts_count,
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
        // Instagram
        const result = await query<any>(`
          SELECT 
            COUNT(DISTINCT p.media_id) as posts_count,
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

// Helper functions
function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace('.', ',') + ' Mio.';
  if (num >= 1000) return num.toLocaleString('de-DE');
  return num.toString();
}

function formatDate(date: Date): string {
  const d = new Date(date);
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.`;
}

function formatDateShort(date: Date): string {
  const d = new Date(date);
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
}

function getMonthName(month: string): string {
  const [year, monthNum] = month.split('-');
  const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 
                  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  return `${months[parseInt(monthNum) - 1]} ${year}`;
}

function getShortMonthName(month: string): string {
  const [, monthNum] = month.split('-');
  const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 
                  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  return months[parseInt(monthNum) - 1];
}

// Get trend color based on percentage change
function getTrendColor(currentValue: number, previousValue: number): string {
  if (previousValue === 0) return CONFIG.colors.gray;
  const change = ((currentValue - previousValue) / previousValue) * 100;
  if (change >= 5) return CONFIG.colors.trendUp;
  if (change <= -5) return CONFIG.colors.trendDown;
  return CONFIG.colors.trendNeutral;
}

// Get trend text with color
function getTrendText(currentValue: number, previousValue: number): { text: string; color: string; percentage: number } {
  if (previousValue === 0) return { text: '—', color: CONFIG.colors.gray, percentage: 0 };
  const change = ((currentValue - previousValue) / previousValue) * 100;
  const text = (change >= 0 ? '+' : '') + change.toFixed(1).replace('.', ',') + '%';
  return { text, color: getTrendColor(currentValue, previousValue), percentage: change };
}

// Add premium branding line to top of each slide
function addBrandingLine(slide: PptxGenJS.Slide, color: string = CONFIG.colors.brandingLine) {
  // Elegant thin branding line at top
  slide.addShape('rect', {
    x: 0, y: 0, w: '100%', h: 0.06,
    fill: { color: color }
  });
}

// Add subtle design element (watermark-style)
function addSubtleWatermark(slide: PptxGenJS.Slide) {
  // Very subtle diagonal line pattern in corner
  slide.addShape('rect', {
    x: 9.2, y: 0, w: 0.8, h: 0.06,
    fill: { color: CONFIG.colors.secondary, transparency: 70 }
  });
}

// Add famefact icon and page number to slide (bottom)
function addFamefactIcon(slide: PptxGenJS.Slide, pageNum: number) {
  // Minimalist hexagon icon
  slide.addShape('hexagon', {
    x: CONFIG.margin, y: 4.95, w: 0.3, h: 0.3,
    fill: { color: CONFIG.colors.primary },
  });
  // Page number (bottom right) - Light font weight
  slide.addText(pageNum.toString().padStart(2, '0'), {
    x: 9.5 - CONFIG.margin, y: 5.1, w: 0.5, h: 0.3,
    fontSize: 10, color: CONFIG.colors.mediumGray, align: 'right', fontFace: CONFIG.fontFamily
  });
}

// Draw professional icon using shapes (replaces emojis)
function drawUserIcon(slide: PptxGenJS.Slide, x: number, y: number, size: number, color: string) {
  // Head (circle)
  slide.addShape('ellipse', {
    x: x + size * 0.3, y: y, w: size * 0.4, h: size * 0.4,
    fill: { color: color }
  });
  // Body (rounded rect)
  slide.addShape('roundRect', {
    x: x + size * 0.15, y: y + size * 0.45, w: size * 0.7, h: size * 0.5,
    fill: { color: color },
    rectRadius: 0.1
  });
}

function drawEyeIcon(slide: PptxGenJS.Slide, x: number, y: number, size: number, color: string) {
  // Eye outline (ellipse)
  slide.addShape('ellipse', {
    x: x, y: y + size * 0.25, w: size, h: size * 0.5,
    line: { color: color, width: 2 }
  });
  // Pupil (filled circle)
  slide.addShape('ellipse', {
    x: x + size * 0.35, y: y + size * 0.35, w: size * 0.3, h: size * 0.3,
    fill: { color: color }
  });
}

function drawChatIcon(slide: PptxGenJS.Slide, x: number, y: number, size: number, color: string) {
  // Chat bubble (rounded rect)
  slide.addShape('roundRect', {
    x: x, y: y, w: size, h: size * 0.7,
    fill: { color: color },
    rectRadius: 0.1
  });
  // Tail (triangle simulated with small rect)
  slide.addShape('rect', {
    x: x + size * 0.15, y: y + size * 0.65, w: size * 0.2, h: size * 0.2,
    fill: { color: color },
    rotate: 45
  });
}

// Create Premium KPI table with zero-row filtering
function createPremiumKPITable(
  slide: PptxGenJS.Slide, 
  kpis: MonthlyKPI[], 
  startY: number,
  platform: 'facebook' | 'instagram'
): void {
  const tableX = CONFIG.margin;
  const tableW = 10 - (CONFIG.margin * 2);
  const colW = [3.2, 2.2, 2.2, 2.2];
  const rowH = 0.38;
  const headerH = 0.48;
  const headerColor = platform === 'facebook' ? CONFIG.colors.tableHeader : CONFIG.colors.tableHeaderIG;
  
  // Shadow effect for header
  slide.addShape('roundRect', {
    x: tableX + 0.03, y: startY + 0.03, w: tableW, h: headerH,
    fill: { color: CONFIG.colors.shadow },
    rectRadius: 0.12
  });
  
  // Draw rounded header background
  slide.addShape('roundRect', {
    x: tableX, y: startY, w: tableW, h: headerH,
    fill: { color: headerColor },
    rectRadius: 0.12
  });
  
  // Header texts - Bold weight
  const headers = ['KPI', getShortMonthName(kpis[2].month), getShortMonthName(kpis[1].month), getShortMonthName(kpis[0].month)];
  let xPos = tableX;
  headers.forEach((header, idx) => {
    slide.addText(header, {
      x: xPos + 0.1, y: startY, w: colW[idx] - 0.2, h: headerH,
      fontSize: 11, bold: true, color: CONFIG.colors.white, 
      fontFace: CONFIG.fontFamily, align: idx === 0 ? 'left' : 'center', valign: 'middle'
    });
    xPos += colW[idx];
  });
  
  // Define data rows based on platform
  const dataRows: { label: string; values: string[]; isEngagementRate?: boolean; rawValues?: number[] }[] = platform === 'facebook' ? [
    { 
      label: 'Neue Fans', 
      values: kpis.map(k => k.new_followers > 0 ? `+${k.new_followers}` : k.new_followers.toString()),
      rawValues: kpis.map(k => Math.abs(k.new_followers))
    },
    { 
      label: 'Fans total', 
      values: kpis.map(k => formatNumber(k.followers)),
      rawValues: kpis.map(k => k.followers)
    },
    { 
      label: 'Post-Reichweite', 
      values: kpis.map(k => formatNumber(k.total_reach)),
      rawValues: kpis.map(k => k.total_reach)
    },
    { 
      label: 'Ø Reichweite pro Post', 
      values: kpis.map(k => formatNumber(k.avg_reach)),
      rawValues: kpis.map(k => k.avg_reach)
    },
    { 
      label: 'Interaktionen (Teilen, Liken, Kommentieren)', 
      values: kpis.map(k => formatNumber(k.total_reactions + k.total_comments + k.total_shares)),
      rawValues: kpis.map(k => k.total_reactions + k.total_comments + k.total_shares)
    },
    { 
      label: '3-sekündige Video Plays', 
      values: kpis.map(k => formatNumber(k.total_video_views)),
      rawValues: kpis.map(k => k.total_video_views)
    },
    { 
      label: 'Interaktionsrate', 
      values: kpis.map(k => k.engagement_rate.toFixed(2).replace('.', ',') + '%'),
      isEngagementRate: true,
      rawValues: kpis.map(k => k.engagement_rate)
    },
    { 
      label: 'Anzahl der Postings', 
      values: kpis.map(k => k.posts_count.toString()),
      rawValues: kpis.map(k => k.posts_count)
    },
  ] : [
    { label: 'Neue Follower', values: kpis.map(k => k.new_followers > 0 ? `+${k.new_followers}` : k.new_followers.toString()), rawValues: kpis.map(k => Math.abs(k.new_followers)) },
    { label: 'Follower total', values: kpis.map(k => formatNumber(k.followers)), rawValues: kpis.map(k => k.followers) },
    { label: 'Post-Reichweite', values: kpis.map(k => formatNumber(k.total_reach)), rawValues: kpis.map(k => k.total_reach) },
    { label: 'Ø Reichweite pro Post', values: kpis.map(k => formatNumber(k.avg_reach)), rawValues: kpis.map(k => k.avg_reach) },
    { label: 'Interaktionen (Likes, Kommentare, Saves)', values: kpis.map(k => formatNumber(k.total_reactions + k.total_comments + k.total_saves)), rawValues: kpis.map(k => k.total_reactions + k.total_comments + k.total_saves) },
    { label: 'Saves', values: kpis.map(k => k.total_saves.toString()), rawValues: kpis.map(k => k.total_saves) },
    { label: 'Interaktionsrate', values: kpis.map(k => k.engagement_rate.toFixed(2).replace('.', ',') + '%'), isEngagementRate: true, rawValues: kpis.map(k => k.engagement_rate) },
    { label: 'Anzahl an Postings', values: kpis.map(k => k.posts_count.toString()), rawValues: kpis.map(k => k.posts_count) },
  ];
  
  // Filter out rows where all values are 0 (cleaner report)
  const filteredRows = dataRows.filter(row => {
    if (!row.rawValues) return true;
    return row.rawValues.some(v => v !== 0);
  });
  
  let currentY = startY + headerH + 0.05;
  filteredRows.forEach((row, rowIdx) => {
    const isAlt = rowIdx % 2 === 0;
    const bgColor = isAlt ? CONFIG.colors.lightGray : CONFIG.colors.white;
    
    // Row background with subtle border
    slide.addShape('rect', {
      x: tableX, y: currentY, w: tableW, h: rowH,
      fill: { color: bgColor },
      line: { color: 'E8E8E8', width: 0.3 }
    });
    
    // Label cell - Light weight
    slide.addText(row.label, {
      x: tableX + 0.15, y: currentY, w: colW[0] - 0.2, h: rowH,
      fontSize: 10, color: CONFIG.colors.darkGray, fontFace: CONFIG.fontFamily,
      align: 'left', valign: 'middle'
    });
    
    // Value cells with trend coloring
    let cellX = tableX + colW[0];
    for (let i = 2; i >= 0; i--) {
      let textColor = CONFIG.colors.black;
      let isBold = false;
      
      // Apply trend coloring for engagement rate
      if (row.isEngagementRate) {
        const rate = kpis[i].engagement_rate;
        if (rate >= 5) textColor = CONFIG.colors.trendUp;
        else if (rate >= 2) textColor = CONFIG.colors.trendNeutral;
        else textColor = CONFIG.colors.trendDown;
        isBold = true;
      }
      
      slide.addText(row.values[i], {
        x: cellX + 0.1, y: currentY, w: colW[3 - i] - 0.2, h: rowH,
        fontSize: 10, color: textColor, fontFace: CONFIG.fontFamily,
        align: 'center', valign: 'middle', bold: isBold
      });
      cellX += colW[3 - i];
    }
    
    currentY += rowH;
  });
  
  // Footnote - Light italic
  slide.addText('*Die Interaktionsrate berechnet sich aus allen Interaktionen durch die Gesamtreichweite × 100', {
    x: CONFIG.margin, y: currentY + 0.12, w: tableW, h: 0.25,
    fontSize: 8, color: CONFIG.colors.mediumGray, italic: true, fontFace: CONFIG.fontFamily
  });
}

// Create Premium Executive Summary Slide with Shape Icons and Pill Trends
function createExecutiveSummarySlide(
  slide: PptxGenJS.Slide,
  fbKpis: MonthlyKPI[],
  igKpis: MonthlyKPI[],
  month: string
): void {
  slide.background = { color: CONFIG.colors.background };
  addBrandingLine(slide);
  addSubtleWatermark(slide);
  
  // Title - Bold weight
  slide.addText('Executive Summary', {
    x: CONFIG.margin, y: 0.25, w: 9, h: 0.5,
    fontSize: 28, bold: true, color: CONFIG.colors.black, fontFace: CONFIG.fontFamily
  });
  // Subtitle - Light weight
  slide.addText(getMonthName(month), {
    x: CONFIG.margin, y: 0.7, w: 9, h: 0.35,
    fontSize: 14, color: CONFIG.colors.mediumGray, fontFace: CONFIG.fontFamily
  });
  
  // Left side: 3 KPI boxes with shadows
  const boxW = 2.7;
  const boxH = 1.9;
  const boxY = 1.2;
  const boxGap = 0.25;
  
  const fbCurrent = fbKpis[2];
  const igCurrent = igKpis[2];
  const fbPrev = fbKpis[1];
  const igPrev = igKpis[1];
  
  // KPI 1: Total Followers
  const totalFollowers = fbCurrent.followers + igCurrent.followers;
  const prevTotalFollowers = fbPrev.followers + igPrev.followers;
  const followerTrend = getTrendText(totalFollowers, prevTotalFollowers);
  
  // Shadow
  slide.addShape('roundRect', {
    x: CONFIG.margin + 0.04, y: boxY + 0.04, w: boxW, h: boxH,
    fill: { color: CONFIG.colors.shadow },
    rectRadius: 0.15
  });
  // Box
  slide.addShape('roundRect', {
    x: CONFIG.margin, y: boxY, w: boxW, h: boxH,
    fill: { color: CONFIG.colors.white },
    line: { color: CONFIG.colors.primary, width: 1.5 },
    rectRadius: 0.15
  });
  // Icon (shape-based user icon)
  drawUserIcon(slide, CONFIG.margin + 0.3, boxY + 0.2, 0.45, CONFIG.colors.primary);
  // Label - Light weight
  slide.addText('Follower Gesamt', {
    x: CONFIG.margin + 0.1, y: boxY + 0.7, w: boxW - 0.2, h: 0.25,
    fontSize: 10, color: CONFIG.colors.mediumGray, fontFace: CONFIG.fontFamily, align: 'center'
  });
  // Value - Bold
  slide.addText(formatNumber(totalFollowers), {
    x: CONFIG.margin + 0.1, y: boxY + 0.95, w: boxW - 0.2, h: 0.45,
    fontSize: 26, bold: true, color: CONFIG.colors.black, fontFace: CONFIG.fontFamily, align: 'center'
  });
  // Trend Pill
  const pillW = 1.1;
  const pillH = 0.32;
  const pillX = CONFIG.margin + (boxW - pillW) / 2;
  const pillY = boxY + 1.45;
  slide.addShape('roundRect', {
    x: pillX, y: pillY, w: pillW, h: pillH,
    fill: { color: followerTrend.color },
    rectRadius: 0.16
  });
  slide.addText(followerTrend.text, {
    x: pillX, y: pillY, w: pillW, h: pillH,
    fontSize: 11, bold: true, color: CONFIG.colors.white, fontFace: CONFIG.fontFamily, align: 'center', valign: 'middle'
  });
  
  // KPI 2: Total Reach
  const totalReach = fbCurrent.total_reach + igCurrent.total_reach;
  const prevTotalReach = fbPrev.total_reach + igPrev.total_reach;
  const reachTrend = getTrendText(totalReach, prevTotalReach);
  
  const box2X = CONFIG.margin + boxW + boxGap;
  // Shadow
  slide.addShape('roundRect', {
    x: box2X + 0.04, y: boxY + 0.04, w: boxW, h: boxH,
    fill: { color: CONFIG.colors.shadow },
    rectRadius: 0.15
  });
  // Box
  slide.addShape('roundRect', {
    x: box2X, y: boxY, w: boxW, h: boxH,
    fill: { color: CONFIG.colors.white },
    line: { color: CONFIG.colors.primary, width: 1.5 },
    rectRadius: 0.15
  });
  // Icon (eye)
  drawEyeIcon(slide, box2X + 0.25, boxY + 0.18, 0.5, CONFIG.colors.primary);
  // Label
  slide.addText('Reichweite Gesamt', {
    x: box2X + 0.1, y: boxY + 0.7, w: boxW - 0.2, h: 0.25,
    fontSize: 10, color: CONFIG.colors.mediumGray, fontFace: CONFIG.fontFamily, align: 'center'
  });
  // Value
  slide.addText(formatNumber(totalReach), {
    x: box2X + 0.1, y: boxY + 0.95, w: boxW - 0.2, h: 0.45,
    fontSize: 26, bold: true, color: CONFIG.colors.black, fontFace: CONFIG.fontFamily, align: 'center'
  });
  // Trend Pill
  const pill2X = box2X + (boxW - pillW) / 2;
  slide.addShape('roundRect', {
    x: pill2X, y: pillY, w: pillW, h: pillH,
    fill: { color: reachTrend.color },
    rectRadius: 0.16
  });
  slide.addText(reachTrend.text, {
    x: pill2X, y: pillY, w: pillW, h: pillH,
    fontSize: 11, bold: true, color: CONFIG.colors.white, fontFace: CONFIG.fontFamily, align: 'center', valign: 'middle'
  });
  
  // KPI 3: Total Interactions
  const totalInteractions = (fbCurrent.total_reactions + fbCurrent.total_comments + fbCurrent.total_shares) + 
                           (igCurrent.total_reactions + igCurrent.total_comments + igCurrent.total_saves);
  const prevTotalInteractions = (fbPrev.total_reactions + fbPrev.total_comments + fbPrev.total_shares) + 
                                (igPrev.total_reactions + igPrev.total_comments + igPrev.total_saves);
  const interactionTrend = getTrendText(totalInteractions, prevTotalInteractions);
  
  const box3X = CONFIG.margin + (boxW + boxGap) * 2;
  // Shadow
  slide.addShape('roundRect', {
    x: box3X + 0.04, y: boxY + 0.04, w: boxW, h: boxH,
    fill: { color: CONFIG.colors.shadow },
    rectRadius: 0.15
  });
  // Box
  slide.addShape('roundRect', {
    x: box3X, y: boxY, w: boxW, h: boxH,
    fill: { color: CONFIG.colors.white },
    line: { color: CONFIG.colors.primary, width: 1.5 },
    rectRadius: 0.15
  });
  // Icon (chat bubble)
  drawChatIcon(slide, box3X + 0.25, boxY + 0.18, 0.5, CONFIG.colors.primary);
  // Label
  slide.addText('Interaktionen Gesamt', {
    x: box3X + 0.1, y: boxY + 0.7, w: boxW - 0.2, h: 0.25,
    fontSize: 10, color: CONFIG.colors.mediumGray, fontFace: CONFIG.fontFamily, align: 'center'
  });
  // Value
  slide.addText(formatNumber(totalInteractions), {
    x: box3X + 0.1, y: boxY + 0.95, w: boxW - 0.2, h: 0.45,
    fontSize: 26, bold: true, color: CONFIG.colors.black, fontFace: CONFIG.fontFamily, align: 'center'
  });
  // Trend Pill
  const pill3X = box3X + (boxW - pillW) / 2;
  slide.addShape('roundRect', {
    x: pill3X, y: pillY, w: pillW, h: pillH,
    fill: { color: interactionTrend.color },
    rectRadius: 0.16
  });
  slide.addText(interactionTrend.text, {
    x: pill3X, y: pillY, w: pillW, h: pillH,
    fontSize: 11, bold: true, color: CONFIG.colors.white, fontFace: CONFIG.fontFamily, align: 'center', valign: 'middle'
  });
  
  // Right side: Gesamtfazit box
  const fazitX = CONFIG.margin + (boxW + boxGap) * 3 + 0.2;
  const fazitW = 10 - fazitX - CONFIG.margin;
  
  // Shadow
  slide.addShape('roundRect', {
    x: fazitX + 0.04, y: boxY + 0.04, w: fazitW, h: boxH,
    fill: { color: CONFIG.colors.shadow },
    rectRadius: 0.15
  });
  // Box
  slide.addShape('roundRect', {
    x: fazitX, y: boxY, w: fazitW, h: boxH,
    fill: { color: CONFIG.colors.white },
    line: { color: CONFIG.colors.secondary, width: 1.5 },
    rectRadius: 0.15
  });
  
  slide.addText('Gesamtfazit', {
    x: fazitX + 0.15, y: boxY + 0.12, w: fazitW - 0.3, h: 0.3,
    fontSize: 12, bold: true, color: CONFIG.colors.secondary, fontFace: CONFIG.fontFamily
  });
  
  const performanceWord = totalReach > prevTotalReach ? 'positive' : (totalReach < prevTotalReach ? 'rückläufige' : 'stabile');
  const fazitText = `Der ${getShortMonthName(month)} zeigt eine ${performanceWord} Performance auf beiden Plattformen. Die organische Basis bleibt solide und bietet eine gute Ausgangslage für neue Impulse.`;
  
  slide.addText(fazitText, {
    x: fazitX + 0.15, y: boxY + 0.45, w: fazitW - 0.3, h: 1.3,
    fontSize: 10, color: CONFIG.colors.darkGray, fontFace: CONFIG.fontFamily
  });
  
  // Platform breakdown below - cleaner design
  const breakdownY = boxY + boxH + 0.35;
  const breakdownW = 4.2;
  const breakdownH = 1.5;
  
  // Facebook mini summary
  slide.addShape('roundRect', {
    x: CONFIG.margin + 0.03, y: breakdownY + 0.03, w: breakdownW, h: breakdownH,
    fill: { color: CONFIG.colors.shadow },
    rectRadius: 0.1
  });
  slide.addShape('roundRect', {
    x: CONFIG.margin, y: breakdownY, w: breakdownW, h: breakdownH,
    fill: { color: CONFIG.colors.white },
    line: { color: CONFIG.colors.primary, width: 1 },
    rectRadius: 0.1
  });
  // Facebook icon (f in circle)
  slide.addShape('ellipse', {
    x: CONFIG.margin + 0.15, y: breakdownY + 0.12, w: 0.35, h: 0.35,
    fill: { color: CONFIG.colors.primary }
  });
  slide.addText('f', {
    x: CONFIG.margin + 0.15, y: breakdownY + 0.12, w: 0.35, h: 0.35,
    fontSize: 14, bold: true, color: CONFIG.colors.white, align: 'center', valign: 'middle', fontFace: CONFIG.fontFamily
  });
  slide.addText('Facebook', {
    x: CONFIG.margin + 0.55, y: breakdownY + 0.15, w: 2, h: 0.3,
    fontSize: 12, bold: true, color: CONFIG.colors.black, fontFace: CONFIG.fontFamily
  });
  slide.addText(`Reichweite: ${formatNumber(fbCurrent.total_reach)}\nInteraktionen: ${formatNumber(fbCurrent.total_reactions + fbCurrent.total_comments)}\nEngagement: ${fbCurrent.engagement_rate.toFixed(2).replace('.', ',')}%`, {
    x: CONFIG.margin + 0.15, y: breakdownY + 0.5, w: breakdownW - 0.3, h: 0.9,
    fontSize: 10, color: CONFIG.colors.darkGray, fontFace: CONFIG.fontFamily
  });
  
  // Instagram mini summary
  const igBoxX = CONFIG.margin + breakdownW + 0.3;
  slide.addShape('roundRect', {
    x: igBoxX + 0.03, y: breakdownY + 0.03, w: breakdownW, h: breakdownH,
    fill: { color: CONFIG.colors.shadow },
    rectRadius: 0.1
  });
  slide.addShape('roundRect', {
    x: igBoxX, y: breakdownY, w: breakdownW, h: breakdownH,
    fill: { color: CONFIG.colors.white },
    line: { color: CONFIG.colors.secondary, width: 1 },
    rectRadius: 0.1
  });
  // Instagram icon (camera outline)
  slide.addShape('roundRect', {
    x: igBoxX + 0.15, y: breakdownY + 0.12, w: 0.35, h: 0.35,
    line: { color: CONFIG.colors.secondary, width: 2 },
    rectRadius: 0.08
  });
  slide.addShape('ellipse', {
    x: igBoxX + 0.24, y: breakdownY + 0.21, w: 0.17, h: 0.17,
    line: { color: CONFIG.colors.secondary, width: 1.5 }
  });
  slide.addText('Instagram', {
    x: igBoxX + 0.55, y: breakdownY + 0.15, w: 2, h: 0.3,
    fontSize: 12, bold: true, color: CONFIG.colors.black, fontFace: CONFIG.fontFamily
  });
  slide.addText(`Reichweite: ${formatNumber(igCurrent.total_reach)}\nInteraktionen: ${formatNumber(igCurrent.total_reactions + igCurrent.total_comments)}\nEngagement: ${igCurrent.engagement_rate.toFixed(2).replace('.', ',')}%`, {
    x: igBoxX + 0.15, y: breakdownY + 0.5, w: breakdownW - 0.3, h: 0.9,
    fontSize: 10, color: CONFIG.colors.darkGray, fontFace: CONFIG.fontFamily
  });
}

// Create Top 3 Content Showcase Slide (replaces bar charts)
function createTop3ContentShowcase(
  slide: PptxGenJS.Slide,
  posts: PostData[],
  platform: 'facebook' | 'instagram',
  month: string
): void {
  slide.background = { color: CONFIG.colors.background };
  const accentColor = platform === 'facebook' ? CONFIG.colors.primary : CONFIG.colors.secondary;
  addBrandingLine(slide, accentColor);
  addSubtleWatermark(slide);
  
  // Title
  slide.addText(platform === 'facebook' ? 'Facebook' : 'Instagram', {
    x: CONFIG.margin, y: 0.2, w: 9, h: 0.45,
    fontSize: 26, bold: true, color: CONFIG.colors.black, fontFace: CONFIG.fontFamily
  });
  slide.addText('Top 3 Content', {
    x: CONFIG.margin, y: 0.6, w: 9, h: 0.3,
    fontSize: 14, color: CONFIG.colors.mediumGray, fontFace: CONFIG.fontFamily
  });
  
  // Get top 3 posts by interactions
  const topPosts = [...posts]
    .map(p => ({ 
      ...p, 
      interactions: (p.reactions_total || 0) + (p.comments_total || 0) + (p.saves || 0),
      engagementRate: p.reach && p.reach > 0 ? (((p.reactions_total || 0) + (p.comments_total || 0)) / p.reach * 100) : 0
    }))
    .sort((a, b) => b.interactions - a.interactions)
    .slice(0, 3);
  
  if (topPosts.length === 0) {
    slide.addText('Keine Posts für diesen Zeitraum verfügbar', {
      x: 1, y: 2.5, w: 8, h: 0.5,
      fontSize: 14, color: CONFIG.colors.mediumGray, align: 'center', fontFace: CONFIG.fontFamily
    });
    return;
  }
  
  // Display 3 large portrait images side by side
  const imgW = 2.8;
  const imgH = 3.5; // Portrait aspect ratio
  const startX = CONFIG.margin + 0.2;
  const startY = 1.0;
  const gap = 0.35;
  
  topPosts.forEach((post, idx) => {
    const xPos = startX + idx * (imgW + gap);
    
    // Shadow for image
    slide.addShape('rect', {
      x: xPos + 0.05, y: startY + 0.05, w: imgW, h: imgH,
      fill: { color: CONFIG.colors.shadow }
    });
    
    if (post.thumbnail_url) {
      try {
        // Main image
        slide.addImage({
          path: post.thumbnail_url,
          x: xPos, y: startY, w: imgW, h: imgH,
          sizing: { type: 'cover', w: imgW, h: imgH }
        });
        
        // Date badge (top right, small and subtle)
        const dateW = 0.9;
        const dateH = 0.28;
        slide.addShape('roundRect', {
          x: xPos + imgW - dateW - 0.08, y: startY + 0.08, w: dateW, h: dateH,
          fill: { color: CONFIG.colors.black, transparency: 40 },
          rectRadius: 0.05
        });
        slide.addText(formatDate(post.created_time), {
          x: xPos + imgW - dateW - 0.08, y: startY + 0.08, w: dateW, h: dateH,
          fontSize: 8, color: CONFIG.colors.white, fontFace: CONFIG.fontFamily, align: 'center', valign: 'middle'
        });
        
        // Elegant overlay on bottom third with metrics
        const overlayH = imgH * 0.35;
        const overlayY = startY + imgH - overlayH;
        
        // Gradient-like overlay (darker at bottom)
        slide.addShape('rect', {
          x: xPos, y: overlayY, w: imgW, h: overlayH,
          fill: { color: CONFIG.colors.black, transparency: 35 }
        });
        
        // Metrics in overlay
        const metricsY = overlayY + 0.15;
        
        // Reach
        slide.addText('Reichweite', {
          x: xPos + 0.1, y: metricsY, w: imgW - 0.2, h: 0.2,
          fontSize: 8, color: 'CCCCCC', fontFace: CONFIG.fontFamily
        });
        slide.addText(formatNumber(post.reach || 0), {
          x: xPos + 0.1, y: metricsY + 0.18, w: imgW - 0.2, h: 0.28,
          fontSize: 14, bold: true, color: CONFIG.colors.white, fontFace: CONFIG.fontFamily
        });
        
        // Interactions
        slide.addText('Interaktionen', {
          x: xPos + 0.1, y: metricsY + 0.52, w: imgW - 0.2, h: 0.2,
          fontSize: 8, color: 'CCCCCC', fontFace: CONFIG.fontFamily
        });
        slide.addText(formatNumber(post.interactions), {
          x: xPos + 0.1, y: metricsY + 0.7, w: imgW - 0.2, h: 0.28,
          fontSize: 14, bold: true, color: CONFIG.colors.white, fontFace: CONFIG.fontFamily
        });
        
        // Engagement rate (small pill)
        const engPillW = 0.9;
        const engPillH = 0.25;
        slide.addShape('roundRect', {
          x: xPos + imgW - engPillW - 0.1, y: metricsY + 0.75, w: engPillW, h: engPillH,
          fill: { color: accentColor },
          rectRadius: 0.12
        });
        slide.addText(`${post.engagementRate.toFixed(1)}%`, {
          x: xPos + imgW - engPillW - 0.1, y: metricsY + 0.75, w: engPillW, h: engPillH,
          fontSize: 9, bold: true, color: CONFIG.colors.white, fontFace: CONFIG.fontFamily, align: 'center', valign: 'middle'
        });
        
      } catch {
        // Fallback placeholder
        slide.addShape('rect', {
          x: xPos, y: startY, w: imgW, h: imgH,
          fill: { color: CONFIG.colors.lightGray },
          line: { color: 'DDDDDD', width: 1 }
        });
        slide.addText('Bild nicht verfügbar', {
          x: xPos, y: startY + imgH / 2 - 0.15, w: imgW, h: 0.3,
          fontSize: 10, color: CONFIG.colors.mediumGray, align: 'center', fontFace: CONFIG.fontFamily
        });
      }
    } else {
      // No thumbnail
      slide.addShape('rect', {
        x: xPos, y: startY, w: imgW, h: imgH,
        fill: { color: CONFIG.colors.lightGray },
        line: { color: 'DDDDDD', width: 1 }
      });
      slide.addText('Kein Bild', {
        x: xPos, y: startY + imgH / 2 - 0.15, w: imgW, h: 0.3,
        fontSize: 10, color: CONFIG.colors.mediumGray, align: 'center', fontFace: CONFIG.fontFamily
      });
    }
    
    // Rank badge
    slide.addShape('ellipse', {
      x: xPos - 0.15, y: startY - 0.15, w: 0.4, h: 0.4,
      fill: { color: accentColor }
    });
    slide.addText((idx + 1).toString(), {
      x: xPos - 0.15, y: startY - 0.15, w: 0.4, h: 0.4,
      fontSize: 14, bold: true, color: CONFIG.colors.white, align: 'center', valign: 'middle', fontFace: CONFIG.fontFamily
    });
  });
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);
    
    // Get page IDs
    const fbPageIds = await getPageIds('facebook');
    const igPageIds = await getPageIds('instagram');
    console.log('FB Page IDs:', fbPageIds, 'IG Page IDs:', igPageIds);
    
    // Calculate months for comparison (current + 2 previous)
    const currentDate = new Date(month + '-01');
    const months = [
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 2, 1).toISOString().slice(0, 7),
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1).toISOString().slice(0, 7),
      month
    ];
    
    // Fetch all data
    const [fbPosts, fbKpis, igPosts, igKpis] = await Promise.all([
      getFacebookPosts(month, fbPageIds),
      getMonthlyKPIs(months, fbPageIds, 'facebook'),
      getInstagramPosts(month, igPageIds),
      getMonthlyKPIs(months, igPageIds, 'instagram'),
    ]);
    
    console.log('FB Posts:', fbPosts.length, 'IG Posts:', igPosts.length);
    
    // Create PowerPoint with HIGH-END AGENCY styling
    const pptx = new PptxGenJS();
    pptx.author = 'famefact GmbH';
    pptx.title = `${CONFIG.customerName} Social Media Report - ${getMonthName(month)}`;
    pptx.company = 'famefact GmbH';
    pptx.layout = 'LAYOUT_16x9';
    
    // ========================================
    // SLIDE 1: Cover (premium gray background)
    // ========================================
    const slide1 = pptx.addSlide();
    slide1.background = { color: CONFIG.colors.background };
    addBrandingLine(slide1);
    
    // famefact logo (top left) - Bold
    slide1.addText('famefact.', {
      x: CONFIG.margin, y: 0.25, w: 2, h: 0.4,
      fontSize: 18, bold: true, color: CONFIG.colors.black, fontFace: CONFIG.fontFamily
    });
    
    // famefact graphic (top right) - green/purple diamond shapes
    slide1.addShape('rect', {
      x: 7.5, y: 0.15, w: 1.4, h: 1.4,
      fill: { color: CONFIG.colors.primary },
      rotate: 45
    });
    slide1.addShape('rect', {
      x: 8.15, y: 0.7, w: 1.1, h: 1.1,
      fill: { color: CONFIG.colors.secondary },
      rotate: 45
    });
    
    // ANDskincare Logo (center)
    const logoY = 1.7;
    ['A', 'N', 'D'].forEach((letter, i) => {
      slide1.addShape('ellipse', {
        x: 3.5 + i * 1.1, y: logoY, w: 0.9, h: 0.9,
        fill: { color: '808080' }
      });
      slide1.addText(letter, {
        x: 3.5 + i * 1.1, y: logoY, w: 0.9, h: 0.9,
        fontSize: 28, bold: true, color: CONFIG.colors.white, align: 'center', valign: 'middle', fontFace: CONFIG.fontFamily
      });
    });
    slide1.addText('SKINCARE', {
      x: 0, y: logoY + 1.05, w: '100%', h: 0.4,
      fontSize: 16, color: '808080', align: 'center', charSpacing: 5, fontFace: CONFIG.fontFamily
    });
    
    // Title
    slide1.addText('Social Media Reporting', {
      x: 0, y: 3.4, w: '100%', h: 0.55,
      fontSize: 30, bold: true, color: CONFIG.colors.black, align: 'center', fontFace: CONFIG.fontFamily
    });
    slide1.addText(getMonthName(month), {
      x: 0, y: 3.95, w: '100%', h: 0.4,
      fontSize: 18, color: CONFIG.colors.primary, align: 'center', fontFace: CONFIG.fontFamily
    });
    
    // ========================================
    // SLIDE 2: Executive Summary (Premium)
    // ========================================
    const slide2 = pptx.addSlide();
    createExecutiveSummarySlide(slide2, fbKpis, igKpis, month);
    addFamefactIcon(slide2, 2);
    
    // ========================================
    // SLIDE 3: Facebook Kennzahlen (Premium Table)
    // ========================================
    const slide3 = pptx.addSlide();
    slide3.background = { color: CONFIG.colors.background };
    addBrandingLine(slide3, CONFIG.colors.primary);
    addSubtleWatermark(slide3);
    
    slide3.addText('Facebook', {
      x: CONFIG.margin, y: 0.2, w: 9, h: 0.45,
      fontSize: 26, bold: true, color: CONFIG.colors.black, fontFace: CONFIG.fontFamily
    });
    slide3.addText('Kennzahlen', {
      x: CONFIG.margin, y: 0.6, w: 9, h: 0.3,
      fontSize: 14, color: CONFIG.colors.mediumGray, fontFace: CONFIG.fontFamily
    });
    
    createPremiumKPITable(slide3, fbKpis, 1.0, 'facebook');
    
    addFamefactIcon(slide3, 3);
    
    // ========================================
    // SLIDE 4: Facebook Top 3 Content (NEW - replaces bar chart)
    // ========================================
    const slide4 = pptx.addSlide();
    createTop3ContentShowcase(slide4, fbPosts.filter(p => p.type !== 'video' && p.type !== 'VIDEO'), 'facebook', month);
    addFamefactIcon(slide4, 4);
    
    // ========================================
    // SLIDE 5: Facebook Videos Top 3
    // ========================================
    const fbVideos = fbPosts.filter(p => p.type === 'video' || p.type === 'VIDEO' || p.type === 'reel' || p.type === 'REEL');
    const slide5 = pptx.addSlide();
    slide5.background = { color: CONFIG.colors.background };
    addBrandingLine(slide5, CONFIG.colors.primary);
    addSubtleWatermark(slide5);
    
    slide5.addText('Facebook', {
      x: CONFIG.margin, y: 0.2, w: 9, h: 0.45,
      fontSize: 26, bold: true, color: CONFIG.colors.black, fontFace: CONFIG.fontFamily
    });
    slide5.addText('Top Videos & Reels', {
      x: CONFIG.margin, y: 0.6, w: 9, h: 0.3,
      fontSize: 14, color: CONFIG.colors.mediumGray, fontFace: CONFIG.fontFamily
    });
    
    if (fbVideos.length > 0) {
      createTop3ContentShowcase(slide5, fbVideos, 'facebook', month);
    } else {
      slide5.addText('Keine Videos für diesen Zeitraum verfügbar', {
        x: 1, y: 2.5, w: 8, h: 0.5,
        fontSize: 14, color: CONFIG.colors.mediumGray, align: 'center', fontFace: CONFIG.fontFamily
      });
    }
    addFamefactIcon(slide5, 5);
    
    // ========================================
    // SLIDE 6: Facebook Demographie
    // ========================================
    const slide6 = pptx.addSlide();
    slide6.background = { color: CONFIG.colors.background };
    addBrandingLine(slide6, CONFIG.colors.primary);
    addSubtleWatermark(slide6);
    
    slide6.addText('Facebook', {
      x: CONFIG.margin, y: 0.2, w: 9, h: 0.45,
      fontSize: 26, bold: true, color: CONFIG.colors.black, fontFace: CONFIG.fontFamily
    });
    slide6.addText('Fans (Demographie)', {
      x: CONFIG.margin, y: 0.6, w: 9, h: 0.3,
      fontSize: 14, color: CONFIG.colors.mediumGray, fontFace: CONFIG.fontFamily
    });
    
    // Placeholder with shadow
    slide6.addShape('roundRect', {
      x: CONFIG.margin + 0.04, y: 1.04, w: 10 - (CONFIG.margin * 2), h: 3.5,
      fill: { color: CONFIG.colors.shadow },
      rectRadius: 0.1
    });
    slide6.addShape('roundRect', {
      x: CONFIG.margin, y: 1.0, w: 10 - (CONFIG.margin * 2), h: 3.5,
      fill: { color: CONFIG.colors.white },
      line: { color: 'E0E0E0', width: 1 },
      rectRadius: 0.1
    });
    slide6.addText('Screenshot der Facebook Insights (Demographie) hier einfügen', {
      x: CONFIG.margin, y: 2.6, w: 10 - (CONFIG.margin * 2), h: 0.4,
      fontSize: 12, color: CONFIG.colors.mediumGray, align: 'center', fontFace: CONFIG.fontFamily
    });
    
    addFamefactIcon(slide6, 6);
    
    // ========================================
    // SLIDE 7: Instagram Kennzahlen (Premium Table)
    // ========================================
    const slide7 = pptx.addSlide();
    slide7.background = { color: CONFIG.colors.background };
    addBrandingLine(slide7, CONFIG.colors.secondary);
    addSubtleWatermark(slide7);
    
    slide7.addText('Instagram', {
      x: CONFIG.margin, y: 0.2, w: 9, h: 0.45,
      fontSize: 26, bold: true, color: CONFIG.colors.black, fontFace: CONFIG.fontFamily
    });
    slide7.addText('Kennzahlen', {
      x: CONFIG.margin, y: 0.6, w: 9, h: 0.3,
      fontSize: 14, color: CONFIG.colors.mediumGray, fontFace: CONFIG.fontFamily
    });
    
    createPremiumKPITable(slide7, igKpis, 1.0, 'instagram');
    
    addFamefactIcon(slide7, 7);
    
    // ========================================
    // SLIDE 8: Instagram Top 3 Content
    // ========================================
    const slide8 = pptx.addSlide();
    createTop3ContentShowcase(slide8, igPosts.filter(p => p.type !== 'VIDEO' && p.type !== 'REEL'), 'instagram', month);
    addFamefactIcon(slide8, 8);
    
    // ========================================
    // SLIDE 9: Instagram Reels Top 3
    // ========================================
    const igReels = igPosts.filter(p => p.type === 'VIDEO' || p.type === 'REEL');
    const slide9 = pptx.addSlide();
    slide9.background = { color: CONFIG.colors.background };
    addBrandingLine(slide9, CONFIG.colors.secondary);
    addSubtleWatermark(slide9);
    
    slide9.addText('Instagram', {
      x: CONFIG.margin, y: 0.2, w: 9, h: 0.45,
      fontSize: 26, bold: true, color: CONFIG.colors.black, fontFace: CONFIG.fontFamily
    });
    slide9.addText('Top Reels', {
      x: CONFIG.margin, y: 0.6, w: 9, h: 0.3,
      fontSize: 14, color: CONFIG.colors.mediumGray, fontFace: CONFIG.fontFamily
    });
    
    if (igReels.length > 0) {
      createTop3ContentShowcase(slide9, igReels, 'instagram', month);
    } else {
      slide9.addText('Keine Reels für diesen Zeitraum verfügbar', {
        x: 1, y: 2.5, w: 8, h: 0.5,
        fontSize: 14, color: CONFIG.colors.mediumGray, align: 'center', fontFace: CONFIG.fontFamily
      });
    }
    addFamefactIcon(slide9, 9);
    
    // ========================================
    // SLIDE 10: Instagram Demographie
    // ========================================
    const slide10 = pptx.addSlide();
    slide10.background = { color: CONFIG.colors.background };
    addBrandingLine(slide10, CONFIG.colors.secondary);
    addSubtleWatermark(slide10);
    
    slide10.addText('Instagram', {
      x: CONFIG.margin, y: 0.2, w: 9, h: 0.45,
      fontSize: 26, bold: true, color: CONFIG.colors.black, fontFace: CONFIG.fontFamily
    });
    slide10.addText('Follower (Demographie)', {
      x: CONFIG.margin, y: 0.6, w: 9, h: 0.3,
      fontSize: 14, color: CONFIG.colors.mediumGray, fontFace: CONFIG.fontFamily
    });
    
    // Placeholder with shadow
    slide10.addShape('roundRect', {
      x: CONFIG.margin + 0.04, y: 1.04, w: 10 - (CONFIG.margin * 2), h: 3.5,
      fill: { color: CONFIG.colors.shadow },
      rectRadius: 0.1
    });
    slide10.addShape('roundRect', {
      x: CONFIG.margin, y: 1.0, w: 10 - (CONFIG.margin * 2), h: 3.5,
      fill: { color: CONFIG.colors.white },
      line: { color: 'E0E0E0', width: 1 },
      rectRadius: 0.1
    });
    slide10.addText('Screenshot der Instagram Insights (Demographie) hier einfügen', {
      x: CONFIG.margin, y: 2.6, w: 10 - (CONFIG.margin * 2), h: 0.4,
      fontSize: 12, color: CONFIG.colors.mediumGray, align: 'center', fontFace: CONFIG.fontFamily
    });
    
    addFamefactIcon(slide10, 10);
    
    // ========================================
    // SLIDE 11: Zusammenfassung
    // ========================================
    const slide11 = pptx.addSlide();
    slide11.background = { color: CONFIG.colors.background };
    addBrandingLine(slide11);
    addSubtleWatermark(slide11);
    
    slide11.addText('Zusammenfassung', {
      x: CONFIG.margin, y: 0.2, w: 9, h: 0.45,
      fontSize: 26, bold: true, color: CONFIG.colors.black, fontFace: CONFIG.fontFamily
    });
    slide11.addText('Facebook & Instagram', {
      x: CONFIG.margin, y: 0.6, w: 9, h: 0.3,
      fontSize: 14, color: CONFIG.colors.mediumGray, fontFace: CONFIG.fontFamily
    });
    
    // Facebook summary box
    const fbCurrentKpi = fbKpis[2];
    const fbPrevKpi = fbKpis[1];
    
    slide11.addShape('roundRect', {
      x: CONFIG.margin + 0.03, y: 1.03, w: 4.3, h: 1.8,
      fill: { color: CONFIG.colors.shadow },
      rectRadius: 0.1
    });
    slide11.addShape('roundRect', {
      x: CONFIG.margin, y: 1.0, w: 4.3, h: 1.8,
      fill: { color: CONFIG.colors.white },
      line: { color: CONFIG.colors.primary, width: 1 },
      rectRadius: 0.1
    });
    
    // Facebook icon
    slide11.addShape('ellipse', {
      x: CONFIG.margin + 0.15, y: 1.12, w: 0.35, h: 0.35,
      fill: { color: CONFIG.colors.primary }
    });
    slide11.addText('f', {
      x: CONFIG.margin + 0.15, y: 1.12, w: 0.35, h: 0.35,
      fontSize: 14, bold: true, color: CONFIG.colors.white, align: 'center', valign: 'middle', fontFace: CONFIG.fontFamily
    });
    slide11.addText('Facebook', {
      x: CONFIG.margin + 0.55, y: 1.15, w: 2, h: 0.3,
      fontSize: 12, bold: true, color: CONFIG.colors.black, fontFace: CONFIG.fontFamily
    });
    
    const fbReachChange = fbPrevKpi.total_reach > 0 
      ? ((fbCurrentKpi.total_reach - fbPrevKpi.total_reach) / fbPrevKpi.total_reach * 100).toFixed(0)
      : '0';
    const fbSummaryText = `• Reichweite: ${formatNumber(fbCurrentKpi.total_reach)} (${parseInt(fbReachChange) >= 0 ? '+' : ''}${fbReachChange}%)\n• ${fbCurrentKpi.posts_count} Postings\n• Engagement: ${fbCurrentKpi.engagement_rate.toFixed(2).replace('.', ',')}%`;
    
    slide11.addText(fbSummaryText, {
      x: CONFIG.margin + 0.15, y: 1.5, w: 4, h: 1.2,
      fontSize: 10, color: CONFIG.colors.darkGray, fontFace: CONFIG.fontFamily
    });
    
    // Instagram summary box
    const igCurrentKpi = igKpis[2];
    const igPrevKpi = igKpis[1];
    
    slide11.addShape('roundRect', {
      x: CONFIG.margin + 4.53, y: 1.03, w: 4.3, h: 1.8,
      fill: { color: CONFIG.colors.shadow },
      rectRadius: 0.1
    });
    slide11.addShape('roundRect', {
      x: CONFIG.margin + 4.5, y: 1.0, w: 4.3, h: 1.8,
      fill: { color: CONFIG.colors.white },
      line: { color: CONFIG.colors.secondary, width: 1 },
      rectRadius: 0.1
    });
    
    // Instagram icon
    slide11.addShape('roundRect', {
      x: CONFIG.margin + 4.65, y: 1.12, w: 0.35, h: 0.35,
      line: { color: CONFIG.colors.secondary, width: 2 },
      rectRadius: 0.08
    });
    slide11.addShape('ellipse', {
      x: CONFIG.margin + 4.74, y: 1.21, w: 0.17, h: 0.17,
      line: { color: CONFIG.colors.secondary, width: 1.5 }
    });
    slide11.addText('Instagram', {
      x: CONFIG.margin + 5.05, y: 1.15, w: 2, h: 0.3,
      fontSize: 12, bold: true, color: CONFIG.colors.black, fontFace: CONFIG.fontFamily
    });
    
    const igReachChange = igPrevKpi.total_reach > 0 
      ? ((igCurrentKpi.total_reach - igPrevKpi.total_reach) / igPrevKpi.total_reach * 100).toFixed(0)
      : '0';
    const igSummaryText = `• Follower: ${igCurrentKpi.new_followers >= 0 ? '+' : ''}${igCurrentKpi.new_followers} neu\n• Reichweite: ${formatNumber(igCurrentKpi.total_reach)} (${parseInt(igReachChange) >= 0 ? '+' : ''}${igReachChange}%)\n• Engagement: ${igCurrentKpi.engagement_rate.toFixed(2).replace('.', ',')}%`;
    
    slide11.addText(igSummaryText, {
      x: CONFIG.margin + 4.65, y: 1.5, w: 4, h: 1.2,
      fontSize: 10, color: CONFIG.colors.darkGray, fontFace: CONFIG.fontFamily
    });
    
    // Gesamtfazit box
    slide11.addShape('roundRect', {
      x: CONFIG.margin + 0.03, y: 3.03, w: 8.8, h: 1.5,
      fill: { color: CONFIG.colors.shadow },
      rectRadius: 0.1
    });
    slide11.addShape('roundRect', {
      x: CONFIG.margin, y: 3.0, w: 8.8, h: 1.5,
      fill: { color: CONFIG.colors.white },
      line: { color: 'E0E0E0', width: 1 },
      rectRadius: 0.1
    });
    
    slide11.addText('Gesamtfazit ' + getShortMonthName(month), {
      x: CONFIG.margin + 0.15, y: 3.1, w: 8.5, h: 0.3,
      fontSize: 11, bold: true, color: CONFIG.colors.black, fontFace: CONFIG.fontFamily
    });
    
    const totalReachCurrent = fbCurrentKpi.total_reach + igCurrentKpi.total_reach;
    const totalReachPrev = fbPrevKpi.total_reach + igPrevKpi.total_reach;
    const overallTrend = totalReachCurrent > totalReachPrev ? 'positive' : (totalReachCurrent < totalReachPrev ? 'rückläufige' : 'stabile');
    
    slide11.addText(
      `Der ${getShortMonthName(month)} zeigt eine ${overallTrend} Performance auf beiden Plattformen. ` +
      `Die organische Basis bleibt solide und bietet eine gute Ausgangslage für neue Impulse und Kampagnen. ` +
      `Besonders die Content-Strategie mit visuell ansprechenden Posts zeigt weiterhin gute Ergebnisse.`,
      {
        x: CONFIG.margin + 0.15, y: 3.4, w: 8.5, h: 1,
        fontSize: 10, color: CONFIG.colors.darkGray, fontFace: CONFIG.fontFamily
      }
    );
    
    addFamefactIcon(slide11, 11);
    
    // ========================================
    // SLIDE 12: Outro (black background)
    // ========================================
    const slide12 = pptx.addSlide();
    slide12.background = { color: CONFIG.colors.black };
    
    // famefact logo (white)
    slide12.addText('famefact.', {
      x: CONFIG.margin, y: 0.35, w: 2.5, h: 0.5,
      fontSize: 20, bold: true, color: CONFIG.colors.white, fontFace: CONFIG.fontFamily
    });
    
    // Contact photo placeholder
    slide12.addShape('roundRect', {
      x: CONFIG.margin, y: 1.1, w: 2.4, h: 2.7,
      fill: { color: CONFIG.colors.darkGray },
      line: { color: '555555', width: 1 },
      rectRadius: 0.1
    });
    slide12.addText('Foto', {
      x: CONFIG.margin, y: 2.3, w: 2.4, h: 0.4,
      fontSize: 11, color: CONFIG.colors.mediumGray, align: 'center', fontFace: CONFIG.fontFamily
    });
    
    // Contact info
    slide12.addText(CONFIG.contact.name, {
      x: CONFIG.margin, y: 3.95, w: 4, h: 0.3,
      fontSize: 13, color: CONFIG.colors.white, fontFace: CONFIG.fontFamily
    });
    slide12.addText(CONFIG.contact.title, {
      x: CONFIG.margin, y: 4.25, w: 4, h: 0.25,
      fontSize: 10, color: CONFIG.colors.mediumGray, fontFace: CONFIG.fontFamily
    });
    
    slide12.addText('famefact', {
      x: CONFIG.margin, y: 4.7, w: 4, h: 0.35,
      fontSize: 15, bold: true, color: CONFIG.colors.white, fontFace: CONFIG.fontFamily
    });
    slide12.addText('FIRST IN SOCIALTAINMENT', {
      x: CONFIG.margin, y: 5.0, w: 4, h: 0.25,
      fontSize: 8, color: CONFIG.colors.mediumGray, charSpacing: 2, fontFace: CONFIG.fontFamily
    });
    
    slide12.addText(`${CONFIG.contact.company}\n${CONFIG.contact.address}\n${CONFIG.contact.city}`, {
      x: CONFIG.margin, y: 5.4, w: 4, h: 0.7,
      fontSize: 9, color: CONFIG.colors.white, fontFace: CONFIG.fontFamily
    });
    
    slide12.addText(`E-Mail: ${CONFIG.contact.email}\nTel.: ${CONFIG.contact.phone}`, {
      x: CONFIG.margin, y: 6.15, w: 4, h: 0.45,
      fontSize: 9, color: CONFIG.colors.white, fontFace: CONFIG.fontFamily
    });
    
    // famefact graphic (right side)
    slide12.addShape('rect', {
      x: 6.8, y: 0.4, w: 2.4, h: 2.4,
      fill: { color: CONFIG.colors.primary },
      rotate: 45
    });
    slide12.addShape('rect', {
      x: 7.5, y: 1.3, w: 1.9, h: 1.9,
      fill: { color: CONFIG.colors.secondary },
      rotate: 45
    });
    
    // Generate file
    const buffer = await pptx.write({ outputType: 'nodebuffer' }) as Buffer;
    
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${CONFIG.customerSlug}_Premium_Report_${month}.pptx"`,
      },
    });
    
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json({ error: 'Failed to generate report', details: String(error) }, { status: 500 });
  }
}
