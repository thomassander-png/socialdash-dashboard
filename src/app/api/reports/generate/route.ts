import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import PptxGenJS from 'pptxgenjs';

// Types
interface FacebookPost {
  post_id: string;
  page_id: string;
  created_time: string;
  type: string;
  permalink: string;
  message: string;
  reactions_total: number;
  comments_total: number;
  shares_total: number;
  reach: number;
  impressions: number;
  video_3s_views: number;
  interactions_total: number;
  image_url: string;
}

interface InstagramPost {
  media_id: string;
  account_id: string;
  timestamp: string;
  media_type: string;
  permalink: string;
  caption: string;
  likes: number;
  comments: number;
  saves: number;
  reach: number;
  impressions: number;
  plays: number;
  interactions_total: number;
  image_url: string;
}

interface MonthlyKPIs {
  month: string;
  total_reach: number;
  total_impressions: number;
  total_interactions: number;
  total_reactions: number;
  total_comments: number;
  total_shares: number;
  total_video_views: number;
  post_count: number;
  avg_reach_per_post: number;
}

interface IGMonthlyKPIs {
  month: string;
  total_reach: number;
  total_impressions: number;
  total_interactions: number;
  total_likes: number;
  total_comments: number;
  total_saves: number;
  total_plays: number;
  post_count: number;
  avg_reach_per_post: number;
}

// Design constants - matching Vergleich.org template
const COLORS = {
  primary: '#1E3A8A',      // Dark blue for table headers (Famefact)
  secondary: '#2563EB',    // Blue for charts (Famefact)
  white: '#FFFFFF',
  black: '#000000',
  gray: '#F3F4F6',
  lightGray: '#E5E7EB',    // Grid lines
  darkGray: '#333333',     // Body text
  borderGray: '#D1D5DB',   // Table borders
};

const FONTS = {
  title: 'Arial',
  body: 'Arial',
};

// Helper to format numbers with German locale
function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '-';
  return num.toLocaleString('de-DE');
}

// Helper to format date in German format
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

// Helper to get month name in German
function getMonthName(monthStr: string): string {
  const months: Record<string, string> = {
    '01': 'Januar', '02': 'Februar', '03': 'März', '04': 'April',
    '05': 'Mai', '06': 'Juni', '07': 'Juli', '08': 'August',
    '09': 'September', '10': 'Oktober', '11': 'November', '12': 'Dezember'
  };
  const [year, month] = monthStr.split('-');
  return `${months[month]} ${year}`;
}

