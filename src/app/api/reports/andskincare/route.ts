import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import PptxGenJS from 'pptxgenjs';

// ANDskincare specific configuration - EXACT famefact design
const CONFIG = {
  customerName: 'ANDskincare',
  customerSlug: 'andskincare',
  facebookUrl: 'facebook.com/ANDskincare',
  instagramHandle: 'and.skincare',
  colors: {
    // famefact brand colors
    green: 'A8D65C',      // Posts bars
    purple: 'B8A9C9',     // Videos/Reels bars
    white: 'FFFFFF',
    black: '000000',
    gray: '666666',
    lightGray: 'F5F5F5',
    tableHeader: 'A8D65C', // Green header for tables
    // Demographics colors
    lightBlue: '7DD3E1',   // Women
    darkBlue: '2B7A8C',    // Men
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
  // Calculate end date as first day of next month
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
  
  const table = platform === 'facebook' ? 'fb_follower_snapshots' : 'ig_follower_snapshots';
  const idCol = platform === 'facebook' ? 'page_id' : 'account_id';
  const placeholders = pageIds.map((_, i) => `$${i + 2}`).join(', ');
  const results: {month: string, followers: number}[] = [];
  
  for (const month of months) {
    try {
      const result = await query<{ followers: string }>(`
        SELECT COALESCE(MAX(followers_count), 0) as followers
        FROM ${table}
        WHERE ${idCol} IN (${placeholders})
          AND snapshot_time <= $1::date + interval '1 month'
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
      console.error(`Error fetching ${platform} KPIs for ${month}:`, error);
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

// Add famefact icon to slide (bottom left)
function addFamefactIcon(slide: PptxGenJS.Slide, pageNum: number) {
  // famefact icon placeholder (simplified)
  slide.addText('⬡', {
    x: 0.3, y: 4.9, w: 0.4, h: 0.4,
    fontSize: 24, color: CONFIG.colors.black, fontFace: 'Arial'
  });
  // Page number (bottom right)
  slide.addText(pageNum.toString(), {
    x: 9.2, y: 5.1, w: 0.5, h: 0.3,
    fontSize: 11, color: CONFIG.colors.gray, align: 'right'
  });
}

// Create KPI table for Facebook (exact famefact style)
function createFacebookKPITable(kpis: MonthlyKPI[]): PptxGenJS.TableRow[] {
  const rows: PptxGenJS.TableRow[] = [];
  const headerOpts = { bold: true, fill: { color: CONFIG.colors.green }, color: CONFIG.colors.white, fontSize: 11, align: 'center' as const };
  const cellOpts = (alt: boolean) => ({ fill: { color: alt ? CONFIG.colors.lightGray : CONFIG.colors.white }, color: CONFIG.colors.black, fontSize: 10, align: 'center' as const });
  
  // Header row
  rows.push([
    { text: 'KPI', options: headerOpts },
    { text: getShortMonthName(kpis[2].month), options: headerOpts },
    { text: getShortMonthName(kpis[1].month), options: headerOpts },
    { text: getShortMonthName(kpis[0].month), options: headerOpts },
  ]);
  
  // Data rows - exact famefact order
  const dataRows = [
    { label: 'Neue Fans', values: kpis.map(k => k.new_followers > 0 ? `+${k.new_followers}` : k.new_followers.toString()) },
    { label: 'Fans total', values: kpis.map(k => formatNumber(k.followers)) },
    { label: 'Post-Reichweite', values: kpis.map(k => formatNumber(k.total_reach)) },
    { label: 'Ø Reichweite pro Post', values: kpis.map(k => formatNumber(k.avg_reach)) },
    { label: 'Interaktionen\n(Teilen, Liken, Kommentieren)', values: kpis.map(k => formatNumber(k.total_reactions + k.total_comments + k.total_shares)) },
    { label: '3-sekündige Video Plays', values: kpis.map(k => formatNumber(k.total_video_views)) },
    { label: 'Interaktionsrate*', values: kpis.map(k => k.engagement_rate.toFixed(2).replace('.', ',') + '%') },
    { label: 'Anzahl der Postings', values: kpis.map(k => k.posts_count.toString()) },
    { label: 'Budget pro Posting', values: ['0,00 €', '0,00 €', '0,00 €'] },
    { label: 'Ausgaben', values: ['0,00 €', '0,00 €', '0,00 €'] },
  ];
  
  dataRows.forEach((row, idx) => {
    rows.push([
      { text: row.label, options: { ...cellOpts(idx % 2 === 0), align: 'left' as const } },
      { text: row.values[2], options: cellOpts(idx % 2 === 0) },
      { text: row.values[1], options: cellOpts(idx % 2 === 0) },
      { text: row.values[0], options: cellOpts(idx % 2 === 0) },
    ]);
  });
  
  return rows;
}

// Create KPI table for Instagram (exact famefact style)
function createInstagramKPITable(kpis: MonthlyKPI[]): PptxGenJS.TableRow[] {
  const rows: PptxGenJS.TableRow[] = [];
  const headerOpts = { bold: true, fill: { color: CONFIG.colors.green }, color: CONFIG.colors.white, fontSize: 11, align: 'center' as const };
  const cellOpts = (alt: boolean) => ({ fill: { color: alt ? CONFIG.colors.lightGray : CONFIG.colors.white }, color: CONFIG.colors.black, fontSize: 10, align: 'center' as const });
  
  rows.push([
    { text: 'KPI', options: headerOpts },
    { text: getShortMonthName(kpis[2].month), options: headerOpts },
    { text: getShortMonthName(kpis[1].month), options: headerOpts },
    { text: getShortMonthName(kpis[0].month), options: headerOpts },
  ]);
  
  const dataRows = [
    { label: 'Neue Follower', values: kpis.map(k => k.new_followers > 0 ? `+ ${k.new_followers}` : k.new_followers.toString()) },
    { label: 'Follower total', values: kpis.map(k => formatNumber(k.followers)) },
    { label: 'Post-Reichweite', values: kpis.map(k => formatNumber(k.total_reach)) },
    { label: 'Ø Reichweite pro Post', values: kpis.map(k => formatNumber(k.avg_reach)) },
    { label: 'Interaktionen\n(Likes, Kommentare, Saves, Klicks)', values: kpis.map(k => formatNumber(k.total_reactions + k.total_comments + k.total_saves)) },
    { label: 'Videoviews', values: kpis.map(k => formatNumber(k.total_video_views)) },
    { label: 'Savings', values: kpis.map(k => k.total_saves.toString()) },
    { label: 'Interaktionsrate', values: kpis.map(k => k.engagement_rate.toFixed(2).replace('.', ',') + ' %') },
    { label: 'Anzahl an Postings', values: kpis.map(k => k.posts_count.toString()) },
    { label: 'Ausgaben', values: ['0,00 €', '0,00 €', '0,00 €'] },
  ];
  
  dataRows.forEach((row, idx) => {
    rows.push([
      { text: row.label, options: { ...cellOpts(idx % 2 === 0), align: 'left' as const } },
      { text: row.values[2], options: cellOpts(idx % 2 === 0) },
      { text: row.values[1], options: cellOpts(idx % 2 === 0) },
      { text: row.values[0], options: cellOpts(idx % 2 === 0) },
    ]);
  });
  
  return rows;
}

// Create bar chart with images above bars
function createBarChartWithImages(
  slide: PptxGenJS.Slide,
  posts: (PostData & { value: number })[],
  barColor: string,
  yAxisLabel: string,
  startY: number
) {
  if (posts.length === 0) {
    slide.addText('Keine Daten für diesen Zeitraum', {
      x: 1, y: 2.5, w: 8, h: 0.5,
      fontSize: 14, color: CONFIG.colors.gray, align: 'center'
    });
    return;
  }
  
  const maxValue = Math.max(...posts.map(p => p.value));
  const chartHeight = 3.2;
  const chartWidth = 8.5;
  const barWidth = Math.min(0.8, chartWidth / posts.length - 0.2);
  const startX = 1.2;
  const chartBottom = startY + chartHeight;
  
  // Y-axis
  slide.addShape('line', {
    x: startX - 0.1, y: startY, w: 0, h: chartHeight,
    line: { color: CONFIG.colors.gray, width: 0.5 }
  });
  
  // Y-axis labels
  const ySteps = 5;
  for (let i = 0; i <= ySteps; i++) {
    const yVal = Math.round((maxValue / ySteps) * (ySteps - i));
    const yPos = startY + (chartHeight / ySteps) * i;
    slide.addText(yVal.toString(), {
      x: 0.2, y: yPos - 0.1, w: 0.8, h: 0.2,
      fontSize: 9, color: CONFIG.colors.gray, align: 'right'
    });
    // Grid line
    slide.addShape('line', {
      x: startX, y: yPos, w: chartWidth, h: 0,
      line: { color: 'E0E0E0', width: 0.3 }
    });
  }
  
  // Bars and images
  posts.forEach((post, idx) => {
    const barHeight = maxValue > 0 ? (post.value / maxValue) * chartHeight : 0;
    const xPos = startX + idx * (chartWidth / posts.length) + 0.1;
    const barY = chartBottom - barHeight;
    
    // Bar
    slide.addShape('rect', {
      x: xPos, y: barY, w: barWidth, h: barHeight,
      fill: { color: barColor },
    });
    
    // Image above bar
    const imgSize = 0.65;
    const imgY = barY - imgSize - 0.05;
    if (post.thumbnail_url) {
      try {
        slide.addImage({
          path: post.thumbnail_url,
          x: xPos + (barWidth - imgSize) / 2,
          y: imgY,
          w: imgSize, h: imgSize,
        });
      } catch {
        slide.addShape('rect', {
          x: xPos + (barWidth - imgSize) / 2, y: imgY, w: imgSize, h: imgSize,
          fill: { color: 'EEEEEE' }, line: { color: 'CCCCCC', width: 0.5 }
        });
      }
    }
    
    // Date label
    const isCarousel = post.type === 'carousel' || post.type === 'CAROUSEL_ALBUM';
    const dateStr = formatDate(post.created_time) + (isCarousel ? '*' : '');
    slide.addText(dateStr, {
      x: xPos - 0.1, y: chartBottom + 0.05, w: barWidth + 0.2, h: 0.3,
      fontSize: 8, color: CONFIG.colors.black, align: 'center'
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
    
    // Create PowerPoint with WHITE background (famefact style)
    const pptx = new PptxGenJS();
    pptx.author = 'famefact GmbH';
    pptx.title = `${CONFIG.customerName} Social Media Report - ${getMonthName(month)}`;
    pptx.company = 'famefact GmbH';
    pptx.layout = 'LAYOUT_16x9';
    
    // ========================================
    // SLIDE 1: Cover (white background)
    // ========================================
    const slide1 = pptx.addSlide();
    slide1.background = { color: CONFIG.colors.white };
    
    // famefact logo (top left) - placeholder
    slide1.addText('famefact.', {
      x: 0.4, y: 0.3, w: 2, h: 0.4,
      fontSize: 18, bold: true, color: CONFIG.colors.black, fontFace: 'Arial'
    });
    
    // famefact graphic (top right) - green/purple diamond shapes
    slide1.addShape('rect', {
      x: 7.5, y: 0.2, w: 1.5, h: 1.5,
      fill: { color: CONFIG.colors.green },
      rotate: 45
    });
    slide1.addShape('rect', {
      x: 8.2, y: 0.8, w: 1.2, h: 1.2,
      fill: { color: CONFIG.colors.purple },
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
        fontSize: 28, bold: true, color: CONFIG.colors.white, align: 'center', valign: 'middle'
      });
    });
    slide1.addText('SKINCARE', {
      x: 0, y: logoY + 1.1, w: '100%', h: 0.4,
      fontSize: 18, color: '808080', align: 'center', charSpacing: 6
    });
    
    // Title
    slide1.addText('Social Media Reporting', {
      x: 0, y: 3.5, w: '100%', h: 0.6,
      fontSize: 32, bold: true, color: CONFIG.colors.black, align: 'center'
    });
    slide1.addText(getMonthName(month), {
      x: 0, y: 4.1, w: '100%', h: 0.4,
      fontSize: 20, color: CONFIG.colors.green, align: 'center'
    });
    
    // ========================================
    // SLIDE 2: Facebook Analyse (Screenshot placeholder)
    // ========================================
    const slide2 = pptx.addSlide();
    slide2.background = { color: CONFIG.colors.white };
    
    // Facebook icon
    slide2.addShape('ellipse', {
      x: 4.5, y: 0.3, w: 0.8, h: 0.8,
      fill: { color: CONFIG.colors.black }
    });
    slide2.addText('f', {
      x: 4.5, y: 0.3, w: 0.8, h: 0.8,
      fontSize: 28, bold: true, color: CONFIG.colors.white, align: 'center', valign: 'middle'
    });
    
    slide2.addText('Facebook Analyse', {
      x: 0, y: 1.2, w: '100%', h: 0.5,
      fontSize: 28, bold: true, color: CONFIG.colors.black, align: 'center'
    });
    
    // Screenshot placeholder
    slide2.addShape('rect', {
      x: 1, y: 1.9, w: 8, h: 3,
      fill: { color: CONFIG.colors.lightGray },
      line: { color: 'CCCCCC', width: 1 }
    });
    slide2.addText('Screenshot der Facebook-Seite hier einfügen', {
      x: 1, y: 3.2, w: 8, h: 0.4,
      fontSize: 12, color: CONFIG.colors.gray, align: 'center'
    });
    
    addFamefactIcon(slide2, 2);
    
    // ========================================
    // SLIDE 3: Facebook Kennzahlen
    // ========================================
    const slide3 = pptx.addSlide();
    slide3.background = { color: CONFIG.colors.white };
    
    slide3.addText('Facebook', {
      x: 0.5, y: 0.3, w: 9, h: 0.5,
      fontSize: 28, bold: true, color: CONFIG.colors.black
    });
    slide3.addText('Kennzahlen', {
      x: 0.5, y: 0.75, w: 9, h: 0.35,
      fontSize: 16, color: CONFIG.colors.gray
    });
    
    const fbTable = createFacebookKPITable(fbKpis);
    slide3.addTable(fbTable, {
      x: 0.5, y: 1.2, w: 9,
      colW: [3, 2, 2, 2],
      border: { type: 'solid', color: 'CCCCCC', pt: 0.5 },
    });
    
    // Footnote
    slide3.addText('*Die Interaktionsrate berechnet sich aus allen Interaktionen durch die Gesamtreichweite mal 100', {
      x: 0.5, y: 4.7, w: 9, h: 0.3,
      fontSize: 8, color: CONFIG.colors.gray, italic: true
    });
    
    addFamefactIcon(slide3, 3);
    
    // ========================================
    // SLIDE 4: Facebook Posts nach Interaktionen
    // ========================================
    const slide4 = pptx.addSlide();
    slide4.background = { color: CONFIG.colors.white };
    
    slide4.addText('Facebook', {
      x: 0.5, y: 0.3, w: 9, h: 0.5,
      fontSize: 28, bold: true, color: CONFIG.colors.black
    });
    slide4.addText('Postings (Feed) nach Interaktionen', {
      x: 0.5, y: 0.75, w: 9, h: 0.35,
      fontSize: 16, color: CONFIG.colors.gray
    });
    
    const fbPostsByInteractions = [...fbPosts]
      .filter(p => p.type !== 'video' && p.type !== 'VIDEO')
      .map(p => ({ ...p, value: (p.reactions_total || 0) + (p.comments_total || 0) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
    
    createBarChartWithImages(slide4, fbPostsByInteractions, CONFIG.colors.green, 'Interaktionen', 1.3);
    
    // Carousel footnote
    if (fbPostsByInteractions.some(p => p.type === 'carousel' || p.type === 'CAROUSEL_ALBUM')) {
      slide4.addText('*Carousel Posting', {
        x: 0.5, y: 4.8, w: 3, h: 0.25,
        fontSize: 9, color: CONFIG.colors.black
      });
    }
    
    addFamefactIcon(slide4, 4);
    
    // ========================================
    // SLIDE 5: Facebook Videos nach 3-Sek-Views
    // ========================================
    const slide5 = pptx.addSlide();
    slide5.background = { color: CONFIG.colors.white };
    
    slide5.addText('Facebook', {
      x: 0.5, y: 0.3, w: 9, h: 0.5,
      fontSize: 28, bold: true, color: CONFIG.colors.black
    });
    slide5.addText('Postings (Feed) nach 3-sekündigen Videoplays', {
      x: 0.5, y: 0.75, w: 9, h: 0.35,
      fontSize: 16, color: CONFIG.colors.gray
    });
    
    // Get videos - use reach as fallback if video_3s_views is 0
    const fbVideos = [...fbPosts]
      .filter(p => p.type === 'video' || p.type === 'VIDEO' || p.type === 'reel' || p.type === 'REEL')
      .map(p => ({ 
        ...p, 
        value: (p.video_3s_views && p.video_3s_views > 0) ? p.video_3s_views : (p.reach || 0)
      }))
      .filter(p => p.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
    
    createBarChartWithImages(slide5, fbVideos, CONFIG.colors.purple, 'Video Views', 1.3);
    
    addFamefactIcon(slide5, 5);
    
    // ========================================
    // SLIDE 6: Facebook Top Postings (2 large images)
    // ========================================
    const slide6 = pptx.addSlide();
    slide6.background = { color: CONFIG.colors.white };
    
    slide6.addText('Facebook', {
      x: 0.5, y: 0.3, w: 9, h: 0.5,
      fontSize: 28, bold: true, color: CONFIG.colors.black
    });
    slide6.addText('Top Postings', {
      x: 0.5, y: 0.75, w: 9, h: 0.35,
      fontSize: 16, color: CONFIG.colors.gray
    });
    
    const topFbPosts = [...fbPosts]
      .map(p => ({ ...p, interactions: (p.reactions_total || 0) + (p.comments_total || 0) }))
      .sort((a, b) => b.interactions - a.interactions)
      .slice(0, 2);
    
    // 2 large images side by side
    topFbPosts.forEach((post, idx) => {
      const xPos = idx === 0 ? 0.8 : 5.2;
      if (post.thumbnail_url) {
        try {
          slide6.addImage({
            path: post.thumbnail_url,
            x: xPos, y: 1.2, w: 4, h: 3.5,
          });
        } catch {
          slide6.addShape('rect', {
            x: xPos, y: 1.2, w: 4, h: 3.5,
            fill: { color: CONFIG.colors.lightGray },
            line: { color: 'CCCCCC', width: 1 }
          });
        }
      } else {
        slide6.addShape('rect', {
          x: xPos, y: 1.2, w: 4, h: 3.5,
          fill: { color: CONFIG.colors.lightGray },
          line: { color: 'CCCCCC', width: 1 }
        });
      }
    });
    
    addFamefactIcon(slide6, 6);
    
    // ========================================
    // SLIDE 7: Facebook Demographie (Screenshot placeholder)
    // ========================================
    const slide7 = pptx.addSlide();
    slide7.background = { color: CONFIG.colors.white };
    
    slide7.addText('Facebook', {
      x: 0.5, y: 0.3, w: 9, h: 0.5,
      fontSize: 28, bold: true, color: CONFIG.colors.black
    });
    slide7.addText('Fans (Demographie)', {
      x: 0.5, y: 0.75, w: 9, h: 0.35,
      fontSize: 16, color: CONFIG.colors.gray
    });
    
    slide7.addShape('rect', {
      x: 0.5, y: 1.2, w: 9, h: 3.6,
      fill: { color: CONFIG.colors.lightGray },
      line: { color: 'CCCCCC', width: 1 }
    });
    slide7.addText('Screenshot der Facebook Insights (Demographie) hier einfügen', {
      x: 0.5, y: 2.8, w: 9, h: 0.4,
      fontSize: 12, color: CONFIG.colors.gray, align: 'center'
    });
    
    addFamefactIcon(slide7, 7);
    
    // ========================================
    // SLIDE 8: Instagram Analyse
    // ========================================
    const slide8 = pptx.addSlide();
    slide8.background = { color: CONFIG.colors.white };
    
    // Instagram icon
    slide8.addShape('ellipse', {
      x: 4.5, y: 0.3, w: 0.8, h: 0.8,
      line: { color: CONFIG.colors.black, width: 2 }
    });
    slide8.addShape('ellipse', {
      x: 4.7, y: 0.5, w: 0.4, h: 0.4,
      line: { color: CONFIG.colors.black, width: 1.5 }
    });
    
    slide8.addText('Instagram Analyse', {
      x: 0, y: 1.2, w: '100%', h: 0.5,
      fontSize: 28, bold: true, color: CONFIG.colors.black, align: 'center'
    });
    slide8.addText(CONFIG.instagramHandle, {
      x: 0, y: 1.7, w: '100%', h: 0.3,
      fontSize: 14, color: CONFIG.colors.gray, align: 'center'
    });
    
    slide8.addShape('rect', {
      x: 1, y: 2.1, w: 8, h: 2.8,
      fill: { color: CONFIG.colors.lightGray },
      line: { color: 'CCCCCC', width: 1 }
    });
    slide8.addText('Screenshot des Instagram-Profils hier einfügen', {
      x: 1, y: 3.3, w: 8, h: 0.4,
      fontSize: 12, color: CONFIG.colors.gray, align: 'center'
    });
    
    addFamefactIcon(slide8, 8);
    
    // ========================================
    // SLIDE 9: Instagram Kennzahlen
    // ========================================
    const slide9 = pptx.addSlide();
    slide9.background = { color: CONFIG.colors.white };
    
    slide9.addText('Instagram', {
      x: 0.5, y: 0.3, w: 9, h: 0.5,
      fontSize: 28, bold: true, color: CONFIG.colors.black
    });
    slide9.addText('Kennzahlen', {
      x: 0.5, y: 0.75, w: 9, h: 0.35,
      fontSize: 16, color: CONFIG.colors.gray
    });
    
    const igTable = createInstagramKPITable(igKpis);
    slide9.addTable(igTable, {
      x: 0.5, y: 1.2, w: 9,
      colW: [3, 2, 2, 2],
      border: { type: 'solid', color: 'CCCCCC', pt: 0.5 },
    });
    
    addFamefactIcon(slide9, 9);
    
    // ========================================
    // SLIDE 10: Instagram Posts nach Interaktionen
    // ========================================
    const slide10 = pptx.addSlide();
    slide10.background = { color: CONFIG.colors.white };
    
    slide10.addText('Instagram', {
      x: 0.5, y: 0.3, w: 9, h: 0.5,
      fontSize: 28, bold: true, color: CONFIG.colors.black
    });
    slide10.addText('Postings (Feed) nach Interaktionen', {
      x: 0.5, y: 0.75, w: 9, h: 0.35,
      fontSize: 16, color: CONFIG.colors.gray
    });
    
    const igPostsByInteractions = [...igPosts]
      .filter(p => p.type !== 'VIDEO' && p.type !== 'REEL')
      .map(p => ({ ...p, value: (p.reactions_total || 0) + (p.comments_total || 0) + (p.saves || 0) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 9);
    
    createBarChartWithImages(slide10, igPostsByInteractions, CONFIG.colors.green, 'Interaktionen', 1.3);
    
    if (igPostsByInteractions.some(p => p.type === 'CAROUSEL_ALBUM')) {
      slide10.addText('*Carousel Posting', {
        x: 0.5, y: 4.8, w: 3, h: 0.25,
        fontSize: 9, color: CONFIG.colors.black
      });
    }
    
    addFamefactIcon(slide10, 10);
    
    // ========================================
    // SLIDE 11: Instagram Reels nach Videoplays
    // ========================================
    const slide11 = pptx.addSlide();
    slide11.background = { color: CONFIG.colors.white };
    
    slide11.addText('Instagram', {
      x: 0.5, y: 0.3, w: 9, h: 0.5,
      fontSize: 28, bold: true, color: CONFIG.colors.black
    });
    slide11.addText('Postings nach Videoplays', {
      x: 0.5, y: 0.75, w: 9, h: 0.35,
      fontSize: 16, color: CONFIG.colors.gray
    });
    
    const igReels = [...igPosts]
      .filter(p => p.type === 'VIDEO' || p.type === 'REEL')
      .map(p => ({ ...p, value: p.video_3s_views || p.reach || 0 }))
      .filter(p => p.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
    
    createBarChartWithImages(slide11, igReels, CONFIG.colors.purple, 'Video Views', 1.3);
    
    addFamefactIcon(slide11, 11);
    
    // ========================================
    // SLIDE 12: Instagram Top Postings (2 large images)
    // ========================================
    const slide12 = pptx.addSlide();
    slide12.background = { color: CONFIG.colors.white };
    
    slide12.addText('Instagram', {
      x: 0.5, y: 0.3, w: 9, h: 0.5,
      fontSize: 28, bold: true, color: CONFIG.colors.black
    });
    slide12.addText('Top Postings', {
      x: 0.5, y: 0.75, w: 9, h: 0.35,
      fontSize: 16, color: CONFIG.colors.gray
    });
    
    const topIgPosts = [...igPosts]
      .map(p => ({ ...p, interactions: (p.reactions_total || 0) + (p.comments_total || 0) }))
      .sort((a, b) => b.interactions - a.interactions)
      .slice(0, 2);
    
    topIgPosts.forEach((post, idx) => {
      const xPos = idx === 0 ? 0.8 : 5.2;
      if (post.thumbnail_url) {
        try {
          slide12.addImage({
            path: post.thumbnail_url,
            x: xPos, y: 1.2, w: 4, h: 3.5,
          });
        } catch {
          slide12.addShape('rect', {
            x: xPos, y: 1.2, w: 4, h: 3.5,
            fill: { color: CONFIG.colors.lightGray },
            line: { color: 'CCCCCC', width: 1 }
          });
        }
      } else {
        slide12.addShape('rect', {
          x: xPos, y: 1.2, w: 4, h: 3.5,
          fill: { color: CONFIG.colors.lightGray },
          line: { color: 'CCCCCC', width: 1 }
        });
      }
    });
    
    addFamefactIcon(slide12, 12);
    
    // ========================================
    // SLIDE 13: Instagram Demographie
    // ========================================
    const slide13 = pptx.addSlide();
    slide13.background = { color: CONFIG.colors.white };
    
    slide13.addText('Instagram', {
      x: 0.5, y: 0.3, w: 9, h: 0.5,
      fontSize: 28, bold: true, color: CONFIG.colors.black
    });
    slide13.addText('Follower (Demographie)', {
      x: 0.5, y: 0.75, w: 9, h: 0.35,
      fontSize: 16, color: CONFIG.colors.gray
    });
    
    slide13.addShape('rect', {
      x: 0.5, y: 1.2, w: 9, h: 3.6,
      fill: { color: CONFIG.colors.lightGray },
      line: { color: 'CCCCCC', width: 1 }
    });
    slide13.addText('Screenshot der Instagram Insights (Demographie) hier einfügen', {
      x: 0.5, y: 2.8, w: 9, h: 0.4,
      fontSize: 12, color: CONFIG.colors.gray, align: 'center'
    });
    
    addFamefactIcon(slide13, 13);
    
    // ========================================
    // SLIDE 14: Zusammenfassung
    // ========================================
    const slide14 = pptx.addSlide();
    slide14.background = { color: CONFIG.colors.white };
    
    slide14.addText('Facebook / Instagram', {
      x: 0.5, y: 0.3, w: 9, h: 0.5,
      fontSize: 28, bold: true, color: CONFIG.colors.black
    });
    slide14.addText('Zusammenfassung', {
      x: 0.5, y: 0.75, w: 9, h: 0.35,
      fontSize: 16, color: CONFIG.colors.gray, italic: true
    });
    
    // Facebook summary
    const fbCurrentKpi = fbKpis[2];
    const fbPrevKpi = fbKpis[1];
    slide14.addText('Facebook:', {
      x: 0.8, y: 1.3, w: 9, h: 0.3,
      fontSize: 12, bold: true, color: CONFIG.colors.black
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
      slide14.addText('●  ' + text, {
        x: 1, y: 1.6 + idx * 0.35, w: 8.5, h: 0.3,
        fontSize: 11, color: CONFIG.colors.black
      });
    });
    
    // Instagram summary
    const igCurrentKpi = igKpis[2];
    const igPrevKpi = igKpis[1];
    slide14.addText('Instagram:', {
      x: 0.8, y: 2.8, w: 9, h: 0.3,
      fontSize: 12, bold: true, color: CONFIG.colors.black
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
      slide14.addText('●  ' + text, {
        x: 1, y: 3.1 + idx * 0.35, w: 8.5, h: 0.3,
        fontSize: 11, color: CONFIG.colors.black
      });
    });
    
    // Gesamtfazit
    slide14.addText('Gesamtfazit ' + getShortMonthName(month) + ':', {
      x: 0.5, y: 4.2, w: 9, h: 0.3,
      fontSize: 11, bold: true, color: CONFIG.colors.black
    });
    slide14.addText(
      `Der ${getShortMonthName(month)} zeigt eine stabile Performance auf beiden Plattformen. ` +
      `Die organische Basis bleibt solide und bietet eine gute Ausgangslage für neue Impulse und Kampagnen.`,
      {
        x: 0.5, y: 4.5, w: 9, h: 0.6,
        fontSize: 10, color: CONFIG.colors.black
      }
    );
    
    addFamefactIcon(slide14, 14);
    
    // ========================================
    // SLIDE 15: Outro (black background)
    // ========================================
    const slide15 = pptx.addSlide();
    slide15.background = { color: CONFIG.colors.black };
    
    // famefact logo (white)
    slide15.addText('famefact.', {
      x: 0.5, y: 0.4, w: 2.5, h: 0.5,
      fontSize: 22, bold: true, color: CONFIG.colors.white, fontFace: 'Arial'
    });
    
    // Contact photo placeholder
    slide15.addShape('rect', {
      x: 0.5, y: 1.2, w: 2.5, h: 2.8,
      fill: { color: '333333' },
      line: { color: '555555', width: 1 }
    });
    slide15.addText('Foto', {
      x: 0.5, y: 2.4, w: 2.5, h: 0.4,
      fontSize: 12, color: CONFIG.colors.gray, align: 'center'
    });
    
    // Contact info
    slide15.addText(CONFIG.contact.name, {
      x: 0.5, y: 4.1, w: 4, h: 0.3,
      fontSize: 14, color: CONFIG.colors.white
    });
    slide15.addText(CONFIG.contact.title, {
      x: 0.5, y: 4.4, w: 4, h: 0.25,
      fontSize: 11, color: CONFIG.colors.white
    });
    
    slide15.addText('famefact', {
      x: 0.5, y: 4.85, w: 4, h: 0.35,
      fontSize: 16, bold: true, color: CONFIG.colors.white
    });
    slide15.addText('FIRST IN SOCIALTAINMENT', {
      x: 0.5, y: 5.15, w: 4, h: 0.25,
      fontSize: 9, color: CONFIG.colors.white, charSpacing: 2
    });
    
    slide15.addText(CONFIG.contact.company, {
      x: 0.5, y: 5.55, w: 4, h: 0.2,
      fontSize: 9, color: CONFIG.colors.white
    });
    slide15.addText(CONFIG.contact.address, {
      x: 0.5, y: 5.75, w: 4, h: 0.2,
      fontSize: 9, color: CONFIG.colors.white
    });
    slide15.addText(CONFIG.contact.city, {
      x: 0.5, y: 5.95, w: 4, h: 0.2,
      fontSize: 9, color: CONFIG.colors.white
    });
    
    slide15.addText('E-Mail: ' + CONFIG.contact.email, {
      x: 0.5, y: 6.3, w: 4, h: 0.2,
      fontSize: 9, color: CONFIG.colors.white
    });
    slide15.addText('Tel.: ' + CONFIG.contact.phone, {
      x: 0.5, y: 6.5, w: 4, h: 0.2,
      fontSize: 9, color: CONFIG.colors.white
    });
    
    // famefact graphic (right side)
    slide15.addShape('rect', {
      x: 7, y: 0.5, w: 2.5, h: 2.5,
      fill: { color: CONFIG.colors.green },
      rotate: 45
    });
    slide15.addShape('rect', {
      x: 7.8, y: 1.5, w: 2, h: 2,
      fill: { color: CONFIG.colors.purple },
      rotate: 45
    });
    
    // Generate file
    const buffer = await pptx.write({ outputType: 'nodebuffer' }) as Buffer;
    
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${CONFIG.customerSlug}_Report_${month}.pptx"`,
      },
    });
    
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json({ error: 'Failed to generate report', details: String(error) }, { status: 500 });
  }
}
