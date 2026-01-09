/**
 * PREMIUM REPORT GENERATOR V2
 * 
 * Spitzenklasse-Design für C-Level Kunden
 * - Echte Kundenlogos
 * - Kundenspezifische Farben
 * - Alle KPIs (Facebook + Instagram)
 * - 16:9 Format (1920x1080)
 * - WOW-Effekt
 */

import PptxGenJS from 'pptxgenjs';

// Slide dimensions (16:9)
const SLIDE_WIDTH = 13.333;
const SLIDE_HEIGHT = 7.5;

// Design constants
const FONTS = {
  heading: 'Arial',
  body: 'Arial',
};

// Default colors (will be overridden by customer colors)
const DEFAULT_COLORS = {
  primary: '#1E3A8A',
  secondary: '#3B82F6',
  accent: '#60A5FA',
  white: '#FFFFFF',
  black: '#0D0D0D',
  gray900: '#111827',
  gray800: '#1F2937',
  gray700: '#374151',
  gray600: '#4B5563',
  gray500: '#6B7280',
  gray400: '#9CA3AF',
  gray300: '#D1D5DB',
  gray200: '#E5E7EB',
  gray100: '#F3F4F6',
  gray50: '#F9FAFB',
  facebook: '#1877F2',
  instagram: '#E4405F',
  famefactGreen: '#84CC16',
};

// KPI Definitions
interface FacebookKPIs {
  month: string;
  followerTotal: number;
  followerGrowth: number;
  reachTotal: number;
  reachOrganic: number;
  reachPaid: number;
  avgReachPerPost: number;
  interactions: number;
  reactions: number;
  comments: number;
  shares: number;
  videoViews3s: number;
  interactionRate: number;
  postCount: number;
  ppaSpend?: number;
}

interface InstagramKPIs {
  month: string;
  followerTotal: number;
  followerGrowth: number;
  reachTotal: number;
  reachOrganic: number;
  reachPaid: number;
  avgReachPerPost: number;
  interactions: number;
  likes: number;
  comments: number;
  saves: number;
  videoViews: number;
  views3sPaid: number;
  interactionRate: number;
  postCount: number;
  ppaSpend?: number;
}

interface PostData {
  id: string;
  date: string;
  imageUrl?: string;
  reach: number;
  interactions: number;
  saves?: number;
  videoViews?: number;
  type: 'image' | 'video' | 'carousel' | 'reel';
}

interface CustomerData {
  name: string;
  slug: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
}

interface ReportData {
  customer: CustomerData;
  month: string;
  facebook?: {
    kpis: FacebookKPIs[];
    posts: PostData[];
    videos: PostData[];
  };
  instagram?: {
    kpis: InstagramKPIs[];
    posts: PostData[];
    reels: PostData[];
  };
}

// Helper functions
function formatNumber(num: number): string {
  return num.toLocaleString('de-DE');
}

function formatPercent(num: number): string {
  return num.toFixed(2).replace('.', ',') + '%';
}

function formatMonthName(month: string): string {
  const date = new Date(`${month}-01`);
  return date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
}

function formatShortMonth(month: string): string {
  const date = new Date(`${month}-01`);
  return date.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' });
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

function lightenColor(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  const r = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * percent));
  const g = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * percent));
  const b = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * percent));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Main export function
export async function generatePremiumReportV2(data: ReportData): Promise<Buffer> {
  const pptx = new PptxGenJS();
  
  // Set presentation properties
  pptx.author = 'famefact GmbH';
  pptx.title = `${data.customer.name} - Social Media Report ${formatMonthName(data.month)}`;
  pptx.subject = 'Social Media Reporting';
  pptx.company = 'famefact GmbH';
  
  // Set slide size to 16:9
  pptx.defineLayout({ name: 'LAYOUT_16x9', width: SLIDE_WIDTH, height: SLIDE_HEIGHT });
  pptx.layout = 'LAYOUT_16x9';
  
  // Customer colors
  const colors = {
    ...DEFAULT_COLORS,
    primary: data.customer.primaryColor || DEFAULT_COLORS.primary,
    secondary: data.customer.secondaryColor || DEFAULT_COLORS.secondary,
  };
  
  // Create slides
  await createCoverSlide(pptx, data, colors);
  
  if (data.facebook) {
    createSeparatorSlide(pptx, 'Facebook', colors.facebook, '📘');
    await createFacebookKPISlide(pptx, data, colors);
    await createFacebookPostsSlide(pptx, data, colors);
    await createFacebookVideosSlide(pptx, data, colors);
  }
  
  if (data.instagram) {
    createSeparatorSlide(pptx, 'Instagram', colors.instagram, '📸');
    await createInstagramKPISlide(pptx, data, colors);
    await createInstagramPostsSlide(pptx, data, colors);
    await createInstagramImagesTableSlide(pptx, data, colors);
    await createInstagramReelsSlide(pptx, data, colors);
    await createInstagramReelsTableSlide(pptx, data, colors);
  }
  
  createFazitSlide(pptx, data, colors);
  createFamefactSlide(pptx, colors);
  
  // Generate buffer
  const buffer = await pptx.write({ outputType: 'nodebuffer' });
  return buffer as Buffer;
}

