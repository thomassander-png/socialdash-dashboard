import { SlideModule, SlideContext, DESIGN } from './types';
import { addSlideHeader, addFamefactIcon, formatNumber, formatCurrency, getCampaignMetric } from './helpers';

function generate(ctx: SlideContext): void {
  const { pptx, customer, monthlyAdsData, primaryColor, secondaryColor, pageNumber } = ctx;
  const currentAds = monthlyAdsData[2] || monthlyAdsData[monthlyAdsData.length - 1];
  const campaigns = currentAds?.campaigns || [];

  const slide = pptx.addSlide();
  addSlideHeader(slide, customer, primaryColor, secondaryColor, 'Paid Ads', 'Kampagnenübersicht');

  const totalSpend = currentAds?.totalSpend || 0;
  const totalImpressions = currentAds?.totalImpressions || 0;
  const totalClicks = currentAds?.totalClicks || 0;
  const totalReach = currentAds?.totalReach || 0;

  // Summary KPI boxes
  const kpiBoxes = [
    { label: 'Gesamtbudget', value: formatCurrency(totalSpend), color: primaryColor },
    { label: 'Reichweite', value: formatNumber(totalReach), color: DESIGN.colors.darkGray },
    { label: 'Impressionen', value: formatNumber(totalImpressions), color: DESIGN.colors.darkGray },
    { label: 'Klicks', value: formatNumber(totalClicks), color: DESIGN.colors.darkGray },
  ];

  const kpiBoxW = 2.1;
  kpiBoxes.forEach((kpi, i) => {
    const x = DESIGN.margin + i * (kpiBoxW + 0.15);
    slide.addShape('roundRect', {
      x: x + 0.03, y: 1.03, w: kpiBoxW, h: 0.85,
      fill: { color: DESIGN.colors.shadow }, rectRadius: 0.08
    });
    slide.addShape('roundRect', {
      x: x, y: 1.0, w: kpiBoxW, h: 0.85,
      fill: { color: DESIGN.colors.white },
      line: { color: i === 0 ? primaryColor : 'E8E8E8', width: i === 0 ? 1.5 : 0.5 },
      rectRadius: 0.08
    });
    slide.addText(kpi.label, {
      x: x + 0.1, y: 1.05, w: kpiBoxW - 0.2, h: 0.25,
      fontSize: 8, color: DESIGN.colors.mediumGray, fontFace: DESIGN.fontFamily
    });
    slide.addText(kpi.value, {
      x: x + 0.1, y: 1.3, w: kpiBoxW - 0.2, h: 0.45,
      fontSize: 18, bold: true, color: kpi.color, fontFace: DESIGN.fontFamily
    });
  });

  // Campaign table
  const tableY = 2.1;
  const tableX = DESIGN.margin;
  const tableW = 10 - DESIGN.margin * 2;
  const colWidths = [3.5, 1.5, 1.5, 1.5, 1.0];

  slide.addShape('roundRect', {
    x: tableX, y: tableY, w: tableW, h: 0.38,
    fill: { color: primaryColor }, rectRadius: 0.08
  });

  const headers = ['Kampagne', 'Budget', 'Reichweite', 'Impressionen', 'Klicks'];
  let hdrX = tableX;
  headers.forEach((h, i) => {
    slide.addText(h, {
      x: hdrX + 0.1, y: tableY, w: colWidths[i] - 0.2, h: 0.38,
      fontSize: 9, bold: true, color: DESIGN.colors.white,
      fontFace: DESIGN.fontFamily, align: i === 0 ? 'left' : 'center', valign: 'middle'
    });
    hdrX += colWidths[i];
  });

  let rowY = tableY + 0.42;
  campaigns.slice(0, 10).forEach((c: any, idx: number) => {
    if (rowY > 4.7) return;
    const isAlt = idx % 2 === 0;
    if (isAlt) {
      slide.addShape('rect', {
        x: tableX + 0.05, y: rowY, w: tableW - 0.1, h: 0.32,
        fill: { color: DESIGN.colors.lightGray }
      });
    }

    // Platform indicator
    const name = c.name || 'Kampagne';
    const platformColor = name.startsWith('IG_') ? secondaryColor : primaryColor;

    const rowData = [
      name.substring(0, 40) + (name.length > 40 ? '...' : ''),
      formatCurrency(getCampaignMetric(c, 'spend')),
      formatNumber(getCampaignMetric(c, 'reach')),
      formatNumber(getCampaignMetric(c, 'impressions')),
      formatNumber(getCampaignMetric(c, 'clicks')),
    ];

    let cellX = tableX;
    rowData.forEach((val, i) => {
      slide.addText(val, {
        x: cellX + 0.1, y: rowY, w: colWidths[i] - 0.2, h: 0.32,
        fontSize: 8, color: i === 1 ? platformColor : DESIGN.colors.darkGray,
        fontFace: DESIGN.fontFamily, align: i === 0 ? 'left' : 'center', valign: 'middle',
        bold: i === 1
      });
      cellX += colWidths[i];
    });

    rowY += 0.32;
  });

  // CPC / CPM / CTR footer
  const footerY = Math.min(rowY + 0.2, 4.8);
  const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const avgCpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  const footerKpis = [
    { label: '\u00d8 CPC', value: formatCurrency(avgCpc) },
    { label: '\u00d8 CPM', value: formatCurrency(avgCpm) },
    { label: '\u00d8 CTR', value: avgCtr.toFixed(2).replace('.', ',') + '%' },
  ];

  footerKpis.forEach((kpi, idx) => {
    const fX = DESIGN.margin + idx * 3;
    slide.addText(kpi.label + ': ', {
      x: fX, y: footerY, w: 1, h: 0.3,
      fontSize: 9, color: DESIGN.colors.mediumGray, fontFace: DESIGN.fontFamily, align: 'right'
    });
    slide.addText(kpi.value, {
      x: fX + 1, y: footerY, w: 1.5, h: 0.3,
      fontSize: 11, bold: true, color: DESIGN.colors.black, fontFace: DESIGN.fontFamily
    });
  });

  addFamefactIcon(slide, pageNumber, primaryColor);
}

export const slideAdsCampaigns: SlideModule = {
  id: 'adsCampaigns',
  name: 'Ads Kampagnen',
  description: 'Paid Ads Kampagnenübersicht mit Budget, Reichweite, CPC/CPM/CTR',
  platform: 'ads',
  category: 'ads',
  order: 40,
  generate,
};
