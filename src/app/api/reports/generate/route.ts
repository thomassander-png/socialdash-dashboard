import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import PptxGenJS from 'pptxgenjs';

// Famefact Brand Colors
const COLORS = {
  dark: '0a0a0a',
  lime: 'c8ff00',
  white: 'FFFFFF',
  gray: '6B7080',
  lightGray: 'F3F4F6',
  cardBg: '1a1a1a',
  purple: '9333ea',
};

// German month names
const GERMAN_MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

function getGermanMonth(month: string): string {
  const [year, monthNum] = month.split('-').map(Number);
  return `${GERMAN_MONTHS[monthNum - 1]} ${year}`;
}

function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '0';
  const n = Number(num);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('de-DE');
}

interface FacebookStats {
  total_posts: number;
  total_reach: number;
  total_impressions: number;
  total_reactions: number;
  total_comments: number;
  total_shares: number;
  total_video_views: number;
  total_interactions: number;
  avg_reach_per_post: number;
}

interface FacebookPost {
  post_id: string;
  page_id: string;
  created_time: Date;
  type: string;
  permalink: string | null;
  message: string | null;
  reactions_total: number;
  comments_total: number;
  shares_total: number | null;
  reach: number | null;
  impressions: number | null;
  video_3s_views: number | null;
  interactions_total: number;
  image_url: string | null;
}

interface InstagramStats {
  total_posts: number;
  total_reach: number;
  total_impressions: number;
  total_likes: number;
  total_comments: number;
  total_saves: number;
  total_plays: number;
  total_interactions: number;
  avg_reach_per_post: number;
}

interface InstagramPost {
  media_id: string;
  account_id: string;
  timestamp: Date;
  media_type: string;
  permalink: string | null;
  caption: string | null;
  likes: number;
  comments: number;
  saves: number | null;
  reach: number | null;
  impressions: number | null;
  plays: number | null;
  interactions_total: number;
  image_url: string | null;
}

async function getCustomerAccounts(customerId: string): Promise<{fbPageIds: string[], igAccountIds: string[]}> {
  const accounts = await query<{platform: string, account_id: string}>(`
    SELECT platform, account_id 
    FROM customer_accounts 
    WHERE customer_id = $1 AND is_active = true
  `, [customerId]);
  
  return {
    fbPageIds: accounts.filter(a => a.platform === 'facebook').map(a => a.account_id),
    igAccountIds: accounts.filter(a => a.platform === 'instagram').map(a => a.account_id),
  };
}