// ============ SLIDE CREATORS ============

async function createCoverSlide(pptx: PptxGenJS, data: ReportData, colors: typeof DEFAULT_COLORS) {
  const slide = pptx.addSlide();
  
  // Dark gradient background
  slide.background = { color: colors.black };
  
  // Accent bar at top
  slide.addShape('rect', {
    x: 0,
    y: 0,
    w: SLIDE_WIDTH,
    h: 0.15,
    fill: { color: colors.primary },
  });
  
  // Customer logo placeholder (if available)
  if (data.customer.logoUrl) {
    try {
      slide.addImage({
        path: data.customer.logoUrl,
        x: SLIDE_WIDTH / 2 - 2,
        y: 1.5,
        w: 4,
        h: 1.5,
        sizing: { type: 'contain', w: 4, h: 1.5 },
      });
    } catch {
      // Fallback to text if logo fails
      slide.addText(data.customer.name, {
        x: 0.5,
        y: 2,
        w: SLIDE_WIDTH - 1,
        h: 1,
        fontSize: 48,
        fontFace: FONTS.heading,
        color: colors.white,
        bold: true,
        align: 'center',
      });
    }
  } else {
    // Customer name as text
    slide.addText(data.customer.name, {
      x: 0.5,
      y: 2,
      w: SLIDE_WIDTH - 1,
      h: 1,
      fontSize: 48,
      fontFace: FONTS.heading,
      color: colors.white,
      bold: true,
      align: 'center',
    });
  }
  
  // Report title
  slide.addText('Social Media Reporting', {
    x: 0.5,
    y: 4,
    w: SLIDE_WIDTH - 1,
    h: 0.6,
    fontSize: 28,
    fontFace: FONTS.heading,
    color: colors.gray400,
    align: 'center',
  });
  
  // Month
  slide.addText(formatMonthName(data.month), {
    x: 0.5,
    y: 4.8,
    w: SLIDE_WIDTH - 1,
    h: 0.6,
    fontSize: 24,
    fontFace: FONTS.heading,
    color: colors.primary,
    bold: true,
    align: 'center',
  });
  
  // famefact branding at bottom
  slide.addText('famefact', {
    x: 0.5,
    y: 6.8,
    w: 2,
    h: 0.4,
    fontSize: 14,
    fontFace: FONTS.body,
    color: colors.famefactGreen,
    bold: true,
  });
  
  slide.addText('first in socialtainment', {
    x: 2.5,
    y: 6.8,
    w: 3,
    h: 0.4,
    fontSize: 12,
    fontFace: FONTS.body,
    color: colors.gray500,
  });
}

function createSeparatorSlide(pptx: PptxGenJS, platform: string, color: string, emoji: string) {
  const slide = pptx.addSlide();
  
  // Dark background
  slide.background = { color: DEFAULT_COLORS.black };
  
  // Platform color accent
  slide.addShape('rect', {
    x: 0,
    y: 3,
    w: SLIDE_WIDTH,
    h: 1.5,
    fill: { color: color },
  });
  
  // Emoji
  slide.addText(emoji, {
    x: 0,
    y: 2.2,
    w: SLIDE_WIDTH,
    h: 1,
    fontSize: 72,
    align: 'center',
  });
  
  // Platform name
  slide.addText(platform, {
    x: 0,
    y: 3.15,
    w: SLIDE_WIDTH,
    h: 1.2,
    fontSize: 56,
    fontFace: FONTS.heading,
    color: DEFAULT_COLORS.white,
    bold: true,
    align: 'center',
  });
  
  // Subtitle
  slide.addText('Performance Report', {
    x: 0,
    y: 4.8,
    w: SLIDE_WIDTH,
    h: 0.5,
    fontSize: 20,
    fontFace: FONTS.body,
    color: DEFAULT_COLORS.gray400,
    align: 'center',
  });
}

