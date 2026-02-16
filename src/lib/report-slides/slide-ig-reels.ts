import { SlideModule, SlideContext, DESIGN } from './types';
import { addSlideHeader, addFamefactIcon, formatNumber, formatDate } from './helpers';

function generate(ctx: SlideContext): void {
  const { pptx, customer, igPosts, primaryColor, secondaryColor, pageNumber } = ctx;
  const slide = pptx.addSlide();
  addSlideHeader(slide, customer, primaryColor, secondaryColor, 'Instagram', 'Reels & Videos');

  const igReels = igPosts.filter(p => p.type === 'VIDEO' || p.type === 'REEL');

  if (igReels.length === 0) {
    slide.addText('Keine Reels für diesen Zeitraum verfügbar', {
      x: 1, y: 2.5, w: 8, h: 0.5,
      fontSize: 14, color: DESIGN.colors.mediumGray, align: 'center', fontFace: DESIGN.fontFamily
    });
    addFamefactIcon(slide, pageNumber, secondaryColor);
    return;
  }

  // Table
  const tableX = DESIGN.margin;
  const tableW = 10 - DESIGN.margin * 2;
  const colWidths = [0.5, 3.5, 1.3, 1.3, 1.3, 1.1];
  const headerY = 1.0;

  slide.addShape('roundRect', {
    x: tableX, y: headerY, w: tableW, h: 0.4,
    fill: { color: secondaryColor }, rectRadius: 0.08
  });

  const headers = ['#', 'Reel', 'Likes', 'Reichweite', 'Saves', 'Datum'];
  let hdrX = tableX;
  headers.forEach((h, i) => {
    slide.addText(h, {
      x: hdrX + 0.1, y: headerY, w: colWidths[i] - 0.2, h: 0.4,
      fontSize: 9, bold: true, color: DESIGN.colors.white,
      fontFace: DESIGN.fontFamily, align: i <= 1 ? 'left' : 'center', valign: 'middle'
    });
    hdrX += colWidths[i];
  });

  const sortedReels = [...igReels]
    .sort((a, b) => (b.reactions_total || 0) - (a.reactions_total || 0))
    .slice(0, 8);

  let rowY = headerY + 0.45;
  sortedReels.forEach((reel, idx) => {
    if (rowY > 4.6) return;
    const isAlt = idx % 2 === 0;
    if (isAlt) {
      slide.addShape('rect', {
        x: tableX + 0.05, y: rowY, w: tableW - 0.1, h: 0.4,
        fill: { color: DESIGN.colors.lightGray }
      });
    }

    const rowData = [
      (idx + 1).toString(),
      (reel.message || 'Reel').substring(0, 50) + ((reel.message || '').length > 50 ? '...' : ''),
      formatNumber(reel.reactions_total || 0),
      formatNumber(reel.reach || 0),
      formatNumber(reel.saves || 0),
      formatDate(reel.created_time),
    ];

    let cellX = tableX;
    rowData.forEach((val, i) => {
      slide.addText(val, {
        x: cellX + 0.1, y: rowY, w: colWidths[i] - 0.2, h: 0.4,
        fontSize: 8, color: i === 2 ? secondaryColor : DESIGN.colors.darkGray,
        fontFace: DESIGN.fontFamily, align: i <= 1 ? 'left' : 'center', valign: 'middle',
        bold: i === 2
      });
      cellX += colWidths[i];
    });

    rowY += 0.4;
  });

  addFamefactIcon(slide, pageNumber, secondaryColor);
}

export const slideIgReels: SlideModule = {
  id: 'igReels',
  name: 'IG Reels',
  description: 'Instagram Reels & Videos Tabelle',
  platform: 'instagram',
  category: 'content',
  order: 33,
  generate,
};
