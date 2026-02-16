import { SlideModule, SlideContext, DESIGN } from './types';
import { addBrandingLine, addSubtleWatermark, addCustomerLogo, addFamefactIcon, formatNumber } from './helpers';

function generate(ctx: SlideContext): void {
  const { pptx, customer, month, fbKpis, igKpis, monthlyAdsData, primaryColor, secondaryColor, pageNumber, config } = ctx;
  const slide = pptx.addSlide();
  slide.background = { color: DESIGN.colors.background };
  addBrandingLine(slide, primaryColor);
  addSubtleWatermark(slide, secondaryColor);
  addCustomerLogo(slide, customer, 7.5, 0.15, 2, 0.5);

  slide.addText('Zusammenfassung', {
    x: DESIGN.margin, y: 0.2, w: 7, h: 0.45,
    fontSize: 26, bold: true, color: DESIGN.colors.black, fontFace: DESIGN.fontFamily
  });
  slide.addText('Facebook & Instagram', {
    x: DESIGN.margin, y: 0.6, w: 7, h: 0.3,
    fontSize: 14, color: DESIGN.colors.mediumGray, fontFace: DESIGN.fontFamily
  });

  const fbCurrent = fbKpis[2] || fbKpis[fbKpis.length - 1];
  const fbPrev = fbKpis[1] || fbKpis[0];
  const igCurrent = igKpis[2] || igKpis[igKpis.length - 1];
  const igPrev = igKpis[1] || igKpis[0];

  // Facebook summary card
  slide.addShape('roundRect', { x: DESIGN.margin + 0.03, y: 1.03, w: 4.3, h: 1.8, fill: { color: DESIGN.colors.shadow }, rectRadius: 0.1 });
  slide.addShape('roundRect', { x: DESIGN.margin, y: 1.0, w: 4.3, h: 1.8, fill: { color: DESIGN.colors.white }, line: { color: primaryColor, width: 1 }, rectRadius: 0.1 });

  slide.addShape('ellipse', { x: DESIGN.margin + 0.15, y: 1.12, w: 0.35, h: 0.35, fill: { color: primaryColor } });
  slide.addText('f', { x: DESIGN.margin + 0.15, y: 1.12, w: 0.35, h: 0.35, fontSize: 14, bold: true, color: DESIGN.colors.white, align: 'center', valign: 'middle', fontFace: DESIGN.fontFamily });
  slide.addText('Facebook', { x: DESIGN.margin + 0.55, y: 1.15, w: 2, h: 0.3, fontSize: 12, bold: true, color: DESIGN.colors.black, fontFace: DESIGN.fontFamily });

  const fbReachChange = fbPrev?.total_reach > 0
    ? ((fbCurrent.total_reach - fbPrev.total_reach) / fbPrev.total_reach * 100).toFixed(0)
    : '0';
  const fbSummaryText = `• Reichweite: ${formatNumber(fbCurrent?.total_reach || 0)} (${parseInt(fbReachChange) >= 0 ? '+' : ''}${fbReachChange}%)\n• ${fbCurrent?.posts_count || 0} Postings\n• Engagement: ${(fbCurrent?.engagement_rate || 0).toFixed(2).replace('.', ',')}%`;
  slide.addText(fbSummaryText, { x: DESIGN.margin + 0.15, y: 1.5, w: 4, h: 1.2, fontSize: 10, color: DESIGN.colors.darkGray, fontFace: DESIGN.fontFamily });

  // Instagram summary card
  slide.addShape('roundRect', { x: DESIGN.margin + 4.53, y: 1.03, w: 4.3, h: 1.8, fill: { color: DESIGN.colors.shadow }, rectRadius: 0.1 });
  slide.addShape('roundRect', { x: DESIGN.margin + 4.5, y: 1.0, w: 4.3, h: 1.8, fill: { color: DESIGN.colors.white }, line: { color: secondaryColor, width: 1 }, rectRadius: 0.1 });

  slide.addShape('roundRect', { x: DESIGN.margin + 4.65, y: 1.12, w: 0.35, h: 0.35, line: { color: secondaryColor, width: 2 }, rectRadius: 0.08 });
  slide.addShape('ellipse', { x: DESIGN.margin + 4.74, y: 1.21, w: 0.17, h: 0.17, line: { color: secondaryColor, width: 1.5 } });
  slide.addText('Instagram', { x: DESIGN.margin + 5.05, y: 1.15, w: 2, h: 0.3, fontSize: 12, bold: true, color: DESIGN.colors.black, fontFace: DESIGN.fontFamily });

  const igReachChange = igPrev?.total_reach > 0
    ? ((igCurrent.total_reach - igPrev.total_reach) / igPrev.total_reach * 100).toFixed(0)
    : '0';
  const igSummaryText = `• Reichweite: ${formatNumber(igCurrent?.total_reach || 0)} (${parseInt(igReachChange) >= 0 ? '+' : ''}${igReachChange}%)\n• ${igCurrent?.posts_count || 0} Postings\n• Engagement: ${(igCurrent?.engagement_rate || 0).toFixed(2).replace('.', ',')}%`;
  slide.addText(igSummaryText, { x: DESIGN.margin + 4.65, y: 1.5, w: 4, h: 1.2, fontSize: 10, color: DESIGN.colors.darkGray, fontFace: DESIGN.fontFamily });

  // Ads summary (if enabled)
  const currentAds = monthlyAdsData[2] || monthlyAdsData[monthlyAdsData.length - 1];
  if (config.platforms.ads && currentAds && currentAds.totalSpend > 0) {
    slide.addShape('roundRect', { x: DESIGN.margin + 0.03, y: 3.03, w: 8.8, h: 1.4, fill: { color: DESIGN.colors.shadow }, rectRadius: 0.1 });
    slide.addShape('roundRect', { x: DESIGN.margin, y: 3.0, w: 8.8, h: 1.4, fill: { color: DESIGN.colors.white }, line: { color: 'E8E8E8', width: 0.5 }, rectRadius: 0.1 });

    slide.addText('Paid Ads', { x: DESIGN.margin + 0.15, y: 3.1, w: 2, h: 0.3, fontSize: 12, bold: true, color: primaryColor, fontFace: DESIGN.fontFamily });

    const adsSummary = `Gesamtbudget: ${formatNumber(Math.round(currentAds.totalSpend))} € | Reichweite: ${formatNumber(currentAds.totalReach)} | Impressionen: ${formatNumber(currentAds.totalImpressions)} | Klicks: ${formatNumber(currentAds.totalClicks)}`;
    slide.addText(adsSummary, { x: DESIGN.margin + 0.15, y: 3.45, w: 8.5, h: 0.3, fontSize: 10, color: DESIGN.colors.darkGray, fontFace: DESIGN.fontFamily });

    const fbAdsText = `Facebook: ${formatNumber(Math.round(currentAds.fbSpend))} € Budget | ${formatNumber(currentAds.fbReach)} Reichweite`;
    const igAdsText = `Instagram: ${formatNumber(Math.round(currentAds.igSpend))} € Budget | ${formatNumber(currentAds.igReach)} Reichweite`;
    slide.addText(fbAdsText, { x: DESIGN.margin + 0.15, y: 3.85, w: 4, h: 0.25, fontSize: 9, color: DESIGN.colors.mediumGray, fontFace: DESIGN.fontFamily });
    slide.addText(igAdsText, { x: DESIGN.margin + 4.5, y: 3.85, w: 4, h: 0.25, fontSize: 9, color: DESIGN.colors.mediumGray, fontFace: DESIGN.fontFamily });
  }

  // Notes
  if (config.notes) {
    const notesY = config.platforms.ads && currentAds?.totalSpend > 0 ? 4.5 : 3.1;
    slide.addText('Anmerkungen:', { x: DESIGN.margin, y: notesY, w: 2, h: 0.25, fontSize: 9, bold: true, color: DESIGN.colors.darkGray, fontFace: DESIGN.fontFamily });
    slide.addText(config.notes, { x: DESIGN.margin, y: notesY + 0.25, w: 8.8, h: 0.6, fontSize: 9, color: DESIGN.colors.mediumGray, fontFace: DESIGN.fontFamily });
  }

  addFamefactIcon(slide, pageNumber, primaryColor);
}

export const slideZusammenfassung: SlideModule = {
  id: 'zusammenfassung',
  name: 'Zusammenfassung',
  description: 'Zusammenfassung aller Plattformen mit Kernkennzahlen',
  platform: 'general',
  category: 'summary',
  order: 90,
  generate,
};
