/**
 * FAMEFACT REPORT GENERATOR
 * 
 * Ein-Klick Monatsreporting System mit 13 Slides
 * Exakte Kopie des famefact Original-Templates
 */

import PptxGenJS from 'pptxgenjs';
import { generateBarChart, fetchAndOptimizeImage } from './chart-generator';

// Slide dimensions (16:9)
const SLIDE_WIDTH = 13.333;
// const SLIDE_HEIGHT = 7.5; // Unused but kept for reference

// Design constants - famefact Template
const COLORS = {
  // Primary palette
  primary: '2962AE',        // Vergleich.org Blue RGB(41,98,174)
  primaryDark: '1E4A8A',    // Darker blue for headers
  primaryLight: '3B82F6',   // Light blue accent
  
  // Neutral palette
  white: 'FFFFFF',
  black: '0D0D0D',          // famefact black
  gray50: 'F9FAFB',
  gray100: 'F3F4F6',
  gray200: 'E5E7EB',
  gray300: 'D1D5DB',
  gray400: '9CA3AF',
  gray500: '6B7280',
  gray600: '4B5563',
  gray700: '374151',
  gray800: '1F2937',
  gray900: '111827',
  
  // Brand colors
  famefactGreen: '84CC16',
  facebook: '1877F2',
  instagram: 'E4405F',
  
  // Status colors
  success: '10B981',
  danger: 'EF4444',
};

const FONTS = {
  heading: 'Arial',
  body: 'Arial',
};

// Report data types
export interface ReportData {
  customer: {
    name: string;
    slug: string;
    logoUrl?: string;
  };
  month: string;
  prevMonth1: string;
  prevMonth2: string;
  facebook?: {
    kpis: FBMonthlyKPIs[];
    posts: FBPost[];
    videos: FBVideo[];
  };
  instagram?: {
    kpis: IGMonthlyKPIs[];
    posts: IGPost[];
    reels: IGReel[];
  };
}

interface FBMonthlyKPIs {
  month: string;
  reach: number;
  impressions: number;
  interactions: number;
  reactions: number;
  comments: number;
  shares: number;
  videoViews: number;
  postCount: number;
  avgReach: number;
}

interface IGMonthlyKPIs {
  month: string;
  reach: number;
  impressions: number;
  interactions: number;
  likes: number;
  comments: number;
  saves: number;
  plays: number;
  postCount: number;
  avgReach: number;
}

interface FBPost {
  postId: string;
  date: string;
  type: string;
  message: string;
  reactions: number;
  comments: number;
  shares: number;
  reach: number;
  impressions: number;
  videoViews: number;
  interactions: number;
  imageUrl: string;
}

interface FBVideo {
  postId: string;
  date: string;
  message: string;
  videoViews: number;
  reach: number;
  interactions: number;
  imageUrl: string;
}

interface IGPost {
  mediaId: string;
  date: string;
  type: string;
  caption: string;
  likes: number;
  comments: number;
  saves: number;
  reach: number;
  impressions: number;
  plays: number;
  interactions: number;
  imageUrl: string;
}

interface IGReel {
  mediaId: string;
  date: string;
  caption: string;
  plays: number;
  likes: number;
  comments: number;
  saves: number;
  reach: number;
  interactions: number;
  imageUrl: string;
}

// Helper functions
function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) return '-';
  return num.toLocaleString('de-DE');
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

function formatMonthName(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 
                  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  return `${months[parseInt(month) - 1]} ${year}`;
}

function formatShortMonth(monthStr: string): string {
  const [, month] = monthStr.split('-');
  const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 
                  'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  return months[parseInt(month) - 1];
}

function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

function calculateChange(current: number, previous: number): { value: string; isPositive: boolean } {
  if (!previous || previous === 0) return { value: '-', isPositive: true };
  const change = ((current - previous) / previous) * 100;
  return {
    value: `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`,
    isPositive: change >= 0
  };
}

// Main report generator
export async function generateFamefactReport(data: ReportData): Promise<Buffer> {
  const pptx = new PptxGenJS();
  
  // Set presentation properties
  pptx.author = 'famefact GmbH';
  pptx.title = `${data.customer.name} - Social Media Report ${formatMonthName(data.month)}`;
  pptx.subject = 'Monatliches Social Media Reporting';
  pptx.company = 'famefact GmbH';
  
  // Define slide master
  pptx.defineSlideMaster({
    title: 'FAMEFACT_MASTER',
    background: { color: COLORS.white },
  });

  // ============ SLIDE 1: COVER ============
  await createCoverSlide(pptx, data);
  
  // ============ SLIDE 2: FACEBOOK SEPARATOR ============
  if (data.facebook) {
    createSeparatorSlide(pptx, 'Facebook', COLORS.facebook);
    
    // ============ SLIDE 3: FACEBOOK KPIs ============
    await createFacebookKPISlide(pptx, data);
    
    // ============ SLIDE 4: FB POSTS BY INTERACTION ============
    await createFacebookPostsChartSlide(pptx, data);
    
    // ============ SLIDE 5: FB VIDEOS BY VIEWS ============
    await createFacebookVideosChartSlide(pptx, data);
  }
  
  // ============ SLIDE 6: INSTAGRAM SEPARATOR ============
  if (data.instagram) {
    createSeparatorSlide(pptx, 'Instagram', COLORS.instagram);
    
    // ============ SLIDE 7: INSTAGRAM KPIs ============
    await createInstagramKPISlide(pptx, data);
    
    // ============ SLIDE 8: IG POSTS BY INTERACTION ============
    await createInstagramPostsChartSlide(pptx, data);
    
    // ============ SLIDE 9: IG POSTS TABLE ============
    await createInstagramPostsTableSlide(pptx, data);
    
    // ============ SLIDE 10: IG REELS BY VIEWS ============
    await createInstagramReelsChartSlide(pptx, data);
    
    // ============ SLIDE 11: IG REELS TABLE ============
    await createInstagramReelsTableSlide(pptx, data);
  }
  
  // ============ SLIDE 12: FAZIT ============
  await createFazitSlide(pptx, data);
  
  // ============ SLIDE 13: CONTACT ============
  await createContactSlide(pptx);

  // Generate buffer
  const buffer = await pptx.write({ outputType: 'nodebuffer' });
  return buffer as Buffer;
}