async function createFacebookKPISlide(pptx: PptxGenJS, data: ReportData, colors: typeof DEFAULT_COLORS) {
  const slide = pptx.addSlide();
  slide.background = { color: colors.white };
  
  // Title
  slide.addText('Facebook Kennzahlen', {
    x: 0.5,
    y: 0.3,
    w: SLIDE_WIDTH - 1,
    h: 0.6,
    fontSize: 28,
    fontFace: FONTS.heading,
    color: colors.gray900,
    bold: true,
  });
  
  // Subtitle with months
  const months = data.facebook?.kpis?.map(k => formatShortMonth(k.month)).join(' | ') || '';
  slide.addText(`Vergleich: ${months}`, {
    x: 0.5,
    y: 0.9,
    w: SLIDE_WIDTH - 1,
    h: 0.4,
    fontSize: 14,
    fontFace: FONTS.body,
    color: colors.gray500,
  });
  
  if (!data.facebook?.kpis || data.facebook.kpis.length === 0) {
    slide.addText('Keine Daten verfügbar', {
      x: 0.5,
      y: 3,
      w: SLIDE_WIDTH - 1,
      h: 1,
      fontSize: 24,
      fontFace: FONTS.body,
      color: colors.gray400,
      align: 'center',
    });
    return;
  }
  
  const kpis = data.facebook.kpis;
  
  // KPI Table
  const tableData: PptxGenJS.TableRow[] = [
    // Header row
    [
      { text: 'Kennzahl', options: { bold: true, fill: { color: colors.facebook }, color: colors.white } },
      ...kpis.map(k => ({ text: formatShortMonth(k.month), options: { bold: true, fill: { color: colors.facebook }, color: colors.white } })),
    ],
    // Data rows
    [
      { text: 'Follower gesamt' },
      ...kpis.map(k => ({ text: formatNumber(k.followerTotal) })),
    ],
    [
      { text: 'Follower Wachstum' },
      ...kpis.map(k => ({ text: k.followerGrowth >= 0 ? `+${formatNumber(k.followerGrowth)}` : formatNumber(k.followerGrowth) })),
    ],
    [
      { text: 'Reichweite gesamt' },
      ...kpis.map(k => ({ text: formatNumber(k.reachTotal) })),
    ],
    [
      { text: 'Organische Reichweite' },
      ...kpis.map(k => ({ text: formatNumber(k.reachOrganic) })),
    ],
    [
      { text: 'Bezahlte Reichweite' },
      ...kpis.map(k => ({ text: formatNumber(k.reachPaid) })),
    ],
    [
      { text: 'Ø Reichweite/Post' },
      ...kpis.map(k => ({ text: formatNumber(k.avgReachPerPost) })),
    ],
    [
      { text: 'Interaktionen gesamt' },
      ...kpis.map(k => ({ text: formatNumber(k.interactions) })),
    ],
    [
      { text: '  - Reaktionen' },
      ...kpis.map(k => ({ text: formatNumber(k.reactions) })),
    ],
    [
      { text: '  - Kommentare' },
      ...kpis.map(k => ({ text: formatNumber(k.comments) })),
    ],
    [
      { text: '  - Shares' },
      ...kpis.map(k => ({ text: formatNumber(k.shares) })),
    ],
    [
      { text: 'Video Views (3 Sek.)' },
      ...kpis.map(k => ({ text: formatNumber(k.videoViews3s) })),
    ],
    [
      { text: 'Interaktionsrate' },
      ...kpis.map(k => ({ text: formatPercent(k.interactionRate) })),
    ],
    [
      { text: 'Anzahl Postings' },
      ...kpis.map(k => ({ text: formatNumber(k.postCount) })),
    ],
  ];
  
  slide.addTable(tableData, {
    x: 0.5,
    y: 1.4,
    w: SLIDE_WIDTH - 1,
    h: 5.5,
    fontFace: FONTS.body,
    fontSize: 11,
    color: colors.gray800,
    border: { type: 'solid', pt: 0.5, color: colors.gray200 },
    colW: [3, ...Array(kpis.length).fill((SLIDE_WIDTH - 4) / kpis.length)],
    rowH: 0.4,
    align: 'center',
    valign: 'middle',
  });
  
  // Footer note
  slide.addText('Interaktionsrate = (Reaktionen + Kommentare) / Reichweite × 100', {
    x: 0.5,
    y: 7,
    w: SLIDE_WIDTH - 1,
    h: 0.3,
    fontSize: 9,
    fontFace: FONTS.body,
    color: colors.gray400,
  });
}

async function createFacebookPostsSlide(pptx: PptxGenJS, data: ReportData, colors: typeof DEFAULT_COLORS) {
  const slide = pptx.addSlide();
  slide.background = { color: colors.white };
  
  // Title
  slide.addText('Facebook Posts nach Interaktion', {
    x: 0.5,
    y: 0.3,
    w: SLIDE_WIDTH - 1,
    h: 0.6,
    fontSize: 24,
    fontFace: FONTS.heading,
    color: colors.gray900,
    bold: true,
  });
  
  const posts = data.facebook?.posts?.slice(0, 8) || [];
  
  if (posts.length === 0) {
    slide.addText('Keine Posts im ausgewählten Zeitraum', {
      x: 0.5,
      y: 3,
      w: SLIDE_WIDTH - 1,
      h: 1,
      fontSize: 18,
      fontFace: FONTS.body,
      color: colors.gray400,
      align: 'center',
    });
    return;
  }
  
  // Chart area
  const chartX = 0.5;
  const chartY = 1.2;
  const chartW = 12.333;
  const chartH = 5.5;
  const barWidth = chartW / posts.length * 0.7;
  const barGap = chartW / posts.length * 0.3;
  const maxValue = Math.max(...posts.map(p => p.interactions)) * 1.2;
  
  // Y-axis
  for (let i = 0; i <= 5; i++) {
    const y = chartY + chartH - (chartH / 5) * i;
    const value = Math.round((maxValue / 5) * i);
    
    // Grid line
    slide.addShape('line', {
      x: chartX,
      y: y,
      w: chartW,
      h: 0,
      line: { color: colors.gray200, width: 0.5, dashType: 'dash' },
    });
    
    // Value label
    slide.addText(formatNumber(value), {
      x: chartX - 0.8,
      y: y - 0.15,
      w: 0.7,
      h: 0.3,
      fontSize: 9,
      fontFace: FONTS.body,
      color: colors.gray500,
      align: 'right',
    });
  }
  
  // Bars and images
  posts.forEach((post, index) => {
    const barHeight = (post.interactions / maxValue) * chartH;
    const x = chartX + index * (barWidth + barGap) + barGap / 2;
    const y = chartY + chartH - barHeight;
    
    // Bar
    slide.addShape('rect', {
      x: x,
      y: y,
      w: barWidth,
      h: barHeight,
      fill: { color: colors.facebook },
    });
    
    // Value on top of bar
    slide.addText(formatNumber(post.interactions), {
      x: x,
      y: y - 0.35,
      w: barWidth,
      h: 0.3,
      fontSize: 10,
      fontFace: FONTS.body,
      color: colors.gray800,
      bold: true,
      align: 'center',
    });
    
    // Image above bar
    if (post.imageUrl) {
      try {
        slide.addImage({
          path: post.imageUrl,
          x: x + (barWidth - 0.8) / 2,
          y: y - 1.1,
          w: 0.8,
          h: 0.8,
          sizing: { type: 'cover', w: 0.8, h: 0.8 },
        });
      } catch {
        // Skip if image fails
      }
    }
    
    // Date below bar
    slide.addText(formatDate(post.date), {
      x: x,
      y: chartY + chartH + 0.1,
      w: barWidth,
      h: 0.3,
      fontSize: 9,
      fontFace: FONTS.body,
      color: colors.gray500,
      align: 'center',
    });
  });
}

