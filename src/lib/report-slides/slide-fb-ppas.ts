import { SlideModule, SlideContext, DESIGN } from './types';
import { addSlideHeader, addFamefactIcon, formatNumber, formatCurrency, getShortMonthName, getCampaignMetric } from './helpers';

function generate(ctx: SlideContext): void {
  const { pptx, customer, months, monthlyAdsData, primaryColor, secondaryColor, pageNumber } = ctx;
  const slide = pptx.addSlide();
  addSlideHeader(slide, customer, primaryColor, secondaryColor, 'Facebook', 'Beitragsbewerbungen (PPAs)');

  // PPA Table
  const tableX = DESIGN.margin;
  const tableW = 10 - DESIGN.margin * 2;
  const colWidths = [3.2, 2.0, 2.0, 2.0];
  const tableY = 1.0;

  // Header
  slide.addShape('roundRect', {
    x: tableX, y: tableY, w: tableW, h: 0.4,
    fill: { color: primaryColor }, rectRadius: 0.08
  });

  const headers = ['Kennzahl', ...months.map(m => getShortMonthName(m))];
  let hdrX = tableX;
  headers.forEach((h, i) => {
    slide.addText(h, {
      x: hdrX + 0.1, y: tableY, w: colWidths[i] - 0.2, h: 0.4,
      fontSize: 9, bold: true, color: DESIGN.colors.white,
      fontFace: DESIGN.fontFamily, align: i === 0 ? 'left' : 'center', valign: 'middle'
    });
    hdrX += colWidths[i];
  });

  // KPI rows
  const kpis = [
    { label: 'Reichweite', values: monthlyAdsData.map(d => formatNumber(d.fbReach)) },
    { label: 'Impressionen', values: monthlyAdsData.map(d => formatNumber(d.fbImpressions)) },
    { label: 'CPM', values: monthlyAdsData.map(d => d.fbImpressions > 0 ? formatCurrency((d.fbSpend / d.fbImpressions) * 1000) : '–') },
    { label: 'Interaktionen', values: monthlyAdsData.map(d => formatNumber(d.fbEngagement)) },
    { label: 'Video Views', values: monthlyAdsData.map(d => formatNumber(d.fbVideoViews)) },
    { label: 'Link-Klicks', values: monthlyAdsData.map(d => formatNumber(d.fbLinkClicks)) },
    { label: 'Kosten/Interaktion', values: monthlyAdsData.map(d => d.fbEngagement > 0 ? formatCurrency(d.fbSpend / d.fbEngagement) : '–') },
    { label: 'Budget', values: monthlyAdsData.map(d => formatCurrency(d.fbSpend)) },
  ];

  let rowY = tableY + 0.45;
  kpis.forEach((kpi, idx) => {
    const isAlt = idx % 2 === 0;
    const bgColor = isAlt ? DESIGN.colors.lightGray : DESIGN.colors.white;
    slide.addShape('rect', {
      x: tableX, y: rowY, w: tableW, h: 0.35,
      fill: { color: bgColor }
    });

    slide.addText(kpi.label, {
      x: tableX + 0.1, y: rowY, w: colWidths[0] - 0.2, h: 0.35,
      fontSize: 9, bold: true, color: DESIGN.colors.darkGray,
      fontFace: DESIGN.fontFamily, valign: 'middle'
    });

    let cellX = tableX + colWidths[0];
    kpi.values.forEach((val, i) => {
      const isCurrentMonth = i === 2;
      slide.addText(val, {
        x: cellX + 0.1, y: rowY, w: colWidths[i + 1] - 0.2, h: 0.35,
        fontSize: 9, color: isCurrentMonth ? DESIGN.colors.black : DESIGN.colors.mediumGray,
        fontFace: DESIGN.fontFamily, align: 'center', valign: 'middle',
        bold: isCurrentMonth
      });
      cellX += colWidths[i + 1];
    });
    rowY += 0.35;
  });

  // Campaign detail list
  const campDetailY = rowY + 0.3;
  slide.addText('Einzelne Kampagnen', {
    x: tableX, y: campDetailY, w: 4, h: 0.3,
    fontSize: 10, bold: true, color: DESIGN.colors.darkGray, fontFace: DESIGN.fontFamily
  });

  const currentAds = monthlyAdsData[2] || monthlyAdsData[monthlyAdsData.length - 1];
  let campY = campDetailY + 0.35;
  (currentAds?.fbCampaigns || []).forEach((c: any) => {
    if (campY > 4.8) return;
    const spend = getCampaignMetric(c, 'spend');
    const reach = getCampaignMetric(c, 'reach');
    const impr = getCampaignMetric(c, 'impressions');
    slide.addText(`• ${c.name || 'Unbekannt'}`, {
      x: tableX + 0.1, y: campY, w: 5, h: 0.22,
      fontSize: 8, color: DESIGN.colors.darkGray, fontFace: DESIGN.fontFamily
    });
    slide.addText(`${formatCurrency(spend)} | ${formatNumber(reach)} Reichw. | ${formatNumber(impr)} Impr.`, {
      x: 5.2, y: campY, w: 4.3, h: 0.22,
      fontSize: 8, color: DESIGN.colors.mediumGray, fontFace: DESIGN.fontFamily, align: 'right'
    });
    campY += 0.25;
  });

  addFamefactIcon(slide, pageNumber, primaryColor);
}

export const slideFbPpas: SlideModule = {
  id: 'fbPpas',
  name: 'FB PPAs',
  description: 'Facebook Beitragsbewerbungen mit 3-Monats-Vergleich und Kampagnenliste',
  platform: 'facebook',
  category: 'ads',
  order: 14,
  generate,
};