// ============ SLIDE CREATORS ============

async function createCoverSlide(pptx: PptxGenJS, data: ReportData) {
  const slide = pptx.addSlide({ masterName: 'FAMEFACT_MASTER' });
  
  // Dark background
  slide.background = { color: COLORS.black };
  
  // famefact logo (top left)
  slide.addText('famefact', {
    x: 0.5,
    y: 0.4,
    w: 2,
    h: 0.5,
    fontSize: 24,
    fontFace: FONTS.heading,
    color: COLORS.famefactGreen,
    bold: true,
  });
  
  // Customer name
  slide.addText(data.customer.name, {
    x: 0.5,
    y: 2.5,
    w: SLIDE_WIDTH - 1,
    h: 1,
    fontSize: 48,
    fontFace: FONTS.heading,
    color: COLORS.white,
    bold: true,
  });
  
  // Report title
  slide.addText('Social Media Report', {
    x: 0.5,
    y: 3.5,
    w: SLIDE_WIDTH - 1,
    h: 0.6,
    fontSize: 28,
    fontFace: FONTS.heading,
    color: COLORS.gray400,
  });
  
  // Month
  slide.addText(formatMonthName(data.month), {
    x: 0.5,
    y: 4.2,
    w: SLIDE_WIDTH - 1,
    h: 0.6,
    fontSize: 24,
    fontFace: FONTS.heading,
    color: COLORS.famefactGreen,
    bold: true,
  });
  
  // Decorative line
  slide.addShape('rect', {
    x: 0.5,
    y: 5,
    w: 3,
    h: 0.05,
    fill: { color: COLORS.famefactGreen },
  });
  
  // Footer
  slide.addText('Erstellt von famefact GmbH', {
    x: 0.5,
    y: 6.8,
    w: SLIDE_WIDTH - 1,
    h: 0.3,
    fontSize: 10,
    fontFace: FONTS.body,
    color: COLORS.gray500,
  });
}

function createSeparatorSlide(pptx: PptxGenJS, platform: string, color: string) {
  const slide = pptx.addSlide({ masterName: 'FAMEFACT_MASTER' });
  
  // Colored background
  slide.background = { color: color };
  
  // Platform icon
  const icon = platform === 'Facebook' ? '📘' : '📸';
  slide.addText(icon, {
    x: 0,
    y: 2.5,
    w: SLIDE_WIDTH,
    h: 1,
    fontSize: 72,
    align: 'center',
  });
  
  // Platform name
  slide.addText(platform, {
    x: 0,
    y: 3.8,
    w: SLIDE_WIDTH,
    h: 1,
    fontSize: 56,
    fontFace: FONTS.heading,
    color: COLORS.white,
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
    color: COLORS.white,
    align: 'center',
  });
}

