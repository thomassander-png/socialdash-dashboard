import PptxGenJS from 'pptxgenjs';
import { DESIGN, AGENCY, CustomerData, MonthlyKPI } from './types';

// ============================================
// IMAGE FETCHING (Base64 for Vercel Serverless)
// ============================================

/**
 * Fetch an image URL and return as base64 data URI.
 * PptxGenJS needs `data` (base64) instead of `path` (URL) on Vercel Serverless
 * because serverless functions can't always resolve external URLs.
 */
export async function fetchImageAsBase64(url: string): Promise<string | null> {
  if (!url) return null;
  try {
    // Follow redirects, set a reasonable timeout
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SocialDash/1.0)' }
    });
    if (!response.ok) {
      console.warn(`[Report] Image fetch failed with status ${response.status}: ${url}`);
      return null;
    }
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    // Reject non-image responses (e.g. HTML error pages)
    if (!contentType.startsWith('image/')) {
      console.warn(`[Report] Non-image content-type (${contentType}): ${url}`);
      return null;
    }
    const buffer = await response.arrayBuffer();
    // Reject tiny responses (< 1KB) - likely error pages or empty placeholders
    if (buffer.byteLength < 1000) {
      console.warn(`[Report] Image too small (${buffer.byteLength} bytes), likely invalid: ${url}`);
      return null;
    }
    const base64 = Buffer.from(buffer).toString('base64');
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.warn(`[Report] Failed to fetch image: ${url}`, error);
    return null;
  }
}

/**
 * Pre-fetch multiple images in parallel.
 * Returns a Map of URL -> base64 data URI.
 */
export async function prefetchImages(urls: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const validUrls = urls.filter(u => u && u.startsWith('http'));
  if (validUrls.length === 0) return map;
  
  const results = await Promise.allSettled(
    validUrls.map(async (url) => {
      const data = await fetchImageAsBase64(url);
      return { url, data };
    })
  );
  
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.data) {
      map.set(result.value.url, result.value.data);
    }
  }
  
  return map;
}

// ============================================
// SHARED HELPER FUNCTIONS
// Used by all slide modules
// ============================================

// Format number with German locale (1.234)
export function formatNumber(num: number): string {
  if (num === null || num === undefined || isNaN(num)) return '0';
  return Math.round(num).toLocaleString('de-DE');
}

// Format currency (€1.234,56)
export function formatCurrency(num: number): string {
  if (num === null || num === undefined || isNaN(num)) return '0,00 €';
  return num.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' €';
}