async function getFacebookData(month: string, pageIds: string[]): Promise<{
  stats: FacebookStats | null;
  topImagePosts: FacebookPost[];
  topVideos: FacebookPost[];
}> {
  if (pageIds.length === 0) {
    return { stats: null, topImagePosts: [], topVideos: [] };
  }

  const monthDate = `${month}-01`;
  const pageIdPlaceholders = pageIds.map((_, i) => `$${i + 2}`).join(',');

  // Get monthly stats
  const statsResult = await query<FacebookStats>(`
    SELECT 
      COUNT(DISTINCT post_id)::int as total_posts,
      COALESCE(SUM(reach), 0)::int as total_reach,
      COALESCE(SUM(impressions), 0)::int as total_impressions,
      COALESCE(SUM(reactions_total), 0)::int as total_reactions,
      COALESCE(SUM(comments_total), 0)::int as total_comments,
      COALESCE(SUM(shares_total), 0)::int as total_shares,
      COALESCE(SUM(video_3s_views), 0)::int as total_video_views,
      COALESCE(SUM(reactions_total), 0) + COALESCE(SUM(comments_total), 0) as total_interactions,
      CASE WHEN COUNT(DISTINCT post_id) > 0 
        THEN COALESCE(SUM(reach), 0) / COUNT(DISTINCT post_id) 
        ELSE 0 
      END as avg_reach_per_post
    FROM view_fb_monthly_post_metrics
    WHERE month = $1 AND page_id IN (${pageIdPlaceholders})
  `, [monthDate, ...pageIds]);

  const stats = statsResult[0] || null;

  // Get top image posts with images from Supabase Storage
  const imagePostsResult = await query<FacebookPost>(`
    SELECT 
      m.post_id, m.page_id, m.created_time, m.type, m.permalink, m.message,
      m.reactions_total, m.comments_total, m.shares_total, m.reach, m.impressions, m.video_3s_views,
      (COALESCE(m.reactions_total, 0) + COALESCE(m.comments_total, 0)) as interactions_total,
      p.image_url
    FROM view_fb_monthly_post_metrics m
    LEFT JOIN fb_posts p ON m.post_id = p.post_id
    WHERE m.month = $1 AND m.page_id IN (${pageIdPlaceholders})
    AND m.type IN ('photo', 'image', 'link', 'status')
    ORDER BY (COALESCE(m.reactions_total, 0) + COALESCE(m.comments_total, 0)) DESC
    LIMIT 9
  `, [monthDate, ...pageIds]);

  // Get top videos
  const videosResult = await query<FacebookPost>(`
    SELECT 
      m.post_id, m.page_id, m.created_time, m.type, m.permalink, m.message,
      m.reactions_total, m.comments_total, m.shares_total, m.reach, m.impressions, m.video_3s_views,
      (COALESCE(m.reactions_total, 0) + COALESCE(m.comments_total, 0)) as interactions_total,
      p.image_url
    FROM view_fb_monthly_post_metrics m
    LEFT JOIN fb_posts p ON m.post_id = p.post_id
    WHERE m.month = $1 AND m.page_id IN (${pageIdPlaceholders})
    AND m.type IN ('video', 'reel')
    AND m.video_3s_views IS NOT NULL
    ORDER BY m.video_3s_views DESC NULLS LAST
    LIMIT 6
  `, [monthDate, ...pageIds]);

  return {
    stats,
    topImagePosts: imagePostsResult,
    topVideos: videosResult,
  };
}

async function getInstagramData(month: string, accountIds: string[]): Promise<{
  stats: InstagramStats | null;
  topPosts: InstagramPost[];
  topReels: InstagramPost[];
}> {
  if (accountIds.length === 0) {
    return { stats: null, topPosts: [], topReels: [] };
  }

  const monthDate = `${month}-01`;
  const accountIdPlaceholders = accountIds.map((_, i) => `$${i + 2}`).join(',');

  // Get monthly stats
  const statsResult = await query<InstagramStats>(`
    SELECT 
      COUNT(DISTINCT media_id)::int as total_posts,
      COALESCE(SUM(reach), 0)::int as total_reach,
      COALESCE(SUM(impressions), 0)::int as total_impressions,
      COALESCE(SUM(likes), 0)::int as total_likes,
      COALESCE(SUM(comments), 0)::int as total_comments,
      COALESCE(SUM(saves), 0)::int as total_saves,
      COALESCE(SUM(plays), 0)::int as total_plays,
      COALESCE(SUM(likes), 0) + COALESCE(SUM(comments), 0) + COALESCE(SUM(saves), 0) as total_interactions,
      CASE WHEN COUNT(DISTINCT media_id) > 0 
        THEN COALESCE(SUM(reach), 0) / COUNT(DISTINCT media_id) 
        ELSE 0 
      END as avg_reach_per_post
    FROM view_ig_monthly_post_metrics
    WHERE month = $1 AND account_id IN (${accountIdPlaceholders})
  `, [monthDate, ...accountIds]);

  const stats = statsResult[0] || null;

  // Get top posts (images/carousels)
  const topPostsResult = await query<InstagramPost>(`
    SELECT 
      m.media_id, m.account_id, m.timestamp, m.media_type, m.permalink, m.caption,
      m.likes, m.comments, m.saves, m.reach, m.impressions, m.plays,
      (COALESCE(m.likes, 0) + COALESCE(m.comments, 0) + COALESCE(m.saves, 0)) as interactions_total,
      p.image_url
    FROM view_ig_monthly_post_metrics m
    LEFT JOIN ig_posts p ON m.media_id = p.media_id
    WHERE m.month = $1 AND m.account_id IN (${accountIdPlaceholders})
    AND m.media_type IN ('IMAGE', 'CAROUSEL_ALBUM')
    ORDER BY (COALESCE(m.likes, 0) + COALESCE(m.comments, 0) + COALESCE(m.saves, 0)) DESC
    LIMIT 9
  `, [monthDate, ...accountIds]);

  // Get top reels
  const topReelsResult = await query<InstagramPost>(`
    SELECT 
      m.media_id, m.account_id, m.timestamp, m.media_type, m.permalink, m.caption,
      m.likes, m.comments, m.saves, m.reach, m.impressions, m.plays,
      (COALESCE(m.likes, 0) + COALESCE(m.comments, 0) + COALESCE(m.saves, 0)) as interactions_total,
      p.image_url
    FROM view_ig_monthly_post_metrics m
    LEFT JOIN ig_posts p ON m.media_id = p.media_id
    WHERE m.month = $1 AND m.account_id IN (${accountIdPlaceholders})
    AND m.media_type IN ('VIDEO', 'REELS')
    AND m.plays IS NOT NULL
    ORDER BY m.plays DESC NULLS LAST
    LIMIT 6
  `, [monthDate, ...accountIds]);

  return {
    stats,
    topPosts: topPostsResult,
    topReels: topReelsResult,
  };
}

