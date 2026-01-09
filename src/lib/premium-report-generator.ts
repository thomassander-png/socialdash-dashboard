/**
 * PREMIUM REPORT GENERATOR
 * 
 * Profiagentur-Level PowerPoint Reports
 * - Modernes, minimalistisches Design
 * - Hochwertige Typografie und Abstände
 * - Premium Farbpalette mit Gradients
 * - Professionelle Tabellen und Charts
 */

import PptxGenJS from 'pptxgenjs';
import {
  generatePremiumBarChart,
  // generatePremiumComparisonChart,
  // generatePremiumLineChart,
  // generatePremiumDoughnutChart,
  fetchAndOptimizeImage,
  // PREMIUM_COLORS,
} from './premium-chart-generator';

// Slide dimensions (16:9)
const SLIDE_WIDTH = 13.333;
const SLIDE_HEIGHT = 7.5;

// Premium Design System
const DESIGN = {
  // Margins and spacing
  margin: {
    outer: 0.5,
    inner: 0.3,
  },
  
  // Typography
  fonts: {
    heading: 'Arial',
    body: 'Arial',
    mono: 'Consolas',
  },
  
  sizes: {
    title: 36,
    subtitle: 24,
    heading: 20,
    body: 12,
    caption: 10,
    tiny: 8,
  },
  
  // Colors
  colors: {
    // Primary palette
    primary: '1E3A8A',
    primaryLight: '3B82F6',
    primaryDark: '1E40AF',
    
    // Neutral palette
    white: 'FFFFFF',
    black: '111827',
    gray900: '111827',
    gray800: '1F2937',
    gray700: '374151',
    gray600: '4B5563',
    gray500: '6B7280',
    gray400: '9CA3AF',
    gray300: 'D1D5DB',
    gray200: 'E5E7EB',
    gray100: 'F3F4F6',
    gray50: 'F9FAFB',
    
    // Accent colors
    success: '10B981',
    warning: 'F59E0B',
    danger: 'EF4444',
    info: '3B82F6',
    
    // Brand colors
    famefactBlack: '0D0D0D',
    famefactGreen: '84CC16',
  },
  
  // Table styles
  table: {
    headerBg: '1E3A8A',
    headerText: 'FFFFFF',
    rowEven: 'F9FAFB',
    rowOdd: 'FFFFFF',
    border: 'E5E7EB',
    text: '374151',
  },
};

// Helper functions
function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '-';
  return num.toLocaleString('de-DE');
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

function getMonthName(monthStr: string): string {
  const months: Record<string, string> = {
    '01': 'Januar', '02': 'Februar', '03': 'März', '04': 'April',
    '05': 'Mai', '06': 'Juni', '07': 'Juli', '08': 'August',
    '09': 'September', '10': 'Oktober', '11': 'November', '12': 'Dezember'
  };
  const [year, month] = monthStr.split('-');
  return `${months[month]} ${year}`;
}

function getShortMonthName(monthStr: string): string {
  const months: Record<string, string> = {
    '01': 'Jan', '02': 'Feb', '03': 'Mär', '04': 'Apr',
    '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Aug',
    '09': 'Sep', '10': 'Okt', '11': 'Nov', '12': 'Dez'
  };
  const [year, month] = monthStr.split('-');
  return `${months[month]} ${year.slice(2)}`;
}

// Slide creation helpers
function addSlideHeader(
  slide: PptxGenJS.Slide,
  title: string,
  platform?: 'facebook' | 'instagram'
) {
  // Platform indicator
  if (platform) {
    const platformColors = {
      facebook: { bg: '1877F2', text: 'FFFFFF', label: 'f' },
      instagram: { bg: 'E4405F', text: 'FFFFFF', label: 'IG' },
    };
    const p = platformColors[platform];
    
    slide.addShape('rect', {
      x: DESIGN.margin.outer,
      y: DESIGN.margin.outer,
      w: 0.5,
      h: 0.5,
      fill: { color: p.bg },
      line: { color: p.bg, width: 0 },
    });
    
    slide.addText(p.label, {
      x: DESIGN.margin.outer,
      y: DESIGN.margin.outer,
      w: 0.5,
      h: 0.5,
      fontSize: 14,
      fontFace: DESIGN.fonts.heading,
      bold: true,
      color: p.text,
      align: 'center',
      valign: 'middle',
    });
  }
  
  // Title
  slide.addText(title, {
    x: platform ? 1.2 : DESIGN.margin.outer,
    y: DESIGN.margin.outer,
    w: SLIDE_WIDTH - (platform ? 1.7 : 1),
    h: 0.6,
    fontSize: DESIGN.sizes.title,
    fontFace: DESIGN.fonts.heading,
    bold: true,
    color: DESIGN.colors.gray900,
  });
  
  // Subtle separator line
  slide.addShape('rect', {
    x: DESIGN.margin.outer,
    y: 1.2,
    w: SLIDE_WIDTH - (2 * DESIGN.margin.outer),
    h: 0.02,
    fill: { color: DESIGN.colors.gray200 },
    line: { color: DESIGN.colors.gray200, width: 0 },
  });
}