// Helper to fetch image as base64
async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    if (!url) return null;
    const response = await fetch(url, { 
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
}

// Add platform icon to slide
function addPlatformIcon(slide: PptxGenJS.Slide, platform: 'facebook' | 'instagram') {
  // Simple circle with letter as placeholder for icon
  const letter = platform === 'facebook' ? 'f' : 'IG';
  slide.addText(letter, {
    x: 0.3,
    y: 0.3,
    w: 0.6,
    h: 0.6,
    fontSize: 24,
    fontFace: FONTS.title,
    color: COLORS.black,
    align: 'center',
    valign: 'middle',
  });
}

// Add Famefact logo placeholder to slide
function addFamefactLogo(slide: PptxGenJS.Slide) {
  slide.addText('famefact', {
    x: 0.3,
    y: 7.0,
    w: 1.2,
    h: 0.3,
    fontSize: 12,
    fontFace: FONTS.title,
    bold: true,
    color: COLORS.black,
  });
}

// Add page number to slide
function addPageNumber(slide: PptxGenJS.Slide, pageNum: number) {
  slide.addText(pageNum.toString(), {
    x: 12.5,
    y: 7.0,
    w: 0.5,
    h: 0.3,
    fontSize: 12,
    fontFace: FONTS.body,
    color: COLORS.darkGray,
    align: 'right',
  });
}

export async function POST(request: NextRequest) {
  try {
    const { customerId, month } = await request.json();

    if (!customerId || !month) {
      return NextResponse.json({ error: 'customerId and month are required' }, { status: 400 });
    }

    // Get customer info
    const customerResult = await query<{ customer_id: string; name: string; slug: string }>(
      `SELECT customer_id, name, slug FROM customers WHERE customer_id = $1`,
      [customerId]
    );

    if (customerResult.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const customer = customerResult[0];

    // Get assigned accounts
    const accountsResult = await query<{ account_id: string; platform: string }>(
      `SELECT account_id, platform FROM customer_accounts WHERE customer_id = $1`,
      [customerId]
    );

    const fbPageIds = accountsResult.filter(a => a.platform === 'facebook').map(a => a.account_id);
    const igAccountIds = accountsResult.filter(a => a.platform === 'instagram').map(a => a.account_id);

    // Calculate date ranges for 3 months
    const [year, monthNum] = month.split('-').map(Number);
    const currentMonth = `${year}-${String(monthNum).padStart(2, '0')}`;
    const prevMonth1 = monthNum === 1 
      ? `${year - 1}-12` 
      : `${year}-${String(monthNum - 1).padStart(2, '0')}`;
    const prevMonth2 = monthNum <= 2 
      ? `${year - 1}-${String(12 + monthNum - 2).padStart(2, '0')}` 
      : `${year}-${String(monthNum - 2).padStart(2, '0')}`;

    // ============ FACEBOOK DATA ============
    const fbKPIs: MonthlyKPIs[] = [];
    const fbPosts: FacebookPost[] = [];
    const fbVideos: FacebookPost[] = [];

    if (fbPageIds.length > 0) {
      // Get Facebook KPIs for 3 months
      for (const m of [currentMonth, prevMonth1, prevMonth2]) {
        const kpiResult = await query<MonthlyKPIs>(`
          SELECT 
            '${m}' as month,
            COALESCE(SUM(reach), 0) as total_reach,
            COALESCE(SUM(impressions), 0) as total_impressions,
            COALESCE(SUM(reactions_total + comments_total), 0) as total_interactions,
            COALESCE(SUM(reactions_total), 0) as total_reactions,
            COALESCE(SUM(comments_total), 0) as total_comments,
            COALESCE(SUM(shares_total), 0) as total_shares,
            COALESCE(SUM(video_3s_views), 0) as total_video_views,
            COUNT(DISTINCT post_id) as post_count,
            CASE WHEN COUNT(DISTINCT post_id) > 0 
              THEN COALESCE(SUM(reach), 0) / COUNT(DISTINCT post_id) 
              ELSE 0 END as avg_reach_per_post
          FROM view_fb_monthly_post_metrics
          WHERE page_id = ANY($1) AND month = $2::date
        `, [fbPageIds, `${m}-01`]);
        
        if (kpiResult.length > 0) {
          fbKPIs.push(kpiResult[0]);
        }
      }

      // Get top Facebook posts (images) by interactions
      const fbPostsResult = await query<FacebookPost>(`
        SELECT 
          m.post_id, m.page_id, m.created_time, m.type, m.permalink, m.message,
          m.reactions_total, m.comments_total, COALESCE(m.shares_total, 0) as shares_total,
          COALESCE(m.reach, 0) as reach, COALESCE(m.impressions, 0) as impressions,
          COALESCE(m.video_3s_views, 0) as video_3s_views,
          (COALESCE(m.reactions_total, 0) + COALESCE(m.comments_total, 0)) as interactions_total,
          COALESCE(p.thumbnail_url, p.media_url, p.og_image_url) as image_url
        FROM view_fb_monthly_post_metrics m
        LEFT JOIN fb_posts p ON m.post_id = p.post_id
        WHERE m.page_id = ANY($1) AND m.month = $2::date
          AND (m.type = 'photo' OR m.type = 'link' OR m.type = 'status' OR m.type IS NULL)
        ORDER BY interactions_total DESC
        LIMIT 6
      `, [fbPageIds, `${currentMonth}-01`]);
      fbPosts.push(...fbPostsResult);

      // Get top Facebook videos by 3s views
      const fbVideosResult = await query<FacebookPost>(`
        SELECT 
          m.post_id, m.page_id, m.created_time, m.type, m.permalink, m.message,
          m.reactions_total, m.comments_total, COALESCE(m.shares_total, 0) as shares_total,
          COALESCE(m.reach, 0) as reach, COALESCE(m.impressions, 0) as impressions,
          COALESCE(m.video_3s_views, 0) as video_3s_views,
          (COALESCE(m.reactions_total, 0) + COALESCE(m.comments_total, 0)) as interactions_total,
          COALESCE(p.thumbnail_url, p.media_url, p.og_image_url) as image_url
        FROM view_fb_monthly_post_metrics m
        LEFT JOIN fb_posts p ON m.post_id = p.post_id
        WHERE m.page_id = ANY($1) AND m.month = $2::date
          AND m.type = 'video'
        ORDER BY video_3s_views DESC
        LIMIT 6
      `, [fbPageIds, `${currentMonth}-01`]);
      fbVideos.push(...fbVideosResult);
    }

    // ============ INSTAGRAM DATA ============
    const igKPIs: IGMonthlyKPIs[] = [];
    const igPosts: InstagramPost[] = [];
    const igReels: InstagramPost[] = [];

    if (igAccountIds.length > 0) {
      // Get Instagram KPIs for 3 months
      for (const m of [currentMonth, prevMonth1, prevMonth2]) {
        const kpiResult = await query<IGMonthlyKPIs>(`
          SELECT 
            '${m}' as month,
            COALESCE(SUM(reach), 0) as total_reach,
            COALESCE(SUM(impressions), 0) as total_impressions,
            COALESCE(SUM(likes + comments + COALESCE(saves, 0)), 0) as total_interactions,
            COALESCE(SUM(likes), 0) as total_likes,
            COALESCE(SUM(comments), 0) as total_comments,
            COALESCE(SUM(saves), 0) as total_saves,
            COALESCE(SUM(plays), 0) as total_plays,
            COUNT(DISTINCT media_id) as post_count,
            CASE WHEN COUNT(DISTINCT media_id) > 0 
              THEN COALESCE(SUM(reach), 0) / COUNT(DISTINCT media_id) 
              ELSE 0 END as avg_reach_per_post
          FROM view_ig_monthly_post_metrics
          WHERE account_id = ANY($1) AND month = $2::date
        `, [igAccountIds, `${m}-01`]);
        
        if (kpiResult.length > 0) {
          igKPIs.push(kpiResult[0]);
        }
      }

      // Get top Instagram posts (images/carousels) by interactions
      const igPostsResult = await query<InstagramPost>(`
        SELECT 
          m.media_id, m.account_id, m.post_created_time as timestamp, m.media_type, m.permalink, m.caption,
          m.likes, m.comments, COALESCE(m.saves, 0) as saves,
          COALESCE(m.reach, 0) as reach, COALESCE(m.impressions, 0) as impressions,
          COALESCE(m.plays, 0) as plays,
          (COALESCE(m.likes, 0) + COALESCE(m.comments, 0) + COALESCE(m.saves, 0)) as interactions_total,
          COALESCE(m.thumbnail_url, m.media_url) as image_url
        FROM view_ig_monthly_post_metrics m
        WHERE m.account_id = ANY($1) AND m.month = $2::date
          AND (m.media_type = 'IMAGE' OR m.media_type = 'CAROUSEL_ALBUM')
        ORDER BY interactions_total DESC
        LIMIT 6
      `, [igAccountIds, `${currentMonth}-01`]);
      igPosts.push(...igPostsResult);

      // Get top Instagram reels by plays
      const igReelsResult = await query<InstagramPost>(`
        SELECT 
          m.media_id, m.account_id, m.post_created_time as timestamp, m.media_type, m.permalink, m.caption,
          m.likes, m.comments, COALESCE(m.saves, 0) as saves,
          COALESCE(m.reach, 0) as reach, COALESCE(m.impressions, 0) as impressions,
          COALESCE(m.plays, 0) as plays,
          (COALESCE(m.likes, 0) + COALESCE(m.comments, 0) + COALESCE(m.saves, 0)) as interactions_total,
          COALESCE(m.thumbnail_url, m.media_url) as image_url
        FROM view_ig_monthly_post_metrics m
        WHERE m.account_id = ANY($1) AND m.month = $2::date
          AND (m.media_type = 'VIDEO' OR m.media_type = 'REELS')
        ORDER BY plays DESC
        LIMIT 6
      `, [igAccountIds, `${currentMonth}-01`]);
      igReels.push(...igReelsResult);
    }

    // ============ CREATE PPTX ============
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_16x9';
    pptx.author = 'famefact';
    pptx.title = `Social Media Reporting ${getMonthName(currentMonth)} - ${customer.name}`;

    let slideNum = 1;

    // ============ SLIDE 1: COVER ============
    const coverSlide = pptx.addSlide();
    coverSlide.addText(customer.name.toUpperCase(), {
      x: 0.5,
      y: 2.5,
      w: 12.3,
      h: 1.5,
      fontSize: 48,
      fontFace: FONTS.title,
      bold: true,
      color: COLORS.black,
      align: 'center',
    });
    coverSlide.addText(`Social Media Reporting\n${getMonthName(currentMonth)}`, {
      x: 0.5,
      y: 4.2,
      w: 12.3,
      h: 1.2,
      fontSize: 28,
      fontFace: FONTS.body,
      color: COLORS.darkGray,
      align: 'center',
    });

    // ============ SLIDE 2: FACEBOOK SEPARATOR ============
    if (fbPageIds.length > 0) {
      const fbSepSlide = pptx.addSlide();
      slideNum++;
      addPlatformIcon(fbSepSlide, 'facebook');
      fbSepSlide.addText('Facebook', {
        x: 0.5,
        y: 1.5,
        w: 12.3,
        h: 1,
        fontSize: 48,
        fontFace: FONTS.title,
        bold: true,
        color: COLORS.black,
        align: 'center',
      });
      addFamefactLogo(fbSepSlide);
      addPageNumber(fbSepSlide, slideNum);

      // ============ SLIDE 3: FACEBOOK KENNZAHLEN ============
      const fbKpiSlide = pptx.addSlide();
      slideNum++;
      addPlatformIcon(fbKpiSlide, 'facebook');
      fbKpiSlide.addText('Facebook Kennzahlen', {
        x: 1.5,
        y: 0.3,
        w: 10,
        h: 0.6,
        fontSize: 32,
        fontFace: FONTS.title,
        bold: true,
        color: COLORS.black,
      });

      // KPI Table
      const fbKpiRows: PptxGenJS.TableRow[] = [
        [
          { text: 'KPI', options: { fill: { color: COLORS.primary }, color: COLORS.white, bold: true } },
          { text: getMonthName(currentMonth), options: { fill: { color: COLORS.primary }, color: COLORS.white, bold: true } },
          { text: getMonthName(prevMonth1), options: { fill: { color: COLORS.primary }, color: COLORS.white, bold: true } },
          { text: getMonthName(prevMonth2), options: { fill: { color: COLORS.primary }, color: COLORS.white, bold: true } },
        ],
      ];

      const kpiLabels = [
        'Follower Wachstum',
        'Follower total',
        'Post-Reichweite',
        'Organische Reichweite',
        'Bezahlte Reichweite',
        'Ø Reichweite pro Post',
        'Interaktionen',
        'Video Views (3-Sek)',
        'Interaktionsrate*',
        'Anzahl an Postings',
        'PPA Ausgaben in €',
      ];

      kpiLabels.forEach((label, idx) => {
        const row: PptxGenJS.TableCell[] = [
          { text: label, options: { fill: { color: idx % 2 === 0 ? COLORS.gray : COLORS.white } } },
        ];
        
        [fbKPIs[0], fbKPIs[1], fbKPIs[2]].forEach(kpi => {
          let value = '-';
          if (kpi) {
            switch (label) {
              case 'Follower Wachstum': value = '-'; break; // TODO: Implement follower tracking
              case 'Follower total': value = '-'; break; // TODO: Implement follower tracking
              case 'Post-Reichweite': value = formatNumber(kpi.total_reach); break;
              case 'Organische Reichweite': value = '-'; break; // TODO: Implement organic/paid split
              case 'Bezahlte Reichweite': value = '-'; break; // TODO: Implement organic/paid split
              case 'Ø Reichweite pro Post': value = formatNumber(Math.round(kpi.avg_reach_per_post)); break;
              case 'Interaktionen': value = formatNumber(kpi.total_interactions); break;
              case 'Video Views (3-Sek)': value = formatNumber(kpi.total_video_views); break;
              case 'Interaktionsrate*': 
                value = kpi.total_reach > 0 
                  ? ((kpi.total_interactions / kpi.total_reach) * 100).toFixed(1) + ' %' 
                  : '-'; 
                break;
              case 'Anzahl an Postings': value = formatNumber(kpi.post_count); break;
              case 'PPA Ausgaben in €': value = '-'; break; // TODO: Implement ad spend tracking
            }
          }
          row.push({ text: value, options: { fill: { color: idx % 2 === 0 ? COLORS.gray : COLORS.white }, align: 'center' } });
        });
        
        fbKpiRows.push(row);
      });

      fbKpiSlide.addTable(fbKpiRows, {
        x: 1.0,
        y: 1.2,
        w: 11.3,
        colW: [3.5, 2.6, 2.6, 2.6],
        fontSize: 11,
        fontFace: FONTS.body,
        border: { type: 'solid', pt: 0.5, color: COLORS.darkGray },
      });

      fbKpiSlide.addText('*Die Interaktionsrate berechnet sich mit den Interaktionen geteilt durch die Post-Reichweite mal hundert.', {
        x: 1.0,
        y: 6.8,
        w: 11.3,
        h: 0.3,
        fontSize: 9,
        fontFace: FONTS.body,
        color: COLORS.darkGray,
      });
      addFamefactLogo(fbKpiSlide);
      addPageNumber(fbKpiSlide, slideNum);

      // ============ SLIDE 4: FACEBOOK POSTS BAR CHART ============
      if (fbPosts.length > 0) {
        const fbPostsSlide = pptx.addSlide();
        slideNum++;
        addPlatformIcon(fbPostsSlide, 'facebook');
        fbPostsSlide.addText('Postings nach Interaktion: Bilder', {
          x: 1.5,
          y: 0.3,
          w: 10,
          h: 0.6,
          fontSize: 32,
          fontFace: FONTS.title,
          bold: true,
          color: COLORS.black,
        });

        // Create bar chart data
        const chartData = [{
          name: 'Interaktionen',
          labels: fbPosts.map(p => formatDate(p.created_time)),
          values: fbPosts.map(p => p.interactions_total),
        }];

        fbPostsSlide.addChart(pptx.ChartType.bar, chartData, {
          x: 1.0,
          y: 1.2,
          w: 11.3,
          h: 4.5,
          barDir: 'col',
          showValue: false,
          showLegend: false,
          chartColors: [COLORS.secondary],
          valAxisMaxVal: Math.max(...fbPosts.map(p => p.interactions_total)) * 1.2,
          catAxisTitle: '',
          valAxisTitle: '',
        });

        // Add post images above bars
        const barWidth = 11.3 / fbPosts.length;
        for (let i = 0; i < Math.min(fbPosts.length, 6); i++) {
          const post = fbPosts[i];
          if (post.image_url) {
            const imgData = await fetchImageAsBase64(post.image_url);
            if (imgData) {
              const barHeight = (post.interactions_total / (Math.max(...fbPosts.map(p => p.interactions_total)) * 1.2)) * 4.5;
              fbPostsSlide.addImage({
                data: imgData,
                x: 1.0 + (i * barWidth) + (barWidth * 0.15),
                y: 5.7 - barHeight - 0.9,
                w: barWidth * 0.7,
                h: 0.8,
              });
            }
          }
        }

        fbPostsSlide.addText('In die Interaktionen fallen Likes, Kommentare und Shares.', {
          x: 1.0,
          y: 6.8,
          w: 11.3,
          h: 0.3,
          fontSize: 9,
          fontFace: FONTS.body,
          color: COLORS.darkGray,
        });
        addFamefactLogo(fbPostsSlide);
        addPageNumber(fbPostsSlide, slideNum);
      }

      // ============ SLIDE 5: FACEBOOK VIDEOS BAR CHART ============
      if (fbVideos.length > 0) {
        const fbVideosSlide = pptx.addSlide();
        slideNum++;
        addPlatformIcon(fbVideosSlide, 'facebook');
        fbVideosSlide.addText('Videos nach 3-sekündige Video Views', {
          x: 1.5,
          y: 0.3,
          w: 10,
          h: 0.6,
          fontSize: 32,
          fontFace: FONTS.title,
          bold: true,
          color: COLORS.black,
        });

        const fbVideoChartData = fbVideos.slice(0, 6);
        const chartData = [{
          name: 'Video Views',
          labels: fbVideoChartData.map(p => formatDate(p.created_time)),
          values: fbVideoChartData.map(p => p.video_3s_views),
        }];

        const maxFbVideoVal = Math.max(...fbVideoChartData.map(p => p.video_3s_views)) * 1.2;

        fbVideosSlide.addChart(pptx.ChartType.bar, chartData, {
          x: 1.0,
          y: 1.2,
          w: 11.3,
          h: 4.5,
          barDir: 'col',
          showValue: false,
          showLegend: false,
          chartColors: [COLORS.secondary],
          valAxisMaxVal: maxFbVideoVal,
        });

        // Add video thumbnails above bars
        const fbVideoBarWidth = 11.3 / fbVideoChartData.length;
        for (let i = 0; i < fbVideoChartData.length; i++) {
          const video = fbVideoChartData[i];
          if (video.image_url) {
            const imgData = await fetchImageAsBase64(video.image_url);
            if (imgData) {
              const barHeight = (video.video_3s_views / maxFbVideoVal) * 4.5;
              fbVideosSlide.addImage({
                data: imgData,
                x: 1.0 + (i * fbVideoBarWidth) + (fbVideoBarWidth * 0.15),
                y: 5.7 - barHeight - 0.9,
                w: fbVideoBarWidth * 0.7,
                h: 0.8,
              });
            }
          }
        }

        addFamefactLogo(fbVideosSlide);
        addPageNumber(fbVideosSlide, slideNum);
      }
    }

    // ============ SLIDE 6: INSTAGRAM SEPARATOR ============
    if (igAccountIds.length > 0) {
      const igSepSlide = pptx.addSlide();
      slideNum++;
      addPlatformIcon(igSepSlide, 'instagram');
      igSepSlide.addText('Instagram', {
        x: 0.5,
        y: 1.5,
        w: 12.3,
        h: 1,
        fontSize: 48,
        fontFace: FONTS.title,
        bold: true,
        color: COLORS.black,
        align: 'center',
      });
      addFamefactLogo(igSepSlide);
      addPageNumber(igSepSlide, slideNum);

      // ============ SLIDE 7: INSTAGRAM KENNZAHLEN ============
      const igKpiSlide = pptx.addSlide();
      slideNum++;
      addPlatformIcon(igKpiSlide, 'instagram');
      igKpiSlide.addText('Instagram Kennzahlen', {
        x: 1.5,
        y: 0.3,
        w: 10,
        h: 0.6,
        fontSize: 32,
        fontFace: FONTS.title,
        bold: true,
        color: COLORS.black,
      });

      const igKpiRows: PptxGenJS.TableRow[] = [
        [
          { text: 'KPI', options: { fill: { color: COLORS.primary }, color: COLORS.white, bold: true } },
          { text: getMonthName(currentMonth), options: { fill: { color: COLORS.primary }, color: COLORS.white, bold: true } },
          { text: getMonthName(prevMonth1), options: { fill: { color: COLORS.primary }, color: COLORS.white, bold: true } },
          { text: getMonthName(prevMonth2), options: { fill: { color: COLORS.primary }, color: COLORS.white, bold: true } },
        ],
      ];

      const igKpiLabels = [
        'Post-Reichweite',
        'Ø Reichweite pro Post',
        'Interaktionen',
        'Likes',
        'Comments',
        'Saves',
        'Video Views',
        'Anzahl Postings',
      ];

      igKpiLabels.forEach((label, idx) => {
        const row: PptxGenJS.TableCell[] = [
          { text: label, options: { fill: { color: idx % 2 === 0 ? COLORS.gray : COLORS.white } } },
        ];
        
        [igKPIs[0], igKPIs[1], igKPIs[2]].forEach(kpi => {
          let value = '-';
          if (kpi) {
            switch (label) {
              case 'Post-Reichweite': value = formatNumber(kpi.total_reach); break;
              case 'Ø Reichweite pro Post': value = formatNumber(Math.round(kpi.avg_reach_per_post)); break;
              case 'Interaktionen': value = formatNumber(kpi.total_interactions); break;
              case 'Likes': value = formatNumber(kpi.total_likes); break;
              case 'Comments': value = formatNumber(kpi.total_comments); break;
              case 'Saves': value = formatNumber(kpi.total_saves); break;
              case 'Video Views': value = formatNumber(kpi.total_plays); break;
              case 'Anzahl Postings': value = formatNumber(kpi.post_count); break;
            }
          }
          row.push({ text: value, options: { fill: { color: idx % 2 === 0 ? COLORS.gray : COLORS.white }, align: 'center' } });
        });
        
        igKpiRows.push(row);
      });

      igKpiSlide.addTable(igKpiRows, {
        x: 1.0,
        y: 1.2,
        w: 11.3,
        colW: [3.5, 2.6, 2.6, 2.6],
        fontSize: 11,
        fontFace: FONTS.body,
        border: { type: 'solid', pt: 0.5, color: COLORS.darkGray },
      });

      igKpiSlide.addText('*Die Interaktionsrate berechnet sich mit den Interaktionen geteilt durch die Post-Reichweite mal hundert.', {
        x: 1.0,
        y: 6.8,
        w: 11.3,
        h: 0.3,
        fontSize: 9,
        fontFace: FONTS.body,
        color: COLORS.darkGray,
      });
      addFamefactLogo(igKpiSlide);
      addPageNumber(igKpiSlide, slideNum);

      // ============ SLIDE 8: INSTAGRAM POSTS BAR CHART ============
      if (igPosts.length > 0) {
        const igPostsSlide = pptx.addSlide();
        slideNum++;
        addPlatformIcon(igPostsSlide, 'instagram');
        igPostsSlide.addText('Postings nach Interaktion: Bilder', {
          x: 1.5,
          y: 0.3,
          w: 10,
          h: 0.6,
          fontSize: 32,
          fontFace: FONTS.title,
          bold: true,
          color: COLORS.black,
        });

        const igChartPosts = igPosts.slice(0, 6);
        const chartData = [{
          name: 'Interaktionen',
          labels: igChartPosts.map(p => formatDate(p.timestamp)),
          values: igChartPosts.map(p => p.interactions_total),
        }];

        const maxIgVal = Math.max(...igChartPosts.map(p => p.interactions_total)) * 1.2;

        igPostsSlide.addChart(pptx.ChartType.bar, chartData, {
          x: 1.0,
          y: 1.2,
          w: 11.3,
          h: 4.5,
          barDir: 'col',
          showValue: false,
          showLegend: false,
          chartColors: [COLORS.secondary],
          valAxisMaxVal: maxIgVal,
        });

        // Add post images above bars
        const igBarWidth = 11.3 / igChartPosts.length;
        for (let i = 0; i < igChartPosts.length; i++) {
          const post = igChartPosts[i];
          if (post.image_url) {
            const imgData = await fetchImageAsBase64(post.image_url);
            if (imgData) {
              const barHeight = (post.interactions_total / maxIgVal) * 4.5;
              igPostsSlide.addImage({
                data: imgData,
                x: 1.0 + (i * igBarWidth) + (igBarWidth * 0.15),
                y: 5.7 - barHeight - 0.9,
                w: igBarWidth * 0.7,
                h: 0.8,
              });
            }
          }
        }

        igPostsSlide.addText('In die Interaktionen fallen Likes, Kommentare, Savings und Profilaufrufe.', {
          x: 1.0,
          y: 6.8,
          w: 11.3,
          h: 0.3,
          fontSize: 9,
          fontFace: FONTS.body,
          color: COLORS.darkGray,
        });
        addFamefactLogo(igPostsSlide);
        addPageNumber(igPostsSlide, slideNum);
      }

      // ============ SLIDE 9: INSTAGRAM POSTS TABLE ============
      if (igPosts.length > 0) {
        const igTableSlide = pptx.addSlide();
        slideNum++;
        addPlatformIcon(igTableSlide, 'instagram');
        igTableSlide.addText('Bild-Beiträge Übersicht', {
          x: 1.5,
          y: 0.3,
          w: 10,
          h: 0.6,
          fontSize: 32,
          fontFace: FONTS.title,
          bold: true,
          color: COLORS.black,
        });

        const postsToShow = igPosts.slice(0, 6);
        const colCount = postsToShow.length + 1;
        const colWidth = 12.3 / colCount;

        // Create table with post details
        const tableRows: PptxGenJS.TableRow[] = [
          [
            { text: 'Datum', options: { fill: { color: COLORS.primary }, color: COLORS.white, bold: true } },
            ...postsToShow.map(p => ({ 
              text: formatDate(p.timestamp), 
              options: { fill: { color: COLORS.primary }, color: COLORS.white, bold: true, align: 'center' as const } 
            })),
          ],
          [
            { text: '', options: { fill: { color: COLORS.white } } },
            ...postsToShow.map(() => ({ text: '', options: { fill: { color: COLORS.white }, align: 'center' as const } })),
          ],
          [
            { text: 'Reichweite', options: { fill: { color: COLORS.gray } } },
            ...postsToShow.map(p => ({ text: formatNumber(p.reach), options: { fill: { color: COLORS.gray }, align: 'center' as const } })),
          ],
          [
            { text: 'Interaktionen', options: { fill: { color: COLORS.white } } },
            ...postsToShow.map(p => ({ text: formatNumber(p.interactions_total), options: { fill: { color: COLORS.white }, align: 'center' as const } })),
          ],
          [
            { text: 'Saves', options: { fill: { color: COLORS.gray } } },
            ...postsToShow.map(p => ({ text: formatNumber(p.saves), options: { fill: { color: COLORS.gray }, align: 'center' as const } })),
          ],
        ];

        igTableSlide.addTable(tableRows, {
          x: 0.5,
          y: 1.2,
          w: 12.3,
          rowH: [0.35, 1.3, 0.35, 0.35, 0.35],
          fontSize: 10,
          fontFace: FONTS.body,
          border: { type: 'solid', pt: 0.5, color: COLORS.darkGray },
        });

        // Add images to the table (row 2)
        for (let i = 0; i < postsToShow.length; i++) {
          const post = postsToShow[i];
          if (post.image_url) {
            const imgData = await fetchImageAsBase64(post.image_url);
            if (imgData) {
              const imgX = 0.5 + colWidth + (i * colWidth) + (colWidth * 0.1);
              igTableSlide.addImage({
                data: imgData,
                x: imgX,
                y: 1.6,
                w: colWidth * 0.8,
                h: 1.1,
              });
            }
          }
        }

        igTableSlide.addText('In die Interaktionen fallen Likes, Kommentare, Savings und Profilaufrufe.', {
          x: 1.0,
          y: 6.8,
          w: 11.3,
          h: 0.3,
          fontSize: 9,
          fontFace: FONTS.body,
          color: COLORS.darkGray,
        });
        addFamefactLogo(igTableSlide);
        addPageNumber(igTableSlide, slideNum);
      }

      // ============ SLIDE 10: INSTAGRAM REELS BAR CHART ============
      if (igReels.length > 0) {
        const igReelsSlide = pptx.addSlide();
        slideNum++;
        addPlatformIcon(igReelsSlide, 'instagram');
        igReelsSlide.addText('Instagram Reels: Aufrufe', {
          x: 1.5,
          y: 0.3,
          w: 10,
          h: 0.6,
          fontSize: 32,
          fontFace: FONTS.title,
          bold: true,
          color: COLORS.black,
        });

        const reelsChartData = igReels.slice(0, 6);
        const chartData = [{
          name: 'Video Views',
          labels: reelsChartData.map(p => formatDate(p.timestamp)),
          values: reelsChartData.map(p => p.plays),
        }];

        const maxReelVal = Math.max(...reelsChartData.map(p => p.plays)) * 1.2;

        igReelsSlide.addChart(pptx.ChartType.bar, chartData, {
          x: 1.0,
          y: 1.2,
          w: 11.3,
          h: 4.5,
          barDir: 'col',
          showValue: false,
          showLegend: false,
          chartColors: [COLORS.secondary],
          valAxisMaxVal: maxReelVal,
        });

        // Add reel thumbnails above bars
        const reelBarWidth = 11.3 / reelsChartData.length;
        for (let i = 0; i < reelsChartData.length; i++) {
          const reel = reelsChartData[i];
          if (reel.image_url) {
            const imgData = await fetchImageAsBase64(reel.image_url);
            if (imgData) {
              const barHeight = (reel.plays / maxReelVal) * 4.5;
              igReelsSlide.addImage({
                data: imgData,
                x: 1.0 + (i * reelBarWidth) + (reelBarWidth * 0.15),
                y: 5.7 - barHeight - 0.9,
                w: reelBarWidth * 0.7,
                h: 0.8,
              });
            }
          }
        }

        addFamefactLogo(igReelsSlide);
        addPageNumber(igReelsSlide, slideNum);
      }

      // ============ SLIDE 11: INSTAGRAM REELS TABLE ============
      if (igReels.length > 0) {
        const igReelsTableSlide = pptx.addSlide();
        slideNum++;
        addPlatformIcon(igReelsTableSlide, 'instagram');
        igReelsTableSlide.addText('Instagram Reels: Übersicht', {
          x: 1.5,
          y: 0.3,
          w: 10,
          h: 0.6,
          fontSize: 32,
          fontFace: FONTS.title,
          bold: true,
          color: COLORS.black,
        });

        const reelsToShow = igReels.slice(0, 6);
        const reelColCount = reelsToShow.length + 1;
        const reelColWidth = 12.3 / reelColCount;

        const reelsTableRows: PptxGenJS.TableRow[] = [
          [
            { text: 'Datum', options: { fill: { color: COLORS.primary }, color: COLORS.white, bold: true } },
            ...reelsToShow.map(p => ({ 
              text: formatDate(p.timestamp), 
              options: { fill: { color: COLORS.primary }, color: COLORS.white, bold: true, align: 'center' as const } 
            })),
          ],
          [
            { text: '', options: { fill: { color: COLORS.white } } },
            ...reelsToShow.map(() => ({ text: '', options: { fill: { color: COLORS.white }, align: 'center' as const } })),
          ],
          [
            { text: 'Reichweite', options: { fill: { color: COLORS.gray } } },
            ...reelsToShow.map(p => ({ text: formatNumber(p.reach), options: { fill: { color: COLORS.gray }, align: 'center' as const } })),
          ],
          [
            { text: 'Interaktionen', options: { fill: { color: COLORS.white } } },
            ...reelsToShow.map(p => ({ text: formatNumber(p.interactions_total), options: { fill: { color: COLORS.white }, align: 'center' as const } })),
          ],
          [
            { text: 'Videoviews', options: { fill: { color: COLORS.gray } } },
            ...reelsToShow.map(p => ({ text: formatNumber(p.plays), options: { fill: { color: COLORS.gray }, align: 'center' as const } })),
          ],
          [
            { text: 'Saves', options: { fill: { color: COLORS.white } } },
            ...reelsToShow.map(p => ({ text: formatNumber(p.saves), options: { fill: { color: COLORS.white }, align: 'center' as const } })),
          ],
        ];

        igReelsTableSlide.addTable(reelsTableRows, {
          x: 0.5,
          y: 1.2,
          w: 12.3,
          rowH: [0.35, 1.3, 0.35, 0.35, 0.35, 0.35],
          fontSize: 10,
          fontFace: FONTS.body,
          border: { type: 'solid', pt: 0.5, color: COLORS.darkGray },
        });

        // Add video thumbnails to the table (row 2)
        for (let i = 0; i < reelsToShow.length; i++) {
          const reel = reelsToShow[i];
          if (reel.image_url) {
            const imgData = await fetchImageAsBase64(reel.image_url);
            if (imgData) {
              const imgX = 0.5 + reelColWidth + (i * reelColWidth) + (reelColWidth * 0.1);
              igReelsTableSlide.addImage({
                data: imgData,
                x: imgX,
                y: 1.6,
                w: reelColWidth * 0.8,
                h: 1.1,
              });
            }
          }
        }

        addFamefactLogo(igReelsTableSlide);
        addPageNumber(igReelsTableSlide, slideNum);
      }
    }

    // ============ SLIDE 12: FAZIT ============
    const fazitSlide = pptx.addSlide();
    slideNum++;
    fazitSlide.addText(`Fazit ${getMonthName(currentMonth)}`, {
      x: 0.5,
      y: 0.3,
      w: 12.3,
      h: 0.6,
      fontSize: 32,
      fontFace: FONTS.title,
      bold: true,
      color: COLORS.black,
      align: 'center',
    });

    // Facebook Fazit
    if (fbKPIs.length > 0 && fbKPIs[0]) {
      const fbKpi = fbKPIs[0];
      addPlatformIcon(fazitSlide, 'facebook');
      fazitSlide.addText('FACEBOOK:', {
        x: 0.5,
        y: 1.2,
        w: 12.3,
        h: 0.4,
        fontSize: 14,
        fontFace: FONTS.title,
        bold: true,
        color: COLORS.black,
      });
      fazitSlide.addText(
        `Im ${getMonthName(currentMonth)} erreichten die Inhalte eine Post-Reichweite von ${formatNumber(fbKpi.total_reach)} Personen. ` +
        `Mit ${formatNumber(fbKpi.total_interactions)} Interaktionen erzielten die Beiträge eine solide Nutzerbeteiligung. ` +
        `Zusätzlich lieferten ${formatNumber(fbKpi.total_video_views)} Video Views (3-Sekunden-Views) einen wichtigen Beitrag zur Sichtbarkeit. ` +
        `Insgesamt wurden ${formatNumber(fbKpi.post_count)} Beiträge veröffentlicht.`,
        {
          x: 0.5,
          y: 1.7,
          w: 12.3,
          h: 1.2,
          fontSize: 11,
          fontFace: FONTS.body,
          color: COLORS.black,
        }
      );
    }

    // Instagram Fazit
    if (igKPIs.length > 0 && igKPIs[0]) {
      const igKpi = igKPIs[0];
      fazitSlide.addText('INSTAGRAM:', {
        x: 0.5,
        y: 3.8,
        w: 12.3,
        h: 0.4,
        fontSize: 14,
        fontFace: FONTS.title,
        bold: true,
        color: COLORS.black,
      });
      fazitSlide.addText(
        `Auf Instagram startete im ${getMonthName(currentMonth)} mit einer Post-Reichweite von ${formatNumber(igKpi.total_reach)} Personen ` +
        `sowie ${formatNumber(igKpi.total_plays)} Video Views. Die ${formatNumber(igKpi.total_interactions)} Interaktionen verdeutlichen, ` +
        `dass die Community gut auf die Inhalte reagiert. Insgesamt wurden ${formatNumber(igKpi.post_count)} Beiträge veröffentlicht.`,
        {
          x: 0.5,
          y: 4.3,
          w: 12.3,
          h: 1.2,
          fontSize: 11,
          fontFace: FONTS.body,
          color: COLORS.black,
        }
      );
    }

    addFamefactLogo(fazitSlide);
    addPageNumber(fazitSlide, slideNum);

    // ============ SLIDE 13: ABSCHLUSSFOLIE ============
    const contactSlide = pptx.addSlide();
    contactSlide.background = { color: COLORS.famefactBlack };
    
    contactSlide.addText('famefact.', {
      x: 0.5,
      y: 0.5,
      w: 3,
      h: 0.5,
      fontSize: 24,
      fontFace: FONTS.title,
      bold: true,
      color: COLORS.white,
    });

    contactSlide.addText('Robert Arnold', {
      x: 6,
      y: 3.5,
      w: 6,
      h: 0.4,
      fontSize: 18,
      fontFace: FONTS.title,
      bold: true,
      color: COLORS.white,
    });

    contactSlide.addText('Teamleader Social Media', {
      x: 6,
      y: 3.9,
      w: 6,
      h: 0.3,
      fontSize: 14,
      fontFace: FONTS.body,
      color: COLORS.white,
    });

    contactSlide.addText('famefact\nfirst in socialtainment\n\ntrack by track GmbH\nSchliemannstraße 23\nD-10437 Berlin\n\nE-Mail: robert.arnold@famefact.com', {
      x: 6,
      y: 4.5,
      w: 6,
      h: 2.5,
      fontSize: 12,
      fontFace: FONTS.body,
      color: COLORS.white,
    });

    // Generate PPTX
    const pptxBuffer = await pptx.write({ outputType: 'nodebuffer' }) as Buffer;

    return new NextResponse(new Uint8Array(pptxBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${customer.slug}_${currentMonth}_report.pptx"`,
      },
    });

  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate report', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
