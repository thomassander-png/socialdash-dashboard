import { SlideModule, SlideContext, DESIGN } from './types';
import { addSlideHeader, addFamefactIcon, formatNumber, formatDate } from './helpers';

function generate(ctx: SlideContext): void {
  const { pptx, customer, month, fbPosts, primaryColor, secondaryColor, pageNumber, imageCache } = ctx;
  const slide = pptx.addSlide();
  addSlideHeader(slide, customer, primaryColor, secondaryColor, 'Facebook', 'Top Beiträge nach Interaktionen', imageCache);

  const posts = fbPosts.filter(p => p.type !== 'video' && p.type !== 'VIDEO');
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
    addFamefactIcon(slide, pageNumber, primaryColor);
    return;
  }

  const imgW = 2.8;
  const imgH = 3.5;
  const startX = DESIGN.margin + 0.2;
  const startY = 1.0;
  const gap = 0.35;

  topPosts.forEach((post, idx) => {
    const xPos = startX + idx * (imgW + gap);

    // Shadow
    slide.addShape('rect', {
      x: xPos + 0.05, y: startY + 0.05, w: imgW, h: imgH,
      fill: { color: DESIGN.colors.shadow }
    });

    // Only use base64 cached images - never use path: (URLs may be expired)
    const imageData = post.thumbnail_url ? imageCache?.get(post.thumbnail_url) : null;

    if (imageData) {
      // We have a valid cached image
      try {
        slide.addImage({
          data: imageData,
          x: xPos, y: startY, w: imgW, h: imgH,
          sizing: { type: 'cover', w: imgW, h: imgH }
        });
      } catch {
        // Image embedding failed - use text fallback
        addTextFallback(slide, post, xPos, startY, imgW, imgH, primaryColor);
      }
    } else {
      // No valid image - show styled text card instead
      addTextFallback(slide, post, xPos, startY, imgW, imgH, primaryColor);
    }

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

    // Dark overlay for metrics
    const overlayH = imgH * 0.35;
    const overlayY = startY + imgH - overlayH;
    slide.addShape('rect', {
      x: xPos, y: overlayY, w: imgW, h: overlayH,
      fill: { color: DESIGN.colors.black, transparency: 35 }
    });

    const metricsY = overlayY + 0.15;
    slide.addText('Reichweite', { x: xPos + 0.1, y: metricsY, w: imgW - 0.2, h: 0.2, fontSize: 8, color: 'CCCCCC', fontFace: DESIGN.fontFamily });
    slide.addText(formatNumber(post.reach || 0), { x: xPos + 0.1, y: metricsY + 0.18, w: imgW - 0.2, h: 0.28, fontSize: 14, bold: true, color: DESIGN.colors.white, fontFace: DESIGN.fontFamily });
    slide.addText('Interaktionen', { x: xPos + 0.1, y: metricsY + 0.52, w: imgW - 0.2, h: 0.2, fontSize: 8, color: 'CCCCCC', fontFace: DESIGN.fontFamily });
    slide.addText(formatNumber(post.interactions), { x: xPos + 0.1, y: metricsY + 0.7, w: imgW - 0.2, h: 0.28, fontSize: 14, bold: true, color: DESIGN.colors.white, fontFace: DESIGN.fontFamily });

    // Engagement pill
    const engPillW = 0.9;
    const engPillH = 0.25;
    slide.addShape('roundRect', {
      x: xPos + imgW - engPillW - 0.1, y: metricsY + 0.75, w: engPillW, h: engPillH,
      fill: { color: primaryColor },
      rectRadius: 0.12
    });
    slide.addText(`${post.engagementRate.toFixed(1)}%`, {
      x: xPos + imgW - engPillW - 0.1, y: metricsY + 0.75, w: engPillW, h: engPillH,
      fontSize: 9, bold: true, color: DESIGN.colors.white, fontFace: DESIGN.fontFamily, align: 'center', valign: 'middle'
    });

    // Rank badge
    slide.addShape('ellipse', { x: xPos - 0.15, y: startY - 0.15, w: 0.4, h: 0.4, fill: { color: primaryColor } });
    slide.addText((idx + 1).toString(), { x: xPos - 0.15, y: startY - 0.15, w: 0.4, h: 0.4, fontSize: 14, bold: true, color: DESIGN.colors.white, align: 'center', valign: 'middle', fontFace: DESIGN.fontFamily });
  });

  addFamefactIcon(slide, pageNumber, primaryColor);
}

// Styled text fallback when no image is available
function addTextFallback(slide: PptxGenJS.Slide, post: any, x: number, y: number, w: number, h: number, primaryColor: string) {
  // Gradient-like background
  slide.addShape('rect', {
    x: x, y: y, w: w, h: h,
    fill: { color: 'F5F5F5' },
    line: { color: 'E0E0E0', width: 1 }
  });
  // Accent bar at top
  slide.addShape('rect', {
    x: x, y: y, w: w, h: 0.06,
    fill: { color: primaryColor }
  });
  // Post text preview
  const message = post.message || post.title || 'Kein Text verfügbar';
  const truncated = message.length > 120 ? message.substring(0, 120) + '...' : message;
  slide.addText(truncated, {
    x: x + 0.15, y: y + 0.3, w: w - 0.3, h: h * 0.5,
    fontSize: 9, color: DESIGN.colors.darkGray, fontFace: DESIGN.fontFamily,
    valign: 'top', wrap: true
  });
  // "Bild nicht verfügbar" note
  slide.addText('📷 Bild nicht verfügbar', {
    x: x + 0.1, y: y + h * 0.55, w: w - 0.2, h: 0.25,
    fontSize: 7, italic: true, color: DESIGN.colors.mediumGray, fontFace: DESIGN.fontFamily, align: 'center'
  });
}

import PptxGenJS from 'pptxgenjs';

export const slideFbTopPosts: SlideModule = {
  id: 'fbTopPosts',
  name: 'FB Top Posts',
  description: 'Top 3 Facebook-Beiträge nach Interaktionen mit Bildern',
  platform: 'facebook',
  category: 'content',
  order: 12,
  generate,
};
