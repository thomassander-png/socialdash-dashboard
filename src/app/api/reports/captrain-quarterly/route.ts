import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import PptxGenJS from 'pptxgenjs';

// Captrain Deutschland specific configuration - Premium Design
const CONFIG = {
  customerName: 'Captrain Deutschland',
  customerSlug: 'captrain-deutschland',
  facebookUrl: 'facebook.com/CaptrainDeutschland',
  instagramHandle: null, // Only Facebook for now
  colors: {
    // Captrain brand colors
    primary: '00A651',      // Captrain Green
    secondary: '003366',    // Dark Blue
    accent: '00A651',       // Green accent
    white: 'FFFFFF',
    black: '000000',
    gray: '666666',
    lightGray: 'F5F5F5',
    darkGray: '333333',
    tableHeader: '00A651',  // Green header for tables
    tableAlt: 'E8F5E9',     // Light green alternating rows
    chartBar1: '00A651',    // Green bars
    chartBar2: '003366',    // Blue bars
  },
  // Contact info for outro slide
  contact: {
    name: 'famefact',
    title: 'Social Media Agentur',
    company: 'track by track GmbH',
    address: 'Schliemannstraße 23',
    city: 'D-10437 Berlin',
    email: 'info@famefact.com',
    phone: '+49 30 12345678',
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
  monthLabel: string;
  posts_count: number;
  total_reactions: number;
  total_comments: number;
  total_shares: number;
  total_reach: number;
  total_impressions: number;
  total_video_views: number;
  avg_reach: number;
  engagement_rate: number;
  followers: number;
  new_followers: number;
}

interface QuarterlyKPI {
  quarter: string;
  quarterLabel: string;
  months: MonthlyKPI[];
  total_posts: number;
  total_reach: number;
  total_impressions: number;
  total_reactions: number;
  total_comments: number;
  total_shares: number;
  avg_reach_per_post: number;
  avg_engagement_rate: number;
}

// Get page IDs for Captrain
async function getPageIds(): Promise<string[]> {
  // First try to find by customer name
  let result = await query<{ account_id: string }>(`
    SELECT ca.account_id 
    FROM customer_accounts ca 
    JOIN customers c ON ca.customer_id = c.customer_id 
    WHERE LOWER(c.name) LIKE '%captrain%'
      AND ca.platform = 'facebook'
  `, []);
  
  if (result.length === 0) {
    // Try to find directly in fb_pages
    result = await query<{ account_id: string }>(`
      SELECT page_id as account_id 
      FROM fb_pages 
      WHERE LOWER(name) LIKE '%captrain%'
    `, []);
  }
  
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

// Get follower data
async function getFollowerData(months: string[], pageIds: string[]): Promise<{month: string, followers: number}[]> {
  if (pageIds.length === 0) return months.map(m => ({ month: m, followers: 0 }));
  
  const placeholders = pageIds.map((_, i) => `$${i + 2}`).join(', ');
  const results: {month: string, followers: number}[] = [];
  
  for (const month of months) {
    try {
      const result = await query<{ followers: string }>(`
        SELECT COALESCE(MAX(followers_count), 0) as followers
        FROM fb_follower_snapshots
        WHERE page_id IN (${placeholders})
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
async function getMonthlyKPIs(months: string[], pageIds: string[]): Promise<MonthlyKPI[]> {
  if (pageIds.length === 0) {
    return months.map(m => ({
      month: m, monthLabel: formatMonthLabel(m), posts_count: 0, total_reactions: 0, total_comments: 0, total_shares: 0,
      total_reach: 0, total_impressions: 0, total_video_views: 0,
      avg_reach: 0, engagement_rate: 0, followers: 0, new_followers: 0
    }));
  }
  
  const followerData = await getFollowerData(months, pageIds);
  const kpis: MonthlyKPI[] = [];
  const placeholders = pageIds.map((_, i) => `$${i + 2}`).join(', ');
  
  for (let idx = 0; idx < months.length; idx++) {
    const month = months[idx];
    const startDate = `${month}-01`;
    
    try {
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
        month, 
        monthLabel: formatMonthLabel(month),
        posts_count: postsCount,
        total_reactions: totalReactions, 
        total_comments: totalComments, 
        total_shares: totalShares,
        total_reach: totalReach, 
        total_impressions: parseInt(d.total_impressions) || 0,
        total_video_views: parseInt(d.total_video_views) || 0,
        avg_reach: postsCount > 0 ? Math.round(totalReach / postsCount) : 0,
        engagement_rate: totalReach > 0 ? ((totalReactions + totalComments + totalShares) / totalReach) * 100 : 0,
        followers, 
        new_followers: followers - prevFollowers
      });
    } catch (error) {
      console.error(`Error fetching KPIs for ${month}:`, error);
      kpis.push({
        month, monthLabel: formatMonthLabel(month), posts_count: 0, total_reactions: 0, total_comments: 0, total_shares: 0,
        total_reach: 0, total_impressions: 0, total_video_views: 0,
        avg_reach: 0, engagement_rate: 0, followers: 0, new_followers: 0
      });
    }
  }
  return kpis;
}

// Format month label
function formatMonthLabel(month: string): string {
  const date = new Date(month + '-01');
  return date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
}

// Get quarter info
function getQuarterInfo(quarter: string, year: number): { months: string[], label: string } {
  const quarters: { [key: string]: { months: number[], label: string } } = {
    'Q1': { months: [1, 2, 3], label: 'Q1 (Januar - März)' },
    'Q2': { months: [4, 5, 6], label: 'Q2 (April - Juni)' },
    'Q3': { months: [7, 8, 9], label: 'Q3 (Juli - September)' },
    'Q4': { months: [10, 11, 12], label: 'Q4 (Oktober - Dezember)' },
  };
  
  const q = quarters[quarter];
  const months = q.months.map(m => `${year}-${String(m).padStart(2, '0')}`);
  return { months, label: `${q.label} ${year}` };
}

// Format number with German locale
function formatNumber(num: number): string {
  return num.toLocaleString('de-DE');
}

// Format percentage
function formatPercent(num: number): string {
  return num.toFixed(2).replace('.', ',') + '%';
}

// Create Premium Title Slide
function createTitleSlide(pptx: PptxGenJS, quarterLabel: string) {
  const slide = pptx.addSlide();
  
  // Premium gradient background
  slide.addShape('rect', {
    x: 0, y: 0, w: '100%', h: '100%',
    fill: { color: CONFIG.colors.secondary }
  });
  
  // Accent bar at top
  slide.addShape('rect', {
    x: 0, y: 0, w: '100%', h: 0.15,
    fill: { color: CONFIG.colors.primary }
  });
  
  // Logo placeholder
  slide.addText('CAPTRAIN', {
    x: 0.5, y: 0.5, w: 3, h: 0.6,
    fontSize: 28, bold: true, color: CONFIG.colors.primary,
    fontFace: 'Arial'
  });
  
  slide.addText('DEUTSCHLAND', {
    x: 0.5, y: 1.0, w: 3, h: 0.4,
    fontSize: 16, color: CONFIG.colors.white,
    fontFace: 'Arial'
  });
  
  // Main title
  slide.addText('SOCIAL MEDIA\nQUARTALSREPORT', {
    x: 0.5, y: 2.5, w: 9, h: 1.5,
    fontSize: 48, bold: true, color: CONFIG.colors.white,
    fontFace: 'Arial', lineSpacing: 55
  });
  
  // Quarter label
  slide.addText(quarterLabel, {
    x: 0.5, y: 4.2, w: 9, h: 0.6,
    fontSize: 28, color: CONFIG.colors.primary,
    fontFace: 'Arial'
  });
  
  // Decorative line
  slide.addShape('rect', {
    x: 0.5, y: 4.9, w: 2, h: 0.05,
    fill: { color: CONFIG.colors.primary }
  });
  
  // Footer
  slide.addText('Erstellt von famefact | Social Media Agentur', {
    x: 0.5, y: 5.1, w: 9, h: 0.3,
    fontSize: 12, color: CONFIG.colors.gray,
    fontFace: 'Arial'
  });
}

// Create Executive Summary Slide
function createExecutiveSummary(pptx: PptxGenJS, quarterlyKPI: QuarterlyKPI) {
  const slide = pptx.addSlide();
  
  // White background
  slide.addShape('rect', {
    x: 0, y: 0, w: '100%', h: '100%',
    fill: { color: CONFIG.colors.white }
  });
  
  // Header bar
  slide.addShape('rect', {
    x: 0, y: 0, w: '100%', h: 0.8,
    fill: { color: CONFIG.colors.secondary }
  });
  
  slide.addText('EXECUTIVE SUMMARY', {
    x: 0.5, y: 0.2, w: 9, h: 0.5,
    fontSize: 24, bold: true, color: CONFIG.colors.white,
    fontFace: 'Arial'
  });
  
  // KPI Cards
  const kpiCards = [
    { label: 'Gesamtreichweite', value: formatNumber(quarterlyKPI.total_reach), icon: '👁️' },
    { label: 'Beiträge', value: formatNumber(quarterlyKPI.total_posts), icon: '📝' },
    { label: 'Interaktionen', value: formatNumber(quarterlyKPI.total_reactions + quarterlyKPI.total_comments + quarterlyKPI.total_shares), icon: '💬' },
    { label: 'Ø Reichweite/Post', value: formatNumber(quarterlyKPI.avg_reach_per_post), icon: '📊' },
  ];
  
  kpiCards.forEach((kpi, i) => {
    const x = 0.5 + (i % 2) * 4.5;
    const y = 1.2 + Math.floor(i / 2) * 1.5;
    
    // Card background
    slide.addShape('rect', {
      x, y, w: 4, h: 1.3,
      fill: { color: CONFIG.colors.lightGray },
      line: { color: CONFIG.colors.primary, width: 2 }
    });
    
    // Icon
    slide.addText(kpi.icon, {
      x: x + 0.2, y: y + 0.2, w: 0.6, h: 0.6,
      fontSize: 28
    });
    
    // Value
    slide.addText(kpi.value, {
      x: x + 0.8, y: y + 0.15, w: 3, h: 0.6,
      fontSize: 28, bold: true, color: CONFIG.colors.primary,
      fontFace: 'Arial'
    });
    
    // Label
    slide.addText(kpi.label, {
      x: x + 0.8, y: y + 0.75, w: 3, h: 0.4,
      fontSize: 14, color: CONFIG.colors.gray,
      fontFace: 'Arial'
    });
  });
  
  // Engagement Rate highlight
  slide.addShape('rect', {
    x: 0.5, y: 4.4, w: 9, h: 0.8,
    fill: { color: CONFIG.colors.primary }
  });
  
  slide.addText(`Durchschnittliche Engagement-Rate: ${formatPercent(quarterlyKPI.avg_engagement_rate)}`, {
    x: 0.5, y: 4.5, w: 9, h: 0.6,
    fontSize: 20, bold: true, color: CONFIG.colors.white,
    fontFace: 'Arial', align: 'center'
  });
}

// Create Monthly Overview Slide
function createMonthlyOverview(pptx: PptxGenJS, monthlyKPIs: MonthlyKPI[]) {
  const slide = pptx.addSlide();
  
  // White background
  slide.addShape('rect', {
    x: 0, y: 0, w: '100%', h: '100%',
    fill: { color: CONFIG.colors.white }
  });
  
  // Header bar
  slide.addShape('rect', {
    x: 0, y: 0, w: '100%', h: 0.8,
    fill: { color: CONFIG.colors.secondary }
  });
  
  slide.addText('MONATLICHE ÜBERSICHT', {
    x: 0.5, y: 0.2, w: 9, h: 0.5,
    fontSize: 24, bold: true, color: CONFIG.colors.white,
    fontFace: 'Arial'
  });
  
  // KPI Table
  const tableData: PptxGenJS.TableRow[] = [
    [
      { text: 'KPI', options: { bold: true, fill: { color: CONFIG.colors.primary }, color: CONFIG.colors.white } },
      ...monthlyKPIs.map(m => ({ 
        text: m.monthLabel.split(' ')[0], 
        options: { bold: true, fill: { color: CONFIG.colors.primary }, color: CONFIG.colors.white } 
      }))
    ],
    [
      { text: 'Beiträge', options: { fill: { color: CONFIG.colors.lightGray } } },
      ...monthlyKPIs.map(m => ({ text: formatNumber(m.posts_count), options: { fill: { color: CONFIG.colors.lightGray } } }))
    ],
    [
      { text: 'Reichweite', options: {} },
      ...monthlyKPIs.map(m => ({ text: formatNumber(m.total_reach), options: {} }))
    ],
    [
      { text: 'Ø Reichweite/Post', options: { fill: { color: CONFIG.colors.lightGray } } },
      ...monthlyKPIs.map(m => ({ text: formatNumber(m.avg_reach), options: { fill: { color: CONFIG.colors.lightGray } } }))
    ],
    [
      { text: 'Reaktionen', options: {} },
      ...monthlyKPIs.map(m => ({ text: formatNumber(m.total_reactions), options: {} }))
    ],
    [
      { text: 'Kommentare', options: { fill: { color: CONFIG.colors.lightGray } } },
      ...monthlyKPIs.map(m => ({ text: formatNumber(m.total_comments), options: { fill: { color: CONFIG.colors.lightGray } } }))
    ],
    [
      { text: 'Shares', options: {} },
      ...monthlyKPIs.map(m => ({ text: formatNumber(m.total_shares), options: {} }))
    ],
    [
      { text: 'Engagement-Rate', options: { fill: { color: CONFIG.colors.lightGray } } },
      ...monthlyKPIs.map(m => ({ text: formatPercent(m.engagement_rate), options: { fill: { color: CONFIG.colors.lightGray } } }))
    ],
  ];
  
  slide.addTable(tableData, {
    x: 0.5, y: 1.1, w: 9, h: 3,
    fontFace: 'Arial',
    fontSize: 11,
    color: CONFIG.colors.darkGray,
    border: { type: 'solid', color: CONFIG.colors.gray, pt: 0.5 },
    align: 'center',
    valign: 'middle'
  });
  
  // Bar chart for reach comparison
  const chartData = [{
    name: 'Reichweite',
    labels: monthlyKPIs.map(m => m.monthLabel.split(' ')[0]),
    values: monthlyKPIs.map(m => m.total_reach)
  }];
  
  slide.addChart('bar', chartData, {
    x: 0.5, y: 4.3, w: 9, h: 2,
    chartColors: [CONFIG.colors.primary],
    showValue: true,
    dataLabelPosition: 'outEnd',
    dataLabelFontSize: 10,
    dataLabelColor: CONFIG.colors.darkGray,
    catAxisTitle: '',
    valAxisTitle: '',
    showLegend: false
  });
}

// Create Top Posts Slide
function createTopPostsSlide(pptx: PptxGenJS, posts: PostData[], monthLabel: string) {
  const slide = pptx.addSlide();
  
  // White background
  slide.addShape('rect', {
    x: 0, y: 0, w: '100%', h: '100%',
    fill: { color: CONFIG.colors.white }
  });
  
  // Header bar
  slide.addShape('rect', {
    x: 0, y: 0, w: '100%', h: 0.8,
    fill: { color: CONFIG.colors.secondary }
  });
  
  slide.addText(`TOP BEITRÄGE - ${monthLabel.toUpperCase()}`, {
    x: 0.5, y: 0.2, w: 9, h: 0.5,
    fontSize: 24, bold: true, color: CONFIG.colors.white,
    fontFace: 'Arial'
  });
  
  // Sort by engagement
  const topPosts = posts
    .sort((a, b) => (b.reactions_total + b.comments_total) - (a.reactions_total + a.comments_total))
    .slice(0, 3);
  
  topPosts.forEach((post, i) => {
    const y = 1.1 + i * 1.6;
    
    // Post card
    slide.addShape('rect', {
      x: 0.5, y, w: 9, h: 1.4,
      fill: { color: i % 2 === 0 ? CONFIG.colors.lightGray : CONFIG.colors.white },
      line: { color: CONFIG.colors.primary, width: 1 }
    });
    
    // Rank badge
    slide.addShape('rect', {
      x: 0.6, y: y + 0.1, w: 0.5, h: 0.5,
      fill: { color: CONFIG.colors.primary }
    });
    slide.addText(`${i + 1}`, {
      x: 0.6, y: y + 0.1, w: 0.5, h: 0.5,
      fontSize: 18, bold: true, color: CONFIG.colors.white,
      fontFace: 'Arial', align: 'center', valign: 'middle'
    });
    
    // Post text
    const messagePreview = (post.message || 'Kein Text').substring(0, 120) + (post.message && post.message.length > 120 ? '...' : '');
    slide.addText(messagePreview, {
      x: 1.3, y: y + 0.1, w: 5.5, h: 0.8,
      fontSize: 10, color: CONFIG.colors.darkGray,
      fontFace: 'Arial', valign: 'top'
    });
    
    // Metrics
    const metrics = [
      { label: 'Reichweite', value: formatNumber(post.reach || 0) },
      { label: 'Reaktionen', value: formatNumber(post.reactions_total) },
      { label: 'Kommentare', value: formatNumber(post.comments_total) },
    ];
    
    metrics.forEach((metric, j) => {
      slide.addText(metric.label, {
        x: 7 + j * 1, y: y + 0.2, w: 0.9, h: 0.3,
        fontSize: 8, color: CONFIG.colors.gray,
        fontFace: 'Arial', align: 'center'
      });
      slide.addText(metric.value, {
        x: 7 + j * 1, y: y + 0.5, w: 0.9, h: 0.4,
        fontSize: 12, bold: true, color: CONFIG.colors.primary,
        fontFace: 'Arial', align: 'center'
      });
    });
    
    // Date
    const postDate = new Date(post.created_time);
    slide.addText(postDate.toLocaleDateString('de-DE'), {
      x: 1.3, y: y + 0.95, w: 2, h: 0.3,
      fontSize: 9, color: CONFIG.colors.gray,
      fontFace: 'Arial'
    });
  });
}

// Create Conclusion Slide
function createConclusionSlide(pptx: PptxGenJS, quarterlyKPI: QuarterlyKPI) {
  const slide = pptx.addSlide();
  
  // Gradient background
  slide.addShape('rect', {
    x: 0, y: 0, w: '100%', h: '100%',
    fill: { color: CONFIG.colors.secondary }
  });
  
  // Accent bar
  slide.addShape('rect', {
    x: 0, y: 0, w: '100%', h: 0.15,
    fill: { color: CONFIG.colors.primary }
  });
  
  slide.addText('FAZIT & AUSBLICK', {
    x: 0.5, y: 0.5, w: 9, h: 0.6,
    fontSize: 32, bold: true, color: CONFIG.colors.white,
    fontFace: 'Arial'
  });
  
  // Summary points
  const summaryPoints = [
    `✓ ${formatNumber(quarterlyKPI.total_posts)} Beiträge im Quartal veröffentlicht`,
    `✓ ${formatNumber(quarterlyKPI.total_reach)} Gesamtreichweite erzielt`,
    `✓ ${formatPercent(quarterlyKPI.avg_engagement_rate)} durchschnittliche Engagement-Rate`,
    `✓ ${formatNumber(quarterlyKPI.total_reactions + quarterlyKPI.total_comments)} Interaktionen generiert`,
  ];
  
  summaryPoints.forEach((point, i) => {
    slide.addText(point, {
      x: 0.5, y: 1.4 + i * 0.5, w: 9, h: 0.4,
      fontSize: 16, color: CONFIG.colors.white,
      fontFace: 'Arial'
    });
  });
  
  // Recommendations box
  slide.addShape('rect', {
    x: 0.5, y: 3.8, w: 9, h: 1.5,
    fill: { color: CONFIG.colors.primary }
  });
  
  slide.addText('EMPFEHLUNGEN FÜR DAS NÄCHSTE QUARTAL', {
    x: 0.7, y: 3.9, w: 8.6, h: 0.4,
    fontSize: 14, bold: true, color: CONFIG.colors.white,
    fontFace: 'Arial'
  });
  
  slide.addText('• Weiterhin regelmäßige Posting-Frequenz beibehalten\n• Video-Content für höhere Engagement-Raten testen\n• Community-Interaktion durch Fragen und Umfragen steigern', {
    x: 0.7, y: 4.3, w: 8.6, h: 0.9,
    fontSize: 11, color: CONFIG.colors.white,
    fontFace: 'Arial'
  });
}

// Create Contact Slide
function createContactSlide(pptx: PptxGenJS) {
  const slide = pptx.addSlide();
  
  // White background
  slide.addShape('rect', {
    x: 0, y: 0, w: '100%', h: '100%',
    fill: { color: CONFIG.colors.white }
  });
  
  // Header bar
  slide.addShape('rect', {
    x: 0, y: 0, w: '100%', h: 1.5,
    fill: { color: CONFIG.colors.secondary }
  });
  
  slide.addText('VIELEN DANK!', {
    x: 0.5, y: 0.4, w: 9, h: 0.7,
    fontSize: 36, bold: true, color: CONFIG.colors.white,
    fontFace: 'Arial', align: 'center'
  });
  
  // Contact info
  slide.addText('Ihr Ansprechpartner', {
    x: 0.5, y: 2, w: 9, h: 0.5,
    fontSize: 18, bold: true, color: CONFIG.colors.primary,
    fontFace: 'Arial', align: 'center'
  });
  
  slide.addText(`${CONFIG.contact.company}\n${CONFIG.contact.address}\n${CONFIG.contact.city}`, {
    x: 0.5, y: 2.7, w: 9, h: 1,
    fontSize: 14, color: CONFIG.colors.darkGray,
    fontFace: 'Arial', align: 'center'
  });
  
  slide.addText(`${CONFIG.contact.email}`, {
    x: 0.5, y: 3.9, w: 9, h: 0.4,
    fontSize: 14, color: CONFIG.colors.primary,
    fontFace: 'Arial', align: 'center'
  });
  
  // famefact branding
  slide.addShape('rect', {
    x: 3.5, y: 4.8, w: 3, h: 0.6,
    fill: { color: CONFIG.colors.primary }
  });
  
  slide.addText('famefact', {
    x: 3.5, y: 4.8, w: 3, h: 0.6,
    fontSize: 20, bold: true, color: CONFIG.colors.white,
    fontFace: 'Arial', align: 'center', valign: 'middle'
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const quarter = searchParams.get('quarter') || 'Q4';
    const year = parseInt(searchParams.get('year') || '2025');
    
    // Get quarter months
    const quarterInfo = getQuarterInfo(quarter, year);
    const quarterLabel = quarterInfo.label;
    
    // Get page IDs
    const pageIds = await getPageIds();
    console.log('Captrain Page IDs found:', pageIds);
    
    // Get monthly KPIs
    const monthlyKPIs = await getMonthlyKPIs(quarterInfo.months, pageIds);
    
    // Calculate quarterly totals
    const quarterlyKPI: QuarterlyKPI = {
      quarter,
      quarterLabel,
      months: monthlyKPIs,
      total_posts: monthlyKPIs.reduce((sum, m) => sum + m.posts_count, 0),
      total_reach: monthlyKPIs.reduce((sum, m) => sum + m.total_reach, 0),
      total_impressions: monthlyKPIs.reduce((sum, m) => sum + m.total_impressions, 0),
      total_reactions: monthlyKPIs.reduce((sum, m) => sum + m.total_reactions, 0),
      total_comments: monthlyKPIs.reduce((sum, m) => sum + m.total_comments, 0),
      total_shares: monthlyKPIs.reduce((sum, m) => sum + m.total_shares, 0),
      avg_reach_per_post: 0,
      avg_engagement_rate: 0,
    };
    
    quarterlyKPI.avg_reach_per_post = quarterlyKPI.total_posts > 0 
      ? Math.round(quarterlyKPI.total_reach / quarterlyKPI.total_posts) 
      : 0;
    
    quarterlyKPI.avg_engagement_rate = quarterlyKPI.total_reach > 0
      ? ((quarterlyKPI.total_reactions + quarterlyKPI.total_comments + quarterlyKPI.total_shares) / quarterlyKPI.total_reach) * 100
      : 0;
    
    // Get posts for each month
    const allPosts: { [month: string]: PostData[] } = {};
    for (const month of quarterInfo.months) {
      allPosts[month] = await getFacebookPosts(month, pageIds);
    }
    
    // Create PowerPoint
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_16x9';
    pptx.title = `Captrain Deutschland - Quartalsreport ${quarterLabel}`;
    pptx.author = 'famefact';
    
    // Create slides
    createTitleSlide(pptx, quarterLabel);
    createExecutiveSummary(pptx, quarterlyKPI);
    createMonthlyOverview(pptx, monthlyKPIs);
    
    // Top posts for each month
    for (const month of quarterInfo.months) {
      if (allPosts[month] && allPosts[month].length > 0) {
        createTopPostsSlide(pptx, allPosts[month], formatMonthLabel(month));
      }
    }
    
    createConclusionSlide(pptx, quarterlyKPI);
    createContactSlide(pptx);
    
    // Generate file
    const buffer = await pptx.write({ outputType: 'nodebuffer' }) as Buffer;
    
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="Captrain_Quarterly_Report_${quarter}_${year}.pptx"`,
      },
    });
    
  } catch (error) {
    console.error('Error generating Captrain quarterly report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