async function createFacebookVideosSlide(pptx: PptxGenJS, data: ReportData, colors: typeof DEFAULT_COLORS) {
  const slide = pptx.addSlide();
  slide.background = { color: colors.white };
  
  // Title
  slide.addText('Facebook Videos nach 3-Sek Views', {
    x: 0.5,
    y: 0.3,
    w: SLIDE_WIDTH - 1,
    h: 0.6,
    fontSize: 24,
    fontFace: FONTS.heading,
    color: colors.gray900,
    bold: true,
  });
  
  const videos = data.facebook?.videos?.slice(0, 8) || [];
  
  if (videos.length === 0) {
    slide.addText('Keine Videos im ausgewählten Zeitraum', {
      x: 0.5,
      y: 3,
      w: SLIDE_WIDTH - 1,
      h: 1,
      fontSize: 18,
      fontFace: FONTS.body,
      color: colors.gray400,
      align: 'center',
    });
    return;
  }
  
  // Chart area (same as posts)
  const chartX = 0.5;
  const chartY = 1.2;
  const chartW = 12.333;
  const chartH = 5.5;
  const barWidth = chartW / videos.length * 0.7;
  const barGap = chartW / videos.length * 0.3;
  const maxValue = Math.max(...videos.map(v => v.videoViews || 0)) * 1.2;
  
  // Y-axis
  for (let i = 0; i <= 5; i++) {
    const y = chartY + chartH - (chartH / 5) * i;
    const value = Math.round((maxValue / 5) * i);
    
    slide.addShape('line', {
      x: chartX,
      y: y,
      w: chartW,
      h: 0,
      line: { color: colors.gray200, width: 0.5, dashType: 'dash' },
    });
    
    slide.addText(formatNumber(value), {
      x: chartX - 0.8,
      y: y - 0.15,
      w: 0.7,
      h: 0.3,
      fontSize: 9,
      fontFace: FONTS.body,
      color: colors.gray500,
      align: 'right',
    });
  }
  
  // Bars and thumbnails
  videos.forEach((video, index) => {
    const views = video.videoViews || 0;
    const barHeight = (views / maxValue) * chartH;
    const x = chartX + index * (barWidth + barGap) + barGap / 2;
    const y = chartY + chartH - barHeight;
    
    slide.addShape('rect', {
      x: x,
      y: y,
      w: barWidth,
      h: barHeight,
      fill: { color: lightenColor(colors.facebook, 0.3) },
    });
    
    slide.addText(formatNumber(views), {
      x: x,
      y: y - 0.35,
      w: barWidth,
      h: 0.3,
      fontSize: 10,
      fontFace: FONTS.body,
      color: colors.gray800,
      bold: true,
      align: 'center',
    });
    
    if (video.imageUrl) {
      try {
        slide.addImage({
          path: video.imageUrl,
          x: x + (barWidth - 0.8) / 2,
          y: y - 1.1,
          w: 0.8,
          h: 0.8,
          sizing: { type: 'cover', w: 0.8, h: 0.8 },
        });
      } catch {
        // Skip if image fails
      }
    }
    
    slide.addText(formatDate(video.date), {
      x: x,
      y: chartY + chartH + 0.1,
      w: barWidth,
      h: 0.3,
      fontSize: 9,
      fontFace: FONTS.body,
      color: colors.gray500,
      align: 'center',
    });
  });
}