async function createFacebookKPISlide(pptx: PptxGenJS, data: ReportData) {
  const slide = pptx.addSlide({ masterName: 'FAMEFACT_MASTER' });
  
  // Title
  slide.addText('Facebook Kennzahlen', {
    x: 0.5,
    y: 0.3,
    w: SLIDE_WIDTH - 1,
    h: 0.6,
    fontSize: 28,
    fontFace: FONTS.heading,
    color: COLORS.gray900,
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
    color: COLORS.gray500,
  });
  
  if (!data.facebook?.kpis || data.facebook.kpis.length === 0) {
    slide.addText('Keine Daten verfügbar', {
      x: 0.5,
      y: 3,
      w: SLIDE_WIDTH - 1,
      h: 1,
      fontSize: 18,
      fontFace: FONTS.body,
      color: COLORS.gray500,
      align: 'center',
    });
    return;
  }
  
  const kpis = data.facebook.kpis;
  const current = kpis[0];
  const prev1 = kpis[1];
  const prev2 = kpis[2];
  
  // KPI Table
  const tableData: PptxGenJS.TableRow[] = [
    // Header row
    [
      { text: 'Metrik', options: { fill: { color: COLORS.facebook }, color: COLORS.white, bold: true, align: 'left' } },
      { text: formatShortMonth(current?.month || ''), options: { fill: { color: COLORS.facebook }, color: COLORS.white, bold: true, align: 'right' } },
      { text: formatShortMonth(prev1?.month || ''), options: { fill: { color: COLORS.facebook }, color: COLORS.white, bold: true, align: 'right' } },
      { text: formatShortMonth(prev2?.month || ''), options: { fill: { color: COLORS.facebook }, color: COLORS.white, bold: true, align: 'right' } },
      { text: 'Trend', options: { fill: { color: COLORS.facebook }, color: COLORS.white, bold: true, align: 'center' } },
    ],
    // Data rows
    createKPIRow('Posts', current?.postCount, prev1?.postCount, prev2?.postCount),
    createKPIRow('Reichweite', current?.reach, prev1?.reach, prev2?.reach),
    createKPIRow('Impressionen', current?.impressions, prev1?.impressions, prev2?.impressions),
    createKPIRow('Interaktionen', current?.interactions, prev1?.interactions, prev2?.interactions),
    createKPIRow('Reactions', current?.reactions, prev1?.reactions, prev2?.reactions),
    createKPIRow('Kommentare', current?.comments, prev1?.comments, prev2?.comments),
    createKPIRow('Shares', current?.shares, prev1?.shares, prev2?.shares),
    createKPIRow('Video Views (3s)', current?.videoViews, prev1?.videoViews, prev2?.videoViews),
    createKPIRow('Ø Reichweite/Post', current?.avgReach, prev1?.avgReach, prev2?.avgReach),
  ];
  
  slide.addTable(tableData, {
    x: 0.5,
    y: 1.5,
    w: SLIDE_WIDTH - 1,
    colW: [3, 2.2, 2.2, 2.2, 2.2],
    fontSize: 11,
    fontFace: FONTS.body,
    border: { type: 'solid', pt: 0.5, color: COLORS.gray200 },
    rowH: 0.5,
  });
}

function createKPIRow(label: string, current?: number, prev1?: number, prev2?: number): PptxGenJS.TableRow {
  const change = calculateChange(current || 0, prev1 || 0);
  return [
    { text: label, options: { color: COLORS.gray700, align: 'left' } },
    { text: formatNumber(current), options: { color: COLORS.gray900, bold: true, align: 'right' } },
    { text: formatNumber(prev1), options: { color: COLORS.gray600, align: 'right' } },
    { text: formatNumber(prev2), options: { color: COLORS.gray600, align: 'right' } },
    { text: change.value, options: { color: change.isPositive ? COLORS.success : COLORS.danger, bold: true, align: 'center' } },
  ];
}

async function createFacebookPostsChartSlide(pptx: PptxGenJS, data: ReportData) {
  const slide = pptx.addSlide({ masterName: 'FAMEFACT_MASTER' });
  
  // Title
  slide.addText('Facebook: Postings nach Interaktion', {
    x: 0.5,
    y: 0.3,
    w: SLIDE_WIDTH - 1,
    h: 0.6,
    fontSize: 24,
    fontFace: FONTS.heading,
    color: COLORS.gray900,
    bold: true,
  });
  
  if (!data.facebook?.posts || data.facebook.posts.length === 0) {
    slide.addText('Keine Posts im ausgewählten Zeitraum', {
      x: 0.5,
      y: 3,
      w: SLIDE_WIDTH - 1,
      h: 1,
      fontSize: 18,
      fontFace: FONTS.body,
      color: COLORS.gray500,
      align: 'center',
    });
    return;
  }
  
  // Sort posts by interactions and take top 6
  const topPosts = [...data.facebook.posts]
    .sort((a, b) => b.interactions - a.interactions)
    .slice(0, 6);
  
  // Generate bar chart
  const chartLabels = topPosts.map((_, i) => `#${i + 1}`);
  const chartValues = topPosts.map(p => p.interactions);
  
  try {
    const chartBuffer = await generateBarChart(
      chartLabels,
      chartValues,
      'Interaktionen',
      `#${COLORS.facebook}`
    );
    
    slide.addImage({
      data: `data:image/png;base64,${chartBuffer.toString('base64')}`,
      x: 0.5,
      y: 1.2,
      w: 7,
      h: 4,
    });
  } catch (error) {
    console.error('Chart generation failed:', error);
  }
  
  // Add thumbnails
  const thumbStartX = 8;
  const thumbWidth = 1.5;
  const thumbHeight = 1;
  const thumbGap = 0.1;
  
  for (let i = 0; i < Math.min(topPosts.length, 6); i++) {
    const post = topPosts[i];
    const row = Math.floor(i / 2);
    const col = i % 2;
    const x = thumbStartX + col * (thumbWidth + thumbGap);
    const y = 1.2 + row * (thumbHeight + thumbGap + 0.4);
    
    // Thumbnail placeholder or image
    if (post.imageUrl) {
      try {
        const imgBuffer = await fetchAndOptimizeImage(post.imageUrl);
        slide.addImage({
          data: `data:image/jpeg;base64,${imgBuffer.toString('base64')}`,
          x,
          y,
          w: thumbWidth,
          h: thumbHeight,
        });
      } catch {
        slide.addShape('rect', {
          x,
          y,
          w: thumbWidth,
          h: thumbHeight,
          fill: { color: COLORS.gray200 },
        });
      }
    } else {
      slide.addShape('rect', {
        x,
        y,
        w: thumbWidth,
        h: thumbHeight,
        fill: { color: COLORS.gray200 },
      });
    }
    
    // Label
    slide.addText(`#${i + 1}: ${formatNumber(post.interactions)} Int.`, {
      x,
      y: y + thumbHeight + 0.05,
      w: thumbWidth,
      h: 0.3,
      fontSize: 8,
      fontFace: FONTS.body,
      color: COLORS.gray600,
      align: 'center',
    });
  }
}

