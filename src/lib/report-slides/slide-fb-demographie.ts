import { SlideModule, SlideContext, DESIGN } from './types';
import { addSlideHeader, addFamefactIcon, formatNumber } from './helpers';

function generate(ctx: SlideContext): void {
  const { pptx, customer, fbKpis, primaryColor, secondaryColor, pageNumber } = ctx;
  const slide = pptx.addSlide();
  addSlideHeader(slide, customer, primaryColor, secondaryColor, 'Facebook', 'Fans (Demographie)');

  // Placeholder for demographic data
  slide.addShape('roundRect', {
    x: DESIGN.margin + 0.04, y: 1.04, w: 10 - (DESIGN.margin * 2), h: 3.5,
    fill: { color: DESIGN.colors.shadow },
    rectRadius: 0.1
  });
  slide.addShape('roundRect', {
    x: DESIGN.margin, y: 1.0, w: 10 - (DESIGN.margin * 2), h: 3.5,
    fill: { color: DESIGN.colors.white },
    line: { color: 'E8E8E8', width: 0.5 },
    rectRadius: 0.1
  });

  const currentKpi = fbKpis[2] || fbKpis[fbKpis.length - 1];

  // Follower count
  slide.addText('Aktuelle Fans', {
    x: DESIGN.margin + 0.3, y: 1.2, w: 3, h: 0.3,
    fontSize: 12, bold: true, color: DESIGN.colors.darkGray, fontFace: DESIGN.fontFamily
  });
  slide.addText(formatNumber(currentKpi?.followers || 0), {
    x: DESIGN.margin + 0.3, y: 1.5, w: 3, h: 0.5,
    fontSize: 28, bold: true, color: primaryColor, fontFace: DESIGN.fontFamily
  });

  // New followers
  const newFollowers = currentKpi?.new_followers || 0;
  slide.addText(`${newFollowers >= 0 ? '+' : ''}${formatNumber(newFollowers)} neue Fans im Berichtsmonat`, {
    x: DESIGN.margin + 0.3, y: 2.0, w: 4, h: 0.3,
    fontSize: 10, color: newFollowers >= 0 ? DESIGN.colors.trendUp : DESIGN.colors.trendDown, fontFace: DESIGN.fontFamily
  });

  // Placeholder note
  slide.addText('Demografische Daten werden über die Meta Graph API abgerufen.\nBei Bedarf können hier Alters- und Geschlechtsverteilung,\nsowie Top-Städte und Länder angezeigt werden.', {
    x: DESIGN.margin + 0.3, y: 2.8, w: 8, h: 1.2,
    fontSize: 10, color: DESIGN.colors.mediumGray, fontFace: DESIGN.fontFamily
  });

  addFamefactIcon(slide, pageNumber, primaryColor);
}

export const slideFbDemographie: SlideModule = {
  id: 'fbDemographie',
  name: 'FB Demographie',
  description: 'Facebook Fan-Demographie (Alter, Geschlecht, Standort)',
  platform: 'facebook',
  category: 'kpi',
  order: 16,
  generate,
};