// Format date (DD.MM.)
export function formatDate(date: Date): string {
  const d = new Date(date);
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.`;
}

// Get full month name (Januar 2026)
export function getMonthName(month: string): string {
  const [year, monthNum] = month.split('-');
  const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
                  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  return `${months[parseInt(monthNum) - 1]} ${year}`;
}

// Get short month name (Januar)
export function getShortMonthName(month: string): string {
  const [, monthNum] = month.split('-');
  const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
                  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  return months[parseInt(monthNum) - 1];
}

// Get trend color
export function getTrendColor(currentValue: number, previousValue: number): string {
  if (previousValue === 0) return DESIGN.colors.gray;
  const change = ((currentValue - previousValue) / previousValue) * 100;
  if (change >= 5) return DESIGN.colors.trendUp;
  if (change <= -5) return DESIGN.colors.trendDown;
  return DESIGN.colors.trendNeutral;
}

// Get trend text with color and percentage
export function getTrendText(currentValue: number, previousValue: number): { text: string; color: string; percentage: number } {
  if (previousValue === 0) return { text: '—', color: DESIGN.colors.gray, percentage: 0 };
  const change = ((currentValue - previousValue) / previousValue) * 100;
  const text = (change >= 0 ? '+' : '') + change.toFixed(1).replace('.', ',') + '%';
  return { text, color: getTrendColor(currentValue, previousValue), percentage: change };
}

// Sanitize filename
export function sanitizeFilename(name: string): string {
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
export function addBrandingLine(slide: PptxGenJS.Slide, color: string) {
  slide.addShape('rect', {
    x: 0, y: 0, w: '100%', h: 0.06,
    fill: { color: color }
  });
}

// Add subtle watermark
export function addSubtleWatermark(slide: PptxGenJS.Slide, secondaryColor: string) {
  slide.addShape('rect', {
    x: 9.2, y: 0, w: 0.8, h: 0.06,
    fill: { color: secondaryColor, transparency: 70 }
  });
}

// Add famefact icon and page number
export function addFamefactIcon(slide: PptxGenJS.Slide, pageNum: number, primaryColor: string) {
  slide.addShape('hexagon', {
    x: DESIGN.margin, y: 4.95, w: 0.3, h: 0.3,
    fill: { color: primaryColor },
  });
  slide.addText(pageNum.toString().padStart(2, '0'), {
    x: 9.5 - DESIGN.margin, y: 5.1, w: 0.5, h: 0.3,
    fontSize: 10, color: DESIGN.colors.mediumGray, align: 'right', fontFace: DESIGN.fontFamily
  });
}

// Draw user icon
export function drawUserIcon(slide: PptxGenJS.Slide, x: number, y: number, size: number, color: string) {
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

// Draw eye icon
export function drawEyeIcon(slide: PptxGenJS.Slide, x: number, y: number, size: number, color: string) {
  slide.addShape('ellipse', {
    x: x, y: y + size * 0.25, w: size, h: size * 0.5,
    line: { color: color, width: 2 }
  });
  slide.addShape('ellipse', {
    x: x + size * 0.35, y: y + size * 0.35, w: size * 0.3, h: size * 0.3,
    fill: { color: color }
  });
}

// Draw chat icon
export function drawChatIcon(slide: PptxGenJS.Slide, x: number, y: number, size: number, color: string) {
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
export function addCustomerLogo(slide: PptxGenJS.Slide, customer: CustomerData, x: number, y: number, maxW: number, maxH: number, imageCache?: Map<string, string>) {
  if (customer.logo_url) {
    const logoData = imageCache?.get(customer.logo_url);
    try {
      const imgOpts: any = {
        x: x, y: y, w: maxW, h: maxH,
        sizing: { type: 'contain', w: maxW, h: maxH }
      };
      if (logoData) {
        imgOpts.data = logoData;
      } else {
        imgOpts.path = customer.logo_url;
      }
      slide.addImage(imgOpts);
    } catch {
      slide.addText(customer.name, {
        x: x, y: y, w: maxW, h: maxH,
        fontSize: 14, bold: true, color: DESIGN.colors.darkGray,
        fontFace: DESIGN.fontFamily, align: 'right', valign: 'middle'
      });
    }
  } else {
    slide.addText(customer.name, {
      x: x, y: y, w: maxW, h: maxH,
      fontSize: 14, bold: true, color: DESIGN.colors.darkGray,
      fontFace: DESIGN.fontFamily, align: 'right', valign: 'middle'
    });
  }
}

// Add standard slide header (platform name + subtitle)
export function addSlideHeader(
  slide: PptxGenJS.Slide,
  customer: CustomerData,
  primaryColor: string,
  secondaryColor: string,
  title: string,
  subtitle: string,
  imageCache?: Map<string, string>
) {
  slide.background = { color: DESIGN.colors.background };
  addBrandingLine(slide, primaryColor);
  addSubtleWatermark(slide, secondaryColor);
  addCustomerLogo(slide, customer, 7.5, 0.15, 2, 0.5, imageCache);
  
  slide.addText(title, {
    x: DESIGN.margin, y: 0.2, w: 7, h: 0.45,
    fontSize: 26, bold: true, color: DESIGN.colors.black, fontFace: DESIGN.fontFamily
  });
  slide.addText(subtitle, {
    x: DESIGN.margin, y: 0.6, w: 7, h: 0.3,
    fontSize: 14, color: DESIGN.colors.mediumGray, fontFace: DESIGN.fontFamily
  });
}

// Create Premium KPI Table (3-month comparison)
export function createPremiumKPITable(
  slide: PptxGenJS.Slide,
  kpis: MonthlyKPI[],
  startY: number,
  platform: 'facebook' | 'instagram',
  primaryColor: string,
  secondaryColor: string
): void {
  // Reverse KPIs: aktueller Monat links, ältester rechts
  const reversedKpis = [...kpis].reverse();
  const tableX = DESIGN.margin;
  const tableW = 10 - (DESIGN.margin * 2);
  const colW = [2.8, 2.1, 2.1, 2.2];
  const rowH = 0.38;
  const headerH = 0.48;
  const headerColor = platform === 'facebook' ? primaryColor : secondaryColor;

  // Shadow
  slide.addShape('roundRect', {
    x: tableX + 0.04, y: startY + 0.04, w: tableW, h: headerH + rowH * 8 + 0.1,
    fill: { color: DESIGN.colors.shadow },
    rectRadius: 0.1
  });
  // Table background
  slide.addShape('roundRect', {
    x: tableX, y: startY, w: tableW, h: headerH + rowH * 8 + 0.1,
    fill: { color: DESIGN.colors.white },
    line: { color: 'E8E8E8', width: 0.5 },
    rectRadius: 0.1
  });

  // Header row
  slide.addShape('roundRect', {
    x: tableX, y: startY, w: tableW, h: headerH,
    fill: { color: headerColor },
    rectRadius: 0.1
  });
  // Fix bottom corners
  slide.addShape('rect', {
    x: tableX, y: startY + headerH - 0.1, w: tableW, h: 0.1,
    fill: { color: headerColor }
  });

  const headers = ['Kennzahl', ...reversedKpis.map(k => getShortMonthName(k.month))];
  let hdrX = tableX;
  headers.forEach((h, i) => {
    slide.addText(h, {
      x: hdrX + 0.15, y: startY, w: colW[i] - 0.3, h: headerH,
      fontSize: 11, bold: true, color: DESIGN.colors.white,
      fontFace: DESIGN.fontFamily, align: i === 0 ? 'left' : 'center', valign: 'middle'
    });
    hdrX += colW[i];
  });

  // KPI rows
  const kpiRows = [
    { label: 'Beiträge', values: reversedKpis.map(k => formatNumber(k.posts_count)) },
    { label: 'Reichweite Gesamt', values: reversedKpis.map(k => formatNumber(k.total_reach)) },
    { label: 'Impressionen', values: reversedKpis.map(k => formatNumber(k.total_impressions)) },
    { label: 'Reaktionen', values: reversedKpis.map(k => formatNumber(k.total_reactions)) },
    { label: 'Kommentare', values: reversedKpis.map(k => formatNumber(k.total_comments)) },
    { label: platform === 'facebook' ? 'Shares' : 'Saves', values: reversedKpis.map(k => formatNumber(platform === 'facebook' ? k.total_shares : k.total_saves)) },
    { label: 'Engagement-Rate', values: reversedKpis.map(k => k.engagement_rate.toFixed(2).replace('.', ',') + '%') },
    { label: 'Follower', values: reversedKpis.map(k => formatNumber(k.followers)) },
  ];

  let rowY = startY + headerH + 0.05;
  kpiRows.forEach((row, idx) => {
    const isAlt = idx % 2 === 0;
    if (isAlt) {
      slide.addShape('rect', {
        x: tableX + 0.05, y: rowY, w: tableW - 0.1, h: rowH,
        fill: { color: DESIGN.colors.lightGray }
      });
    }

    let cellX = tableX;
    // Label
    slide.addText(row.label, {
      x: cellX + 0.15, y: rowY, w: colW[0] - 0.3, h: rowH,
      fontSize: 10, bold: true, color: DESIGN.colors.darkGray,
      fontFace: DESIGN.fontFamily, valign: 'middle'
    });
    cellX += colW[0];

    // Values
    row.values.forEach((val, i) => {
      const isCurrentMonth = i === 0; // Aktueller Monat ist jetzt der erste (links)
      slide.addText(val, {
        x: cellX + 0.1, y: rowY, w: colW[i + 1] - 0.2, h: rowH,
        fontSize: 10, color: isCurrentMonth ? DESIGN.colors.black : DESIGN.colors.mediumGray,
        fontFace: DESIGN.fontFamily, align: 'center', valign: 'middle',
        bold: isCurrentMonth
      });
      cellX += colW[i + 1];
    });

    rowY += rowH;
  });
}

// Get campaign metric helper
export function getCampaignMetric(campaign: any, metric: string): number {
  if (!campaign) return 0;
  // Check insights array first (Graph API format)
  if (campaign.insights?.data?.[0]) {
    const insights = campaign.insights.data[0];
    if (metric === 'spend') return parseFloat(insights.spend || '0');
    if (metric === 'impressions') return parseInt(insights.impressions || '0');
    if (metric === 'reach') return parseInt(insights.reach || '0');
    if (metric === 'clicks') return parseInt(insights.clicks || '0');
    if (metric === 'cpc') return parseFloat(insights.cpc || '0');
    if (metric === 'cpm') return parseFloat(insights.cpm || '0');
    if (metric === 'ctr') return parseFloat(insights.ctr || '0');
    if (metric === 'frequency') return parseFloat(insights.frequency || '0');
    // Action metrics
    if (metric === 'post_engagement' || metric === 'video_views' || metric === 'link_clicks') {
      const actions = insights.actions || [];
      const action = actions.find((a: any) => a.action_type === metric);
      return action ? parseInt(action.value || '0') : 0;
    }
  }
  // Check insight object (singular - our ads_cache format)
  if (campaign.insight && typeof campaign.insight === 'object') {
    const ins = campaign.insight;
    if (ins[metric] !== undefined && ins[metric] !== null) {
      return parseFloat(ins[metric]) || 0;
    }
  }
  // Direct properties
  if (campaign[metric] !== undefined) return parseFloat(campaign[metric] || '0');
  return 0;
}