function addSlideFooter(slide: PptxGenJS.Slide, pageNum: number) {
  // Famefact logo text
  slide.addText('famefact', {
    x: DESIGN.margin.outer,
    y: SLIDE_HEIGHT - 0.4,
    w: 1.5,
    h: 0.3,
    fontSize: DESIGN.sizes.body,
    fontFace: DESIGN.fonts.heading,
    bold: true,
    color: DESIGN.colors.gray600,
  });
  
  // Page number
  slide.addText(pageNum.toString(), {
    x: SLIDE_WIDTH - 0.8,
    y: SLIDE_HEIGHT - 0.4,
    w: 0.5,
    h: 0.3,
    fontSize: DESIGN.sizes.body,
    fontFace: DESIGN.fonts.body,
    color: DESIGN.colors.gray500,
    align: 'right',
  });
}

// Premium KPI Table
function createKPITable(
  slide: PptxGenJS.Slide,
  kpiData: Array<{ label: string; values: string[] }>,
  months: string[],
  startY: number = 1.4
) {
  const rows: PptxGenJS.TableRow[] = [];
  
  // Header row
  rows.push([
    { 
      text: 'KPI', 
      options: { 
        fill: { color: DESIGN.table.headerBg }, 
        color: DESIGN.table.headerText, 
        bold: true,
        align: 'left',
        valign: 'middle',
      } 
    },
    ...months.map(m => ({ 
      text: getShortMonthName(m), 
      options: { 
        fill: { color: DESIGN.table.headerBg }, 
        color: DESIGN.table.headerText, 
        bold: true,
        align: 'center',
        valign: 'middle',
      } 
    })),
  ]);
  
  // Data rows
  kpiData.forEach((kpi, idx) => {
    const bgColor = idx % 2 === 0 ? DESIGN.table.rowEven : DESIGN.table.rowOdd;
    rows.push([
      { 
        text: kpi.label, 
        options: { 
          fill: { color: bgColor },
          color: DESIGN.table.text,
          align: 'left',
          valign: 'middle',
        } 
      },
      ...kpi.values.map(v => ({ 
        text: v, 
        options: { 
          fill: { color: bgColor },
          color: DESIGN.table.text,
          align: 'center',
          valign: 'middle',
        } 
      })),
    ]);
  });
  
  slide.addTable(rows, {
    x: DESIGN.margin.outer,
    y: startY,
    w: SLIDE_WIDTH - (2 * DESIGN.margin.outer),
    colW: [4, 2.8, 2.8, 2.8],
    rowH: 0.45,
    fontSize: DESIGN.sizes.body,
    fontFace: DESIGN.fonts.body,
    border: { type: 'solid', pt: 0.5, color: DESIGN.table.border },
    margin: [0.1, 0.15, 0.1, 0.15],
  });
}

// Types
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
    kpis: Array<{ month: string; reach: number; impressions: number; interactions: number; reactions: number; comments: number; shares: number; videoViews: number; postCount: number; avgReach: number }>;
    posts: Array<{ postId: string; date: string; type: string; message: string; reactions: number; comments: number; shares: number; reach: number; impressions: number; videoViews: number; interactions: number; imageUrl: string }>;
    videos: Array<{ postId: string; date: string; message: string; videoViews: number; reach: number; interactions: number; imageUrl: string }>;
  };
  instagram?: {
    kpis: Array<{ month: string; reach: number; impressions: number; interactions: number; likes: number; comments: number; saves: number; plays: number; postCount: number; avgReach: number }>;
    posts: Array<{ mediaId: string; date: string; type: string; caption: string; likes: number; comments: number; saves: number; reach: number; impressions: number; plays: number; interactions: number; imageUrl: string }>;
    reels: Array<{ mediaId: string; date: string; caption: string; plays: number; likes: number; comments: number; saves: number; reach: number; interactions: number; imageUrl: string }>;
  };
}

/**
 * Generate a premium PowerPoint report
 */