async function createFacebookVideosChartSlide(pptx: PptxGenJS, data: ReportData) {
  const slide = pptx.addSlide({ masterName: 'FAMEFACT_MASTER' });
  
  // Title
  slide.addText('Facebook: Videos nach 3-Sekunden Views', {
    x: 0.5,
    y: 0.3,
    w: SLIDE_WIDTH - 1,
    h: 0.6,
    fontSize: 24,
    fontFace: FONTS.heading,
    color: COLORS.gray900,
    bold: true,
  });
  
  if (!data.facebook?.videos || data.facebook.videos.length === 0) {
    slide.addText('Keine Videos im ausgewählten Zeitraum', {
      x: 0.5,
      y: 3,
      w: SLIDE_WIDTH - 1,
      h: 1,
      fontSize: 18,
      fontFace: FONTS.body,
      color: COLORS.gray500,
      align: 'center',
    });
    return;
  }
  
  // Sort videos by views and take top 6
  const topVideos = [...data.facebook.videos]
    .sort((a, b) => b.videoViews - a.videoViews)
    .slice(0, 6);
  
  // Generate bar chart
  const chartLabels = topVideos.map((_, i) => `#${i + 1}`);
  const chartValues = topVideos.map(v => v.videoViews);
  
  try {
    const chartBuffer = await generateBarChart(
      chartLabels,
      chartValues,
      '3-Sek Views',
      `#${COLORS.facebook}`
    );
    
    slide.addImage({
      data: `data:image/png;base64,${chartBuffer.toString('base64')}`,
      x: 0.5,
      y: 1.2,
      w: 7,
      h: 4,
    });
  } catch (error) {
    console.error('Chart generation failed:', error);
  }
  
  // Add thumbnails
  const thumbStartX = 8;
  const thumbWidth = 1.5;
  const thumbHeight = 1;
  const thumbGap = 0.1;
  
  for (let i = 0; i < Math.min(topVideos.length, 6); i++) {
    const video = topVideos[i];
    const row = Math.floor(i / 2);
    const col = i % 2;
    const x = thumbStartX + col * (thumbWidth + thumbGap);
    const y = 1.2 + row * (thumbHeight + thumbGap + 0.4);
    
    // Video icon placeholder
    slide.addShape('rect', {
      x,
      y,
      w: thumbWidth,
      h: thumbHeight,
      fill: { color: COLORS.gray800 },
    });
    
    slide.addText('▶', {
      x,
      y,
      w: thumbWidth,
      h: thumbHeight,
      fontSize: 24,
      color: COLORS.white,
      align: 'center',
      valign: 'middle',
    });
    
    // Label
    slide.addText(`#${i + 1}: ${formatNumber(video.videoViews)} Views`, {
      x,
      y: y + thumbHeight + 0.05,
      w: thumbWidth,
      h: 0.3,
      fontSize: 8,
      fontFace: FONTS.body,
      color: COLORS.gray600,
      align: 'center',
    });
  }
}

async function createInstagramKPISlide(pptx: PptxGenJS, data: ReportData) {
  const slide = pptx.addSlide({ masterName: 'FAMEFACT_MASTER' });
  
  // Title
  slide.addText('Instagram Kennzahlen', {
    x: 0.5,
    y: 0.3,
    w: SLIDE_WIDTH - 1,
    h: 0.6,
    fontSize: 28,
    fontFace: FONTS.heading,
    color: COLORS.gray900,
    bold: true,
  });
  
  // Subtitle with months
  const months = data.instagram?.kpis?.map(k => formatShortMonth(k.month)).join(' | ') || '';
  slide.addText(`Vergleich: ${months}`, {
    x: 0.5,
    y: 0.9,
    w: SLIDE_WIDTH - 1,
    h: 0.4,
    fontSize: 14,
    fontFace: FONTS.body,
    color: COLORS.gray500,
  });
  
  if (!data.instagram?.kpis || data.instagram.kpis.length === 0) {
    slide.addText('Keine Daten verfügbar', {
      x: 0.5,
      y: 3,
      w: SLIDE_WIDTH - 1,
      h: 1,
      fontSize: 18,
      fontFace: FONTS.body,
      color: COLORS.gray500,
      align: 'center',
    });
    return;
  }
  
  const kpis = data.instagram.kpis;
  const current = kpis[0];
  const prev1 = kpis[1];
  const prev2 = kpis[2];
  
  // KPI Table
  const tableData: PptxGenJS.TableRow[] = [
    // Header row
    [
      { text: 'Metrik', options: { fill: { color: COLORS.instagram }, color: COLORS.white, bold: true, align: 'left' } },
      { text: formatShortMonth(current?.month || ''), options: { fill: { color: COLORS.instagram }, color: COLORS.white, bold: true, align: 'right' } },
      { text: formatShortMonth(prev1?.month || ''), options: { fill: { color: COLORS.instagram }, color: COLORS.white, bold: true, align: 'right' } },
      { text: formatShortMonth(prev2?.month || ''), options: { fill: { color: COLORS.instagram }, color: COLORS.white, bold: true, align: 'right' } },
      { text: 'Trend', options: { fill: { color: COLORS.instagram }, color: COLORS.white, bold: true, align: 'center' } },
    ],
    // Data rows
    createKPIRow('Posts', current?.postCount, prev1?.postCount, prev2?.postCount),
    createKPIRow('Reichweite', current?.reach, prev1?.reach, prev2?.reach),
    createKPIRow('Impressionen', current?.impressions, prev1?.impressions, prev2?.impressions),
    createKPIRow('Interaktionen', current?.interactions, prev1?.interactions, prev2?.interactions),
    createKPIRow('Likes', current?.likes, prev1?.likes, prev2?.likes),
    createKPIRow('Kommentare', current?.comments, prev1?.comments, prev2?.comments),
    createKPIRow('Saves', current?.saves, prev1?.saves, prev2?.saves),
    createKPIRow('Video Plays', current?.plays, prev1?.plays, prev2?.plays),
    createKPIRow('Ø Reichweite/Post', current?.avgReach, prev1?.avgReach, prev2?.avgReach),
  ];
  
  slide.addTable(tableData, {
    x: 0.5,
    y: 1.5,
    w: SLIDE_WIDTH - 1,
    colW: [3, 2.2, 2.2, 2.2, 2.2],
    fontSize: 11,
    fontFace: FONTS.body,
    border: { type: 'solid', pt: 0.5, color: COLORS.gray200 },
    rowH: 0.5,
  });
}

