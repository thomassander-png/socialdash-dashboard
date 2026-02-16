import { SlideModule, SlideContext, DESIGN } from './types';
import { addSlideHeader, addFamefactIcon, formatNumber, formatDate } from './helpers';

function generate(ctx: SlideContext): void {
  const { pptx, customer, fbPosts, primaryColor, secondaryColor, pageNumber } = ctx;
  const slide = pptx.addSlide();
  addSlideHeader(slide, customer, primaryColor, secondaryColor, 'Facebook', 'Videos & Reels');

  const fbVideos = fbPosts.filter(p => p.type === 'video' || p.type === 'VIDEO' || p.type === 'reel' || p.type === 'REEL');

  if (fbVideos.length === 0) {
    slide.addText('Keine Videos für diesen Zeitraum verfügbar', {
      x: 1, y: 2.5, w: 8, h: 0.5,
      fontSize: 14, color: DESIGN.colors.mediumGray, align: 'center', fontFace: DESIGN.fontFamily
    });
    addFamefactIcon(slide, pageNumber, primaryColor);
    return;
  }

  // Table header
  const tableX = DESIGN.margin;
  const tableW = 10 - DESIGN.margin * 2;
  const colWidths = [0.5, 3.5, 1.5, 1.5, 1.5, 1.0];
  const headerY = 1.0;

  slide.addShape('roundRect', {
    x: tableX, y: headerY, w: tableW, h: 0.4,
    fill: { color: primaryColor }, rectRadius: 0.08
  });

  const headers = ['#', 'Video', '3s Views', 'Reichweite', 'Interaktionen', 'Datum'];
  let hdrX = tableX;
  headers.forEach((h, i) => {
    slide.addText(h, {
      x: hdrX + 0.1, y: headerY, w: colWidths[i] - 0.2, h: 0.4,
      fontSize: 9, bold: true, color: DESIGN.colors.white,
      fontFace: DESIGN.fontFamily, align: i <= 1 ? 'left' : 'center', valign: 'middle'
    });
    hdrX += colWidths[i];
  });

  // Video rows
  const sortedVideos = [...fbVideos]
    .sort((a, b) => (b.video_3s_views || 0) - (a.video_3s_views || 0))
    .slice(0, 8);

  let rowY = headerY + 0.45;
  sortedVideos.forEach((video, idx) => {
    if (rowY > 4.6) return;
    const isAlt = idx % 2 === 0;
    if (isAlt) {
      slide.addShape('rect', {
        x: tableX + 0.05, y: rowY, w: tableW - 0.1, h: 0.4,
        fill: { color: DESIGN.colors.lightGray }
      });
    }

    const interactions = (video.reactions_total || 0) + (video.comments_total || 0);
    const rowData = [
      (idx + 1).toString(),
      (video.message || 'Video').substring(0, 50) + ((video.message || '').length > 50 ? '...' : ''),
      formatNumber(video.video_3s_views || 0),
      formatNumber(video.reach || 0),
      formatNumber(interactions),
      formatDate(video.created_time),
    ];

    let cellX = tableX;
    rowData.forEach((val, i) => {
      slide.addText(val, {
        x: cellX + 0.1, y: rowY, w: colWidths[i] - 0.2, h: 0.4,
        fontSize: 8, color: i === 2 ? primaryColor : DESIGN.colors.darkGray,
        fontFace: DESIGN.fontFamily, align: i <= 1 ? 'left' : 'center', valign: 'middle',
        bold: i === 2
      });
      cellX += colWidths[i];
    });

    rowY += 0.4;
  });

  addFamefactIcon(slide, pageNumber, primaryColor);
}

export const slideFbVideos: SlideModule = {
  id: 'fbVideos',
  name: 'FB Videos',
  description: 'Facebook Videos & Reels Tabelle mit 3s Views',
  platform: 'facebook',
  category: 'content',
  order: 13,
  generate,
};