async function createInstagramKPISlide(pptx: PptxGenJS, data: ReportData, colors: typeof DEFAULT_COLORS) {
  const slide = pptx.addSlide();
  slide.background = { color: colors.white };
  
  // Title
  slide.addText('Instagram Kennzahlen', {
    x: 0.5,
    y: 0.3,
    w: SLIDE_WIDTH - 1,
    h: 0.6,
    fontSize: 28,
    fontFace: FONTS.heading,
    color: colors.gray900,
    bold: true,
  });
  
  const months = data.instagram?.kpis?.map(k => formatShortMonth(k.month)).join(' | ') || '';
  slide.addText(`Vergleich: ${months}`, {
    x: 0.5,
    y: 0.9,
    w: SLIDE_WIDTH - 1,
    h: 0.4,
    fontSize: 14,
    fontFace: FONTS.body,
    color: colors.gray500,
  });
  
  if (!data.instagram?.kpis || data.instagram.kpis.length === 0) {
    slide.addText('Keine Daten verfügbar', {
      x: 0.5,
      y: 3,
      w: SLIDE_WIDTH - 1,
      h: 1,
      fontSize: 24,
      fontFace: FONTS.body,
      color: colors.gray400,
      align: 'center',
    });
    return;
  }
  
  const kpis = data.instagram.kpis;
  
  const tableData: PptxGenJS.TableRow[] = [
    [
      { text: 'Kennzahl', options: { bold: true, fill: { color: colors.instagram }, color: colors.white } },
      ...kpis.map(k => ({ text: formatShortMonth(k.month), options: { bold: true, fill: { color: colors.instagram }, color: colors.white } })),
    ],
    [
      { text: 'Follower gesamt' },
      ...kpis.map(k => ({ text: formatNumber(k.followerTotal) })),
    ],
    [
      { text: 'Neue Follower' },
      ...kpis.map(k => ({ text: k.followerGrowth >= 0 ? `+${formatNumber(k.followerGrowth)}` : formatNumber(k.followerGrowth) })),
    ],
    [
      { text: 'Reichweite gesamt' },
      ...kpis.map(k => ({ text: formatNumber(k.reachTotal) })),
    ],
    [
      { text: 'Organische Reichweite' },
      ...kpis.map(k => ({ text: formatNumber(k.reachOrganic) })),
    ],
    [
      { text: 'Bezahlte Reichweite' },
      ...kpis.map(k => ({ text: formatNumber(k.reachPaid) })),
    ],
    [
      { text: 'Ø Reichweite/Post' },
      ...kpis.map(k => ({ text: formatNumber(k.avgReachPerPost) })),
    ],
    [
      { text: 'Interaktionen gesamt' },
      ...kpis.map(k => ({ text: formatNumber(k.interactions) })),
    ],
    [
      { text: '  - Likes' },
      ...kpis.map(k => ({ text: formatNumber(k.likes) })),
    ],
    [
      { text: '  - Kommentare' },
      ...kpis.map(k => ({ text: formatNumber(k.comments) })),
    ],
    [
      { text: '  - Saves' },
      ...kpis.map(k => ({ text: formatNumber(k.saves) })),
    ],
    [
      { text: 'Video Views' },
      ...kpis.map(k => ({ text: formatNumber(k.videoViews) })),
    ],
    [
      { text: 'Interaktionsrate' },
      ...kpis.map(k => ({ text: formatPercent(k.interactionRate) })),
    ],
    [
      { text: 'Anzahl Postings' },
      ...kpis.map(k => ({ text: formatNumber(k.postCount) })),
    ],
  ];
  
  slide.addTable(tableData, {
    x: 0.5,
    y: 1.4,
    w: SLIDE_WIDTH - 1,
    h: 5.5,
    fontFace: FONTS.body,
    fontSize: 11,
    color: colors.gray800,
    border: { type: 'solid', pt: 0.5, color: colors.gray200 },
    colW: [3, ...Array(kpis.length).fill((SLIDE_WIDTH - 4) / kpis.length)],
    rowH: 0.4,
    align: 'center',
    valign: 'middle',
  });
  
  slide.addText('Interaktionsrate = (Likes + Kommentare) / Reichweite × 100', {
    x: 0.5,
    y: 7,
    w: SLIDE_WIDTH - 1,
    h: 0.3,
    fontSize: 9,
    fontFace: FONTS.body,
    color: colors.gray400,
  });
}