async function createInstagramPostsChartSlide(pptx: PptxGenJS, data: ReportData) {
  const slide = pptx.addSlide({ masterName: 'FAMEFACT_MASTER' });
  
  // Title
  slide.addText('Instagram: Postings nach Interaktion', {
    x: 0.5,
    y: 0.3,
    w: SLIDE_WIDTH - 1,
    h: 0.6,
    fontSize: 24,
    fontFace: FONTS.heading,
    color: COLORS.gray900,
    bold: true,
  });
  
  if (!data.instagram?.posts || data.instagram.posts.length === 0) {
    slide.addText('Keine Posts im ausgewählten Zeitraum', {
      x: 0.5,
      y: 3,
      w: SLIDE_WIDTH - 1,
      h: 1,
      fontSize: 18,
      fontFace: FONTS.body,
      color: COLORS.gray500,
      align: 'center',
    });
    return;
  }
  
  // Sort posts by interactions and take top 6
  const topPosts = [...data.instagram.posts]
    .sort((a, b) => b.interactions - a.interactions)
    .slice(0, 6);
  
  // Generate bar chart
  const chartLabels = topPosts.map((_, i) => `#${i + 1}`);
  const chartValues = topPosts.map(p => p.interactions);
  
  try {
    const chartBuffer = await generateBarChart(
      chartLabels,
      chartValues,
      'Interaktionen',
      `#${COLORS.instagram}`
    );
    
    slide.addImage({
      data: `data:image/png;base64,${chartBuffer.toString('base64')}`,
      x: 0.5,
      y: 1.2,
      w: 7,
      h: 4,
    });
  } catch (error) {
    console.error('Chart generation failed:', error);
  }
  
  // Add thumbnails
  const thumbStartX = 8;
  const thumbWidth = 1.5;
  const thumbHeight = 1;
  const thumbGap = 0.1;
  
  for (let i = 0; i < Math.min(topPosts.length, 6); i++) {
    const post = topPosts[i];
    const row = Math.floor(i / 2);
    const col = i % 2;
    const x = thumbStartX + col * (thumbWidth + thumbGap);
    const y = 1.2 + row * (thumbHeight + thumbGap + 0.4);
    
    // Thumbnail placeholder or image
    if (post.imageUrl) {
      try {
        const imgBuffer = await fetchAndOptimizeImage(post.imageUrl);
        slide.addImage({
          data: `data:image/jpeg;base64,${imgBuffer.toString('base64')}`,
          x,
          y,
          w: thumbWidth,
          h: thumbHeight,
        });
      } catch {
        slide.addShape('rect', {
          x,
          y,
          w: thumbWidth,
          h: thumbHeight,
          fill: { color: COLORS.gray200 },
        });
      }
    } else {
      slide.addShape('rect', {
        x,
        y,
        w: thumbWidth,
        h: thumbHeight,
        fill: { color: COLORS.gray200 },
      });
    }
    
    // Label
    slide.addText(`#${i + 1}: ${formatNumber(post.interactions)} Int.`, {
      x,
      y: y + thumbHeight + 0.05,
      w: thumbWidth,
      h: 0.3,
      fontSize: 8,
      fontFace: FONTS.body,
      color: COLORS.gray600,
      align: 'center',
    });
  }
}

