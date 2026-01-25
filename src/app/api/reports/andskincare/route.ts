import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import PptxGenJS from 'pptxgenjs';

// ANDskincare specific configuration - PREMIUM famefact design
const CONFIG = {
  customerName: 'ANDskincare',
  customerSlug: 'andskincare',
  facebookUrl: 'facebook.com/ANDskincare',
  instagramHandle: 'and.skincare',
  // Global styling
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
    // Basic colors
    white: 'FFFFFF',
    black: '000000',
    gray: '666666',
    lightGray: 'F5F5F5',
    darkGray: '333333',
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
function getTrendText(currentValue: number, previousValue: number): { text: string; color: string } {
  if (previousValue === 0) return { text: '—', color: CONFIG.colors.gray };
  const change = ((currentValue - previousValue) / previousValue) * 100;
  const text = (change >= 0 ? '+' : '') + change.toFixed(1).replace('.', ',') + '%';
  return { text, color: getTrendColor(currentValue, previousValue) };
}

// Add branding line to top of each slide
function addBrandingLine(slide: PptxGenJS.Slide, color: string = CONFIG.colors.brandingLine) {
  slide.addShape('rect', {
    x: 0, y: 0, w: '100%', h: 0.08,
    fill: { color: color }
  });
}

// Add famefact icon and page number to slide (bottom)
function addFamefactIcon(slide: PptxGenJS.Slide, pageNum: number) {
  // famefact icon placeholder (simplified)
  slide.addText('⬡', {
    x: CONFIG.margin, y: 4.9, w: 0.4, h: 0.4,
    fontSize: 24, color: CONFIG.colors.black, fontFace: CONFIG.fontFamily
  });
  // Page number (bottom right)
  slide.addText(pageNum.toString(), {
    x: 9.5 - CONFIG.margin, y: 5.1, w: 0.5, h: 0.3,
    fontSize: 11, color: CONFIG.colors.gray, align: 'right', fontFace: CONFIG.fontFamily
  });
}

// Create Premium KPI table for Facebook with rounded headers and trend colors
function createPremiumFacebookKPITable(
  slide: PptxGenJS.Slide, 
  kpis: MonthlyKPI[], 
  startY: number
): void {
  const tableX = CONFIG.margin;
  const tableW = 10 - (CONFIG.margin * 2);
  const colW = [3.2, 2.2, 2.2, 2.2];
  const rowH = 0.38;
  const headerH = 0.45;
  
  // Draw rounded header background (simulated with rect + round corners)
  slide.addShape('roundRect', {
    x: tableX, y: startY, w: tableW, h: headerH,
    fill: { color: CONFIG.colors.tableHeader },
    rectRadius: 0.1
  });
  
  // Header texts
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
  
  // Data rows with trend coloring
  const dataRows = [
    { 
      label: 'Neue Fans', 
      values: kpis.map(k => k.new_followers > 0 ? `+${k.new_followers}` : k.new_followers.toString()),
      trendIdx: null // No trend comparison
    },
    { 
      label: 'Fans total', 
      values: kpis.map(k => formatNumber(k.followers)),
      trendIdx: null
    },
    { 
      label: 'Post-Reichweite', 
      values: kpis.map(k => formatNumber(k.total_reach)),
      trendIdx: 0 // Compare with previous month
    },
    { 
      label: 'Ø Reichweite pro Post', 
      values: kpis.map(k => formatNumber(k.avg_reach)),
      trendIdx: 0
    },
    { 
      label: 'Interaktionen\n(Teilen, Liken, Kommentieren)', 
      values: kpis.map(k => formatNumber(k.total_reactions + k.total_comments + k.total_shares)),
      trendIdx: 0
    },
    { 
      label: '3-sekündige Video Plays', 
      values: kpis.map(k => formatNumber(k.total_video_views)),
      trendIdx: null
    },
    { 
      label: 'Interaktionsrate*', 
      values: kpis.map(k => k.engagement_rate.toFixed(2).replace('.', ',') + '%'),
      trendIdx: 0, // Special: color based on absolute value
      isEngagementRate: true
    },
    { 
      label: 'Anzahl der Postings', 
      values: kpis.map(k => k.posts_count.toString()),
      trendIdx: null
    },
    { 
      label: 'Budget pro Posting', 
      values: ['0,00 €', '0,00 €', '0,00 €'],
      trendIdx: null
    },
    { 
      label: 'Ausgaben', 
      values: ['0,00 €', '0,00 €', '0,00 €'],
      trendIdx: null
    },
  ];
  
  let currentY = startY + headerH;
  dataRows.forEach((row, rowIdx) => {
    const isAlt = rowIdx % 2 === 0;
    const bgColor = isAlt ? CONFIG.colors.lightGray : CONFIG.colors.white;
    
    // Row background
    slide.addShape('rect', {
      x: tableX, y: currentY, w: tableW, h: rowH,
      fill: { color: bgColor },
      line: { color: 'DDDDDD', width: 0.3 }
    });
    
    // Label cell
    slide.addText(row.label, {
      x: tableX + 0.1, y: currentY, w: colW[0] - 0.2, h: rowH,
      fontSize: 10, color: CONFIG.colors.black, fontFace: CONFIG.fontFamily,
      align: 'left', valign: 'middle'
    });
    
    // Value cells with trend coloring
    let cellX = tableX + colW[0];
    for (let i = 2; i >= 0; i--) {
      let textColor = CONFIG.colors.black;
      
      // Apply trend coloring for engagement rate
      if (row.isEngagementRate) {
        const rate = kpis[i].engagement_rate;
        if (rate >= 5) textColor = CONFIG.colors.trendUp;
        else if (rate >= 2) textColor = CONFIG.colors.trendNeutral;
        else textColor = CONFIG.colors.trendDown;
      }
      // Apply trend coloring for other metrics (compare current with previous)
      else if (row.trendIdx !== null && i === 2) {
        // Only color the current month column
        const currentVal = parseFloat(row.values[i].replace(/[^\d,-]/g, '').replace(',', '.')) || 0;
        const prevVal = parseFloat(row.values[i - 1].replace(/[^\d,-]/g, '').replace(',', '.')) || 0;
        if (prevVal > 0) {
          const change = ((currentVal - prevVal) / prevVal) * 100;
          if (change >= 5) textColor = CONFIG.colors.trendUp;
          else if (change <= -5) textColor = CONFIG.colors.trendDown;
        }
      }
      
      slide.addText(row.values[i], {
        x: cellX + 0.1, y: currentY, w: colW[3 - i] - 0.2, h: rowH,
        fontSize: 10, color: textColor, fontFace: CONFIG.fontFamily,
        align: 'center', valign: 'middle', bold: row.isEngagementRate
      });
      cellX += colW[3 - i];
    }
    
    currentY += rowH;
  });
  
  // Footnote
  slide.addText('*Die Interaktionsrate berechnet sich aus allen Interaktionen durch die Gesamtreichweite mal 100', {
    x: CONFIG.margin, y: currentY + 0.15, w: tableW, h: 0.25,
    fontSize: 8, color: CONFIG.colors.gray, italic: true, fontFace: CONFIG.fontFamily
  });
}

// Create Premium KPI table for Instagram with purple header
function createPremiumInstagramKPITable(
  slide: PptxGenJS.Slide, 
  kpis: MonthlyKPI[], 
  startY: number
): void {
  const tableX = CONFIG.margin;
  const tableW = 10 - (CONFIG.margin * 2);
  const colW = [3.2, 2.2, 2.2, 2.2];
  const rowH = 0.38;
  const headerH = 0.45;
  
  // Draw rounded header background with Instagram purple
  slide.addShape('roundRect', {
    x: tableX, y: startY, w: tableW, h: headerH,
    fill: { color: CONFIG.colors.tableHeaderIG },
    rectRadius: 0.1
  });
  
  // Header texts
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
  
  // Data rows
  const dataRows = [
    { label: 'Neue Follower', values: kpis.map(k => k.new_followers > 0 ? `+ ${k.new_followers}` : k.new_followers.toString()), isEngagementRate: false },
    { label: 'Follower total', values: kpis.map(k => formatNumber(k.followers)), isEngagementRate: false },
    { label: 'Post-Reichweite', values: kpis.map(k => formatNumber(k.total_reach)), isEngagementRate: false },
    { label: 'Ø Reichweite pro Post', values: kpis.map(k => formatNumber(k.avg_reach)), isEngagementRate: false },
    { label: 'Interaktionen\n(Likes, Kommentare, Saves, Klicks)', values: kpis.map(k => formatNumber(k.total_reactions + k.total_comments + k.total_saves)), isEngagementRate: false },
    { label: 'Videoviews', values: kpis.map(k => formatNumber(k.total_video_views)), isEngagementRate: false },
    { label: 'Savings', values: kpis.map(k => k.total_saves.toString()), isEngagementRate: false },
    { label: 'Interaktionsrate', values: kpis.map(k => k.engagement_rate.toFixed(2).replace('.', ',') + ' %'), isEngagementRate: true },
    { label: 'Anzahl an Postings', values: kpis.map(k => k.posts_count.toString()), isEngagementRate: false },
    { label: 'Ausgaben', values: ['0,00 €', '0,00 €', '0,00 €'], isEngagementRate: false },
  ];
  
  let currentY = startY + headerH;
  dataRows.forEach((row, rowIdx) => {
    const isAlt = rowIdx % 2 === 0;
    const bgColor = isAlt ? CONFIG.colors.lightGray : CONFIG.colors.white;
    
    slide.addShape('rect', {
      x: tableX, y: currentY, w: tableW, h: rowH,
      fill: { color: bgColor },
      line: { color: 'DDDDDD', width: 0.3 }
    });
    
    slide.addText(row.label, {
      x: tableX + 0.1, y: currentY, w: colW[0] - 0.2, h: rowH,
      fontSize: 10, color: CONFIG.colors.black, fontFace: CONFIG.fontFamily,
      align: 'left', valign: 'middle'
    });
    
    let cellX = tableX + colW[0];
    for (let i = 2; i >= 0; i--) {
      let textColor = CONFIG.colors.black;
      
      if (row.isEngagementRate) {
        const rate = kpis[i].engagement_rate;
        if (rate >= 5) textColor = CONFIG.colors.trendUp;
        else if (rate >= 2) textColor = CONFIG.colors.trendNeutral;
        else textColor = CONFIG.colors.trendDown;
      }
      
      slide.addText(row.values[i], {
        x: cellX + 0.1, y: currentY, w: colW[3 - i] - 0.2, h: rowH,
        fontSize: 10, color: textColor, fontFace: CONFIG.fontFamily,
        align: 'center', valign: 'middle', bold: row.isEngagementRate
      });
      cellX += colW[3 - i];
    }
    
    currentY += rowH;
  });
}

// Create Executive Summary Slide
function createExecutiveSummarySlide(
  slide: PptxGenJS.Slide,
  fbKpis: MonthlyKPI[],
  igKpis: MonthlyKPI[],
  month: string
): void {
  addBrandingLine(slide);
  slide.background = { color: CONFIG.colors.white };
  
  // Title
  slide.addText('Executive Summary', {
    x: CONFIG.margin, y: 0.3, w: 9, h: 0.5,
    fontSize: 28, bold: true, color: CONFIG.colors.black, fontFace: CONFIG.fontFamily
  });
  slide.addText(getMonthName(month), {
    x: CONFIG.margin, y: 0.75, w: 9, h: 0.35,
    fontSize: 16, color: CONFIG.colors.gray, fontFace: CONFIG.fontFamily
  });
  
  // Left side: 3 KPI boxes
  const boxW = 2.8;
  const boxH = 1.8;
  const boxY = 1.4;
  const boxGap = 0.2;
  
  const fbCurrent = fbKpis[2];
  const igCurrent = igKpis[2];
  const fbPrev = fbKpis[1];
  const igPrev = igKpis[1];
  
  // KPI 1: Total Followers
  const totalFollowers = fbCurrent.followers + igCurrent.followers;
  const prevTotalFollowers = fbPrev.followers + igPrev.followers;
  const followerTrend = getTrendText(totalFollowers, prevTotalFollowers);
  
  slide.addShape('roundRect', {
    x: CONFIG.margin, y: boxY, w: boxW, h: boxH,
    fill: { color: CONFIG.colors.lightGray },
    line: { color: CONFIG.colors.primary, width: 2 },
    rectRadius: 0.15
  });
  slide.addText('👥', {
    x: CONFIG.margin + 0.2, y: boxY + 0.15, w: 0.5, h: 0.4,
    fontSize: 20
  });
  slide.addText('Follower Gesamt', {
    x: CONFIG.margin + 0.1, y: boxY + 0.55, w: boxW - 0.2, h: 0.3,
    fontSize: 10, color: CONFIG.colors.gray, fontFace: CONFIG.fontFamily, align: 'center'
  });
  slide.addText(formatNumber(totalFollowers), {
    x: CONFIG.margin + 0.1, y: boxY + 0.85, w: boxW - 0.2, h: 0.5,
    fontSize: 24, bold: true, color: CONFIG.colors.black, fontFace: CONFIG.fontFamily, align: 'center'
  });
  slide.addText(followerTrend.text, {
    x: CONFIG.margin + 0.1, y: boxY + 1.35, w: boxW - 0.2, h: 0.3,
    fontSize: 12, color: followerTrend.color, fontFace: CONFIG.fontFamily, align: 'center', bold: true
  });
  
  // KPI 2: Total Reach
  const totalReach = fbCurrent.total_reach + igCurrent.total_reach;
  const prevTotalReach = fbPrev.total_reach + igPrev.total_reach;
  const reachTrend = getTrendText(totalReach, prevTotalReach);
  
  slide.addShape('roundRect', {
    x: CONFIG.margin + boxW + boxGap, y: boxY, w: boxW, h: boxH,
    fill: { color: CONFIG.colors.lightGray },
    line: { color: CONFIG.colors.primary, width: 2 },
    rectRadius: 0.15
  });
  slide.addText('👁️', {
    x: CONFIG.margin + boxW + boxGap + 0.2, y: boxY + 0.15, w: 0.5, h: 0.4,
    fontSize: 20
  });
  slide.addText('Reichweite Gesamt', {
    x: CONFIG.margin + boxW + boxGap + 0.1, y: boxY + 0.55, w: boxW - 0.2, h: 0.3,
    fontSize: 10, color: CONFIG.colors.gray, fontFace: CONFIG.fontFamily, align: 'center'
  });
  slide.addText(formatNumber(totalReach), {
    x: CONFIG.margin + boxW + boxGap + 0.1, y: boxY + 0.85, w: boxW - 0.2, h: 0.5,
    fontSize: 24, bold: true, color: CONFIG.colors.black, fontFace: CONFIG.fontFamily, align: 'center'
  });
  slide.addText(reachTrend.text, {
    x: CONFIG.margin + boxW + boxGap + 0.1, y: boxY + 1.35, w: boxW - 0.2, h: 0.3,
    fontSize: 12, color: reachTrend.color, fontFace: CONFIG.fontFamily, align: 'center', bold: true
  });
  
  // KPI 3: Total Interactions
  const totalInteractions = (fbCurrent.total_reactions + fbCurrent.total_comments + fbCurrent.total_shares) + 
                           (igCurrent.total_reactions + igCurrent.total_comments + igCurrent.total_saves);
  const prevTotalInteractions = (fbPrev.total_reactions + fbPrev.total_comments + fbPrev.total_shares) + 
                                (igPrev.total_reactions + igPrev.total_comments + igPrev.total_saves);
  const interactionTrend = getTrendText(totalInteractions, prevTotalInteractions);
  
  slide.addShape('roundRect', {
    x: CONFIG.margin + (boxW + boxGap) * 2, y: boxY, w: boxW, h: boxH,
    fill: { color: CONFIG.colors.lightGray },
    line: { color: CONFIG.colors.primary, width: 2 },
    rectRadius: 0.15
  });
  slide.addText('💬', {
    x: CONFIG.margin + (boxW + boxGap) * 2 + 0.2, y: boxY + 0.15, w: 0.5, h: 0.4,
    fontSize: 20
  });
  slide.addText('Interaktionen Gesamt', {
    x: CONFIG.margin + (boxW + boxGap) * 2 + 0.1, y: boxY + 0.55, w: boxW - 0.2, h: 0.3,
    fontSize: 10, color: CONFIG.colors.gray, fontFace: CONFIG.fontFamily, align: 'center'
  });
  slide.addText(formatNumber(totalInteractions), {
    x: CONFIG.margin + (boxW + boxGap) * 2 + 0.1, y: boxY + 0.85, w: boxW - 0.2, h: 0.5,
    fontSize: 24, bold: true, color: CONFIG.colors.black, fontFace: CONFIG.fontFamily, align: 'center'
  });
  slide.addText(interactionTrend.text, {
    x: CONFIG.margin + (boxW + boxGap) * 2 + 0.1, y: boxY + 1.35, w: boxW - 0.2, h: 0.3,
    fontSize: 12, color: interactionTrend.color, fontFace: CONFIG.fontFamily, align: 'center', bold: true
  });
  
  // Right side: Gesamtfazit box
  const fazitX = CONFIG.margin + (boxW + boxGap) * 3 + 0.3;
  const fazitW = 10 - fazitX - CONFIG.margin;
  
  slide.addShape('roundRect', {
    x: fazitX, y: boxY, w: fazitW, h: boxH,
    fill: { color: CONFIG.colors.white },
    line: { color: CONFIG.colors.secondary, width: 2 },
    rectRadius: 0.15
  });
  
  slide.addText('Gesamtfazit', {
    x: fazitX + 0.15, y: boxY + 0.1, w: fazitW - 0.3, h: 0.35,
    fontSize: 12, bold: true, color: CONFIG.colors.secondary, fontFace: CONFIG.fontFamily
  });
  
  const fazitText = `Der ${getShortMonthName(month)} zeigt eine ${
    totalReach > prevTotalReach ? 'positive' : 'stabile'
  } Performance auf beiden Plattformen. Die organische Basis bleibt solide und bietet eine gute Ausgangslage für neue Impulse.`;
  
  slide.addText(fazitText, {
    x: fazitX + 0.15, y: boxY + 0.45, w: fazitW - 0.3, h: 1.2,
    fontSize: 10, color: CONFIG.colors.black, fontFace: CONFIG.fontFamily
  });
  
  // Platform breakdown below
  const breakdownY = boxY + boxH + 0.4;
  
  // Facebook mini summary
  slide.addShape('rect', {
    x: CONFIG.margin, y: breakdownY, w: 4.3, h: 1.6,
    fill: { color: CONFIG.colors.lightGray },
    line: { color: CONFIG.colors.primary, width: 1.5 }
  });
  slide.addText('📘 Facebook', {
    x: CONFIG.margin + 0.15, y: breakdownY + 0.1, w: 4, h: 0.3,
    fontSize: 12, bold: true, color: CONFIG.colors.black, fontFace: CONFIG.fontFamily
  });
  slide.addText(`Reichweite: ${formatNumber(fbCurrent.total_reach)}\nInteraktionen: ${formatNumber(fbCurrent.total_reactions + fbCurrent.total_comments)}\nEngagement: ${fbCurrent.engagement_rate.toFixed(2).replace('.', ',')}%`, {
    x: CONFIG.margin + 0.15, y: breakdownY + 0.45, w: 4, h: 1,
    fontSize: 10, color: CONFIG.colors.black, fontFace: CONFIG.fontFamily
  });
  
  // Instagram mini summary
  slide.addShape('rect', {
    x: CONFIG.margin + 4.5, y: breakdownY, w: 4.3, h: 1.6,
    fill: { color: CONFIG.colors.lightGray },
    line: { color: CONFIG.colors.secondary, width: 1.5 }
  });
  slide.addText('📸 Instagram', {
    x: CONFIG.margin + 4.65, y: breakdownY + 0.1, w: 4, h: 0.3,
    fontSize: 12, bold: true, color: CONFIG.colors.black, fontFace: CONFIG.fontFamily
  });
  slide.addText(`Reichweite: ${formatNumber(igCurrent.total_reach)}\nInteraktionen: ${formatNumber(igCurrent.total_reactions + igCurrent.total_comments)}\nEngagement: ${igCurrent.engagement_rate.toFixed(2).replace('.', ',')}%`, {
    x: CONFIG.margin + 4.65, y: breakdownY + 0.45, w: 4, h: 1,
    fontSize: 10, color: CONFIG.colors.black, fontFace: CONFIG.fontFamily
  });
}

// Create premium bar chart with larger images and overlays
function createPremiumBarChartWithImages(
  slide: PptxGenJS.Slide,
  posts: (PostData & { value: number })[],
  barColor: string,
  yAxisLabel: string,
  startY: number
) {
  if (posts.length === 0) {
    slide.addText('Keine Daten für diesen Zeitraum', {
      x: 1, y: 2.5, w: 8, h: 0.5,
      fontSize: 14, color: CONFIG.colors.gray, align: 'center', fontFace: CONFIG.fontFamily
    });
    return;
  }
  
  const maxValue = Math.max(...posts.map(p => p.value));
  const chartHeight = 2.8;
  const chartWidth = 10 - (CONFIG.margin * 2) - 0.5;
  const startX = CONFIG.margin + 0.7;
  const chartBottom = startY + chartHeight;
  
  // Calculate bar width based on number of posts (min 1.5 inch for images)
  const imgSize = 1.5; // Minimum 1.5 inch for images
  const barWidth = Math.min(imgSize, (chartWidth - 0.5) / posts.length - 0.15);
  const actualImgSize = Math.max(barWidth * 0.9, 1.2);
  
  // Y-axis
  slide.addShape('line', {
    x: startX - 0.1, y: startY, w: 0, h: chartHeight,
    line: { color: CONFIG.colors.gray, width: 0.5 }
  });
  
  // Y-axis labels and grid lines
  const ySteps = 5;
  for (let i = 0; i <= ySteps; i++) {
    const yVal = Math.round((maxValue / ySteps) * (ySteps - i));
    const yPos = startY + (chartHeight / ySteps) * i;
    slide.addText(formatNumber(yVal), {
      x: CONFIG.margin - 0.1, y: yPos - 0.12, w: 0.7, h: 0.24,
      fontSize: 8, color: CONFIG.colors.gray, align: 'right', fontFace: CONFIG.fontFamily
    });
    // Grid line
    slide.addShape('line', {
      x: startX, y: yPos, w: chartWidth, h: 0,
      line: { color: 'E8E8E8', width: 0.3, dashType: 'dash' }
    });
  }
  
  // Bars and images with overlays
  const spacing = chartWidth / posts.length;
  posts.forEach((post, idx) => {
    const barHeight = maxValue > 0 ? (post.value / maxValue) * chartHeight : 0;
    const xPos = startX + idx * spacing + (spacing - barWidth) / 2;
    const barY = chartBottom - barHeight;
    
    // Bar with gradient effect (simulated with two rectangles)
    slide.addShape('rect', {
      x: xPos, y: barY, w: barWidth, h: barHeight,
      fill: { color: barColor },
    });
    // Lighter overlay on left side for 3D effect
    slide.addShape('rect', {
      x: xPos, y: barY, w: barWidth * 0.3, h: barHeight,
      fill: { color: barColor, transparency: 30 },
    });
    
    // Image above bar (larger, min 1.5 inch)
    const imgY = barY - actualImgSize - 0.08;
    const imgX = xPos + (barWidth - actualImgSize) / 2;
    
    if (post.thumbnail_url) {
      try {
        slide.addImage({
          path: post.thumbnail_url,
          x: imgX,
          y: imgY,
          w: actualImgSize, 
          h: actualImgSize,
        });
        
        // Semi-transparent overlay box with interaction count (bottom right of image)
        const overlayW = actualImgSize * 0.6;
        const overlayH = 0.28;
        const overlayX = imgX + actualImgSize - overlayW - 0.05;
        const overlayY = imgY + actualImgSize - overlayH - 0.05;
        
        // Black background with 50% transparency
        slide.addShape('rect', {
          x: overlayX, y: overlayY, w: overlayW, h: overlayH,
          fill: { color: CONFIG.colors.black, transparency: 50 },
          rectRadius: 0.05
        });
        
        // White text for interaction count
        slide.addText(formatNumber(post.value), {
          x: overlayX, y: overlayY, w: overlayW, h: overlayH,
          fontSize: 9, bold: true, color: CONFIG.colors.white, 
          fontFace: CONFIG.fontFamily, align: 'center', valign: 'middle'
        });
      } catch {
        slide.addShape('rect', {
          x: imgX, y: imgY, w: actualImgSize, h: actualImgSize,
          fill: { color: 'EEEEEE' }, line: { color: 'CCCCCC', width: 0.5 }
        });
      }
    }
    
    // Date label below bar
    const isCarousel = post.type === 'carousel' || post.type === 'CAROUSEL_ALBUM';
    const dateStr = formatDate(post.created_time) + (isCarousel ? '*' : '');
    slide.addText(dateStr, {
      x: xPos - 0.15, y: chartBottom + 0.05, w: barWidth + 0.3, h: 0.25,
      fontSize: 7, color: CONFIG.colors.black, align: 'center', fontFace: CONFIG.fontFamily
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
    
    // Create PowerPoint with premium styling
    const pptx = new PptxGenJS();
    pptx.author = 'famefact GmbH';
    pptx.title = `${CONFIG.customerName} Social Media Report - ${getMonthName(month)}`;
    pptx.company = 'famefact GmbH';
    pptx.layout = 'LAYOUT_16x9';
    
    // ========================================
    // SLIDE 1: Cover (white background with branding)
    // ========================================
    const slide1 = pptx.addSlide();
    slide1.background = { color: CONFIG.colors.white };
    addBrandingLine(slide1);
    
    // famefact logo (top left)
    slide1.addText('famefact.', {
      x: CONFIG.margin, y: 0.3, w: 2, h: 0.4,
      fontSize: 18, bold: true, color: CONFIG.colors.black, fontFace: CONFIG.fontFamily
    });
    
    // famefact graphic (top right) - green/purple diamond shapes
    slide1.addShape('rect', {
      x: 7.5, y: 0.2, w: 1.5, h: 1.5,
      fill: { color: CONFIG.colors.primary },
      rotate: 45
    });
    slide1.addShape('rect', {
      x: 8.2, y: 0.8, w: 1.2, h: 1.2,
      fill: { color: CONFIG.colors.secondary },
      rotate: 45
    });
    
    // ANDskincare Logo (center)
    const logoY = 1.8;
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
      x: 0, y: logoY + 1.1, w: '100%', h: 0.4,
      fontSize: 18, color: '808080', align: 'center', charSpacing: 6, fontFace: CONFIG.fontFamily
    });
    
    // Title
    slide1.addText('Social Media Reporting', {
      x: 0, y: 3.5, w: '100%', h: 0.6,
      fontSize: 32, bold: true, color: CONFIG.colors.black, align: 'center', fontFace: CONFIG.fontFamily
    });
    slide1.addText(getMonthName(month), {
      x: 0, y: 4.1, w: '100%', h: 0.4,
      fontSize: 20, color: CONFIG.colors.primary, align: 'center', fontFace: CONFIG.fontFamily
    });
    
    // ========================================
    // SLIDE 2: Executive Summary (NEW!)
    // ========================================
    const slide2 = pptx.addSlide();
    createExecutiveSummarySlide(slide2, fbKpis, igKpis, month);
    addFamefactIcon(slide2, 2);
    
    // ========================================
    // SLIDE 3: Facebook Analyse (Screenshot placeholder)
    // ========================================
    const slide3 = pptx.addSlide();
    slide3.background = { color: CONFIG.colors.white };
    addBrandingLine(slide3, CONFIG.colors.primary);
    
    // Facebook icon
    slide3.addShape('ellipse', {
      x: 4.5, y: 0.3, w: 0.8, h: 0.8,
      fill: { color: CONFIG.colors.black }
    });
    slide3.addText('f', {
      x: 4.5, y: 0.3, w: 0.8, h: 0.8,
      fontSize: 28, bold: true, color: CONFIG.colors.white, align: 'center', valign: 'middle', fontFace: CONFIG.fontFamily
    });
    
    slide3.addText('Facebook Analyse', {
      x: 0, y: 1.2, w: '100%', h: 0.5,
      fontSize: 28, bold: true, color: CONFIG.colors.black, align: 'center', fontFace: CONFIG.fontFamily
    });
    
    // Screenshot placeholder
    slide3.addShape('rect', {
      x: 1, y: 1.9, w: 8, h: 3,
      fill: { color: CONFIG.colors.lightGray },
      line: { color: 'CCCCCC', width: 1 }
    });
    slide3.addText('Screenshot der Facebook-Seite hier einfügen', {
      x: 1, y: 3.2, w: 8, h: 0.4,
      fontSize: 12, color: CONFIG.colors.gray, align: 'center', fontFace: CONFIG.fontFamily
    });
    
    addFamefactIcon(slide3, 3);
    
    // ========================================
    // SLIDE 4: Facebook Kennzahlen (Premium Table)
    // ========================================
    const slide4 = pptx.addSlide();
    slide4.background = { color: CONFIG.colors.white };
    addBrandingLine(slide4, CONFIG.colors.primary);
    
    slide4.addText('Facebook', {
      x: CONFIG.margin, y: 0.2, w: 9, h: 0.5,
      fontSize: 28, bold: true, color: CONFIG.colors.black, fontFace: CONFIG.fontFamily
    });
    slide4.addText('Kennzahlen', {
      x: CONFIG.margin, y: 0.65, w: 9, h: 0.35,
      fontSize: 16, color: CONFIG.colors.gray, fontFace: CONFIG.fontFamily
    });
    
    createPremiumFacebookKPITable(slide4, fbKpis, 1.1);
    
    addFamefactIcon(slide4, 4);
    
    // ========================================
    // SLIDE 5: Facebook Posts nach Interaktionen (Premium Chart)
    // ========================================
    const slide5 = pptx.addSlide();
    slide5.background = { color: CONFIG.colors.white };
    addBrandingLine(slide5, CONFIG.colors.primary);
    
    slide5.addText('Facebook', {
      x: CONFIG.margin, y: 0.2, w: 9, h: 0.5,
      fontSize: 28, bold: true, color: CONFIG.colors.black, fontFace: CONFIG.fontFamily
    });
    slide5.addText('Postings (Feed) nach Interaktionen', {
      x: CONFIG.margin, y: 0.65, w: 9, h: 0.35,
      fontSize: 16, color: CONFIG.colors.gray, fontFace: CONFIG.fontFamily
    });
    
    const fbPostsByInteractions = [...fbPosts]
      .filter(p => p.type !== 'video' && p.type !== 'VIDEO')
      .map(p => ({ ...p, value: (p.reactions_total || 0) + (p.comments_total || 0) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
    
    createPremiumBarChartWithImages(slide5, fbPostsByInteractions, CONFIG.colors.green, 'Interaktionen', 1.5);
    
    if (fbPostsByInteractions.some(p => p.type === 'carousel' || p.type === 'CAROUSEL_ALBUM')) {
      slide5.addText('*Carousel Posting', {
        x: CONFIG.margin, y: 4.8, w: 3, h: 0.25,
        fontSize: 9, color: CONFIG.colors.black, fontFace: CONFIG.fontFamily
      });
    }
    
    addFamefactIcon(slide5, 5);
    
    // ========================================
    // SLIDE 6: Facebook Videos nach 3-Sek-Views
    // ========================================
    const slide6 = pptx.addSlide();
    slide6.background = { color: CONFIG.colors.white };
    addBrandingLine(slide6, CONFIG.colors.primary);
    
    slide6.addText('Facebook', {
      x: CONFIG.margin, y: 0.2, w: 9, h: 0.5,
      fontSize: 28, bold: true, color: CONFIG.colors.black, fontFace: CONFIG.fontFamily
    });
    slide6.addText('Postings (Feed) nach 3-sekündigen Videoplays', {
      x: CONFIG.margin, y: 0.65, w: 9, h: 0.35,
      fontSize: 16, color: CONFIG.colors.gray, fontFace: CONFIG.fontFamily
    });
    
    const fbVideos = [...fbPosts]
      .filter(p => p.type === 'video' || p.type === 'VIDEO' || p.type === 'reel' || p.type === 'REEL')
      .map(p => ({ 
        ...p, 
        value: (p.video_3s_views && p.video_3s_views > 0) ? p.video_3s_views : (p.reach || 0)
      }))
      .filter(p => p.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    
    createPremiumBarChartWithImages(slide6, fbVideos, CONFIG.colors.purple, 'Video Views', 1.5);
    
    addFamefactIcon(slide6, 6);
    
    // ========================================
    // SLIDE 7: Facebook Top Postings (2 large images)
    // ========================================
    const slide7 = pptx.addSlide();
    slide7.background = { color: CONFIG.colors.white };
    addBrandingLine(slide7, CONFIG.colors.primary);
    
    slide7.addText('Facebook', {
      x: CONFIG.margin, y: 0.2, w: 9, h: 0.5,
      fontSize: 28, bold: true, color: CONFIG.colors.black, fontFace: CONFIG.fontFamily
    });
    slide7.addText('Top Postings', {
      x: CONFIG.margin, y: 0.65, w: 9, h: 0.35,
      fontSize: 16, color: CONFIG.colors.gray, fontFace: CONFIG.fontFamily
    });
    
    const topFbPosts = [...fbPosts]
      .map(p => ({ ...p, interactions: (p.reactions_total || 0) + (p.comments_total || 0) }))
      .sort((a, b) => b.interactions - a.interactions)
      .slice(0, 2);
    
    topFbPosts.forEach((post, idx) => {
      const xPos = idx === 0 ? CONFIG.margin + 0.3 : 5.2;
      if (post.thumbnail_url) {
        try {
          slide7.addImage({
            path: post.thumbnail_url,
            x: xPos, y: 1.1, w: 4, h: 3.5,
          });
          // Overlay with stats
          slide7.addShape('rect', {
            x: xPos, y: 4.1, w: 4, h: 0.5,
            fill: { color: CONFIG.colors.black, transparency: 50 }
          });
          slide7.addText(`${formatNumber(post.interactions)} Interaktionen`, {
            x: xPos, y: 4.1, w: 4, h: 0.5,
            fontSize: 12, bold: true, color: CONFIG.colors.white, align: 'center', valign: 'middle', fontFace: CONFIG.fontFamily
          });
        } catch {
          slide7.addShape('rect', {
            x: xPos, y: 1.1, w: 4, h: 3.5,
            fill: { color: CONFIG.colors.lightGray },
            line: { color: 'CCCCCC', width: 1 }
          });
        }
      } else {
        slide7.addShape('rect', {
          x: xPos, y: 1.1, w: 4, h: 3.5,
          fill: { color: CONFIG.colors.lightGray },
          line: { color: 'CCCCCC', width: 1 }
        });
      }
    });
    
    addFamefactIcon(slide7, 7);
    
    // ========================================
    // SLIDE 8: Facebook Demographie
    // ========================================
    const slide8 = pptx.addSlide();
    slide8.background = { color: CONFIG.colors.white };
    addBrandingLine(slide8, CONFIG.colors.primary);
    
    slide8.addText('Facebook', {
      x: CONFIG.margin, y: 0.2, w: 9, h: 0.5,
      fontSize: 28, bold: true, color: CONFIG.colors.black, fontFace: CONFIG.fontFamily
    });
    slide8.addText('Fans (Demographie)', {
      x: CONFIG.margin, y: 0.65, w: 9, h: 0.35,
      fontSize: 16, color: CONFIG.colors.gray, fontFace: CONFIG.fontFamily
    });
    
    slide8.addShape('rect', {
      x: CONFIG.margin, y: 1.1, w: 10 - (CONFIG.margin * 2), h: 3.6,
      fill: { color: CONFIG.colors.lightGray },
      line: { color: 'CCCCCC', width: 1 }
    });
    slide8.addText('Screenshot der Facebook Insights (Demographie) hier einfügen', {
      x: CONFIG.margin, y: 2.7, w: 10 - (CONFIG.margin * 2), h: 0.4,
      fontSize: 12, color: CONFIG.colors.gray, align: 'center', fontFace: CONFIG.fontFamily
    });
    
    addFamefactIcon(slide8, 8);
    
    // ========================================
    // SLIDE 9: Instagram Analyse
    // ========================================
    const slide9 = pptx.addSlide();
    slide9.background = { color: CONFIG.colors.white };
    addBrandingLine(slide9, CONFIG.colors.secondary);
    
    // Instagram icon
    slide9.addShape('ellipse', {
      x: 4.5, y: 0.3, w: 0.8, h: 0.8,
      line: { color: CONFIG.colors.black, width: 2 }
    });
    slide9.addShape('ellipse', {
      x: 4.7, y: 0.5, w: 0.4, h: 0.4,
      line: { color: CONFIG.colors.black, width: 1.5 }
    });
    
    slide9.addText('Instagram Analyse', {
      x: 0, y: 1.2, w: '100%', h: 0.5,
      fontSize: 28, bold: true, color: CONFIG.colors.black, align: 'center', fontFace: CONFIG.fontFamily
    });
    slide9.addText(CONFIG.instagramHandle, {
      x: 0, y: 1.7, w: '100%', h: 0.3,
      fontSize: 14, color: CONFIG.colors.gray, align: 'center', fontFace: CONFIG.fontFamily
    });
    
    slide9.addShape('rect', {
      x: 1, y: 2.1, w: 8, h: 2.8,
      fill: { color: CONFIG.colors.lightGray },
      line: { color: 'CCCCCC', width: 1 }
    });
    slide9.addText('Screenshot des Instagram-Profils hier einfügen', {
      x: 1, y: 3.3, w: 8, h: 0.4,
      fontSize: 12, color: CONFIG.colors.gray, align: 'center', fontFace: CONFIG.fontFamily
    });
    
    addFamefactIcon(slide9, 9);
    
    // ========================================
    // SLIDE 10: Instagram Kennzahlen (Premium Table)
    // ========================================
    const slide10 = pptx.addSlide();
    slide10.background = { color: CONFIG.colors.white };
    addBrandingLine(slide10, CONFIG.colors.secondary);
    
    slide10.addText('Instagram', {
      x: CONFIG.margin, y: 0.2, w: 9, h: 0.5,
      fontSize: 28, bold: true, color: CONFIG.colors.black, fontFace: CONFIG.fontFamily
    });
    slide10.addText('Kennzahlen', {
      x: CONFIG.margin, y: 0.65, w: 9, h: 0.35,
      fontSize: 16, color: CONFIG.colors.gray, fontFace: CONFIG.fontFamily
    });
    
    createPremiumInstagramKPITable(slide10, igKpis, 1.1);
    
    addFamefactIcon(slide10, 10);
    
    // ========================================
    // SLIDE 11: Instagram Posts nach Interaktionen
    // ========================================
    const slide11 = pptx.addSlide();
    slide11.background = { color: CONFIG.colors.white };
    addBrandingLine(slide11, CONFIG.colors.secondary);
    
    slide11.addText('Instagram', {
      x: CONFIG.margin, y: 0.2, w: 9, h: 0.5,
      fontSize: 28, bold: true, color: CONFIG.colors.black, fontFace: CONFIG.fontFamily
    });
    slide11.addText('Postings (Feed) nach Interaktionen', {
      x: CONFIG.margin, y: 0.65, w: 9, h: 0.35,
      fontSize: 16, color: CONFIG.colors.gray, fontFace: CONFIG.fontFamily
    });
    
    const igPostsByInteractions = [...igPosts]
      .filter(p => p.type !== 'VIDEO' && p.type !== 'REEL')
      .map(p => ({ ...p, value: (p.reactions_total || 0) + (p.comments_total || 0) + (p.saves || 0) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
    
    createPremiumBarChartWithImages(slide11, igPostsByInteractions, CONFIG.colors.green, 'Interaktionen', 1.5);
    
    if (igPostsByInteractions.some(p => p.type === 'CAROUSEL_ALBUM')) {
      slide11.addText('*Carousel Posting', {
        x: CONFIG.margin, y: 4.8, w: 3, h: 0.25,
        fontSize: 9, color: CONFIG.colors.black, fontFace: CONFIG.fontFamily
      });
    }
    
    addFamefactIcon(slide11, 11);
    
    // ========================================
    // SLIDE 12: Instagram Reels nach Videoplays
    // ========================================
    const slide12 = pptx.addSlide();
    slide12.background = { color: CONFIG.colors.white };
    addBrandingLine(slide12, CONFIG.colors.secondary);
    
    slide12.addText('Instagram', {
      x: CONFIG.margin, y: 0.2, w: 9, h: 0.5,
      fontSize: 28, bold: true, color: CONFIG.colors.black, fontFace: CONFIG.fontFamily
    });
    slide12.addText('Postings nach Videoplays', {
      x: CONFIG.margin, y: 0.65, w: 9, h: 0.35,
      fontSize: 16, color: CONFIG.colors.gray, fontFace: CONFIG.fontFamily
    });
    
    const igReels = [...igPosts]
      .filter(p => p.type === 'VIDEO' || p.type === 'REEL')
      .map(p => ({ ...p, value: p.video_3s_views || p.reach || 0 }))
      .filter(p => p.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    
    createPremiumBarChartWithImages(slide12, igReels, CONFIG.colors.purple, 'Video Views', 1.5);
    
    addFamefactIcon(slide12, 12);
    
    // ========================================
    // SLIDE 13: Instagram Top Postings
    // ========================================
    const slide13 = pptx.addSlide();
    slide13.background = { color: CONFIG.colors.white };
    addBrandingLine(slide13, CONFIG.colors.secondary);
    
    slide13.addText('Instagram', {
      x: CONFIG.margin, y: 0.2, w: 9, h: 0.5,
      fontSize: 28, bold: true, color: CONFIG.colors.black, fontFace: CONFIG.fontFamily
    });
    slide13.addText('Top Postings', {
      x: CONFIG.margin, y: 0.65, w: 9, h: 0.35,
      fontSize: 16, color: CONFIG.colors.gray, fontFace: CONFIG.fontFamily
    });
    
    const topIgPosts = [...igPosts]
      .map(p => ({ ...p, interactions: (p.reactions_total || 0) + (p.comments_total || 0) }))
      .sort((a, b) => b.interactions - a.interactions)
      .slice(0, 2);
    
    topIgPosts.forEach((post, idx) => {
      const xPos = idx === 0 ? CONFIG.margin + 0.3 : 5.2;
      if (post.thumbnail_url) {
        try {
          slide13.addImage({
            path: post.thumbnail_url,
            x: xPos, y: 1.1, w: 4, h: 3.5,
          });
          // Overlay with stats
          slide13.addShape('rect', {
            x: xPos, y: 4.1, w: 4, h: 0.5,
            fill: { color: CONFIG.colors.black, transparency: 50 }
          });
          slide13.addText(`${formatNumber(post.interactions)} Interaktionen`, {
            x: xPos, y: 4.1, w: 4, h: 0.5,
            fontSize: 12, bold: true, color: CONFIG.colors.white, align: 'center', valign: 'middle', fontFace: CONFIG.fontFamily
          });
        } catch {
          slide13.addShape('rect', {
            x: xPos, y: 1.1, w: 4, h: 3.5,
            fill: { color: CONFIG.colors.lightGray },
            line: { color: 'CCCCCC', width: 1 }
          });
        }
      } else {
        slide13.addShape('rect', {
          x: xPos, y: 1.1, w: 4, h: 3.5,
          fill: { color: CONFIG.colors.lightGray },
          line: { color: 'CCCCCC', width: 1 }
        });
      }
    });
    
    addFamefactIcon(slide13, 13);
    
    // ========================================
    // SLIDE 14: Instagram Demographie
    // ========================================
    const slide14 = pptx.addSlide();
    slide14.background = { color: CONFIG.colors.white };
    addBrandingLine(slide14, CONFIG.colors.secondary);
    
    slide14.addText('Instagram', {
      x: CONFIG.margin, y: 0.2, w: 9, h: 0.5,
      fontSize: 28, bold: true, color: CONFIG.colors.black, fontFace: CONFIG.fontFamily
    });
    slide14.addText('Follower (Demographie)', {
      x: CONFIG.margin, y: 0.65, w: 9, h: 0.35,
      fontSize: 16, color: CONFIG.colors.gray, fontFace: CONFIG.fontFamily
    });
    
    slide14.addShape('rect', {
      x: CONFIG.margin, y: 1.1, w: 10 - (CONFIG.margin * 2), h: 3.6,
      fill: { color: CONFIG.colors.lightGray },
      line: { color: 'CCCCCC', width: 1 }
    });
    slide14.addText('Screenshot der Instagram Insights (Demographie) hier einfügen', {
      x: CONFIG.margin, y: 2.7, w: 10 - (CONFIG.margin * 2), h: 0.4,
      fontSize: 12, color: CONFIG.colors.gray, align: 'center', fontFace: CONFIG.fontFamily
    });
    
    addFamefactIcon(slide14, 14);
    
    // ========================================
    // SLIDE 15: Zusammenfassung
    // ========================================
    const slide15 = pptx.addSlide();
    slide15.background = { color: CONFIG.colors.white };
    addBrandingLine(slide15);
    
    slide15.addText('Facebook / Instagram', {
      x: CONFIG.margin, y: 0.2, w: 9, h: 0.5,
      fontSize: 28, bold: true, color: CONFIG.colors.black, fontFace: CONFIG.fontFamily
    });
    slide15.addText('Zusammenfassung', {
      x: CONFIG.margin, y: 0.65, w: 9, h: 0.35,
      fontSize: 16, color: CONFIG.colors.gray, italic: true, fontFace: CONFIG.fontFamily
    });
    
    // Facebook summary
    const fbCurrentKpi = fbKpis[2];
    const fbPrevKpi = fbKpis[1];
    slide15.addText('Facebook:', {
      x: CONFIG.margin + 0.3, y: 1.2, w: 9, h: 0.3,
      fontSize: 12, bold: true, color: CONFIG.colors.black, fontFace: CONFIG.fontFamily
    });
    
    const fbReachChange = fbPrevKpi.total_reach > 0 
      ? ((fbCurrentKpi.total_reach - fbPrevKpi.total_reach) / fbPrevKpi.total_reach * 100).toFixed(0)
      : '0';
    const fbBullets = [
      `Reichweite ${parseInt(fbReachChange) >= 0 ? 'steigt' : 'sinkt'} auf ${formatNumber(fbCurrentKpi.total_reach)} (${parseInt(fbReachChange) >= 0 ? '+' : ''}${fbReachChange}% ggü. ${getShortMonthName(fbPrevKpi.month)})`,
      `${fbCurrentKpi.posts_count} Postings im ${getShortMonthName(fbCurrentKpi.month)}`,
      `Interaktionsrate: ${fbCurrentKpi.engagement_rate.toFixed(2).replace('.', ',')}%`,
    ];
    
    fbBullets.forEach((text, idx) => {
      const trendColor = idx === 0 ? (parseInt(fbReachChange) >= 0 ? CONFIG.colors.trendUp : CONFIG.colors.trendDown) : CONFIG.colors.black;
      slide15.addText('●  ' + text, {
        x: CONFIG.margin + 0.5, y: 1.5 + idx * 0.35, w: 8.5, h: 0.3,
        fontSize: 11, color: idx === 0 ? trendColor : CONFIG.colors.black, fontFace: CONFIG.fontFamily
      });
    });
    
    // Instagram summary
    const igCurrentKpi = igKpis[2];
    const igPrevKpi = igKpis[1];
    slide15.addText('Instagram:', {
      x: CONFIG.margin + 0.3, y: 2.7, w: 9, h: 0.3,
      fontSize: 12, bold: true, color: CONFIG.colors.black, fontFace: CONFIG.fontFamily
    });
    
    const igReachChange = igPrevKpi.total_reach > 0 
      ? ((igCurrentKpi.total_reach - igPrevKpi.total_reach) / igPrevKpi.total_reach * 100).toFixed(0)
      : '0';
    const igBullets = [
      `Follower-Wachstum: ${igCurrentKpi.new_followers >= 0 ? '+' : ''}${igCurrentKpi.new_followers} neue Follower`,
      `Reichweite: ${formatNumber(igCurrentKpi.total_reach)} (${parseInt(igReachChange) >= 0 ? '+' : ''}${igReachChange}% ggü. ${getShortMonthName(igPrevKpi.month)})`,
      `Reels bleiben wichtiger Treiber für Reichweite und Sichtbarkeit`,
    ];
    
    igBullets.forEach((text, idx) => {
      const trendColor = idx === 0 ? (igCurrentKpi.new_followers >= 0 ? CONFIG.colors.trendUp : CONFIG.colors.trendDown) : CONFIG.colors.black;
      slide15.addText('●  ' + text, {
        x: CONFIG.margin + 0.5, y: 3.0 + idx * 0.35, w: 8.5, h: 0.3,
        fontSize: 11, color: idx === 0 ? trendColor : CONFIG.colors.black, fontFace: CONFIG.fontFamily
      });
    });
    
    // Gesamtfazit
    slide15.addText('Gesamtfazit ' + getShortMonthName(month) + ':', {
      x: CONFIG.margin, y: 4.1, w: 9, h: 0.3,
      fontSize: 11, bold: true, color: CONFIG.colors.black, fontFace: CONFIG.fontFamily
    });
    slide15.addText(
      `Der ${getShortMonthName(month)} zeigt eine stabile Performance auf beiden Plattformen. ` +
      `Die organische Basis bleibt solide und bietet eine gute Ausgangslage für neue Impulse und Kampagnen.`,
      {
        x: CONFIG.margin, y: 4.4, w: 10 - (CONFIG.margin * 2), h: 0.6,
        fontSize: 10, color: CONFIG.colors.black, fontFace: CONFIG.fontFamily
      }
    );
    
    addFamefactIcon(slide15, 15);
    
    // ========================================
    // SLIDE 16: Outro (black background)
    // ========================================
    const slide16 = pptx.addSlide();
    slide16.background = { color: CONFIG.colors.black };
    
    // famefact logo (white)
    slide16.addText('famefact.', {
      x: CONFIG.margin, y: 0.4, w: 2.5, h: 0.5,
      fontSize: 22, bold: true, color: CONFIG.colors.white, fontFace: CONFIG.fontFamily
    });
    
    // Contact photo placeholder
    slide16.addShape('rect', {
      x: CONFIG.margin, y: 1.2, w: 2.5, h: 2.8,
      fill: { color: CONFIG.colors.darkGray },
      line: { color: '555555', width: 1 }
    });
    slide16.addText('Foto', {
      x: CONFIG.margin, y: 2.4, w: 2.5, h: 0.4,
      fontSize: 12, color: CONFIG.colors.gray, align: 'center', fontFace: CONFIG.fontFamily
    });
    
    // Contact info
    slide16.addText(CONFIG.contact.name, {
      x: CONFIG.margin, y: 4.1, w: 4, h: 0.3,
      fontSize: 14, color: CONFIG.colors.white, fontFace: CONFIG.fontFamily
    });
    slide16.addText(CONFIG.contact.title, {
      x: CONFIG.margin, y: 4.4, w: 4, h: 0.25,
      fontSize: 11, color: CONFIG.colors.white, fontFace: CONFIG.fontFamily
    });
    
    slide16.addText('famefact', {
      x: CONFIG.margin, y: 4.85, w: 4, h: 0.35,
      fontSize: 16, bold: true, color: CONFIG.colors.white, fontFace: CONFIG.fontFamily
    });
    slide16.addText('FIRST IN SOCIALTAINMENT', {
      x: CONFIG.margin, y: 5.15, w: 4, h: 0.25,
      fontSize: 9, color: CONFIG.colors.white, charSpacing: 2, fontFace: CONFIG.fontFamily
    });
    
    slide16.addText(CONFIG.contact.company, {
      x: CONFIG.margin, y: 5.55, w: 4, h: 0.2,
      fontSize: 9, color: CONFIG.colors.white, fontFace: CONFIG.fontFamily
    });
    slide16.addText(CONFIG.contact.address, {
      x: CONFIG.margin, y: 5.75, w: 4, h: 0.2,
      fontSize: 9, color: CONFIG.colors.white, fontFace: CONFIG.fontFamily
    });
    slide16.addText(CONFIG.contact.city, {
      x: CONFIG.margin, y: 5.95, w: 4, h: 0.2,
      fontSize: 9, color: CONFIG.colors.white, fontFace: CONFIG.fontFamily
    });
    
    slide16.addText('E-Mail: ' + CONFIG.contact.email, {
      x: CONFIG.margin, y: 6.3, w: 4, h: 0.2,
      fontSize: 9, color: CONFIG.colors.white, fontFace: CONFIG.fontFamily
    });
    slide16.addText('Tel.: ' + CONFIG.contact.phone, {
      x: CONFIG.margin, y: 6.5, w: 4, h: 0.2,
      fontSize: 9, color: CONFIG.colors.white, fontFace: CONFIG.fontFamily
    });
    
    // famefact graphic (right side)
    slide16.addShape('rect', {
      x: 7, y: 0.5, w: 2.5, h: 2.5,
      fill: { color: CONFIG.colors.primary },
      rotate: 45
    });
    slide16.addShape('rect', {
      x: 7.8, y: 1.5, w: 2, h: 2,
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