export async function generatePremiumReport(data: ReportData): Promise<Buffer> {
  const pptx = new PptxGenJS();
  
  // Set presentation properties
  pptx.author = 'famefact';
  pptx.company = 'track by track GmbH';
  pptx.title = `${data.customer.name} - Social Media Report ${getMonthName(data.month)}`;
  pptx.subject = 'Monthly Social Media Performance Report';
  
  // Set slide size to 16:9
  pptx.defineLayout({ name: 'LAYOUT_16x9', width: SLIDE_WIDTH, height: SLIDE_HEIGHT });
  pptx.layout = 'LAYOUT_16x9';
  
  let slideNum = 0;
  
  // ============ SLIDE 1: COVER ============
  const coverSlide = pptx.addSlide();
  slideNum++;
  
  // Dark gradient background
  coverSlide.background = { color: DESIGN.colors.famefactBlack };
  
  // Famefact logo
  coverSlide.addText('famefact.', {
    x: DESIGN.margin.outer,
    y: DESIGN.margin.outer,
    w: 3,
    h: 0.5,
    fontSize: 24,
    fontFace: DESIGN.fonts.heading,
    bold: true,
    color: DESIGN.colors.white,
  });
  
  // Customer name
  coverSlide.addText(data.customer.name, {
    x: DESIGN.margin.outer,
    y: 2.5,
    w: SLIDE_WIDTH - 1,
    h: 1,
    fontSize: 48,
    fontFace: DESIGN.fonts.heading,
    bold: true,
    color: DESIGN.colors.white,
  });
  
  // Report title
  coverSlide.addText('Social Media Report', {
    x: DESIGN.margin.outer,
    y: 3.6,
    w: SLIDE_WIDTH - 1,
    h: 0.6,
    fontSize: 28,
    fontFace: DESIGN.fonts.body,
    color: DESIGN.colors.gray400,
  });
  
  // Month
  coverSlide.addText(getMonthName(data.month), {
    x: DESIGN.margin.outer,
    y: 4.3,
    w: SLIDE_WIDTH - 1,
    h: 0.5,
    fontSize: 20,
    fontFace: DESIGN.fonts.body,
    color: DESIGN.colors.famefactGreen,
  });
  
  // ============ FACEBOOK SECTION ============
  if (data.facebook && data.facebook.kpis.length > 0) {
    // SLIDE: Facebook Separator
    const fbSepSlide = pptx.addSlide();
    slideNum++;
    fbSepSlide.background = { color: '1877F2' };
    
    fbSepSlide.addText('Facebook', {
      x: 0,
      y: 2.5,
      w: SLIDE_WIDTH,
      h: 1.5,
      fontSize: 72,
      fontFace: DESIGN.fonts.heading,
      bold: true,
      color: DESIGN.colors.white,
      align: 'center',
    });
    
    fbSepSlide.addText('Performance Overview', {
      x: 0,
      y: 4,
      w: SLIDE_WIDTH,
      h: 0.6,
      fontSize: 24,
      fontFace: DESIGN.fonts.body,
      color: 'FFFFFF99',
      align: 'center',
    });
    
    // SLIDE: Facebook KPIs
    const fbKpiSlide = pptx.addSlide();
    slideNum++;
    addSlideHeader(fbKpiSlide, 'Facebook Kennzahlen', 'facebook');
    
    const fbKpi = data.facebook.kpis[0];
    const fbKpiPrev1 = data.facebook.kpis[1];
    const fbKpiPrev2 = data.facebook.kpis[2];
    
    const fbKpiData = [
      { label: 'Post-Reichweite', values: [formatNumber(fbKpi?.reach), formatNumber(fbKpiPrev1?.reach), formatNumber(fbKpiPrev2?.reach)] },
      { label: 'Ø Reichweite pro Post', values: [formatNumber(Math.round(fbKpi?.avgReach || 0)), formatNumber(Math.round(fbKpiPrev1?.avgReach || 0)), formatNumber(Math.round(fbKpiPrev2?.avgReach || 0))] },
      { label: 'Interaktionen', values: [formatNumber(fbKpi?.interactions), formatNumber(fbKpiPrev1?.interactions), formatNumber(fbKpiPrev2?.interactions)] },
      { label: 'Reaktionen', values: [formatNumber(fbKpi?.reactions), formatNumber(fbKpiPrev1?.reactions), formatNumber(fbKpiPrev2?.reactions)] },
      { label: 'Kommentare', values: [formatNumber(fbKpi?.comments), formatNumber(fbKpiPrev1?.comments), formatNumber(fbKpiPrev2?.comments)] },
      { label: 'Shares', values: [formatNumber(fbKpi?.shares), formatNumber(fbKpiPrev1?.shares), formatNumber(fbKpiPrev2?.shares)] },
      { label: 'Video Views (3-Sek)', values: [formatNumber(fbKpi?.videoViews), formatNumber(fbKpiPrev1?.videoViews), formatNumber(fbKpiPrev2?.videoViews)] },
      { label: 'Interaktionsrate', values: [
        fbKpi?.reach > 0 ? ((fbKpi.interactions / fbKpi.reach) * 100).toFixed(2) + ' %' : '-',
        fbKpiPrev1?.reach > 0 ? ((fbKpiPrev1.interactions / fbKpiPrev1.reach) * 100).toFixed(2) + ' %' : '-',
        fbKpiPrev2?.reach > 0 ? ((fbKpiPrev2.interactions / fbKpiPrev2.reach) * 100).toFixed(2) + ' %' : '-',
      ]},
      { label: 'Anzahl Postings', values: [formatNumber(fbKpi?.postCount), formatNumber(fbKpiPrev1?.postCount), formatNumber(fbKpiPrev2?.postCount)] },
    ];
    
    createKPITable(fbKpiSlide, fbKpiData, [data.month, data.prevMonth1, data.prevMonth2]);
    
    fbKpiSlide.addText('*Die Interaktionsrate berechnet sich aus Interaktionen geteilt durch Post-Reichweite mal 100.', {
      x: DESIGN.margin.outer,
      y: 6.2,
      w: SLIDE_WIDTH - 1,
      h: 0.3,
      fontSize: DESIGN.sizes.caption,
      fontFace: DESIGN.fonts.body,
      color: DESIGN.colors.gray500,
    });
    
    addSlideFooter(fbKpiSlide, slideNum);
    
    // SLIDE: Facebook Posts Chart
    if (data.facebook.posts.length > 0) {
      const fbPostsSlide = pptx.addSlide();
      slideNum++;
      addSlideHeader(fbPostsSlide, 'Top Posts nach Interaktionen', 'facebook');
      
      const topPosts = data.facebook.posts.slice(0, 6);
      
      // Generate premium chart
      const chartImage = await generatePremiumBarChart(
        {
          labels: topPosts.map(p => formatDate(p.date)),
          values: topPosts.map(p => p.interactions),
          label: 'Interaktionen',
        },
        {
          showValues: true,
          maxValue: Math.max(...topPosts.map(p => p.interactions)) * 1.3,
          gradient: true,
        }
      );
      
      // Add chart
      fbPostsSlide.addImage({
        data: chartImage,
        x: DESIGN.margin.outer,
        y: 1.4,
        w: SLIDE_WIDTH - 1,
        h: 4.0,
      });
      
      // Add post thumbnails above bars
      const barWidth = (SLIDE_WIDTH - 1) / topPosts.length;
      const maxVal = Math.max(...topPosts.map(p => p.interactions)) * 1.3;
      
      for (let i = 0; i < topPosts.length; i++) {
        const post = topPosts[i];
        if (post.imageUrl) {
          const imgData = await fetchAndOptimizeImage(post.imageUrl, 400, 400);
          if (imgData) {
            const barHeight = (post.interactions / maxVal) * 3.5;
            fbPostsSlide.addImage({
              data: imgData,
              x: DESIGN.margin.outer + (i * barWidth) + (barWidth * 0.15),
              y: 5.4 - barHeight - 0.9,
              w: barWidth * 0.7,
              h: 0.8,
            });
          }
        }
      }
      
      fbPostsSlide.addText('Interaktionen = Reaktionen + Kommentare + Shares', {
        x: DESIGN.margin.outer,
        y: 6.2,
        w: SLIDE_WIDTH - 1,
        h: 0.3,
        fontSize: DESIGN.sizes.caption,
        fontFace: DESIGN.fonts.body,
        color: DESIGN.colors.gray500,
      });
      
      addSlideFooter(fbPostsSlide, slideNum);
    }
    
    // SLIDE: Facebook Videos Chart
    if (data.facebook.videos.length > 0) {
      const fbVideosSlide = pptx.addSlide();
      slideNum++;
      addSlideHeader(fbVideosSlide, 'Videos nach 3-Sekunden Views', 'facebook');
      
      const topVideos = data.facebook.videos.slice(0, 6);
      
      const videoChartImage = await generatePremiumBarChart(
        {
          labels: topVideos.map(v => formatDate(v.date)),
          values: topVideos.map(v => v.videoViews),
          label: 'Video Views',
        },
        {
          showValues: true,
          maxValue: Math.max(...topVideos.map(v => v.videoViews)) * 1.3,
          gradient: true,
        }
      );
      
      fbVideosSlide.addImage({
        data: videoChartImage,
        x: DESIGN.margin.outer,
        y: 1.4,
        w: SLIDE_WIDTH - 1,
        h: 4.5,
      });
      
      addSlideFooter(fbVideosSlide, slideNum);
    }
  }
  
  // ============ INSTAGRAM SECTION ============
  if (data.instagram && data.instagram.kpis.length > 0) {
    // SLIDE: Instagram Separator
    const igSepSlide = pptx.addSlide();
    slideNum++;
    
    // Instagram gradient background
    igSepSlide.background = { color: 'E4405F' };
    
    igSepSlide.addText('Instagram', {
      x: 0,
      y: 2.5,
      w: SLIDE_WIDTH,
      h: 1.5,
      fontSize: 72,
      fontFace: DESIGN.fonts.heading,
      bold: true,
      color: DESIGN.colors.white,
      align: 'center',
    });
    
    igSepSlide.addText('Performance Overview', {
      x: 0,
      y: 4,
      w: SLIDE_WIDTH,
      h: 0.6,
      fontSize: 24,
      fontFace: DESIGN.fonts.body,
      color: 'FFFFFF99',
      align: 'center',
    });
    
    // SLIDE: Instagram KPIs
    const igKpiSlide = pptx.addSlide();
    slideNum++;
    addSlideHeader(igKpiSlide, 'Instagram Kennzahlen', 'instagram');
    
    const igKpi = data.instagram.kpis[0];
    const igKpiPrev1 = data.instagram.kpis[1];
    const igKpiPrev2 = data.instagram.kpis[2];
    
    const igKpiData = [
      { label: 'Post-Reichweite', values: [formatNumber(igKpi?.reach), formatNumber(igKpiPrev1?.reach), formatNumber(igKpiPrev2?.reach)] },
      { label: 'Ø Reichweite pro Post', values: [formatNumber(Math.round(igKpi?.avgReach || 0)), formatNumber(Math.round(igKpiPrev1?.avgReach || 0)), formatNumber(Math.round(igKpiPrev2?.avgReach || 0))] },
      { label: 'Interaktionen', values: [formatNumber(igKpi?.interactions), formatNumber(igKpiPrev1?.interactions), formatNumber(igKpiPrev2?.interactions)] },
      { label: 'Likes', values: [formatNumber(igKpi?.likes), formatNumber(igKpiPrev1?.likes), formatNumber(igKpiPrev2?.likes)] },
      { label: 'Kommentare', values: [formatNumber(igKpi?.comments), formatNumber(igKpiPrev1?.comments), formatNumber(igKpiPrev2?.comments)] },
      { label: 'Saves', values: [formatNumber(igKpi?.saves), formatNumber(igKpiPrev1?.saves), formatNumber(igKpiPrev2?.saves)] },
      { label: 'Video Views', values: [formatNumber(igKpi?.plays), formatNumber(igKpiPrev1?.plays), formatNumber(igKpiPrev2?.plays)] },
      { label: 'Anzahl Postings', values: [formatNumber(igKpi?.postCount), formatNumber(igKpiPrev1?.postCount), formatNumber(igKpiPrev2?.postCount)] },
    ];
    
    createKPITable(igKpiSlide, igKpiData, [data.month, data.prevMonth1, data.prevMonth2]);
    addSlideFooter(igKpiSlide, slideNum);
    
    // SLIDE: Instagram Posts Chart
    if (data.instagram.posts.length > 0) {
      const igPostsSlide = pptx.addSlide();
      slideNum++;
      addSlideHeader(igPostsSlide, 'Top Posts nach Interaktionen', 'instagram');
      
      const topIgPosts = data.instagram.posts.slice(0, 6);
      
      const igChartImage = await generatePremiumBarChart(
        {
          labels: topIgPosts.map(p => formatDate(p.date)),
          values: topIgPosts.map(p => p.interactions),
          label: 'Interaktionen',
        },
        {
          showValues: true,
          maxValue: Math.max(...topIgPosts.map(p => p.interactions)) * 1.3,
          gradient: true,
        }
      );
      
      igPostsSlide.addImage({
        data: igChartImage,
        x: DESIGN.margin.outer,
        y: 1.4,
        w: SLIDE_WIDTH - 1,
        h: 4.0,
      });
      
      // Add post thumbnails
      const igBarWidth = (SLIDE_WIDTH - 1) / topIgPosts.length;
      const maxIgVal = Math.max(...topIgPosts.map(p => p.interactions)) * 1.3;
      
      for (let i = 0; i < topIgPosts.length; i++) {
        const post = topIgPosts[i];
        if (post.imageUrl) {
          const imgData = await fetchAndOptimizeImage(post.imageUrl, 400, 400);
          if (imgData) {
            const barHeight = (post.interactions / maxIgVal) * 3.5;
            igPostsSlide.addImage({
              data: imgData,
              x: DESIGN.margin.outer + (i * igBarWidth) + (igBarWidth * 0.15),
              y: 5.4 - barHeight - 0.9,
              w: igBarWidth * 0.7,
              h: 0.8,
            });
          }
        }
      }
      
      igPostsSlide.addText('Interaktionen = Likes + Kommentare + Saves', {
        x: DESIGN.margin.outer,
        y: 6.2,
        w: SLIDE_WIDTH - 1,
        h: 0.3,
        fontSize: DESIGN.sizes.caption,
        fontFace: DESIGN.fonts.body,
        color: DESIGN.colors.gray500,
      });
      
      addSlideFooter(igPostsSlide, slideNum);
    }
    
    // SLIDE: Instagram Posts Table
    if (data.instagram.posts.length > 0) {
      const igTableSlide = pptx.addSlide();
      slideNum++;
      addSlideHeader(igTableSlide, 'Bild-Beiträge Übersicht', 'instagram');
      
      const postsToShow = data.instagram.posts.slice(0, 6);
      const colCount = postsToShow.length + 1;
      const colWidth = (SLIDE_WIDTH - 1) / colCount;
      
      // Create table rows
      const tableRows: PptxGenJS.TableRow[] = [
        [
          { text: 'Datum', options: { fill: { color: DESIGN.table.headerBg }, color: DESIGN.table.headerText, bold: true } },
          ...postsToShow.map(p => ({ 
            text: formatDate(p.date), 
            options: { fill: { color: DESIGN.table.headerBg }, color: DESIGN.table.headerText, bold: true, align: 'center' as const } 
          })),
        ],
        [
          { text: '', options: { fill: { color: DESIGN.colors.white } } },
          ...postsToShow.map(() => ({ text: '', options: { fill: { color: DESIGN.colors.white }, align: 'center' as const } })),
        ],
        [
          { text: 'Reichweite', options: { fill: { color: DESIGN.table.rowEven } } },
          ...postsToShow.map(p => ({ text: formatNumber(p.reach), options: { fill: { color: DESIGN.table.rowEven }, align: 'center' as const } })),
        ],
        [
          { text: 'Interaktionen', options: { fill: { color: DESIGN.table.rowOdd } } },
          ...postsToShow.map(p => ({ text: formatNumber(p.interactions), options: { fill: { color: DESIGN.table.rowOdd }, align: 'center' as const } })),
        ],
        [
          { text: 'Saves', options: { fill: { color: DESIGN.table.rowEven } } },
          ...postsToShow.map(p => ({ text: formatNumber(p.saves), options: { fill: { color: DESIGN.table.rowEven }, align: 'center' as const } })),
        ],
      ];
      
      igTableSlide.addTable(tableRows, {
        x: DESIGN.margin.outer,
        y: 1.4,
        w: SLIDE_WIDTH - 1,
        rowH: [0.35, 1.3, 0.35, 0.35, 0.35],
        fontSize: DESIGN.sizes.body,
        fontFace: DESIGN.fonts.body,
        border: { type: 'solid', pt: 0.5, color: DESIGN.table.border },
      });
      
      // Add images to table
      for (let i = 0; i < postsToShow.length; i++) {
        const post = postsToShow[i];
        if (post.imageUrl) {
          const imgData = await fetchAndOptimizeImage(post.imageUrl, 400, 400);
          if (imgData) {
            const imgX = DESIGN.margin.outer + colWidth + (i * colWidth) + (colWidth * 0.1);
            igTableSlide.addImage({
              data: imgData,
              x: imgX,
              y: 1.8,
              w: colWidth * 0.8,
              h: 1.1,
            });
          }
        }
      }
      
      addSlideFooter(igTableSlide, slideNum);
    }
    
    // SLIDE: Instagram Reels Chart
    if (data.instagram.reels.length > 0) {
      const igReelsSlide = pptx.addSlide();
      slideNum++;
      addSlideHeader(igReelsSlide, 'Reels nach Video Views', 'instagram');
      
      const topReels = data.instagram.reels.slice(0, 6);
      
      const reelsChartImage = await generatePremiumBarChart(
        {
          labels: topReels.map(r => formatDate(r.date)),
          values: topReels.map(r => r.plays),
          label: 'Video Views',
        },
        {
          showValues: true,
          maxValue: Math.max(...topReels.map(r => r.plays)) * 1.3,
          gradient: true,
        }
      );
      
      igReelsSlide.addImage({
        data: reelsChartImage,
        x: DESIGN.margin.outer,
        y: 1.4,
        w: SLIDE_WIDTH - 1,
        h: 4.5,
      });
      
      addSlideFooter(igReelsSlide, slideNum);
    }
    
    // SLIDE: Instagram Reels Table
    if (data.instagram.reels.length > 0) {
      const igReelsTableSlide = pptx.addSlide();
      slideNum++;
      addSlideHeader(igReelsTableSlide, 'Reels Übersicht', 'instagram');
      
      const reelsToShow = data.instagram.reels.slice(0, 6);
      const reelColCount = reelsToShow.length + 1;
      const reelColWidth = (SLIDE_WIDTH - 1) / reelColCount;
      
      const reelsTableRows: PptxGenJS.TableRow[] = [
        [
          { text: 'Datum', options: { fill: { color: DESIGN.table.headerBg }, color: DESIGN.table.headerText, bold: true } },
          ...reelsToShow.map(r => ({ 
            text: formatDate(r.date), 
            options: { fill: { color: DESIGN.table.headerBg }, color: DESIGN.table.headerText, bold: true, align: 'center' as const } 
          })),
        ],
        [
          { text: '', options: { fill: { color: DESIGN.colors.white } } },
          ...reelsToShow.map(() => ({ text: '', options: { fill: { color: DESIGN.colors.white }, align: 'center' as const } })),
        ],
        [
          { text: 'Reichweite', options: { fill: { color: DESIGN.table.rowEven } } },
          ...reelsToShow.map(r => ({ text: formatNumber(r.reach), options: { fill: { color: DESIGN.table.rowEven }, align: 'center' as const } })),
        ],
        [
          { text: 'Interaktionen', options: { fill: { color: DESIGN.table.rowOdd } } },
          ...reelsToShow.map(r => ({ text: formatNumber(r.interactions), options: { fill: { color: DESIGN.table.rowOdd }, align: 'center' as const } })),
        ],
        [
          { text: 'Video Views', options: { fill: { color: DESIGN.table.rowEven } } },
          ...reelsToShow.map(r => ({ text: formatNumber(r.plays), options: { fill: { color: DESIGN.table.rowEven }, align: 'center' as const } })),
        ],
        [
          { text: 'Saves', options: { fill: { color: DESIGN.table.rowOdd } } },
          ...reelsToShow.map(r => ({ text: formatNumber(r.saves), options: { fill: { color: DESIGN.table.rowOdd }, align: 'center' as const } })),
        ],
      ];
      
      igReelsTableSlide.addTable(reelsTableRows, {
        x: DESIGN.margin.outer,
        y: 1.4,
        w: SLIDE_WIDTH - 1,
        rowH: [0.35, 1.3, 0.35, 0.35, 0.35, 0.35],
        fontSize: DESIGN.sizes.body,
        fontFace: DESIGN.fonts.body,
        border: { type: 'solid', pt: 0.5, color: DESIGN.table.border },
      });
      
      // Add reel thumbnails
      for (let i = 0; i < reelsToShow.length; i++) {
        const reel = reelsToShow[i];
        if (reel.imageUrl) {
          const imgData = await fetchAndOptimizeImage(reel.imageUrl, 400, 400);
          if (imgData) {
            const imgX = DESIGN.margin.outer + reelColWidth + (i * reelColWidth) + (reelColWidth * 0.1);
            igReelsTableSlide.addImage({
              data: imgData,
              x: imgX,
              y: 1.8,
              w: reelColWidth * 0.8,
              h: 1.1,
            });
          }
        }
      }
      
      addSlideFooter(igReelsTableSlide, slideNum);
    }
  }
  
  // ============ SLIDE: FAZIT ============
  const fazitSlide = pptx.addSlide();
  slideNum++;
  addSlideHeader(fazitSlide, `Fazit ${getMonthName(data.month)}`);
  
  let fazitY = 1.6;
  
  // Facebook Fazit
  if (data.facebook && data.facebook.kpis.length > 0) {
    const fbKpi = data.facebook.kpis[0];
    
    fazitSlide.addText('FACEBOOK', {
      x: DESIGN.margin.outer,
      y: fazitY,
      w: 2,
      h: 0.4,
      fontSize: 14,
      fontFace: DESIGN.fonts.heading,
      bold: true,
      color: '1877F2',
    });
    
    fazitSlide.addText(
      `Im ${getMonthName(data.month)} erreichten die Facebook-Inhalte eine Post-Reichweite von ${formatNumber(fbKpi.reach)} Personen. ` +
      `Mit ${formatNumber(fbKpi.interactions)} Interaktionen erzielten die Beiträge eine solide Nutzerbeteiligung. ` +
      `Zusätzlich lieferten ${formatNumber(fbKpi.videoViews)} Video Views (3-Sekunden-Views) einen wichtigen Beitrag zur Sichtbarkeit. ` +
      `Insgesamt wurden ${formatNumber(fbKpi.postCount)} Beiträge veröffentlicht.`,
      {
        x: DESIGN.margin.outer,
        y: fazitY + 0.5,
        w: SLIDE_WIDTH - 1,
        h: 1.2,
        fontSize: DESIGN.sizes.body,
        fontFace: DESIGN.fonts.body,
        color: DESIGN.colors.gray700,
        lineSpacing: 18,
      }
    );
    
    fazitY += 2.2;
  }
  
  // Instagram Fazit
  if (data.instagram && data.instagram.kpis.length > 0) {
    const igKpi = data.instagram.kpis[0];
    
    fazitSlide.addText('INSTAGRAM', {
      x: DESIGN.margin.outer,
      y: fazitY,
      w: 2,
      h: 0.4,
      fontSize: 14,
      fontFace: DESIGN.fonts.heading,
      bold: true,
      color: 'E4405F',
    });
    
    fazitSlide.addText(
      `Auf Instagram startete der ${getMonthName(data.month)} mit einer Post-Reichweite von ${formatNumber(igKpi.reach)} Personen ` +
      `sowie ${formatNumber(igKpi.plays)} Video Views. Die ${formatNumber(igKpi.interactions)} Interaktionen verdeutlichen, ` +
      `dass die Community gut auf die Inhalte reagiert. Insgesamt wurden ${formatNumber(igKpi.postCount)} Beiträge veröffentlicht.`,
      {
        x: DESIGN.margin.outer,
        y: fazitY + 0.5,
        w: SLIDE_WIDTH - 1,
        h: 1.2,
        fontSize: DESIGN.sizes.body,
        fontFace: DESIGN.fonts.body,
        color: DESIGN.colors.gray700,
        lineSpacing: 18,
      }
    );
  }
  
  addSlideFooter(fazitSlide, slideNum);
  
  // ============ SLIDE: CONTACT ============
  const contactSlide = pptx.addSlide();
  contactSlide.background = { color: DESIGN.colors.famefactBlack };
  
  contactSlide.addText('famefact.', {
    x: DESIGN.margin.outer,
    y: DESIGN.margin.outer,
    w: 3,
    h: 0.5,
    fontSize: 24,
    fontFace: DESIGN.fonts.heading,
    bold: true,
    color: DESIGN.colors.white,
  });
  
  contactSlide.addText('Robert Arnold', {
    x: 6,
    y: 3.2,
    w: 6,
    h: 0.5,
    fontSize: 22,
    fontFace: DESIGN.fonts.heading,
    bold: true,
    color: DESIGN.colors.white,
  });
  
  contactSlide.addText('Teamleader Social Media', {
    x: 6,
    y: 3.7,
    w: 6,
    h: 0.4,
    fontSize: 14,
    fontFace: DESIGN.fonts.body,
    color: DESIGN.colors.gray400,
  });
  
  contactSlide.addText(
    'famefact\nfirst in socialtainment\n\ntrack by track GmbH\nSchliemannstraße 23\nD-10437 Berlin\n\nE-Mail: robert.arnold@famefact.com',
    {
      x: 6,
      y: 4.4,
      w: 6,
      h: 2.5,
      fontSize: 12,
      fontFace: DESIGN.fonts.body,
      color: DESIGN.colors.gray300,
      lineSpacing: 16,
    }
  );
  
  // Generate PPTX buffer
  const pptxBuffer = await pptx.write({ outputType: 'nodebuffer' }) as Buffer;
  
  return pptxBuffer;
}

export { DESIGN, formatNumber, formatDate, getMonthName };