async function createInstagramPostsTableSlide(pptx: PptxGenJS, data: ReportData) {
  const slide = pptx.addSlide({ masterName: 'FAMEFACT_MASTER' });
  
  // Title
  slide.addText('Instagram: Bild-Beiträge Übersicht', {
    x: 0.5,
    y: 0.3,
    w: SLIDE_WIDTH - 1,
    h: 0.6,
    fontSize: 24,
    fontFace: FONTS.heading,
    color: COLORS.gray900,
    bold: true,
  });
  
  if (!data.instagram?.posts || data.instagram.posts.length === 0) {
    slide.addText('Keine Bild-Beiträge im ausgewählten Zeitraum', {
      x: 0.5,
      y: 3,
      w: SLIDE_WIDTH - 1,
      h: 1,
      fontSize: 18,
      fontFace: FONTS.body,
      color: COLORS.gray500,
      align: 'center',
    });
    return;
  }
  
  // Filter only images and carousels, take top 10
  const imagePosts = data.instagram.posts
    .filter(p => p.type === 'IMAGE' || p.type === 'CAROUSEL_ALBUM')
    .slice(0, 10);
  
  // Table header
  const tableData: PptxGenJS.TableRow[] = [
    [
      { text: '#', options: { fill: { color: COLORS.instagram }, color: COLORS.white, bold: true, align: 'center' } },
      { text: 'Datum', options: { fill: { color: COLORS.instagram }, color: COLORS.white, bold: true, align: 'center' } },
      { text: 'Caption', options: { fill: { color: COLORS.instagram }, color: COLORS.white, bold: true, align: 'left' } },
      { text: 'Likes', options: { fill: { color: COLORS.instagram }, color: COLORS.white, bold: true, align: 'right' } },
      { text: 'Komm.', options: { fill: { color: COLORS.instagram }, color: COLORS.white, bold: true, align: 'right' } },
      { text: 'Saves', options: { fill: { color: COLORS.instagram }, color: COLORS.white, bold: true, align: 'right' } },
      { text: 'Reach', options: { fill: { color: COLORS.instagram }, color: COLORS.white, bold: true, align: 'right' } },
    ],
  ];
  
  // Data rows
  imagePosts.forEach((post, i) => {
    const isEven = i % 2 === 0;
    const bgColor = isEven ? COLORS.white : COLORS.gray50;
    tableData.push([
      { text: `${i + 1}`, options: { fill: { color: bgColor }, color: COLORS.gray700, align: 'center' } },
      { text: formatDate(post.date), options: { fill: { color: bgColor }, color: COLORS.gray700, align: 'center' } },
      { text: truncateText(post.caption, 40), options: { fill: { color: bgColor }, color: COLORS.gray700, align: 'left' } },
      { text: formatNumber(post.likes), options: { fill: { color: bgColor }, color: COLORS.gray900, bold: true, align: 'right' } },
      { text: formatNumber(post.comments), options: { fill: { color: bgColor }, color: COLORS.gray700, align: 'right' } },
      { text: formatNumber(post.saves), options: { fill: { color: bgColor }, color: COLORS.gray700, align: 'right' } },
      { text: formatNumber(post.reach), options: { fill: { color: bgColor }, color: COLORS.gray700, align: 'right' } },
    ]);
  });
  
  slide.addTable(tableData, {
    x: 0.5,
    y: 1.1,
    w: SLIDE_WIDTH - 1,
    colW: [0.5, 1.2, 5, 1.3, 1.3, 1.3, 1.3],
    fontSize: 9,
    fontFace: FONTS.body,
    border: { type: 'solid', pt: 0.5, color: COLORS.gray200 },
    rowH: 0.5,
  });
}

async function createInstagramReelsChartSlide(pptx: PptxGenJS, data: ReportData) {
  const slide = pptx.addSlide({ masterName: 'FAMEFACT_MASTER' });
  
  // Title
  slide.addText('Instagram: Reels nach Aufrufen', {
    x: 0.5,
    y: 0.3,
    w: SLIDE_WIDTH - 1,
    h: 0.6,
    fontSize: 24,
    fontFace: FONTS.heading,
    color: COLORS.gray900,
    bold: true,
  });
  
  if (!data.instagram?.reels || data.instagram.reels.length === 0) {
    slide.addText('Keine Reels im ausgewählten Zeitraum', {
      x: 0.5,
      y: 3,
      w: SLIDE_WIDTH - 1,
      h: 1,
      fontSize: 18,
      fontFace: FONTS.body,
      color: COLORS.gray500,
      align: 'center',
    });
    return;
  }
  
  // Sort reels by plays and take top 6
  const topReels = [...data.instagram.reels]
    .sort((a, b) => b.plays - a.plays)
    .slice(0, 6);
  
  // Generate bar chart
  const chartLabels = topReels.map((_, i) => `#${i + 1}`);
  const chartValues = topReels.map(r => r.plays);
  
  try {
    const chartBuffer = await generateBarChart(
      chartLabels,
      chartValues,
      'Aufrufe',
      `#${COLORS.instagram}`
    );
    
    slide.addImage({
      data: `data:image/png;base64,${chartBuffer.toString('base64')}`,
      x: 0.5,
      y: 1.2,
      w: 7,
      h: 4,
    });
  } catch (error) {
    console.error('Chart generation failed:', error);
  }
  
  // Add thumbnails
  const thumbStartX = 8;
  const thumbWidth = 1.5;
  const thumbHeight = 1;
  const thumbGap = 0.1;
  
  for (let i = 0; i < Math.min(topReels.length, 6); i++) {
    const reel = topReels[i];
    const row = Math.floor(i / 2);
    const col = i % 2;
    const x = thumbStartX + col * (thumbWidth + thumbGap);
    const y = 1.2 + row * (thumbHeight + thumbGap + 0.4);
    
    // Reel thumbnail with play icon
    if (reel.imageUrl) {
      try {
        const imgBuffer = await fetchAndOptimizeImage(reel.imageUrl);
        slide.addImage({
          data: `data:image/jpeg;base64,${imgBuffer.toString('base64')}`,
          x,
          y,
          w: thumbWidth,
          h: thumbHeight,
        });
      } catch {
        slide.addShape('rect', {
          x,
          y,
          w: thumbWidth,
          h: thumbHeight,
          fill: { color: COLORS.gray800 },
        });
      }
    } else {
      slide.addShape('rect', {
        x,
        y,
        w: thumbWidth,
        h: thumbHeight,
        fill: { color: COLORS.gray800 },
      });
    }
    
    // Play icon overlay
    slide.addText('▶', {
      x,
      y,
      w: thumbWidth,
      h: thumbHeight,
      fontSize: 20,
      color: COLORS.white,
      align: 'center',
      valign: 'middle',
    });
    
    // Label
    slide.addText(`#${i + 1}: ${formatNumber(reel.plays)} Views`, {
      x,
      y: y + thumbHeight + 0.05,
      w: thumbWidth,
      h: 0.3,
      fontSize: 8,
      fontFace: FONTS.body,
      color: COLORS.gray600,
      align: 'center',
    });
  }
}