async function createInstagramPostsSlide(pptx: PptxGenJS, data: ReportData, colors: typeof DEFAULT_COLORS) {
  const slide = pptx.addSlide();
  slide.background = { color: colors.white };
  
  slide.addText('Instagram Posts nach Interaktion', {
    x: 0.5,
    y: 0.3,
    w: SLIDE_WIDTH - 1,
    h: 0.6,
    fontSize: 24,
    fontFace: FONTS.heading,
    color: colors.gray900,
    bold: true,
  });
  
  const posts = data.instagram?.posts?.filter(p => p.type !== 'reel').slice(0, 8) || [];
  
  if (posts.length === 0) {
    slide.addText('Keine Posts im ausgewählten Zeitraum', {
      x: 0.5,
      y: 3,
      w: SLIDE_WIDTH - 1,
      h: 1,
      fontSize: 18,
      fontFace: FONTS.body,
      color: colors.gray400,
      align: 'center',
    });
    return;
  }
  
  const chartX = 0.5;
  const chartY = 1.2;
  const chartW = 12.333;
  const chartH = 5.5;
  const barWidth = chartW / posts.length * 0.7;
  const barGap = chartW / posts.length * 0.3;
  const maxValue = Math.max(...posts.map(p => p.interactions)) * 1.2;
  
  for (let i = 0; i <= 5; i++) {
    const y = chartY + chartH - (chartH / 5) * i;
    const value = Math.round((maxValue / 5) * i);
    
    slide.addShape('line', {
      x: chartX,
      y: y,
      w: chartW,
      h: 0,
      line: { color: colors.gray200, width: 0.5, dashType: 'dash' },
    });
    
    slide.addText(formatNumber(value), {
      x: chartX - 0.8,
      y: y - 0.15,
      w: 0.7,
      h: 0.3,
      fontSize: 9,
      fontFace: FONTS.body,
      color: colors.gray500,
      align: 'right',
    });
  }
  
  posts.forEach((post, index) => {
    const barHeight = (post.interactions / maxValue) * chartH;
    const x = chartX + index * (barWidth + barGap) + barGap / 2;
    const y = chartY + chartH - barHeight;
    
    slide.addShape('rect', {
      x: x,
      y: y,
      w: barWidth,
      h: barHeight,
      fill: { color: colors.instagram },
    });
    
    slide.addText(formatNumber(post.interactions), {
      x: x,
      y: y - 0.35,
      w: barWidth,
      h: 0.3,
      fontSize: 10,
      fontFace: FONTS.body,
      color: colors.gray800,
      bold: true,
      align: 'center',
    });
    
    if (post.imageUrl) {
      try {
        slide.addImage({
          path: post.imageUrl,
          x: x + (barWidth - 0.8) / 2,
          y: y - 1.1,
          w: 0.8,
          h: 0.8,
          sizing: { type: 'cover', w: 0.8, h: 0.8 },
        });
      } catch {
        // Skip if image fails
      }
    }
    
    slide.addText(formatDate(post.date), {
      x: x,
      y: chartY + chartH + 0.1,
      w: barWidth,
      h: 0.3,
      fontSize: 9,
      fontFace: FONTS.body,
      color: colors.gray500,
      align: 'center',
    });
  });
}

async function createInstagramImagesTableSlide(pptx: PptxGenJS, data: ReportData, colors: typeof DEFAULT_COLORS) {
  const slide = pptx.addSlide();
  slide.background = { color: colors.white };
  
  slide.addText('Instagram Bild-Beiträge Übersicht', {
    x: 0.5,
    y: 0.3,
    w: SLIDE_WIDTH - 1,
    h: 0.6,
    fontSize: 24,
    fontFace: FONTS.heading,
    color: colors.gray900,
    bold: true,
  });
  
  const posts = data.instagram?.posts?.filter(p => p.type !== 'reel').slice(0, 10) || [];
  
  if (posts.length === 0) {
    slide.addText('Keine Bild-Beiträge im ausgewählten Zeitraum', {
      x: 0.5,
      y: 3,
      w: SLIDE_WIDTH - 1,
      h: 1,
      fontSize: 18,
      fontFace: FONTS.body,
      color: colors.gray400,
      align: 'center',
    });
    return;
  }
  
  const tableData: PptxGenJS.TableRow[] = [
    [
      { text: 'Datum', options: { bold: true, fill: { color: colors.instagram }, color: colors.white } },
      { text: 'Bild', options: { bold: true, fill: { color: colors.instagram }, color: colors.white } },
      { text: 'Reichweite', options: { bold: true, fill: { color: colors.instagram }, color: colors.white } },
      { text: 'Interaktionen', options: { bold: true, fill: { color: colors.instagram }, color: colors.white } },
      { text: 'Saves', options: { bold: true, fill: { color: colors.instagram }, color: colors.white } },
    ],
    ...posts.map(post => [
      { text: formatDate(post.date) },
      { text: '' }, // Image placeholder
      { text: formatNumber(post.reach) },
      { text: formatNumber(post.interactions) },
      { text: formatNumber(post.saves || 0) },
    ]),
  ];
  
  slide.addTable(tableData, {
    x: 0.5,
    y: 1.1,
    w: SLIDE_WIDTH - 1,
    h: 6,
    fontFace: FONTS.body,
    fontSize: 11,
    color: colors.gray800,
    border: { type: 'solid', pt: 0.5, color: colors.gray200 },
    colW: [1.5, 1.5, 2.5, 2.5, 2.5],
    rowH: 0.55,
    align: 'center',
    valign: 'middle',
  });
  
  // Add images to table
  posts.forEach((post, index) => {
    if (post.imageUrl) {
      try {
        slide.addImage({
          path: post.imageUrl,
          x: 2.1,
          y: 1.65 + (index + 1) * 0.55,
          w: 0.5,
          h: 0.5,
          sizing: { type: 'cover', w: 0.5, h: 0.5 },
        });
      } catch {
        // Skip if image fails
      }
    }
  });
}

