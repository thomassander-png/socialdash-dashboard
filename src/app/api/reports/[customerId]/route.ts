import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import PptxGenJS from 'pptxgenjs';
import path from 'path';
import fs from 'fs';

// ============================================
// DYNAMIC CUSTOMER REPORT GENERATOR
// High-End Agency-Level PowerPoint Export
// ============================================

// famefact Agency Configuration (static)
const AGENCY = {
  name: 'famefact',
  tagline: 'FIRST IN SOCIALTAINMENT',
  metaPartner: 'Offizieller Meta Business Partner',
  // Logo will be loaded from /public/assets/
  logoPath: '/assets/famefact-logo.png',
  colors: {
    primary: '84CC16',       // Lime green (default brand color)
    secondary: 'A855F7',     // Purple (Instagram accent)
    green: 'A8D65C',         // Posts bars
    purple: 'B8A9C9',        // Videos/Reels bars
  },
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

// Design Configuration
const DESIGN = {
  fontFamily: 'Inter',
  fontFamilyFallback: 'Arial',
  margin: 0.5,
  colors: {
    background: 'F9F9F9',
    white: 'FFFFFF',
    black: '000000',
    gray: '666666',
    lightGray: 'F5F5F5',
    darkGray: '333333',
    mediumGray: '999999',
    shadow: 'E0E0E0',
    trendUp: '22C55E',
    trendDown: 'EF4444',
    trendNeutral: 'EAB308',
    lightBlue: '7DD3E1',
    darkBlue: '2B7A8C',
  }
};

// Customer data interface
interface CustomerData {
  customer_id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
  is_active: boolean;
}

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

// Get customer data from database
async function getCustomerData(customerId: string): Promise<CustomerData | null> {
  // Try to find by customer_id (UUID) or by slug
  // First try exact UUID match
  let result = await query<CustomerData>(`
    SELECT 
      customer_id,
      name,
      LOWER(REPLACE(name, ' ', '-')) as slug,
      logo_url,
      primary_color,
      is_active
    FROM customers
    WHERE customer_id::text = $1
    LIMIT 1
  `, [customerId]);
  
  // If not found, try by slug
  if (!result[0]) {
    result = await query<CustomerData>(`
      SELECT 
        customer_id,
        name,
        LOWER(REPLACE(name, ' ', '-')) as slug,
        logo_url,
        primary_color,
        is_active
      FROM customers
      WHERE LOWER(REPLACE(name, ' ', '-')) = LOWER($1)
      LIMIT 1
    `, [customerId]);
  }
  
  return result[0] || null;
}

// Get page IDs for a customer
async function getPageIds(customerId: string, platform: 'facebook' | 'instagram'): Promise<string[]> {
  const result = await query<{ account_id: string }>(`
    SELECT ca.account_id 
    FROM customer_accounts ca 
    WHERE ca.customer_id = $1 AND ca.platform = $2
  `, [customerId, platform]);
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

function formatCurrency(num: number): string {
  return num.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(date: Date): string {
  const d = new Date(date);
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.`;
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

function getTrendColor(currentValue: number, previousValue: number): string {
  if (previousValue === 0) return DESIGN.colors.gray;
  const change = ((currentValue - previousValue) / previousValue) * 100;
  if (change >= 5) return DESIGN.colors.trendUp;
  if (change <= -5) return DESIGN.colors.trendDown;
  return DESIGN.colors.trendNeutral;
}

function getTrendText(currentValue: number, previousValue: number): { text: string; color: string; percentage: number } {
  if (previousValue === 0) return { text: '—', color: DESIGN.colors.gray, percentage: 0 };
  const change = ((currentValue - previousValue) / previousValue) * 100;
  const text = (change >= 0 ? '+' : '') + change.toFixed(1).replace('.', ',') + '%';
  return { text, color: getTrendColor(currentValue, previousValue), percentage: change };
}

// Sanitize filename for safe download
function sanitizeFilename(name: string): string {
  return name
    .replace(/[äÄ]/g, 'ae')
    .replace(/[öÖ]/g, 'oe')
    .replace(/[üÜ]/g, 'ue')
    .replace(/[ß]/g, 'ss')
    .replace(/[^a-zA-Z0-9\-_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

// Add branding line to top of slide
function addBrandingLine(slide: PptxGenJS.Slide, color: string) {
  slide.addShape('rect', {
    x: 0, y: 0, w: '100%', h: 0.06,
    fill: { color: color }
  });
}

// Add subtle watermark
function addSubtleWatermark(slide: PptxGenJS.Slide, secondaryColor: string) {
  slide.addShape('rect', {
    x: 9.2, y: 0, w: 0.8, h: 0.06,
    fill: { color: secondaryColor, transparency: 70 }
  });
}

// Add famefact icon and page number
function addFamefactIcon(slide: PptxGenJS.Slide, pageNum: number, primaryColor: string) {
  slide.addShape('hexagon', {
    x: DESIGN.margin, y: 4.95, w: 0.3, h: 0.3,
    fill: { color: primaryColor },
  });
  slide.addText(pageNum.toString().padStart(2, '0'), {
    x: 9.5 - DESIGN.margin, y: 5.1, w: 0.5, h: 0.3,
    fontSize: 10, color: DESIGN.colors.mediumGray, align: 'right', fontFace: DESIGN.fontFamily
  });
}

// Draw professional icons
function drawUserIcon(slide: PptxGenJS.Slide, x: number, y: number, size: number, color: string) {
  slide.addShape('ellipse', {
    x: x + size * 0.3, y: y, w: size * 0.4, h: size * 0.4,
    fill: { color: color }
  });
  slide.addShape('roundRect', {
    x: x + size * 0.15, y: y + size * 0.45, w: size * 0.7, h: size * 0.5,
    fill: { color: color },
    rectRadius: 0.1
  });
}

function drawEyeIcon(slide: PptxGenJS.Slide, x: number, y: number, size: number, color: string) {
  slide.addShape('ellipse', {
    x: x, y: y + size * 0.25, w: size, h: size * 0.5,
    line: { color: color, width: 2 }
  });
  slide.addShape('ellipse', {
    x: x + size * 0.35, y: y + size * 0.35, w: size * 0.3, h: size * 0.3,
    fill: { color: color }
  });
}

function drawChatIcon(slide: PptxGenJS.Slide, x: number, y: number, size: number, color: string) {
  slide.addShape('roundRect', {
    x: x, y: y, w: size, h: size * 0.7,
    fill: { color: color },
    rectRadius: 0.1
  });
  slide.addShape('rect', {
    x: x + size * 0.15, y: y + size * 0.65, w: size * 0.2, h: size * 0.2,
    fill: { color: color },
    rotate: 45
  });
}

// Add customer logo or fallback text
function addCustomerLogo(slide: PptxGenJS.Slide, customer: CustomerData, x: number, y: number, maxW: number, maxH: number) {
  if (customer.logo_url) {
    try {
      slide.addImage({
        path: customer.logo_url,
        x: x, y: y, w: maxW, h: maxH,
        sizing: { type: 'contain', w: maxW, h: maxH }
      });
    } catch {
      // Fallback to text if logo fails to load
      slide.addText(customer.name, {
        x: x, y: y, w: maxW, h: maxH,
        fontSize: 14, bold: true, color: DESIGN.colors.darkGray,
        fontFace: DESIGN.fontFamily, align: 'right', valign: 'middle'
      });
    }
  } else {
    // No logo URL - use text fallback
    slide.addText(customer.name, {
      x: x, y: y, w: maxW, h: maxH,
      fontSize: 14, bold: true, color: DESIGN.colors.darkGray,
      fontFace: DESIGN.fontFamily, align: 'right', valign: 'middle'
    });
  }
}

// Create Premium KPI table
function createPremiumKPITable(
  slide: PptxGenJS.Slide, 
  kpis: MonthlyKPI[], 
  startY: number,
  platform: 'facebook' | 'instagram',
  primaryColor: string,
  secondaryColor: string
): void {
  const tableX = DESIGN.margin;
  const tableW = 10 - (DESIGN.margin * 2);
  const colW = [3.2, 2.2, 2.2, 2.2];
  const rowH = 0.38;
  const headerH = 0.48;
  const headerColor = platform === 'facebook' ? primaryColor : secondaryColor;
  
  // Shadow
  slide.addShape('roundRect', {
    x: tableX + 0.03, y: startY + 0.03, w: tableW, h: headerH,
    fill: { color: DESIGN.colors.shadow },
    rectRadius: 0.12
  });
  
  // Header
  slide.addShape('roundRect', {
    x: tableX, y: startY, w: tableW, h: headerH,
    fill: { color: headerColor },
    rectRadius: 0.12
  });
  
  const headers = ['KPI', getShortMonthName(kpis[2].month), getShortMonthName(kpis[1].month), getShortMonthName(kpis[0].month)];
  let xPos = tableX;
  headers.forEach((header, idx) => {
    slide.addText(header, {
      x: xPos + 0.1, y: startY, w: colW[idx] - 0.2, h: headerH,
      fontSize: 11, bold: true, color: DESIGN.colors.white, 
      fontFace: DESIGN.fontFamily, align: idx === 0 ? 'left' : 'center', valign: 'middle'
    });
    xPos += colW[idx];
  });
  
  const dataRows: { label: string; values: string[]; isEngagementRate?: boolean; rawValues?: number[] }[] = platform === 'facebook' ? [
    { label: 'Neue Fans', values: kpis.map(k => k.new_followers > 0 ? `+${k.new_followers}` : k.new_followers.toString()), rawValues: kpis.map(k => Math.abs(k.new_followers)) },
    { label: 'Fans total', values: kpis.map(k => formatNumber(k.followers)), rawValues: kpis.map(k => k.followers) },
    { label: 'Post-Reichweite', values: kpis.map(k => formatNumber(k.total_reach)), rawValues: kpis.map(k => k.total_reach) },
    { label: 'Ø Reichweite pro Post', values: kpis.map(k => formatNumber(k.avg_reach)), rawValues: kpis.map(k => k.avg_reach) },
    { label: 'Interaktionen (Teilen, Liken, Kommentieren)', values: kpis.map(k => formatNumber(k.total_reactions + k.total_comments + k.total_shares)), rawValues: kpis.map(k => k.total_reactions + k.total_comments + k.total_shares) },
    { label: '3-sekündige Video Plays', values: kpis.map(k => formatNumber(k.total_video_views)), rawValues: kpis.map(k => k.total_video_views) },
    { label: 'Interaktionsrate', values: kpis.map(k => k.engagement_rate.toFixed(2).replace('.', ',') + '%'), isEngagementRate: true, rawValues: kpis.map(k => k.engagement_rate) },
    { label: 'Anzahl der Postings', values: kpis.map(k => k.posts_count.toString()), rawValues: kpis.map(k => k.posts_count) },
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
  
  // Filter zero rows
  const filteredRows = dataRows.filter(row => {
    if (!row.rawValues) return true;
    return row.rawValues.some(v => v !== 0);
  });
  
  let currentY = startY + headerH + 0.05;
  filteredRows.forEach((row, rowIdx) => {
    const isAlt = rowIdx % 2 === 0;
    const bgColor = isAlt ? DESIGN.colors.lightGray : DESIGN.colors.white;
    
    slide.addShape('rect', {
      x: tableX, y: currentY, w: tableW, h: rowH,
      fill: { color: bgColor },
      line: { color: 'E8E8E8', width: 0.3 }
    });
    
    slide.addText(row.label, {
      x: tableX + 0.15, y: currentY, w: colW[0] - 0.2, h: rowH,
      fontSize: 10, color: DESIGN.colors.darkGray, fontFace: DESIGN.fontFamily,
      align: 'left', valign: 'middle'
    });
    
    let cellX = tableX + colW[0];
    for (let i = 2; i >= 0; i--) {
      let textColor = DESIGN.colors.black;
      let isBold = false;
      
      if (row.isEngagementRate) {
        const rate = kpis[i].engagement_rate;
        if (rate >= 5) textColor = DESIGN.colors.trendUp;
        else if (rate >= 2) textColor = DESIGN.colors.trendNeutral;
        else textColor = DESIGN.colors.trendDown;
        isBold = true;
      }
      
      slide.addText(row.values[i], {
        x: cellX + 0.1, y: currentY, w: colW[3 - i] - 0.2, h: rowH,
        fontSize: 10, color: textColor, fontFace: DESIGN.fontFamily,
        align: 'center', valign: 'middle', bold: isBold
      });
      cellX += colW[3 - i];
    }
    
    currentY += rowH;
  });
  
  slide.addText('*Die Interaktionsrate berechnet sich aus allen Interaktionen durch die Gesamtreichweite × 100', {
    x: DESIGN.margin, y: currentY + 0.12, w: tableW, h: 0.25,
    fontSize: 8, color: DESIGN.colors.mediumGray, italic: true, fontFace: DESIGN.fontFamily
  });
}

// Create Executive Summary Slide
function createExecutiveSummarySlide(
  slide: PptxGenJS.Slide,
  fbKpis: MonthlyKPI[],
  igKpis: MonthlyKPI[],
  month: string,
  customer: CustomerData,
  primaryColor: string,
  secondaryColor: string
): void {
  slide.background = { color: DESIGN.colors.background };
  addBrandingLine(slide, primaryColor);
  addSubtleWatermark(slide, secondaryColor);
  
  // Customer logo (top right)
  addCustomerLogo(slide, customer, 7.5, 0.15, 2, 0.5);
  
  slide.addText('Executive Summary', {
    x: DESIGN.margin, y: 0.25, w: 7, h: 0.5,
    fontSize: 28, bold: true, color: DESIGN.colors.black, fontFace: DESIGN.fontFamily
  });
  slide.addText(getMonthName(month), {
    x: DESIGN.margin, y: 0.7, w: 7, h: 0.35,
    fontSize: 14, color: DESIGN.colors.mediumGray, fontFace: DESIGN.fontFamily
  });
  
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
  
  slide.addShape('roundRect', {
    x: DESIGN.margin + 0.04, y: boxY + 0.04, w: boxW, h: boxH,
    fill: { color: DESIGN.colors.shadow },
    rectRadius: 0.15
  });
  slide.addShape('roundRect', {
    x: DESIGN.margin, y: boxY, w: boxW, h: boxH,
    fill: { color: DESIGN.colors.white },
    line: { color: primaryColor, width: 1.5 },
    rectRadius: 0.15
  });
  drawUserIcon(slide, DESIGN.margin + 0.3, boxY + 0.2, 0.45, primaryColor);
  slide.addText('Follower Gesamt', {
    x: DESIGN.margin + 0.1, y: boxY + 0.7, w: boxW - 0.2, h: 0.25,
    fontSize: 10, color: DESIGN.colors.mediumGray, fontFace: DESIGN.fontFamily, align: 'center'
  });
  slide.addText(formatNumber(totalFollowers), {
    x: DESIGN.margin + 0.1, y: boxY + 0.95, w: boxW - 0.2, h: 0.45,
    fontSize: 26, bold: true, color: DESIGN.colors.black, fontFace: DESIGN.fontFamily, align: 'center'
  });
  const pillW = 1.1;
  const pillH = 0.32;
  const pillX = DESIGN.margin + (boxW - pillW) / 2;
  const pillY = boxY + 1.45;
  slide.addShape('roundRect', {
    x: pillX, y: pillY, w: pillW, h: pillH,
    fill: { color: followerTrend.color },
    rectRadius: 0.16
  });
  slide.addText(followerTrend.text, {
    x: pillX, y: pillY, w: pillW, h: pillH,
    fontSize: 11, bold: true, color: DESIGN.colors.white, fontFace: DESIGN.fontFamily, align: 'center', valign: 'middle'
  });
  
  // KPI 2: Total Reach
  const totalReach = fbCurrent.total_reach + igCurrent.total_reach;
  const prevTotalReach = fbPrev.total_reach + igPrev.total_reach;
  const reachTrend = getTrendText(totalReach, prevTotalReach);
  
  const box2X = DESIGN.margin + boxW + boxGap;
  slide.addShape('roundRect', {
    x: box2X + 0.04, y: boxY + 0.04, w: boxW, h: boxH,
    fill: { color: DESIGN.colors.shadow },
    rectRadius: 0.15
  });
  slide.addShape('roundRect', {
    x: box2X, y: boxY, w: boxW, h: boxH,
    fill: { color: DESIGN.colors.white },
    line: { color: primaryColor, width: 1.5 },
    rectRadius: 0.15
  });
  drawEyeIcon(slide, box2X + 0.25, boxY + 0.18, 0.5, primaryColor);
  slide.addText('Reichweite Gesamt', {
    x: box2X + 0.1, y: boxY + 0.7, w: boxW - 0.2, h: 0.25,
    fontSize: 10, color: DESIGN.colors.mediumGray, fontFace: DESIGN.fontFamily, align: 'center'
  });
  slide.addText(formatNumber(totalReach), {
    x: box2X + 0.1, y: boxY + 0.95, w: boxW - 0.2, h: 0.45,
    fontSize: 26, bold: true, color: DESIGN.colors.black, fontFace: DESIGN.fontFamily, align: 'center'
  });
  const pill2X = box2X + (boxW - pillW) / 2;
  slide.addShape('roundRect', {
    x: pill2X, y: pillY, w: pillW, h: pillH,
    fill: { color: reachTrend.color },
    rectRadius: 0.16
  });
  slide.addText(reachTrend.text, {
    x: pill2X, y: pillY, w: pillW, h: pillH,
    fontSize: 11, bold: true, color: DESIGN.colors.white, fontFace: DESIGN.fontFamily, align: 'center', valign: 'middle'
  });
  
  // KPI 3: Total Interactions
  const totalInteractions = (fbCurrent.total_reactions + fbCurrent.total_comments + fbCurrent.total_shares) + 
                           (igCurrent.total_reactions + igCurrent.total_comments + igCurrent.total_saves);
  const prevTotalInteractions = (fbPrev.total_reactions + fbPrev.total_comments + fbPrev.total_shares) + 
                                (igPrev.total_reactions + igPrev.total_comments + igPrev.total_saves);
  const interactionTrend = getTrendText(totalInteractions, prevTotalInteractions);
  
  const box3X = DESIGN.margin + (boxW + boxGap) * 2;
  slide.addShape('roundRect', {
    x: box3X + 0.04, y: boxY + 0.04, w: boxW, h: boxH,
    fill: { color: DESIGN.colors.shadow },
    rectRadius: 0.15
  });
  slide.addShape('roundRect', {
    x: box3X, y: boxY, w: boxW, h: boxH,
    fill: { color: DESIGN.colors.white },
    line: { color: primaryColor, width: 1.5 },
    rectRadius: 0.15
  });
  drawChatIcon(slide, box3X + 0.25, boxY + 0.18, 0.5, primaryColor);
  slide.addText('Interaktionen Gesamt', {
    x: box3X + 0.1, y: boxY + 0.7, w: boxW - 0.2, h: 0.25,
    fontSize: 10, color: DESIGN.colors.mediumGray, fontFace: DESIGN.fontFamily, align: 'center'
  });
  slide.addText(formatNumber(totalInteractions), {
    x: box3X + 0.1, y: boxY + 0.95, w: boxW - 0.2, h: 0.45,
    fontSize: 26, bold: true, color: DESIGN.colors.black, fontFace: DESIGN.fontFamily, align: 'center'
  });
  const pill3X = box3X + (boxW - pillW) / 2;
  slide.addShape('roundRect', {
    x: pill3X, y: pillY, w: pillW, h: pillH,
    fill: { color: interactionTrend.color },
    rectRadius: 0.16
  });
  slide.addText(interactionTrend.text, {
    x: pill3X, y: pillY, w: pillW, h: pillH,
    fontSize: 11, bold: true, color: DESIGN.colors.white, fontFace: DESIGN.fontFamily, align: 'center', valign: 'middle'
  });
  
  // Gesamtfazit box
  const fazitX = DESIGN.margin + (boxW + boxGap) * 3 + 0.2;
  const fazitW = 10 - fazitX - DESIGN.margin;
  
  slide.addShape('roundRect', {
    x: fazitX + 0.04, y: boxY + 0.04, w: fazitW, h: boxH,
    fill: { color: DESIGN.colors.shadow },
    rectRadius: 0.15
  });
  slide.addShape('roundRect', {
    x: fazitX, y: boxY, w: fazitW, h: boxH,
    fill: { color: DESIGN.colors.white },
    line: { color: secondaryColor, width: 1.5 },
    rectRadius: 0.15
  });
  
  slide.addText('Gesamtfazit', {
    x: fazitX + 0.15, y: boxY + 0.12, w: fazitW - 0.3, h: 0.3,
    fontSize: 12, bold: true, color: secondaryColor, fontFace: DESIGN.fontFamily
  });
  
  const performanceWord = totalReach > prevTotalReach ? 'positive' : (totalReach < prevTotalReach ? 'rückläufige' : 'stabile');
  const fazitText = `Der ${getShortMonthName(month)} zeigt eine ${performanceWord} Performance auf beiden Plattformen. Die organische Basis bleibt solide und bietet eine gute Ausgangslage für neue Impulse.`;
  
  slide.addText(fazitText, {
    x: fazitX + 0.15, y: boxY + 0.45, w: fazitW - 0.3, h: 1.3,
    fontSize: 10, color: DESIGN.colors.darkGray, fontFace: DESIGN.fontFamily
  });
  
  // Platform breakdown
  const breakdownY = boxY + boxH + 0.35;
  const breakdownW = 4.2;
  const breakdownH = 1.5;
  
  // Facebook
  slide.addShape('roundRect', {
    x: DESIGN.margin + 0.03, y: breakdownY + 0.03, w: breakdownW, h: breakdownH,
    fill: { color: DESIGN.colors.shadow },
    rectRadius: 0.1
  });
  slide.addShape('roundRect', {
    x: DESIGN.margin, y: breakdownY, w: breakdownW, h: breakdownH,
    fill: { color: DESIGN.colors.white },
    line: { color: primaryColor, width: 1 },
    rectRadius: 0.1
  });
  slide.addShape('ellipse', {
    x: DESIGN.margin + 0.15, y: breakdownY + 0.12, w: 0.35, h: 0.35,
    fill: { color: primaryColor }
  });
  slide.addText('f', {
    x: DESIGN.margin + 0.15, y: breakdownY + 0.12, w: 0.35, h: 0.35,
    fontSize: 14, bold: true, color: DESIGN.colors.white, align: 'center', valign: 'middle', fontFace: DESIGN.fontFamily
  });
  slide.addText('Facebook', {
    x: DESIGN.margin + 0.55, y: breakdownY + 0.15, w: 2, h: 0.3,
    fontSize: 12, bold: true, color: DESIGN.colors.black, fontFace: DESIGN.fontFamily
  });
  slide.addText(`Reichweite: ${formatNumber(fbCurrent.total_reach)}\nInteraktionen: ${formatNumber(fbCurrent.total_reactions + fbCurrent.total_comments)}\nEngagement: ${fbCurrent.engagement_rate.toFixed(2).replace('.', ',')}%`, {
    x: DESIGN.margin + 0.15, y: breakdownY + 0.5, w: breakdownW - 0.3, h: 0.9,
    fontSize: 10, color: DESIGN.colors.darkGray, fontFace: DESIGN.fontFamily
  });
  
  // Instagram
  const igBoxX = DESIGN.margin + breakdownW + 0.3;
  slide.addShape('roundRect', {
    x: igBoxX + 0.03, y: breakdownY + 0.03, w: breakdownW, h: breakdownH,
    fill: { color: DESIGN.colors.shadow },
    rectRadius: 0.1
  });
  slide.addShape('roundRect', {
    x: igBoxX, y: breakdownY, w: breakdownW, h: breakdownH,
    fill: { color: DESIGN.colors.white },
    line: { color: secondaryColor, width: 1 },
    rectRadius: 0.1
  });
  slide.addShape('roundRect', {
    x: igBoxX + 0.15, y: breakdownY + 0.12, w: 0.35, h: 0.35,
    line: { color: secondaryColor, width: 2 },
    rectRadius: 0.08
  });
  slide.addShape('ellipse', {
    x: igBoxX + 0.24, y: breakdownY + 0.21, w: 0.17, h: 0.17,
    line: { color: secondaryColor, width: 1.5 }
  });
  slide.addText('Instagram', {
    x: igBoxX + 0.55, y: breakdownY + 0.15, w: 2, h: 0.3,
    fontSize: 12, bold: true, color: DESIGN.colors.black, fontFace: DESIGN.fontFamily
  });
  slide.addText(`Reichweite: ${formatNumber(igCurrent.total_reach)}\nInteraktionen: ${formatNumber(igCurrent.total_reactions + igCurrent.total_comments)}\nEngagement: ${igCurrent.engagement_rate.toFixed(2).replace('.', ',')}%`, {
    x: igBoxX + 0.15, y: breakdownY + 0.5, w: breakdownW - 0.3, h: 0.9,
    fontSize: 10, color: DESIGN.colors.darkGray, fontFace: DESIGN.fontFamily
  });
}

// Create Top 3 Content Showcase
function createTop3ContentShowcase(
  slide: PptxGenJS.Slide,
  posts: PostData[],
  platform: 'facebook' | 'instagram',
  month: string,
  customer: CustomerData,
  primaryColor: string,
  secondaryColor: string
): void {
  slide.background = { color: DESIGN.colors.background };
  const accentColor = platform === 'facebook' ? primaryColor : secondaryColor;
  addBrandingLine(slide, accentColor);
  addSubtleWatermark(slide, secondaryColor);
  
  // Customer logo
  addCustomerLogo(slide, customer, 7.5, 0.15, 2, 0.5);
  
  slide.addText(platform === 'facebook' ? 'Facebook' : 'Instagram', {
    x: DESIGN.margin, y: 0.2, w: 7, h: 0.45,
    fontSize: 26, bold: true, color: DESIGN.colors.black, fontFace: DESIGN.fontFamily
  });
  slide.addText('Top 3 Content', {
    x: DESIGN.margin, y: 0.6, w: 7, h: 0.3,
    fontSize: 14, color: DESIGN.colors.mediumGray, fontFace: DESIGN.fontFamily
  });
  
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
      fontSize: 14, color: DESIGN.colors.mediumGray, align: 'center', fontFace: DESIGN.fontFamily
    });
    return;
  }
  
  const imgW = 2.8;
  const imgH = 3.5;
  const startX = DESIGN.margin + 0.2;
  const startY = 1.0;
  const gap = 0.35;
  
  topPosts.forEach((post, idx) => {
    const xPos = startX + idx * (imgW + gap);
    
    slide.addShape('rect', {
      x: xPos + 0.05, y: startY + 0.05, w: imgW, h: imgH,
      fill: { color: DESIGN.colors.shadow }
    });
    
    if (post.thumbnail_url) {
      try {
        slide.addImage({
          path: post.thumbnail_url,
          x: xPos, y: startY, w: imgW, h: imgH,
          sizing: { type: 'cover', w: imgW, h: imgH }
        });
        
        // Date badge
        const dateW = 0.9;
        const dateH = 0.28;
        slide.addShape('roundRect', {
          x: xPos + imgW - dateW - 0.08, y: startY + 0.08, w: dateW, h: dateH,
          fill: { color: DESIGN.colors.black, transparency: 40 },
          rectRadius: 0.05
        });
        slide.addText(formatDate(post.created_time), {
          x: xPos + imgW - dateW - 0.08, y: startY + 0.08, w: dateW, h: dateH,
          fontSize: 8, color: DESIGN.colors.white, fontFace: DESIGN.fontFamily, align: 'center', valign: 'middle'
        });
        
        // Overlay
        const overlayH = imgH * 0.35;
        const overlayY = startY + imgH - overlayH;
        
        slide.addShape('rect', {
          x: xPos, y: overlayY, w: imgW, h: overlayH,
          fill: { color: DESIGN.colors.black, transparency: 35 }
        });
        
        const metricsY = overlayY + 0.15;
        
        slide.addText('Reichweite', {
          x: xPos + 0.1, y: metricsY, w: imgW - 0.2, h: 0.2,
          fontSize: 8, color: 'CCCCCC', fontFace: DESIGN.fontFamily
        });
        slide.addText(formatNumber(post.reach || 0), {
          x: xPos + 0.1, y: metricsY + 0.18, w: imgW - 0.2, h: 0.28,
          fontSize: 14, bold: true, color: DESIGN.colors.white, fontFace: DESIGN.fontFamily
        });
        
        slide.addText('Interaktionen', {
          x: xPos + 0.1, y: metricsY + 0.52, w: imgW - 0.2, h: 0.2,
          fontSize: 8, color: 'CCCCCC', fontFace: DESIGN.fontFamily
        });
        slide.addText(formatNumber(post.interactions), {
          x: xPos + 0.1, y: metricsY + 0.7, w: imgW - 0.2, h: 0.28,
          fontSize: 14, bold: true, color: DESIGN.colors.white, fontFace: DESIGN.fontFamily
        });
        
        // Engagement pill
        const engPillW = 0.9;
        const engPillH = 0.25;
        slide.addShape('roundRect', {
          x: xPos + imgW - engPillW - 0.1, y: metricsY + 0.75, w: engPillW, h: engPillH,
          fill: { color: accentColor },
          rectRadius: 0.12
        });
        slide.addText(`${post.engagementRate.toFixed(1)}%`, {
          x: xPos + imgW - engPillW - 0.1, y: metricsY + 0.75, w: engPillW, h: engPillH,
          fontSize: 9, bold: true, color: DESIGN.colors.white, fontFace: DESIGN.fontFamily, align: 'center', valign: 'middle'
        });
        
      } catch {
        slide.addShape('rect', {
          x: xPos, y: startY, w: imgW, h: imgH,
          fill: { color: DESIGN.colors.lightGray },
          line: { color: 'DDDDDD', width: 1 }
        });
        slide.addText('Bild nicht verfügbar', {
          x: xPos, y: startY + imgH / 2 - 0.15, w: imgW, h: 0.3,
          fontSize: 10, color: DESIGN.colors.mediumGray, align: 'center', fontFace: DESIGN.fontFamily
        });
      }
    } else {
      slide.addShape('rect', {
        x: xPos, y: startY, w: imgW, h: imgH,
        fill: { color: DESIGN.colors.lightGray },
        line: { color: 'DDDDDD', width: 1 }
      });
      slide.addText('Kein Bild', {
        x: xPos, y: startY + imgH / 2 - 0.15, w: imgW, h: 0.3,
        fontSize: 10, color: DESIGN.colors.mediumGray, align: 'center', fontFace: DESIGN.fontFamily
      });
    }
    
    // Rank badge
    slide.addShape('ellipse', {
      x: xPos - 0.15, y: startY - 0.15, w: 0.4, h: 0.4,
      fill: { color: accentColor }
    });
    slide.addText((idx + 1).toString(), {
      x: xPos - 0.15, y: startY - 0.15, w: 0.4, h: 0.4,
      fontSize: 14, bold: true, color: DESIGN.colors.white, align: 'center', valign: 'middle', fontFace: DESIGN.fontFamily
    });
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const { customerId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);
    
    // Get customer data from database
    const customer = await getCustomerData(customerId);
    
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }
    
    // Determine colors (use customer's primary_color or default to famefact green)
    const primaryColor = customer.primary_color?.replace('#', '') || AGENCY.colors.primary;
    const secondaryColor = AGENCY.colors.secondary;
    
    // Get page IDs
    const fbPageIds = await getPageIds(customer.customer_id, 'facebook');
    const igPageIds = await getPageIds(customer.customer_id, 'instagram');
    console.log(`Customer: ${customer.name}, FB Pages: ${fbPageIds.length}, IG Pages: ${igPageIds.length}`);
    
    // Calculate months for comparison
    const currentDate = new Date(month + '-01');
    const months = [
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 2, 1).toISOString().slice(0, 7),
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1).toISOString().slice(0, 7),
      month
    ];
    
    // Ad account to customer slug mapping (default account-level)
    const AD_ACCOUNT_MAP: Record<string, string> = {
      '64446085': 'andskincare',
      '289778171212746': 'contipark',
      '1908114009405295': 'captrain-deutschland',
      '589986474813245': 'pelikan',
      '456263405094069': 'famefact-gmbh',
      '969976773634901': 'asphericon',
      '594963889574701': 'pelikan',  // Shared: Pelikan + Herlitz
      '1812018146005238': 'fensterart',
      '778746264991304': 'vergleich.org',
    };

    // Campaign-level overrides: campaigns matching these patterns belong to a different customer
    const CAMPAIGN_CUSTOMER_OVERRIDES: { pattern: RegExp; customerSlug: string }[] = [
      { pattern: /herlitz/i, customerSlug: 'herlitz' },
      { pattern: /famefact.*reach.*herlitz|herlitz.*schulranzen/i, customerSlug: 'herlitz' },
    ];

    // Determine which customer a campaign belongs to
    function getCampaignCustomer(campaign: any): string {
      for (const override of CAMPAIGN_CUSTOMER_OVERRIDES) {
        if (override.pattern.test(campaign.name || '')) {
          return override.customerSlug;
        }
      }
      return AD_ACCOUNT_MAP[campaign.account_id] || 'unknown';
    }

    // Fetch all data including ads
    const [fbPosts, fbKpis, igPosts, igKpis, adsResult] = await Promise.all([
      getFacebookPosts(month, fbPageIds),
      getMonthlyKPIs(months, fbPageIds, 'facebook'),
      getInstagramPosts(month, igPageIds),
      getMonthlyKPIs(months, igPageIds, 'instagram'),
      query<{ data: any }>('SELECT data FROM ads_cache WHERE month = $1', [month]).catch(() => []),
    ]);

    // Get ads campaigns for this customer (campaign-level matching)
    const adsData = adsResult[0]?.data || { accountSummaries: [], campaigns: [] };
    const customerAdCampaigns = (adsData.campaigns || []).filter((c: any) => {
      return getCampaignCustomer(c) === customer.slug;
    });
    // Calculate totals from campaigns (not account-level, to handle shared accounts)
    const totalAdSpend = customerAdCampaigns.reduce((sum: number, c: any) => sum + (parseFloat(c.spend) || 0), 0);
    const totalAdImpressions = customerAdCampaigns.reduce((sum: number, c: any) => sum + (parseInt(c.impressions) || 0), 0);
    const totalAdClicks = customerAdCampaigns.reduce((sum: number, c: any) => sum + (parseInt(c.clicks) || 0), 0);
    const totalAdReach = customerAdCampaigns.reduce((sum: number, c: any) => sum + (parseInt(c.reach) || 0), 0);
    
    console.log(`FB Posts: ${fbPosts.length}, IG Posts: ${igPosts.length}, Ads Campaigns: ${customerAdCampaigns.length}`);
    
    // Create PowerPoint
    const pptx = new PptxGenJS();
    pptx.author = 'famefact GmbH';
    pptx.title = `${customer.name} Social Media Report - ${getMonthName(month)}`;
    pptx.company = 'famefact GmbH';
    pptx.layout = 'LAYOUT_16x9';
    
    // ========================================
    // SLIDE 1: Cover
    // ========================================
    const slide1 = pptx.addSlide();
    slide1.background = { color: DESIGN.colors.background };
    addBrandingLine(slide1, primaryColor);
    
    // famefact logo (top left)
    slide1.addText('famefact.', {
      x: DESIGN.margin, y: 0.25, w: 2, h: 0.4,
      fontSize: 18, bold: true, color: DESIGN.colors.black, fontFace: DESIGN.fontFamily
    });
    // Meta Business Partner badge
    slide1.addShape('roundRect', {
      x: DESIGN.margin, y: 0.7, w: 2.2, h: 0.25,
      fill: { color: '1877F2' },
      rectRadius: 0.04
    });
    slide1.addText(AGENCY.metaPartner, {
      x: DESIGN.margin + 0.05, y: 0.7, w: 2.1, h: 0.25,
      fontSize: 7, bold: true, color: DESIGN.colors.white, fontFace: DESIGN.fontFamily, valign: 'middle'
    });
    
    // Decorative shapes
    slide1.addShape('rect', {
      x: 7.5, y: 0.15, w: 1.4, h: 1.4,
      fill: { color: primaryColor },
      rotate: 45
    });
    slide1.addShape('rect', {
      x: 8.15, y: 0.7, w: 1.1, h: 1.1,
      fill: { color: secondaryColor },
      rotate: 45
    });
    
    // Customer logo or name (center)
    if (customer.logo_url) {
      try {
        slide1.addImage({
          path: customer.logo_url,
          x: 3, y: 1.5, w: 4, h: 1.5,
          sizing: { type: 'contain', w: 4, h: 1.5 }
        });
      } catch {
        slide1.addText(customer.name, {
          x: 0, y: 1.8, w: '100%', h: 0.8,
          fontSize: 36, bold: true, color: DESIGN.colors.darkGray, align: 'center', fontFace: DESIGN.fontFamily
        });
      }
    } else {
      slide1.addText(customer.name, {
        x: 0, y: 1.8, w: '100%', h: 0.8,
        fontSize: 36, bold: true, color: DESIGN.colors.darkGray, align: 'center', fontFace: DESIGN.fontFamily
      });
    }
    
    // Title
    slide1.addText('Social Media Reporting', {
      x: 0, y: 3.4, w: '100%', h: 0.55,
      fontSize: 30, bold: true, color: DESIGN.colors.black, align: 'center', fontFace: DESIGN.fontFamily
    });
    slide1.addText(getMonthName(month), {
      x: 0, y: 3.95, w: '100%', h: 0.4,
      fontSize: 18, color: primaryColor, align: 'center', fontFace: DESIGN.fontFamily
    });
    
    // ========================================
    // SLIDE 2: Executive Summary
    // ========================================
    const slide2 = pptx.addSlide();
    createExecutiveSummarySlide(slide2, fbKpis, igKpis, month, customer, primaryColor, secondaryColor);
    addFamefactIcon(slide2, 2, primaryColor);
    
    // ========================================
    // SLIDE 3: Facebook Kennzahlen
    // ========================================
    const slide3 = pptx.addSlide();
    slide3.background = { color: DESIGN.colors.background };
    addBrandingLine(slide3, primaryColor);
    addSubtleWatermark(slide3, secondaryColor);
    addCustomerLogo(slide3, customer, 7.5, 0.15, 2, 0.5);
    
    slide3.addText('Facebook', {
      x: DESIGN.margin, y: 0.2, w: 7, h: 0.45,
      fontSize: 26, bold: true, color: DESIGN.colors.black, fontFace: DESIGN.fontFamily
    });
    slide3.addText('Kennzahlen', {
      x: DESIGN.margin, y: 0.6, w: 7, h: 0.3,
      fontSize: 14, color: DESIGN.colors.mediumGray, fontFace: DESIGN.fontFamily
    });
    
    createPremiumKPITable(slide3, fbKpis, 1.0, 'facebook', primaryColor, secondaryColor);
    addFamefactIcon(slide3, 3, primaryColor);
    
    // ========================================
    // SLIDE 4: Facebook Top 3 Content
    // ========================================
    const slide4 = pptx.addSlide();
    createTop3ContentShowcase(slide4, fbPosts.filter(p => p.type !== 'video' && p.type !== 'VIDEO'), 'facebook', month, customer, primaryColor, secondaryColor);
    addFamefactIcon(slide4, 4, primaryColor);
    
    // ========================================
    // SLIDE 5: Facebook Videos
    // ========================================
    const fbVideos = fbPosts.filter(p => p.type === 'video' || p.type === 'VIDEO' || p.type === 'reel' || p.type === 'REEL');
    const slide5 = pptx.addSlide();
    slide5.background = { color: DESIGN.colors.background };
    addBrandingLine(slide5, primaryColor);
    addSubtleWatermark(slide5, secondaryColor);
    addCustomerLogo(slide5, customer, 7.5, 0.15, 2, 0.5);
    
    slide5.addText('Facebook', {
      x: DESIGN.margin, y: 0.2, w: 7, h: 0.45,
      fontSize: 26, bold: true, color: DESIGN.colors.black, fontFace: DESIGN.fontFamily
    });
    slide5.addText('Top Videos & Reels', {
      x: DESIGN.margin, y: 0.6, w: 7, h: 0.3,
      fontSize: 14, color: DESIGN.colors.mediumGray, fontFace: DESIGN.fontFamily
    });
    
    if (fbVideos.length > 0) {
      createTop3ContentShowcase(slide5, fbVideos, 'facebook', month, customer, primaryColor, secondaryColor);
    } else {
      slide5.addText('Keine Videos für diesen Zeitraum verfügbar', {
        x: 1, y: 2.5, w: 8, h: 0.5,
        fontSize: 14, color: DESIGN.colors.mediumGray, align: 'center', fontFace: DESIGN.fontFamily
      });
    }
    addFamefactIcon(slide5, 5, primaryColor);
    
    // ========================================
    // SLIDE 6: Facebook Demographie
    // ========================================
    const slide6 = pptx.addSlide();
    slide6.background = { color: DESIGN.colors.background };
    addBrandingLine(slide6, primaryColor);
    addSubtleWatermark(slide6, secondaryColor);
    addCustomerLogo(slide6, customer, 7.5, 0.15, 2, 0.5);
    
    slide6.addText('Facebook', {
      x: DESIGN.margin, y: 0.2, w: 7, h: 0.45,
      fontSize: 26, bold: true, color: DESIGN.colors.black, fontFace: DESIGN.fontFamily
    });
    slide6.addText('Fans (Demographie)', {
      x: DESIGN.margin, y: 0.6, w: 7, h: 0.3,
      fontSize: 14, color: DESIGN.colors.mediumGray, fontFace: DESIGN.fontFamily
    });
    
    slide6.addShape('roundRect', {
      x: DESIGN.margin + 0.04, y: 1.04, w: 10 - (DESIGN.margin * 2), h: 3.5,
      fill: { color: DESIGN.colors.shadow },
      rectRadius: 0.1
    });
    slide6.addShape('roundRect', {
      x: DESIGN.margin, y: 1.0, w: 10 - (DESIGN.margin * 2), h: 3.5,
      fill: { color: DESIGN.colors.white },
      line: { color: 'E0E0E0', width: 1 },
      rectRadius: 0.1
    });
    slide6.addText('Screenshot der Facebook Insights (Demographie) hier einfügen', {
      x: DESIGN.margin, y: 2.6, w: 10 - (DESIGN.margin * 2), h: 0.4,
      fontSize: 12, color: DESIGN.colors.mediumGray, align: 'center', fontFace: DESIGN.fontFamily
    });
    addFamefactIcon(slide6, 6, primaryColor);
    
    // ========================================
    // SLIDE 7: Instagram Kennzahlen
    // ========================================
    const slide7 = pptx.addSlide();
    slide7.background = { color: DESIGN.colors.background };
    addBrandingLine(slide7, secondaryColor);
    addSubtleWatermark(slide7, secondaryColor);
    addCustomerLogo(slide7, customer, 7.5, 0.15, 2, 0.5);
    
    slide7.addText('Instagram', {
      x: DESIGN.margin, y: 0.2, w: 7, h: 0.45,
      fontSize: 26, bold: true, color: DESIGN.colors.black, fontFace: DESIGN.fontFamily
    });
    slide7.addText('Kennzahlen', {
      x: DESIGN.margin, y: 0.6, w: 7, h: 0.3,
      fontSize: 14, color: DESIGN.colors.mediumGray, fontFace: DESIGN.fontFamily
    });
    
    createPremiumKPITable(slide7, igKpis, 1.0, 'instagram', primaryColor, secondaryColor);
    addFamefactIcon(slide7, 7, primaryColor);
    
    // ========================================
    // SLIDE 8: Instagram Top 3 Content
    // ========================================
    const slide8 = pptx.addSlide();
    createTop3ContentShowcase(slide8, igPosts.filter(p => p.type !== 'VIDEO' && p.type !== 'REEL'), 'instagram', month, customer, primaryColor, secondaryColor);
    addFamefactIcon(slide8, 8, primaryColor);
    
    // ========================================
    // SLIDE 9: Instagram Reels
    // ========================================
    const igReels = igPosts.filter(p => p.type === 'VIDEO' || p.type === 'REEL');
    const slide9 = pptx.addSlide();
    slide9.background = { color: DESIGN.colors.background };
    addBrandingLine(slide9, secondaryColor);
    addSubtleWatermark(slide9, secondaryColor);
    addCustomerLogo(slide9, customer, 7.5, 0.15, 2, 0.5);
    
    slide9.addText('Instagram', {
      x: DESIGN.margin, y: 0.2, w: 7, h: 0.45,
      fontSize: 26, bold: true, color: DESIGN.colors.black, fontFace: DESIGN.fontFamily
    });
    slide9.addText('Top Reels', {
      x: DESIGN.margin, y: 0.6, w: 7, h: 0.3,
      fontSize: 14, color: DESIGN.colors.mediumGray, fontFace: DESIGN.fontFamily
    });
    
    if (igReels.length > 0) {
      createTop3ContentShowcase(slide9, igReels, 'instagram', month, customer, primaryColor, secondaryColor);
    } else {
      slide9.addText('Keine Reels für diesen Zeitraum verfügbar', {
        x: 1, y: 2.5, w: 8, h: 0.5,
        fontSize: 14, color: DESIGN.colors.mediumGray, align: 'center', fontFace: DESIGN.fontFamily
      });
    }
    addFamefactIcon(slide9, 9, primaryColor);
    
    // ========================================
    // SLIDE 10: Instagram Demographie
    // ========================================
    const slide10 = pptx.addSlide();
    slide10.background = { color: DESIGN.colors.background };
    addBrandingLine(slide10, secondaryColor);
    addSubtleWatermark(slide10, secondaryColor);
    addCustomerLogo(slide10, customer, 7.5, 0.15, 2, 0.5);
    
    slide10.addText('Instagram', {
      x: DESIGN.margin, y: 0.2, w: 7, h: 0.45,
      fontSize: 26, bold: true, color: DESIGN.colors.black, fontFace: DESIGN.fontFamily
    });
    slide10.addText('Follower (Demographie)', {
      x: DESIGN.margin, y: 0.6, w: 7, h: 0.3,
      fontSize: 14, color: DESIGN.colors.mediumGray, fontFace: DESIGN.fontFamily
    });
    
    slide10.addShape('roundRect', {
      x: DESIGN.margin + 0.04, y: 1.04, w: 10 - (DESIGN.margin * 2), h: 3.5,
      fill: { color: DESIGN.colors.shadow },
      rectRadius: 0.1
    });
    slide10.addShape('roundRect', {
      x: DESIGN.margin, y: 1.0, w: 10 - (DESIGN.margin * 2), h: 3.5,
      fill: { color: DESIGN.colors.white },
      line: { color: 'E0E0E0', width: 1 },
      rectRadius: 0.1
    });
    slide10.addText('Screenshot der Instagram Insights (Demographie) hier einfügen', {
      x: DESIGN.margin, y: 2.6, w: 10 - (DESIGN.margin * 2), h: 0.4,
      fontSize: 12, color: DESIGN.colors.mediumGray, align: 'center', fontFace: DESIGN.fontFamily
    });
    addFamefactIcon(slide10, 10, primaryColor);
    
    // ========================================
    // SLIDE 11: Zusammenfassung
    // ========================================
    const slide11 = pptx.addSlide();
    slide11.background = { color: DESIGN.colors.background };
    addBrandingLine(slide11, primaryColor);
    addSubtleWatermark(slide11, secondaryColor);
    addCustomerLogo(slide11, customer, 7.5, 0.15, 2, 0.5);
    
    slide11.addText('Zusammenfassung', {
      x: DESIGN.margin, y: 0.2, w: 7, h: 0.45,
      fontSize: 26, bold: true, color: DESIGN.colors.black, fontFace: DESIGN.fontFamily
    });
    slide11.addText('Facebook & Instagram', {
      x: DESIGN.margin, y: 0.6, w: 7, h: 0.3,
      fontSize: 14, color: DESIGN.colors.mediumGray, fontFace: DESIGN.fontFamily
    });
    
    // Facebook summary
    const fbCurrentKpi = fbKpis[2];
    const fbPrevKpi = fbKpis[1];
    
    slide11.addShape('roundRect', {
      x: DESIGN.margin + 0.03, y: 1.03, w: 4.3, h: 1.8,
      fill: { color: DESIGN.colors.shadow },
      rectRadius: 0.1
    });
    slide11.addShape('roundRect', {
      x: DESIGN.margin, y: 1.0, w: 4.3, h: 1.8,
      fill: { color: DESIGN.colors.white },
      line: { color: primaryColor, width: 1 },
      rectRadius: 0.1
    });
    
    slide11.addShape('ellipse', {
      x: DESIGN.margin + 0.15, y: 1.12, w: 0.35, h: 0.35,
      fill: { color: primaryColor }
    });
    slide11.addText('f', {
      x: DESIGN.margin + 0.15, y: 1.12, w: 0.35, h: 0.35,
      fontSize: 14, bold: true, color: DESIGN.colors.white, align: 'center', valign: 'middle', fontFace: DESIGN.fontFamily
    });
    slide11.addText('Facebook', {
      x: DESIGN.margin + 0.55, y: 1.15, w: 2, h: 0.3,
      fontSize: 12, bold: true, color: DESIGN.colors.black, fontFace: DESIGN.fontFamily
    });
    
    const fbReachChange = fbPrevKpi.total_reach > 0 
      ? ((fbCurrentKpi.total_reach - fbPrevKpi.total_reach) / fbPrevKpi.total_reach * 100).toFixed(0)
      : '0';
    const fbSummaryText = `• Reichweite: ${formatNumber(fbCurrentKpi.total_reach)} (${parseInt(fbReachChange) >= 0 ? '+' : ''}${fbReachChange}%)\n• ${fbCurrentKpi.posts_count} Postings\n• Engagement: ${fbCurrentKpi.engagement_rate.toFixed(2).replace('.', ',')}%`;
    
    slide11.addText(fbSummaryText, {
      x: DESIGN.margin + 0.15, y: 1.5, w: 4, h: 1.2,
      fontSize: 10, color: DESIGN.colors.darkGray, fontFace: DESIGN.fontFamily
    });
    
    // Instagram summary
    const igCurrentKpi = igKpis[2];
    const igPrevKpi = igKpis[1];
    
    slide11.addShape('roundRect', {
      x: DESIGN.margin + 4.53, y: 1.03, w: 4.3, h: 1.8,
      fill: { color: DESIGN.colors.shadow },
      rectRadius: 0.1
    });
    slide11.addShape('roundRect', {
      x: DESIGN.margin + 4.5, y: 1.0, w: 4.3, h: 1.8,
      fill: { color: DESIGN.colors.white },
      line: { color: secondaryColor, width: 1 },
      rectRadius: 0.1
    });
    
    slide11.addShape('roundRect', {
      x: DESIGN.margin + 4.65, y: 1.12, w: 0.35, h: 0.35,
      line: { color: secondaryColor, width: 2 },
      rectRadius: 0.08
    });
    slide11.addShape('ellipse', {
      x: DESIGN.margin + 4.74, y: 1.21, w: 0.17, h: 0.17,
      line: { color: secondaryColor, width: 1.5 }
    });
    slide11.addText('Instagram', {
      x: DESIGN.margin + 5.05, y: 1.15, w: 2, h: 0.3,
      fontSize: 12, bold: true, color: DESIGN.colors.black, fontFace: DESIGN.fontFamily
    });
    
    const igReachChange = igPrevKpi.total_reach > 0 
      ? ((igCurrentKpi.total_reach - igPrevKpi.total_reach) / igPrevKpi.total_reach * 100).toFixed(0)
      : '0';
    const igSummaryText = `• Follower: ${igCurrentKpi.new_followers >= 0 ? '+' : ''}${igCurrentKpi.new_followers} neu\n• Reichweite: ${formatNumber(igCurrentKpi.total_reach)} (${parseInt(igReachChange) >= 0 ? '+' : ''}${igReachChange}%)\n• Engagement: ${igCurrentKpi.engagement_rate.toFixed(2).replace('.', ',')}%`;
    
    slide11.addText(igSummaryText, {
      x: DESIGN.margin + 4.65, y: 1.5, w: 4, h: 1.2,
      fontSize: 10, color: DESIGN.colors.darkGray, fontFace: DESIGN.fontFamily
    });
    
    // Gesamtfazit
    slide11.addShape('roundRect', {
      x: DESIGN.margin + 0.03, y: 3.03, w: 8.8, h: 1.5,
      fill: { color: DESIGN.colors.shadow },
      rectRadius: 0.1
    });
    slide11.addShape('roundRect', {
      x: DESIGN.margin, y: 3.0, w: 8.8, h: 1.5,
      fill: { color: DESIGN.colors.white },
      line: { color: 'E0E0E0', width: 1 },
      rectRadius: 0.1
    });
    
    slide11.addText('Gesamtfazit ' + getShortMonthName(month), {
      x: DESIGN.margin + 0.15, y: 3.1, w: 8.5, h: 0.3,
      fontSize: 11, bold: true, color: DESIGN.colors.black, fontFace: DESIGN.fontFamily
    });
    
    const totalReachCurrent = fbCurrentKpi.total_reach + igCurrentKpi.total_reach;
    const totalReachPrev = fbPrevKpi.total_reach + igPrevKpi.total_reach;
    const overallTrend = totalReachCurrent > totalReachPrev ? 'positive' : (totalReachCurrent < totalReachPrev ? 'rückläufige' : 'stabile');
    
    slide11.addText(
      `Der ${getShortMonthName(month)} zeigt eine ${overallTrend} Performance auf beiden Plattformen. ` +
      `Die organische Basis bleibt solide und bietet eine gute Ausgangslage für neue Impulse und Kampagnen. ` +
      `Besonders die Content-Strategie mit visuell ansprechenden Posts zeigt weiterhin gute Ergebnisse.`,
      {
        x: DESIGN.margin + 0.15, y: 3.4, w: 8.5, h: 1,
        fontSize: 10, color: DESIGN.colors.darkGray, fontFace: DESIGN.fontFamily
      }
    );
    addFamefactIcon(slide11, 11, primaryColor);
    
    // ========================================
    // SLIDE 12: Paid Ads Performance (PPA)
    // ========================================
    if (customerAdCampaigns.length > 0) {
      const slideAds = pptx.addSlide();
      slideAds.background = { color: DESIGN.colors.background };
      addBrandingLine(slideAds, primaryColor);
      addSubtleWatermark(slideAds, secondaryColor);
      addCustomerLogo(slideAds, customer, 7.5, 0.15, 2, 0.5);
      
      slideAds.addText('Paid Ads Performance', {
        x: DESIGN.margin, y: 0.2, w: 7, h: 0.45,
        fontSize: 26, bold: true, color: DESIGN.colors.black, fontFace: DESIGN.fontFamily
      });
      slideAds.addText(`PPA Ausgaben ${getShortMonthName(month)} | ${formatCurrency(totalAdSpend)} gesamt`, {
        x: DESIGN.margin, y: 0.6, w: 7, h: 0.3,
        fontSize: 14, color: DESIGN.colors.mediumGray, fontFace: DESIGN.fontFamily
      });
      
      // Gesamt-KPI Karten
      const adsKpis = [
        { label: 'Gesamtausgaben', value: formatCurrency(totalAdSpend), color: primaryColor },
        { label: 'Impressionen', value: formatNumber(totalAdImpressions), color: '3B82F6' },
        { label: 'Reichweite', value: formatNumber(totalAdReach), color: '8B5CF6' },
        { label: 'Klicks', value: formatNumber(totalAdClicks), color: '10B981' },
      ];
      
      adsKpis.forEach((kpi, idx) => {
        const kpiX = DESIGN.margin + idx * 2.25;
        slideAds.addShape('roundRect', {
          x: kpiX + 0.02, y: 1.12, w: 2.05, h: 0.75,
          fill: { color: DESIGN.colors.shadow }, rectRadius: 0.08
        });
        slideAds.addShape('roundRect', {
          x: kpiX, y: 1.1, w: 2.05, h: 0.75,
          fill: { color: DESIGN.colors.white }, line: { color: kpi.color, width: 1 }, rectRadius: 0.08
        });
        slideAds.addShape('rect', {
          x: kpiX, y: 1.1, w: 2.05, h: 0.06,
          fill: { color: kpi.color }
        });
        slideAds.addText(kpi.value, {
          x: kpiX + 0.1, y: 1.2, w: 1.85, h: 0.35,
          fontSize: 16, bold: true, color: DESIGN.colors.black, fontFace: DESIGN.fontFamily
        });
        slideAds.addText(kpi.label, {
          x: kpiX + 0.1, y: 1.5, w: 1.85, h: 0.25,
          fontSize: 8, color: DESIGN.colors.mediumGray, fontFace: DESIGN.fontFamily
        });
      });
      
      // Kampagnen-Tabelle
      const tableStartY = 2.1;
      const adsColWidths = [4.5, 1.5, 1.5, 1.5];
      const adsTableW = 9.0;
      
      slideAds.addShape('roundRect', {
        x: DESIGN.margin + 0.02, y: tableStartY + 0.02, w: adsTableW, h: 0.4,
        fill: { color: DESIGN.colors.shadow }, rectRadius: 0.08
      });
      slideAds.addShape('roundRect', {
        x: DESIGN.margin, y: tableStartY, w: adsTableW, h: 0.4,
        fill: { color: primaryColor }, rectRadius: 0.08
      });
      
      const adsHeaders = ['Kampagne', 'Ausgaben', 'Impressionen', 'Klicks'];
      let hdrX = DESIGN.margin;
      adsHeaders.forEach((h, i) => {
        slideAds.addText(h, {
          x: hdrX + 0.1, y: tableStartY, w: adsColWidths[i] - 0.2, h: 0.4,
          fontSize: 9, bold: true, color: DESIGN.colors.white,
          fontFace: DESIGN.fontFamily, align: i === 0 ? 'left' : 'center', valign: 'middle'
        });
        hdrX += adsColWidths[i];
      });
      
      const sortedCampaigns = [...customerAdCampaigns]
        .sort((a: any, b: any) => (b.spend || 0) - (a.spend || 0))
        .slice(0, 10);
      
      let rowY = tableStartY + 0.45;
      sortedCampaigns.forEach((campaign: any, idx: number) => {
        const isAlt = idx % 2 === 0;
        const bgColor = isAlt ? DESIGN.colors.lightGray : DESIGN.colors.white;
        
        slideAds.addShape('rect', {
          x: DESIGN.margin, y: rowY, w: adsTableW, h: 0.32,
          fill: { color: bgColor }
        });
        
        const rowData = [
          campaign.campaign_name || 'Unbekannt',
          formatCurrency(campaign.spend || 0),
          formatNumber(campaign.impressions || 0),
          formatNumber(campaign.clicks || 0),
        ];
        
        let cellX = DESIGN.margin;
        rowData.forEach((val: string, i: number) => {
          slideAds.addText(val, {
            x: cellX + 0.1, y: rowY, w: adsColWidths[i] - 0.2, h: 0.32,
            fontSize: 8, color: i === 1 ? primaryColor : DESIGN.colors.darkGray,
            fontFace: DESIGN.fontFamily, align: i === 0 ? 'left' : 'center', valign: 'middle',
            bold: i === 1
          });
          cellX += adsColWidths[i];
        });
        
        rowY += 0.32;
      });
      
      // CPC / CPM / CTR footer
      const footerY = Math.min(rowY + 0.2, 4.8);
      const avgCpc = totalAdClicks > 0 ? totalAdSpend / totalAdClicks : 0;
      const avgCpm = totalAdImpressions > 0 ? (totalAdSpend / totalAdImpressions) * 1000 : 0;
      const avgCtr = totalAdImpressions > 0 ? (totalAdClicks / totalAdImpressions) * 100 : 0;
      
      const footerKpis = [
        { label: '\u00d8 CPC', value: formatCurrency(avgCpc) },
        { label: '\u00d8 CPM', value: formatCurrency(avgCpm) },
        { label: '\u00d8 CTR', value: avgCtr.toFixed(2).replace('.', ',') + '%' },
      ];
      
      footerKpis.forEach((kpi, idx) => {
        const fX = DESIGN.margin + idx * 3;
        slideAds.addText(kpi.label + ': ', {
          x: fX, y: footerY, w: 1, h: 0.3,
          fontSize: 9, color: DESIGN.colors.mediumGray, fontFace: DESIGN.fontFamily, align: 'right'
        });
        slideAds.addText(kpi.value, {
          x: fX + 1, y: footerY, w: 1.5, h: 0.3,
          fontSize: 11, bold: true, color: DESIGN.colors.black, fontFace: DESIGN.fontFamily
        });
      });
      
      addFamefactIcon(slideAds, 12, primaryColor);
    }
    
    // ========================================
    // SLIDE 13: Outro
    // ========================================
    const slide12 = pptx.addSlide();
    slide12.background = { color: DESIGN.colors.black };
    
    slide12.addText('famefact.', {
      x: DESIGN.margin, y: 0.35, w: 2.5, h: 0.5,
      fontSize: 20, bold: true, color: DESIGN.colors.white, fontFace: DESIGN.fontFamily
    });
    
    slide12.addShape('roundRect', {
      x: DESIGN.margin, y: 1.1, w: 2.4, h: 2.7,
      fill: { color: DESIGN.colors.darkGray },
      line: { color: '555555', width: 1 },
      rectRadius: 0.1
    });
    slide12.addText('Foto', {
      x: DESIGN.margin, y: 2.3, w: 2.4, h: 0.4,
      fontSize: 11, color: DESIGN.colors.mediumGray, align: 'center', fontFace: DESIGN.fontFamily
    });
    
    slide12.addText(AGENCY.contact.name, {
      x: DESIGN.margin, y: 3.95, w: 4, h: 0.3,
      fontSize: 13, color: DESIGN.colors.white, fontFace: DESIGN.fontFamily
    });
    slide12.addText(AGENCY.contact.title, {
      x: DESIGN.margin, y: 4.25, w: 4, h: 0.25,
      fontSize: 10, color: DESIGN.colors.mediumGray, fontFace: DESIGN.fontFamily
    });
    
    slide12.addText('famefact', {
      x: DESIGN.margin, y: 4.7, w: 4, h: 0.35,
      fontSize: 15, bold: true, color: DESIGN.colors.white, fontFace: DESIGN.fontFamily
    });
    slide12.addText(AGENCY.tagline, {
      x: DESIGN.margin, y: 5.0, w: 4, h: 0.25,
      fontSize: 8, color: DESIGN.colors.mediumGray, charSpacing: 2, fontFace: DESIGN.fontFamily
    });
    
    slide12.addText(`${AGENCY.contact.company}\n${AGENCY.contact.address}\n${AGENCY.contact.city}`, {
      x: DESIGN.margin, y: 5.4, w: 4, h: 0.7,
      fontSize: 9, color: DESIGN.colors.white, fontFace: DESIGN.fontFamily
    });
    
    slide12.addText(`E-Mail: ${AGENCY.contact.email}\nTel.: ${AGENCY.contact.phone}`, {
      x: DESIGN.margin, y: 6.15, w: 4, h: 0.45,
      fontSize: 9, color: DESIGN.colors.white, fontFace: DESIGN.fontFamily
    });
    
    slide12.addShape('rect', {
      x: 6.8, y: 0.4, w: 2.4, h: 2.4,
      fill: { color: primaryColor },
      rotate: 45
    });
    slide12.addShape('rect', {
      x: 7.5, y: 1.3, w: 1.9, h: 1.9,
      fill: { color: secondaryColor },
      rotate: 45
    });
    
    // Generate file with dynamic filename
    const buffer = await pptx.write({ outputType: 'nodebuffer' }) as Buffer;
    const [year, monthNum] = month.split('-');
    const monthNames = ['Januar', 'Februar', 'Maerz', 'April', 'Mai', 'Juni', 
                        'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
    const monthName = monthNames[parseInt(monthNum) - 1];
    const safeCustomerName = sanitizeFilename(customer.name);
    const filename = `${safeCustomerName}_Social_Media_Report_${monthName}_${year}.pptx`;
    
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
    
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json({ error: 'Failed to generate report', details: String(error) }, { status: 500 });
  }
}