async function createInstagramReelsTableSlide(pptx: PptxGenJS, data: ReportData) {
  const slide = pptx.addSlide({ masterName: 'FAMEFACT_MASTER' });
  
  // Title
  slide.addText('Instagram: Reels Übersicht', {
    x: 0.5,
    y: 0.3,
    w: SLIDE_WIDTH - 1,
    h: 0.6,
    fontSize: 24,
    fontFace: FONTS.heading,
    color: COLORS.gray900,
    bold: true,
  });
  
  if (!data.instagram?.reels || data.instagram.reels.length === 0) {
    slide.addText('Keine Reels im ausgewählten Zeitraum', {
      x: 0.5,
      y: 3,
      w: SLIDE_WIDTH - 1,
      h: 1,
      fontSize: 18,
      fontFace: FONTS.body,
      color: COLORS.gray500,
      align: 'center',
    });
    return;
  }
  
  // Take top 10 reels
  const reels = data.instagram.reels.slice(0, 10);
  
  // Table header
  const tableData: PptxGenJS.TableRow[] = [
    [
      { text: '#', options: { fill: { color: COLORS.instagram }, color: COLORS.white, bold: true, align: 'center' } },
      { text: 'Datum', options: { fill: { color: COLORS.instagram }, color: COLORS.white, bold: true, align: 'center' } },
      { text: 'Caption', options: { fill: { color: COLORS.instagram }, color: COLORS.white, bold: true, align: 'left' } },
      { text: 'Plays', options: { fill: { color: COLORS.instagram }, color: COLORS.white, bold: true, align: 'right' } },
      { text: 'Likes', options: { fill: { color: COLORS.instagram }, color: COLORS.white, bold: true, align: 'right' } },
      { text: 'Komm.', options: { fill: { color: COLORS.instagram }, color: COLORS.white, bold: true, align: 'right' } },
      { text: 'Saves', options: { fill: { color: COLORS.instagram }, color: COLORS.white, bold: true, align: 'right' } },
    ],
  ];
  
  // Data rows
  reels.forEach((reel, i) => {
    const isEven = i % 2 === 0;
    const bgColor = isEven ? COLORS.white : COLORS.gray50;
    tableData.push([
      { text: `${i + 1}`, options: { fill: { color: bgColor }, color: COLORS.gray700, align: 'center' } },
      { text: formatDate(reel.date), options: { fill: { color: bgColor }, color: COLORS.gray700, align: 'center' } },
      { text: truncateText(reel.caption, 40), options: { fill: { color: bgColor }, color: COLORS.gray700, align: 'left' } },
      { text: formatNumber(reel.plays), options: { fill: { color: bgColor }, color: COLORS.gray900, bold: true, align: 'right' } },
      { text: formatNumber(reel.likes), options: { fill: { color: bgColor }, color: COLORS.gray700, align: 'right' } },
      { text: formatNumber(reel.comments), options: { fill: { color: bgColor }, color: COLORS.gray700, align: 'right' } },
      { text: formatNumber(reel.saves), options: { fill: { color: bgColor }, color: COLORS.gray700, align: 'right' } },
    ]);
  });
  
  slide.addTable(tableData, {
    x: 0.5,
    y: 1.1,
    w: SLIDE_WIDTH - 1,
    colW: [0.5, 1.2, 5, 1.5, 1.3, 1.3, 1.3],
    fontSize: 9,
    fontFace: FONTS.body,
    border: { type: 'solid', pt: 0.5, color: COLORS.gray200 },
    rowH: 0.5,
  });
}