async function createInstagramReelsSlide(pptx: PptxGenJS, data: ReportData, colors: typeof DEFAULT_COLORS) {
  const slide = pptx.addSlide();
  slide.background = { color: colors.white };
  
  slide.addText('Instagram Reels nach Aufrufen', {
    x: 0.5,
    y: 0.3,
    w: SLIDE_WIDTH - 1,
    h: 0.6,
    fontSize: 24,
    fontFace: FONTS.heading,
    color: colors.gray900,
    bold: true,
  });
  
  const reels = data.instagram?.reels?.slice(0, 8) || [];
  
  if (reels.length === 0) {
    slide.addText('Keine Reels im ausgewählten Zeitraum', {
      x: 0.5,
      y: 3,
      w: SLIDE_WIDTH - 1,
      h: 1,
      fontSize: 18,
      fontFace: FONTS.body,
      color: colors.gray400,
      align: 'center',
    });
    return;
  }
  
  const chartX = 0.5;
  const chartY = 1.2;
  const chartW = 12.333;
  const chartH = 5.5;
  const barWidth = chartW / reels.length * 0.7;
  const barGap = chartW / reels.length * 0.3;
  const maxValue = Math.max(...reels.map(r => r.videoViews || 0)) * 1.2;
  
  for (let i = 0; i <= 5; i++) {
    const y = chartY + chartH - (chartH / 5) * i;
    const value = Math.round((maxValue / 5) * i);
    
    slide.addShape('line', {
      x: chartX,
      y: y,
      w: chartW,
      h: 0,
      line: { color: colors.gray200, width: 0.5, dashType: 'dash' },
    });
    
    slide.addText(formatNumber(value), {
      x: chartX - 0.8,
      y: y - 0.15,
      w: 0.7,
      h: 0.3,
      fontSize: 9,
      fontFace: FONTS.body,
      color: colors.gray500,
      align: 'right',
    });
  }
  
  reels.forEach((reel, index) => {
    const views = reel.videoViews || 0;
    const barHeight = (views / maxValue) * chartH;
    const x = chartX + index * (barWidth + barGap) + barGap / 2;
    const y = chartY + chartH - barHeight;
    
    slide.addShape('rect', {
      x: x,
      y: y,
      w: barWidth,
      h: barHeight,
      fill: { color: lightenColor(colors.instagram, 0.2) },
    });
    
    slide.addText(formatNumber(views), {
      x: x,
      y: y - 0.35,
      w: barWidth,
      h: 0.3,
      fontSize: 10,
      fontFace: FONTS.body,
      color: colors.gray800,
      bold: true,
      align: 'center',
    });
    
    if (reel.imageUrl) {
      try {
        slide.addImage({
          path: reel.imageUrl,
          x: x + (barWidth - 0.8) / 2,
          y: y - 1.1,
          w: 0.8,
          h: 0.8,
          sizing: { type: 'cover', w: 0.8, h: 0.8 },
        });
      } catch {
        // Skip if image fails
      }
    }
    
    slide.addText(formatDate(reel.date), {
      x: x,
      y: chartY + chartH + 0.1,
      w: barWidth,
      h: 0.3,
      fontSize: 9,
      fontFace: FONTS.body,
      color: colors.gray500,
      align: 'center',
    });
  });
}

async function createInstagramReelsTableSlide(pptx: PptxGenJS, data: ReportData, colors: typeof DEFAULT_COLORS) {
  const slide = pptx.addSlide();
  slide.background = { color: colors.white };
  
  slide.addText('Instagram Reels Übersicht', {
    x: 0.5,
    y: 0.3,
    w: SLIDE_WIDTH - 1,
    h: 0.6,
    fontSize: 24,
    fontFace: FONTS.heading,
    color: colors.gray900,
    bold: true,
  });
  
  const reels = data.instagram?.reels?.slice(0, 10) || [];
  
  if (reels.length === 0) {
    slide.addText('Keine Reels im ausgewählten Zeitraum', {
      x: 0.5,
      y: 3,
      w: SLIDE_WIDTH - 1,
      h: 1,
      fontSize: 18,
      fontFace: FONTS.body,
      color: colors.gray400,
      align: 'center',
    });
    return;
  }
  
  const tableData: PptxGenJS.TableRow[] = [
    [
      { text: 'Datum', options: { bold: true, fill: { color: colors.instagram }, color: colors.white } },
      { text: 'Thumbnail', options: { bold: true, fill: { color: colors.instagram }, color: colors.white } },
      { text: 'Reichweite', options: { bold: true, fill: { color: colors.instagram }, color: colors.white } },
      { text: 'Interaktionen', options: { bold: true, fill: { color: colors.instagram }, color: colors.white } },
      { text: 'Views', options: { bold: true, fill: { color: colors.instagram }, color: colors.white } },
      { text: 'Saves', options: { bold: true, fill: { color: colors.instagram }, color: colors.white } },
    ],
    ...reels.map(reel => [
      { text: formatDate(reel.date) },
      { text: '' }, // Image placeholder
      { text: formatNumber(reel.reach) },
      { text: formatNumber(reel.interactions) },
      { text: formatNumber(reel.videoViews || 0) },
      { text: formatNumber(reel.saves || 0) },
    ]),
  ];
  
  slide.addTable(tableData, {
    x: 0.5,
    y: 1.1,
    w: SLIDE_WIDTH - 1,
    h: 6,
    fontFace: FONTS.body,
    fontSize: 11,
    color: colors.gray800,
    border: { type: 'solid', pt: 0.5, color: colors.gray200 },
    colW: [1.3, 1.3, 2, 2, 2, 2],
    rowH: 0.55,
    align: 'center',
    valign: 'middle',
  });
  
  // Add thumbnails
  reels.forEach((reel, index) => {
    if (reel.imageUrl) {
      try {
        slide.addImage({
          path: reel.imageUrl,
          x: 1.9,
          y: 1.65 + (index + 1) * 0.55,
          w: 0.5,
          h: 0.5,
          sizing: { type: 'cover', w: 0.5, h: 0.5 },
        });
      } catch {
        // Skip if image fails
      }
    }
  });
}

