import { SlideModule, SlideContext, DESIGN } from './types';
import {
  addBrandingLine, addSubtleWatermark, addCustomerLogo, addFamefactIcon,
  drawUserIcon, drawEyeIcon, drawChatIcon,
  formatNumber, getShortMonthName, getTrendText
} from './helpers';

function generate(ctx: SlideContext): void {
  const { pptx, customer, month, fbKpis, igKpis, primaryColor, secondaryColor, pageNumber } = ctx;
  const slide = pptx.addSlide();
  slide.background = { color: DESIGN.colors.background };
  addBrandingLine(slide, primaryColor);
  addSubtleWatermark(slide, secondaryColor);
  addCustomerLogo(slide, customer, 7.5, 0.15, 2, 0.5);

  slide.addText('Executive Summary', {
    x: DESIGN.margin, y: 0.2, w: 7, h: 0.45,
    fontSize: 26, bold: true, color: DESIGN.colors.black, fontFace: DESIGN.fontFamily
  });
  slide.addText(getShortMonthName(month) + ' – Alle Plattformen', {
    x: DESIGN.margin, y: 0.6, w: 7, h: 0.3,
    fontSize: 14, color: DESIGN.colors.mediumGray, fontFace: DESIGN.fontFamily
  });

  const fbCurrent = fbKpis[2] || fbKpis[fbKpis.length - 1];
  const fbPrev = fbKpis[1] || fbKpis[0];
  const igCurrent = igKpis[2] || igKpis[igKpis.length - 1];
  const igPrev = igKpis[1] || igKpis[0];

  // KPI Boxes
  const boxW = 2.1;
  const boxH = 1.8;
  const boxGap = 0.25;
  const boxY = 1.1;
  const accentColor = primaryColor;
  const pillW = 1.1;
  const pillH = 0.32;
  const pillY = boxY + boxH - 0.5;

  // KPI 1: Total Posts
  const totalPosts = (fbCurrent?.posts_count || 0) + (igCurrent?.posts_count || 0);
  const prevTotalPosts = (fbPrev?.posts_count || 0) + (igPrev?.posts_count || 0);
  const postsTrend = getTrendText(totalPosts, prevTotalPosts);

  const box1X = DESIGN.margin;
  slide.addShape('roundRect', { x: box1X + 0.04, y: boxY + 0.04, w: boxW, h: boxH, fill: { color: DESIGN.colors.shadow }, rectRadius: 0.15 });
  slide.addShape('roundRect', { x: box1X, y: boxY, w: boxW, h: boxH, fill: { color: DESIGN.colors.white }, line: { color: primaryColor, width: 1.5 }, rectRadius: 0.15 });
  drawUserIcon(slide, box1X + 0.25, boxY + 0.18, 0.5, primaryColor);
  slide.addText('Beiträge Gesamt', { x: box1X + 0.1, y: boxY + 0.7, w: boxW - 0.2, h: 0.25, fontSize: 10, color: DESIGN.colors.mediumGray, fontFace: DESIGN.fontFamily, align: 'center' });
  slide.addText(formatNumber(totalPosts), { x: box1X + 0.1, y: boxY + 0.95, w: boxW - 0.2, h: 0.45, fontSize: 26, bold: true, color: DESIGN.colors.black, fontFace: DESIGN.fontFamily, align: 'center' });
  const pill1X = box1X + (boxW - pillW) / 2;
  slide.addShape('roundRect', { x: pill1X, y: pillY, w: pillW, h: pillH, fill: { color: postsTrend.color }, rectRadius: 0.16 });
  slide.addText(postsTrend.text, { x: pill1X, y: pillY, w: pillW, h: pillH, fontSize: 11, bold: true, color: DESIGN.colors.white, fontFace: DESIGN.fontFamily, align: 'center', valign: 'middle' });

  // KPI 2: Total Reach
  const totalReach = (fbCurrent?.total_reach || 0) + (igCurrent?.total_reach || 0);
  const prevTotalReach = (fbPrev?.total_reach || 0) + (igPrev?.total_reach || 0);
  const reachTrend = getTrendText(totalReach, prevTotalReach);

  const box2X = DESIGN.margin + (boxW + boxGap);
  slide.addShape('roundRect', { x: box2X + 0.04, y: boxY + 0.04, w: boxW, h: boxH, fill: { color: DESIGN.colors.shadow }, rectRadius: 0.15 });
  slide.addShape('roundRect', { x: box2X, y: boxY, w: boxW, h: boxH, fill: { color: DESIGN.colors.white }, line: { color: primaryColor, width: 1.5 }, rectRadius: 0.15 });
  drawEyeIcon(slide, box2X + 0.25, boxY + 0.18, 0.5, primaryColor);
  slide.addText('Reichweite Gesamt', { x: box2X + 0.1, y: boxY + 0.7, w: boxW - 0.2, h: 0.25, fontSize: 10, color: DESIGN.colors.mediumGray, fontFace: DESIGN.fontFamily, align: 'center' });
  slide.addText(formatNumber(totalReach), { x: box2X + 0.1, y: boxY + 0.95, w: boxW - 0.2, h: 0.45, fontSize: 26, bold: true, color: DESIGN.colors.black, fontFace: DESIGN.fontFamily, align: 'center' });
  const pill2X = box2X + (boxW - pillW) / 2;
  slide.addShape('roundRect', { x: pill2X, y: pillY, w: pillW, h: pillH, fill: { color: reachTrend.color }, rectRadius: 0.16 });
  slide.addText(reachTrend.text, { x: pill2X, y: pillY, w: pillW, h: pillH, fontSize: 11, bold: true, color: DESIGN.colors.white, fontFace: DESIGN.fontFamily, align: 'center', valign: 'middle' });

  // KPI 3: Total Interactions
  const totalInteractions = (fbCurrent?.total_reactions || 0) + (fbCurrent?.total_comments || 0) + (fbCurrent?.total_shares || 0) +
                            (igCurrent?.total_reactions || 0) + (igCurrent?.total_comments || 0) + (igCurrent?.total_saves || 0);
  const prevTotalInteractions = (fbPrev?.total_reactions || 0) + (fbPrev?.total_comments || 0) + (fbPrev?.total_shares || 0) +
                                (igPrev?.total_reactions || 0) + (igPrev?.total_comments || 0) + (igPrev?.total_saves || 0);
  const interactionTrend = getTrendText(totalInteractions, prevTotalInteractions);

  const box3X = DESIGN.margin + (boxW + boxGap) * 2;
  slide.addShape('roundRect', { x: box3X + 0.04, y: boxY + 0.04, w: boxW, h: boxH, fill: { color: DESIGN.colors.shadow }, rectRadius: 0.15 });
  slide.addShape('roundRect', { x: box3X, y: boxY, w: boxW, h: boxH, fill: { color: DESIGN.colors.white }, line: { color: primaryColor, width: 1.5 }, rectRadius: 0.15 });
  drawChatIcon(slide, box3X + 0.25, boxY + 0.18, 0.5, primaryColor);
  slide.addText('Interaktionen Gesamt', { x: box3X + 0.1, y: boxY + 0.7, w: boxW - 0.2, h: 0.25, fontSize: 10, color: DESIGN.colors.mediumGray, fontFace: DESIGN.fontFamily, align: 'center' });
  slide.addText(formatNumber(totalInteractions), { x: box3X + 0.1, y: boxY + 0.95, w: boxW - 0.2, h: 0.45, fontSize: 26, bold: true, color: DESIGN.colors.black, fontFace: DESIGN.fontFamily, align: 'center' });
  const pill3X = box3X + (boxW - pillW) / 2;
  slide.addShape('roundRect', { x: pill3X, y: pillY, w: pillW, h: pillH, fill: { color: interactionTrend.color }, rectRadius: 0.16 });
  slide.addText(interactionTrend.text, { x: pill3X, y: pillY, w: pillW, h: pillH, fontSize: 11, bold: true, color: DESIGN.colors.white, fontFace: DESIGN.fontFamily, align: 'center', valign: 'middle' });

  // Gesamtfazit box
  const fazitX = DESIGN.margin + (boxW + boxGap) * 3 + 0.2;
  const fazitW = 10 - fazitX - DESIGN.margin;
  slide.addShape('roundRect', { x: fazitX + 0.04, y: boxY + 0.04, w: fazitW, h: boxH, fill: { color: DESIGN.colors.shadow }, rectRadius: 0.15 });
  slide.addShape('roundRect', { x: fazitX, y: boxY, w: fazitW, h: boxH, fill: { color: DESIGN.colors.white }, line: { color: secondaryColor, width: 1.5 }, rectRadius: 0.15 });
  slide.addText('Gesamtfazit', { x: fazitX + 0.15, y: boxY + 0.12, w: fazitW - 0.3, h: 0.3, fontSize: 12, bold: true, color: secondaryColor, fontFace: DESIGN.fontFamily });

  const performanceWord = totalReach > prevTotalReach ? 'positive' : (totalReach < prevTotalReach ? 'rückläufige' : 'stabile');
  const fazitText = `Der ${getShortMonthName(month)} zeigt eine ${performanceWord} Performance auf beiden Plattformen. Die organische Basis bleibt solide und bietet eine gute Ausgangslage für neue Impulse.`;
  slide.addText(fazitText, { x: fazitX + 0.15, y: boxY + 0.45, w: fazitW - 0.3, h: 1.3, fontSize: 10, color: DESIGN.colors.darkGray, fontFace: DESIGN.fontFamily });

  // Platform breakdown
  const breakdownY = boxY + boxH + 0.35;
  const breakdownW = 4.2;
  const breakdownH = 1.5;

  // Facebook breakdown
  slide.addShape('roundRect', { x: DESIGN.margin + 0.03, y: breakdownY + 0.03, w: breakdownW, h: breakdownH, fill: { color: DESIGN.colors.shadow }, rectRadius: 0.1 });
  slide.addShape('roundRect', { x: DESIGN.margin, y: breakdownY, w: breakdownW, h: breakdownH, fill: { color: DESIGN.colors.white }, line: { color: primaryColor, width: 1 }, rectRadius: 0.1 });
  slide.addShape('ellipse', { x: DESIGN.margin + 0.15, y: breakdownY + 0.12, w: 0.35, h: 0.35, fill: { color: primaryColor } });
  slide.addText('f', { x: DESIGN.margin + 0.15, y: breakdownY + 0.12, w: 0.35, h: 0.35, fontSize: 14, bold: true, color: DESIGN.colors.white, align: 'center', valign: 'middle', fontFace: DESIGN.fontFamily });
  slide.addText('Facebook', { x: DESIGN.margin + 0.55, y: breakdownY + 0.15, w: 2, h: 0.3, fontSize: 12, bold: true, color: DESIGN.colors.black, fontFace: DESIGN.fontFamily });
  slide.addText(`${formatNumber(fbCurrent?.total_reach || 0)} Reichweite\n${formatNumber(fbCurrent?.posts_count || 0)} Beiträge\n${(fbCurrent?.engagement_rate || 0).toFixed(2).replace('.', ',')}% Engagement`, {
    x: DESIGN.margin + 0.15, y: breakdownY + 0.5, w: breakdownW - 0.3, h: 0.9,
    fontSize: 10, color: DESIGN.colors.darkGray, fontFace: DESIGN.fontFamily
  });

  // Instagram breakdown
  const igBreakdownX = DESIGN.margin + breakdownW + 0.6;
  slide.addShape('roundRect', { x: igBreakdownX + 0.03, y: breakdownY + 0.03, w: breakdownW, h: breakdownH, fill: { color: DESIGN.colors.shadow }, rectRadius: 0.1 });
  slide.addShape('roundRect', { x: igBreakdownX, y: breakdownY, w: breakdownW, h: breakdownH, fill: { color: DESIGN.colors.white }, line: { color: secondaryColor, width: 1 }, rectRadius: 0.1 });
  slide.addShape('roundRect', { x: igBreakdownX + 0.15, y: breakdownY + 0.12, w: 0.35, h: 0.35, line: { color: secondaryColor, width: 2 }, rectRadius: 0.08 });
  slide.addShape('ellipse', { x: igBreakdownX + 0.24, y: breakdownY + 0.21, w: 0.17, h: 0.17, line: { color: secondaryColor, width: 1.5 } });
  slide.addText('Instagram', { x: igBreakdownX + 0.55, y: breakdownY + 0.15, w: 2, h: 0.3, fontSize: 12, bold: true, color: DESIGN.colors.black, fontFace: DESIGN.fontFamily });
  slide.addText(`${formatNumber(igCurrent?.total_reach || 0)} Reichweite\n${formatNumber(igCurrent?.posts_count || 0)} Beiträge\n${(igCurrent?.engagement_rate || 0).toFixed(2).replace('.', ',')}% Engagement`, {
    x: igBreakdownX + 0.15, y: breakdownY + 0.5, w: breakdownW - 0.3, h: 0.9,
    fontSize: 10, color: DESIGN.colors.darkGray, fontFace: DESIGN.fontFamily
  });

  addFamefactIcon(slide, pageNumber, primaryColor);
}

export const slideExecutiveSummary: SlideModule = {
  id: 'executiveSummary',
  name: 'Executive Summary',
  description: 'Gesamtübersicht aller Plattformen mit KPI-Boxen und Fazit',
  platform: 'general',
  category: 'summary',
  order: 1,
  generate,
};