async function generatePPTX(
  clientName: string,
  month: string,
  fbData: Awaited<ReturnType<typeof getFacebookData>>,
  igData: Awaited<ReturnType<typeof getInstagramData>>
): Promise<Buffer> {
  const pptx = new PptxGenJS();
  
  // Set presentation properties
  pptx.author = 'Famefact';
  pptx.title = `Social Media Report - ${clientName} - ${getGermanMonth(month)}`;
  pptx.subject = 'Monthly Social Media Report';
  pptx.layout = 'LAYOUT_16x9';

  const germanMonth = getGermanMonth(month);

  // ==================== Cover Slide ====================
  const coverSlide = pptx.addSlide();
  coverSlide.background = { color: COLORS.dark };

  coverSlide.addText('Social Media Reporting', {
    x: 0.5,
    y: 2.5,
    w: '90%',
    h: 1,
    fontSize: 48,
    bold: true,
    color: COLORS.white,
    align: 'center',
  });

  coverSlide.addText(germanMonth, {
    x: 0.5,
    y: 3.8,
    w: '90%',
    h: 0.8,
    fontSize: 32,
    color: COLORS.lime,
    align: 'center',
  });

  coverSlide.addText(clientName, {
    x: 0.5,
    y: 4.8,
    w: '90%',
    h: 0.5,
    fontSize: 20,
    color: COLORS.gray,
    align: 'center',
  });

  // ==================== Facebook Section ====================
  if (fbData.stats && fbData.stats.total_posts > 0) {
    // Facebook separator slide
    const fbSeparator = pptx.addSlide();
    fbSeparator.background = { color: COLORS.dark };
    fbSeparator.addText('Facebook', {
      x: 0.5,
      y: 3,
      w: '90%',
      h: 1.5,
      fontSize: 56,
      bold: true,
      color: COLORS.lime,
      align: 'center',
    });

    // Facebook KPI slide
    const fbKpiSlide = pptx.addSlide();
    fbKpiSlide.background = { color: COLORS.dark };
    
    fbKpiSlide.addText('Facebook Kennzahlen', {
      x: 0.5,
      y: 0.3,
      w: '90%',
      h: 0.8,
      fontSize: 28,
      bold: true,
      color: COLORS.white,
    });

    const stats = fbData.stats;
    const kpis: Array<Array<{text: string}>> = [
      [{ text: 'KPI' }, { text: germanMonth }],
      [{ text: 'Post-Reichweite' }, { text: formatNumber(stats.total_reach) }],
      [{ text: 'Ø Reichweite pro Post' }, { text: formatNumber(stats.avg_reach_per_post) }],
      [{ text: 'Interaktionen' }, { text: formatNumber(stats.total_interactions) }],
      [{ text: 'Reactions' }, { text: formatNumber(stats.total_reactions) }],
      [{ text: 'Kommentare' }, { text: formatNumber(stats.total_comments) }],
      [{ text: 'Video Views (3-Sek)' }, { text: formatNumber(stats.total_video_views) }],
      [{ text: 'Anzahl Postings' }, { text: String(stats.total_posts) }],
      [{ text: 'Shares (Limited)' }, { text: formatNumber(stats.total_shares) }],
    ];

    // Calculate interaction rate
    if (stats.total_reach > 0) {
      const rate = (stats.total_interactions / stats.total_reach) * 100;
      kpis.push([{ text: 'Interaktionsrate' }, { text: `${rate.toFixed(2)}%` }]);
    }

    fbKpiSlide.addTable(kpis, {
      x: 1,
      y: 1.3,
      w: 8,
      colW: [5, 3],
      border: { type: 'solid', color: COLORS.cardBg, pt: 1 },
      fill: { color: COLORS.cardBg },
      color: COLORS.white,
      fontSize: 11,
      fontFace: 'Arial',
      valign: 'middle',
      align: 'left',
    });

    // Footnotes
    fbKpiSlide.addText([
      { text: 'Interaktionsrate = Interaktionen / Post-Reichweite × 100', options: { fontSize: 8, color: COLORS.gray } },
      { text: '\nInteraktionen = Reactions + Comments (Shares separat, da eingeschränkt)', options: { fontSize: 8, color: COLORS.gray } },
    ], {
      x: 0.5,
      y: 6.5,
      w: '90%',
      h: 0.5,
    });

    // Top Posts slide with images
    if (fbData.topImagePosts.length > 0) {
      const topPostsSlide = pptx.addSlide();
      topPostsSlide.background = { color: COLORS.dark };
      
      topPostsSlide.addText('Top Posts nach Interaktion', {
        x: 0.5,
        y: 0.3,
        w: '90%',
        h: 0.8,
        fontSize: 28,
        bold: true,
        color: COLORS.white,
      });

      // Add post cards (3x2 grid)
      const cardWidth = 3.1;
      const cardHeight = 2.3;
      const startX = 0.3;
      const startY = 1.2;
      const gapX = 0.15;
      const gapY = 0.15;

      for (let i = 0; i < Math.min(6, fbData.topImagePosts.length); i++) {
        const post = fbData.topImagePosts[i];
        const row = Math.floor(i / 3);
        const col = i % 3;
        const x = startX + col * (cardWidth + gapX);
        const y = startY + row * (cardHeight + gapY);

        // Card background
        topPostsSlide.addShape('rect', {
          x,
          y,
          w: cardWidth,
          h: cardHeight,
          fill: { color: COLORS.cardBg },
          line: { color: COLORS.cardBg },
        });

        // Try to add image if available
        if (post.image_url) {
          try {
            topPostsSlide.addImage({
              path: post.image_url,
              x: x + 0.1,
              y: y + 0.1,
              w: 1.2,
              h: 1.2,
            });
          } catch {
            // Image loading failed, skip
          }
        }

        // Date
        const postDate = new Date(post.created_time);
        const dateStr = postDate.toLocaleDateString('de-DE');
        topPostsSlide.addText(dateStr, {
          x: x + (post.image_url ? 1.4 : 0.1),
          y: y + 0.1,
          w: cardWidth - (post.image_url ? 1.5 : 0.2),
          h: 0.25,
          fontSize: 8,
          color: COLORS.gray,
        });

        // Message preview
        const message = post.message ? post.message.substring(0, 80) + (post.message.length > 80 ? '...' : '') : 'Kein Text';
        topPostsSlide.addText(message, {
          x: x + (post.image_url ? 1.4 : 0.1),
          y: y + 0.4,
          w: cardWidth - (post.image_url ? 1.5 : 0.2),
          h: 1.0,
          fontSize: 9,
          color: COLORS.white,
          valign: 'top',
        });

        // Interactions
        topPostsSlide.addText(`❤ ${formatNumber(post.interactions_total)} Interaktionen`, {
          x: x + 0.1,
          y: y + cardHeight - 0.4,
          w: cardWidth - 0.2,
          h: 0.3,
          fontSize: 10,
          bold: true,
          color: COLORS.lime,
        });
      }

      // Footnote
      topPostsSlide.addText('Interaktionen = Reactions + Kommentare. Shares separat (limited).', {
        x: 0.5,
        y: 6.5,
        w: '90%',
        h: 0.3,
        fontSize: 8,
        color: COLORS.gray,
      });
    }

    // Videos slide
    if (fbData.topVideos.length > 0) {
      const videosSlide = pptx.addSlide();
      videosSlide.background = { color: COLORS.dark };
      
      videosSlide.addText('Top Videos nach 3-Sek Views', {
        x: 0.5,
        y: 0.3,
        w: '90%',
        h: 0.8,
        fontSize: 28,
        bold: true,
        color: COLORS.white,
      });

      const cardWidth = 3.1;
      const cardHeight = 2.3;
      const startX = 0.3;
      const startY = 1.2;
      const gapX = 0.15;
      const gapY = 0.15;

      for (let i = 0; i < Math.min(6, fbData.topVideos.length); i++) {
        const post = fbData.topVideos[i];
        const row = Math.floor(i / 3);
        const col = i % 3;
        const x = startX + col * (cardWidth + gapX);
        const y = startY + row * (cardHeight + gapY);

        // Card background
        videosSlide.addShape('rect', {
          x,
          y,
          w: cardWidth,
          h: cardHeight,
          fill: { color: COLORS.cardBg },
          line: { color: COLORS.cardBg },
        });

        // Date
        const postDate = new Date(post.created_time);
        const dateStr = postDate.toLocaleDateString('de-DE');
        videosSlide.addText(dateStr, {
          x: x + 0.1,
          y: y + 0.1,
          w: cardWidth - 0.2,
          h: 0.25,
          fontSize: 8,
          color: COLORS.gray,
        });

        // Message preview
        const message = post.message ? post.message.substring(0, 100) + (post.message.length > 100 ? '...' : '') : 'Kein Text';
        videosSlide.addText(message, {
          x: x + 0.1,
          y: y + 0.4,
          w: cardWidth - 0.2,
          h: 1.4,
          fontSize: 9,
          color: COLORS.white,
          valign: 'top',
        });

        // Views
        videosSlide.addText(`👁 ${formatNumber(post.video_3s_views)} Views`, {
          x: x + 0.1,
          y: y + cardHeight - 0.4,
          w: cardWidth - 0.2,
          h: 0.3,
          fontSize: 10,
          bold: true,
          color: COLORS.lime,
        });
      }
    }
  }

  // ==================== Instagram Section ====================
  if (igData.stats && igData.stats.total_posts > 0) {
    // Instagram separator slide
    const igSeparator = pptx.addSlide();
    igSeparator.background = { color: COLORS.dark };
    igSeparator.addText('Instagram', {
      x: 0.5,
      y: 3,
      w: '90%',
      h: 1.5,
      fontSize: 56,
      bold: true,
      color: COLORS.purple,
      align: 'center',
    });

    // Instagram KPI slide
    const igKpiSlide = pptx.addSlide();
    igKpiSlide.background = { color: COLORS.dark };
    
    igKpiSlide.addText('Instagram Kennzahlen', {
      x: 0.5,
      y: 0.3,
      w: '90%',
      h: 0.8,
      fontSize: 28,
      bold: true,
      color: COLORS.white,
    });

    const stats = igData.stats;
    const kpis: Array<Array<{text: string}>> = [
      [{ text: 'KPI' }, { text: germanMonth }],
      [{ text: 'Reichweite' }, { text: formatNumber(stats.total_reach) }],
      [{ text: 'Ø Reichweite pro Post' }, { text: formatNumber(stats.avg_reach_per_post) }],
      [{ text: 'Interaktionen' }, { text: formatNumber(stats.total_interactions) }],
      [{ text: 'Likes' }, { text: formatNumber(stats.total_likes) }],
      [{ text: 'Kommentare' }, { text: formatNumber(stats.total_comments) }],
      [{ text: 'Saves' }, { text: formatNumber(stats.total_saves) }],
      [{ text: 'Reel Plays' }, { text: formatNumber(stats.total_plays) }],
      [{ text: 'Anzahl Postings' }, { text: String(stats.total_posts) }],
    ];

    // Calculate interaction rate
    if (stats.total_reach > 0) {
      const rate = (stats.total_interactions / stats.total_reach) * 100;
      kpis.push([{ text: 'Interaktionsrate' }, { text: `${rate.toFixed(2)}%` }]);
    }

    igKpiSlide.addTable(kpis, {
      x: 1,
      y: 1.3,
      w: 8,
      colW: [5, 3],
      border: { type: 'solid', color: COLORS.cardBg, pt: 1 },
      fill: { color: COLORS.cardBg },
      color: COLORS.white,
      fontSize: 11,
      fontFace: 'Arial',
      valign: 'middle',
      align: 'left',
    });

    igKpiSlide.addText('Interaktionen = Likes + Comments + Saves', {
      x: 0.5,
      y: 6.5,
      w: '90%',
      h: 0.3,
      fontSize: 8,
      color: COLORS.gray,
    });

    // Top Posts slide with images
    if (igData.topPosts.length > 0) {
      const topPostsSlide = pptx.addSlide();
      topPostsSlide.background = { color: COLORS.dark };
      
      topPostsSlide.addText('Top Posts nach Interaktion', {
        x: 0.5,
        y: 0.3,
        w: '90%',
        h: 0.8,
        fontSize: 28,
        bold: true,
        color: COLORS.white,
      });

      const cardWidth = 3.1;
      const cardHeight = 2.3;
      const startX = 0.3;
      const startY = 1.2;
      const gapX = 0.15;
      const gapY = 0.15;

      for (let i = 0; i < Math.min(6, igData.topPosts.length); i++) {
        const post = igData.topPosts[i];
        const row = Math.floor(i / 3);
        const col = i % 3;
        const x = startX + col * (cardWidth + gapX);
        const y = startY + row * (cardHeight + gapY);

        // Card background
        topPostsSlide.addShape('rect', {
          x,
          y,
          w: cardWidth,
          h: cardHeight,
          fill: { color: COLORS.cardBg },
          line: { color: COLORS.cardBg },
        });

        // Try to add image if available
        if (post.image_url) {
          try {
            topPostsSlide.addImage({
              path: post.image_url,
              x: x + 0.1,
              y: y + 0.1,
              w: 1.2,
              h: 1.2,
            });
          } catch {
            // Image loading failed, skip
          }
        }

        // Date
        const postDate = new Date(post.timestamp);
        const dateStr = postDate.toLocaleDateString('de-DE');
        topPostsSlide.addText(dateStr, {
          x: x + (post.image_url ? 1.4 : 0.1),
          y: y + 0.1,
          w: cardWidth - (post.image_url ? 1.5 : 0.2),
          h: 0.25,
          fontSize: 8,
          color: COLORS.gray,
        });

        // Caption preview
        const caption = post.caption ? post.caption.substring(0, 80) + (post.caption.length > 80 ? '...' : '') : 'Kein Text';
        topPostsSlide.addText(caption, {
          x: x + (post.image_url ? 1.4 : 0.1),
          y: y + 0.4,
          w: cardWidth - (post.image_url ? 1.5 : 0.2),
          h: 1.0,
          fontSize: 9,
          color: COLORS.white,
          valign: 'top',
        });

        // Interactions
        topPostsSlide.addText(`❤ ${formatNumber(post.interactions_total)} Interaktionen`, {
          x: x + 0.1,
          y: y + cardHeight - 0.4,
          w: cardWidth - 0.2,
          h: 0.3,
          fontSize: 10,
          bold: true,
          color: COLORS.purple,
        });
      }
    }

    // Reels slide
    if (igData.topReels.length > 0) {
      const reelsSlide = pptx.addSlide();
      reelsSlide.background = { color: COLORS.dark };
      
      reelsSlide.addText('Top Reels nach Plays', {
        x: 0.5,
        y: 0.3,
        w: '90%',
        h: 0.8,
        fontSize: 28,
        bold: true,
        color: COLORS.white,
      });

      const cardWidth = 3.1;
      const cardHeight = 2.3;
      const startX = 0.3;
      const startY = 1.2;
      const gapX = 0.15;
      const gapY = 0.15;

      for (let i = 0; i < Math.min(6, igData.topReels.length); i++) {
        const post = igData.topReels[i];
        const row = Math.floor(i / 3);
        const col = i % 3;
        const x = startX + col * (cardWidth + gapX);
        const y = startY + row * (cardHeight + gapY);

        // Card background
        reelsSlide.addShape('rect', {
          x,
          y,
          w: cardWidth,
          h: cardHeight,
          fill: { color: COLORS.cardBg },
          line: { color: COLORS.cardBg },
        });

        // Date
        const postDate = new Date(post.timestamp);
        const dateStr = postDate.toLocaleDateString('de-DE');
        reelsSlide.addText(dateStr, {
          x: x + 0.1,
          y: y + 0.1,
          w: cardWidth - 0.2,
          h: 0.25,
          fontSize: 8,
          color: COLORS.gray,
        });

        // Caption preview
        const caption = post.caption ? post.caption.substring(0, 100) + (post.caption.length > 100 ? '...' : '') : 'Kein Text';
        reelsSlide.addText(caption, {
          x: x + 0.1,
          y: y + 0.4,
          w: cardWidth - 0.2,
          h: 1.4,
          fontSize: 9,
          color: COLORS.white,
          valign: 'top',
        });

        // Plays
        reelsSlide.addText(`▶ ${formatNumber(post.plays)} Plays`, {
          x: x + 0.1,
          y: y + cardHeight - 0.4,
          w: cardWidth - 0.2,
          h: 0.3,
          fontSize: 10,
          bold: true,
          color: COLORS.purple,
        });
      }
    }
  }

  // ==================== Fazit Slide ====================
  const fazitSlide = pptx.addSlide();
  fazitSlide.background = { color: COLORS.dark };
  
  fazitSlide.addText('Fazit', {
    x: 0.5,
    y: 0.3,
    w: '90%',
    h: 0.8,
    fontSize: 28,
    bold: true,
    color: COLORS.white,
  });

  let fazitText = '';
  if (fbData.stats && fbData.stats.total_posts > 0) {
    const stats = fbData.stats;
    fazitText += `Facebook: Im ${germanMonth} wurden ${stats.total_posts} Beiträge veröffentlicht. `;
    fazitText += `Die Gesamtreichweite betrug ${formatNumber(stats.total_reach)} `;
    fazitText += `mit ${formatNumber(stats.total_interactions)} Interaktionen. `;
    
    if (fbData.topImagePosts.length > 0) {
      const topPost = fbData.topImagePosts[0];
      fazitText += `Der Top-Post erzielte ${formatNumber(topPost.interactions_total)} Interaktionen.\n\n`;
    }
  }

  if (igData.stats && igData.stats.total_posts > 0) {
    const stats = igData.stats;
    fazitText += `Instagram: Im ${germanMonth} wurden ${stats.total_posts} Beiträge veröffentlicht. `;
    fazitText += `Die Gesamtreichweite betrug ${formatNumber(stats.total_reach)} `;
    fazitText += `mit ${formatNumber(stats.total_interactions)} Interaktionen (inkl. Saves). `;
    
    if (igData.topPosts.length > 0) {
      const topPost = igData.topPosts[0];
      fazitText += `Der Top-Post erzielte ${formatNumber(topPost.interactions_total)} Interaktionen.`;
    }
  }

  if (!fazitText) {
    fazitText = 'Keine Daten für diesen Monat verfügbar.';
  }

  fazitSlide.addText(fazitText, {
    x: 0.75,
    y: 1.5,
    w: '85%',
    h: 4,
    fontSize: 16,
    color: COLORS.white,
    valign: 'top',
  });

  // ==================== Contact Slide ====================
  const contactSlide = pptx.addSlide();
  contactSlide.background = { color: COLORS.dark };

  contactSlide.addText('Vielen Dank', {
    x: 0.5,
    y: 2.5,
    w: '90%',
    h: 1,
    fontSize: 48,
    bold: true,
    color: COLORS.lime,
    align: 'center',
  });

  contactSlide.addText(`Report erstellt für ${clientName}`, {
    x: 0.5,
    y: 4,
    w: '90%',
    h: 0.5,
    fontSize: 18,
    color: COLORS.gray,
    align: 'center',
  });

  contactSlide.addText(germanMonth, {
    x: 0.5,
    y: 4.5,
    w: '90%',
    h: 0.5,
    fontSize: 14,
    color: COLORS.gray,
    align: 'center',
  });

  // Generate the PPTX file
  const pptxData = await pptx.write({ outputType: 'nodebuffer' }) as Buffer;
  return pptxData;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, month } = body;

    if (!customerId || !month) {
      return NextResponse.json(
        { error: 'customerId and month are required' },
        { status: 400 }
      );
    }

    // Get customer info
    const customers = await query<{customer_id: string, name: string}>(`
      SELECT customer_id, name FROM customers WHERE customer_id = $1
    `, [customerId]);

    if (customers.length === 0) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    const customer = customers[0];

    // Get customer's accounts
    const { fbPageIds, igAccountIds } = await getCustomerAccounts(customerId);

    // Fetch data for the customer's accounts
    const fbData = await getFacebookData(month, fbPageIds);
    const igData = await getInstagramData(month, igAccountIds);

    // Generate PPTX
    const pptxBuffer = await generatePPTX(customer.name, month, fbData, igData);

    // Return as base64
    const base64 = pptxBuffer.toString('base64');
    const filename = `report_${customer.name.toLowerCase().replace(/\s+/g, '_')}_${month}.pptx`;

    return NextResponse.json({
      success: true,
      filename,
      data: base64,
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      stats: {
        facebook: fbData.stats ? {
          posts: fbData.stats.total_posts,
          reach: fbData.stats.total_reach,
          interactions: fbData.stats.total_interactions,
        } : null,
        instagram: igData.stats ? {
          posts: igData.stats.total_posts,
          reach: igData.stats.total_reach,
          interactions: igData.stats.total_interactions,
        } : null,
      }
    });

  } catch (error) {
    console.error('Report generation failed:', error);
    return NextResponse.json(
      { error: 'Report generation failed', details: String(error) },
      { status: 500 }
    );
  }
}