function createFazitSlide(pptx: PptxGenJS, data: ReportData, colors: typeof DEFAULT_COLORS) {
  const slide = pptx.addSlide();
  slide.background = { color: colors.white };
  
  slide.addText('Fazit & Empfehlungen', {
    x: 0.5,
    y: 0.3,
    w: SLIDE_WIDTH - 1,
    h: 0.6,
    fontSize: 28,
    fontFace: FONTS.heading,
    color: colors.gray900,
    bold: true,
  });
  
  // Generate automatic summary
  const summaryParts: string[] = [];
  
  if (data.facebook?.kpis && data.facebook.kpis.length > 0) {
    const fbCurrent = data.facebook.kpis[0];
    const fbPrev = data.facebook.kpis[1];
    
    summaryParts.push('📘 Facebook:');
    summaryParts.push(`Im ${formatMonthName(fbCurrent.month)} wurden ${formatNumber(fbCurrent.postCount)} Beiträge veröffentlicht.`);
    summaryParts.push(`Die Gesamtreichweite betrug ${formatNumber(fbCurrent.reachTotal)} mit ${formatNumber(fbCurrent.interactions)} Interaktionen.`);
    
    if (fbPrev) {
      const reachChange = ((fbCurrent.reachTotal - fbPrev.reachTotal) / fbPrev.reachTotal * 100).toFixed(1);
      const interactionChange = ((fbCurrent.interactions - fbPrev.interactions) / fbPrev.interactions * 100).toFixed(1);
      summaryParts.push(`Im Vergleich zum Vormonat: Reichweite ${parseFloat(reachChange) >= 0 ? '+' : ''}${reachChange}%, Interaktionen ${parseFloat(interactionChange) >= 0 ? '+' : ''}${interactionChange}%.`);
    }
    
    summaryParts.push('');
  }
  
  if (data.instagram?.kpis && data.instagram.kpis.length > 0) {
    const igCurrent = data.instagram.kpis[0];
    const igPrev = data.instagram.kpis[1];
    
    summaryParts.push('📸 Instagram:');
    summaryParts.push(`Im ${formatMonthName(igCurrent.month)} wurden ${formatNumber(igCurrent.postCount)} Beiträge veröffentlicht.`);
    summaryParts.push(`Die Gesamtreichweite betrug ${formatNumber(igCurrent.reachTotal)} mit ${formatNumber(igCurrent.interactions)} Interaktionen und ${formatNumber(igCurrent.saves)} Saves.`);
    
    if (igPrev) {
      const reachChange = ((igCurrent.reachTotal - igPrev.reachTotal) / igPrev.reachTotal * 100).toFixed(1);
      const interactionChange = ((igCurrent.interactions - igPrev.interactions) / igPrev.interactions * 100).toFixed(1);
      summaryParts.push(`Im Vergleich zum Vormonat: Reichweite ${parseFloat(reachChange) >= 0 ? '+' : ''}${reachChange}%, Interaktionen ${parseFloat(interactionChange) >= 0 ? '+' : ''}${interactionChange}%.`);
    }
  }
  
  slide.addText(summaryParts.join('\n'), {
    x: 0.5,
    y: 1.2,
    w: SLIDE_WIDTH - 1,
    h: 5.5,
    fontSize: 14,
    fontFace: FONTS.body,
    color: colors.gray700,
    valign: 'top',
    paraSpaceAfter: 8,
  });
}

function createFamefactSlide(pptx: PptxGenJS, colors: typeof DEFAULT_COLORS) {
  const slide = pptx.addSlide();
  
  // Dark background
  slide.background = { color: colors.black };
  
  // famefact logo
  slide.addText('famefact', {
    x: 0,
    y: 2.5,
    w: SLIDE_WIDTH,
    h: 1,
    fontSize: 56,
    fontFace: FONTS.heading,
    color: colors.famefactGreen,
    bold: true,
    align: 'center',
  });
  
  // Tagline
  slide.addText('first in socialtainment', {
    x: 0,
    y: 3.6,
    w: SLIDE_WIDTH,
    h: 0.5,
    fontSize: 20,
    fontFace: FONTS.body,
    color: colors.gray400,
    align: 'center',
  });
  
  // Contact info
  slide.addText('www.famefact.com | hello@famefact.com', {
    x: 0,
    y: 5,
    w: SLIDE_WIDTH,
    h: 0.4,
    fontSize: 14,
    fontFace: FONTS.body,
    color: colors.gray500,
    align: 'center',
  });
  
  // Copyright
  slide.addText(`© ${new Date().getFullYear()} famefact GmbH`, {
    x: 0,
    y: 6.8,
    w: SLIDE_WIDTH,
    h: 0.3,
    fontSize: 10,
    fontFace: FONTS.body,
    color: colors.gray600,
    align: 'center',
  });
}

export type { ReportData, FacebookKPIs, InstagramKPIs, PostData, CustomerData };