async function createFazitSlide(pptx: PptxGenJS, data: ReportData) {
  const slide = pptx.addSlide({ masterName: 'FAMEFACT_MASTER' });
  
  // Title
  slide.addText('Fazit & Empfehlungen', {
    x: 0.5,
    y: 0.3,
    w: SLIDE_WIDTH - 1,
    h: 0.6,
    fontSize: 28,
    fontFace: FONTS.heading,
    color: COLORS.gray900,
    bold: true,
  });
  
  // Generate automatic summary
  const fazitText = generateFazitText(data);
  
  slide.addText(fazitText, {
    x: 0.5,
    y: 1.2,
    w: SLIDE_WIDTH - 1,
    h: 5.5,
    fontSize: 14,
    fontFace: FONTS.body,
    color: COLORS.gray700,
    valign: 'top',
    paraSpaceBefore: 6,
    paraSpaceAfter: 6,
  });
}

function generateFazitText(data: ReportData): string {
  const lines: string[] = [];
  const monthName = formatMonthName(data.month);
  
  lines.push(`Social Media Performance ${monthName}`);
  lines.push('');
  
  // Facebook summary
  if (data.facebook?.kpis && data.facebook.kpis.length > 0) {
    const fbCurrent = data.facebook.kpis[0];
    const fbPrev = data.facebook.kpis[1];
    
    lines.push('📘 Facebook:');
    lines.push(`• ${fbCurrent.postCount} Posts veröffentlicht`);
    lines.push(`• ${formatNumber(fbCurrent.interactions)} Interaktionen (Reactions + Kommentare)`);
    
    if (fbPrev && fbPrev.interactions > 0) {
      const change = ((fbCurrent.interactions - fbPrev.interactions) / fbPrev.interactions * 100).toFixed(1);
      const trend = parseFloat(change) >= 0 ? '📈' : '📉';
      lines.push(`• Trend: ${trend} ${change}% im Vergleich zum Vormonat`);
    }
    
    if (data.facebook.videos && data.facebook.videos.length > 0) {
      const totalViews = data.facebook.videos.reduce((sum, v) => sum + v.videoViews, 0);
      lines.push(`• ${formatNumber(totalViews)} Video-Views (3 Sekunden)`);
    }
    lines.push('');
  }
  
  // Instagram summary
  if (data.instagram?.kpis && data.instagram.kpis.length > 0) {
    const igCurrent = data.instagram.kpis[0];
    const igPrev = data.instagram.kpis[1];
    
    lines.push('📸 Instagram:');
    lines.push(`• ${igCurrent.postCount} Posts veröffentlicht`);
    lines.push(`• ${formatNumber(igCurrent.interactions)} Interaktionen (Likes + Kommentare + Saves)`);
    
    if (igPrev && igPrev.interactions > 0) {
      const change = ((igCurrent.interactions - igPrev.interactions) / igPrev.interactions * 100).toFixed(1);
      const trend = parseFloat(change) >= 0 ? '📈' : '📉';
      lines.push(`• Trend: ${trend} ${change}% im Vergleich zum Vormonat`);
    }
    
    if (data.instagram.reels && data.instagram.reels.length > 0) {
      const totalPlays = data.instagram.reels.reduce((sum, r) => sum + r.plays, 0);
      lines.push(`• ${formatNumber(totalPlays)} Reel-Aufrufe`);
    }
    lines.push('');
  }
  
  // Recommendations
  lines.push('💡 Empfehlungen:');
  lines.push('• Weiterhin auf hochwertige visuelle Inhalte setzen');
  lines.push('• Video-Content (Reels) für höhere Reichweite nutzen');
  lines.push('• Community-Interaktion durch Fragen und CTAs fördern');
  
  return lines.join('\n');
}

async function createContactSlide(pptx: PptxGenJS) {
  const slide = pptx.addSlide({ masterName: 'FAMEFACT_MASTER' });
  
  // Dark background
  slide.background = { color: COLORS.black };
  
  // famefact logo
  slide.addText('famefact', {
    x: 0,
    y: 2,
    w: SLIDE_WIDTH,
    h: 1,
    fontSize: 48,
    fontFace: FONTS.heading,
    color: COLORS.famefactGreen,
    bold: true,
    align: 'center',
  });
  
  // Tagline
  slide.addText('Social Media Marketing Agentur', {
    x: 0,
    y: 3.2,
    w: SLIDE_WIDTH,
    h: 0.5,
    fontSize: 20,
    fontFace: FONTS.body,
    color: COLORS.gray400,
    align: 'center',
  });
  
  // Contact info
  slide.addText('www.famefact.com | info@famefact.com', {
    x: 0,
    y: 4.2,
    w: SLIDE_WIDTH,
    h: 0.4,
    fontSize: 14,
    fontFace: FONTS.body,
    color: COLORS.gray500,
    align: 'center',
  });
  
  // Decorative line
  slide.addShape('rect', {
    x: (SLIDE_WIDTH - 3) / 2,
    y: 5,
    w: 3,
    h: 0.05,
    fill: { color: COLORS.famefactGreen },
  });
  
  // Footer
  slide.addText('© famefact GmbH - Alle Rechte vorbehalten', {
    x: 0,
    y: 6.8,
    w: SLIDE_WIDTH,
    h: 0.3,
    fontSize: 10,
    fontFace: FONTS.body,
    color: COLORS.gray600,
    align: 'center',
  });
}
