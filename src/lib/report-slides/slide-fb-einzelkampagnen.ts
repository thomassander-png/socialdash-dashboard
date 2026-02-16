import { SlideModule, SlideContext, DESIGN } from './types';
import { addSlideHeader, addFamefactIcon, formatNumber, formatCurrency, getCampaignMetric } from './helpers';

function generate(ctx: SlideContext): void {
  const { pptx, customer, monthlyAdsData, primaryColor, secondaryColor, pageNumber , imageCache } = ctx;
  const currentAds = monthlyAdsData[2] || monthlyAdsData[monthlyAdsData.length - 1];
  const campaigns = currentAds?.fbCampaigns || [];

  if (campaigns.length === 0) return; // Skip if no campaigns

  const slide = pptx.addSlide();
  addSlideHeader(slide, customer, primaryColor, secondaryColor, 'Facebook', 'Einzelkampagnen', imageCache);

  const cardW = 4.2;
  const cardH = 1.6;
  const gap = 0.4;
  const startY = 1.1;
  const cols = 2;

  campaigns.slice(0, 6).forEach((c: any, idx: number) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const x = DESIGN.margin + col * (cardW + gap);
    const y = startY + row * (cardH + 0.25);

    if (y + cardH > 5.0) return;

    // Card shadow + bg
    slide.addShape('roundRect', {
      x: x + 0.03, y: y + 0.03, w: cardW, h: cardH,
      fill: { color: DESIGN.colors.shadow }, rectRadius: 0.1
    });
    slide.addShape('roundRect', {
      x: x, y: y, w: cardW, h: cardH,
      fill: { color: DESIGN.colors.white },
      line: { color: primaryColor, width: 1 },
      rectRadius: 0.1
    });

    // Campaign name
    const name = (c.name || 'Kampagne').replace(/^(FB_|IG_)/, '');
    slide.addText(name.substring(0, 45) + (name.length > 45 ? '...' : ''), {
      x: x + 0.15, y: y + 0.1, w: cardW - 0.3, h: 0.35,
      fontSize: 9, bold: true, color: DESIGN.colors.darkGray, fontFace: DESIGN.fontFamily
    });

    // Colored accent line
    slide.addShape('rect', {
      x: x + 0.15, y: y + 0.45, w: cardW - 0.3, h: 0.03,
      fill: { color: primaryColor }
    });

    // Metrics grid
    const spend = getCampaignMetric(c, 'spend');
    const reach = getCampaignMetric(c, 'reach');
    const impressions = getCampaignMetric(c, 'impressions');
    const clicks = getCampaignMetric(c, 'clicks');
    const engagement = getCampaignMetric(c, 'post_engagement');
    const videoViews = getCampaignMetric(c, 'video_views');

    const metrics = [
      { label: 'Budget', value: formatCurrency(spend), color: primaryColor },
      { label: 'Reichweite', value: formatNumber(reach), color: DESIGN.colors.darkGray },
      { label: 'Impressionen', value: formatNumber(impressions), color: DESIGN.colors.darkGray },
      { label: 'Klicks', value: formatNumber(clicks), color: DESIGN.colors.darkGray },
      { label: 'Interaktionen', value: formatNumber(engagement), color: DESIGN.colors.darkGray },
      { label: 'Video Views', value: formatNumber(videoViews), color: DESIGN.colors.darkGray },
    ];

    const metricW = (cardW - 0.3) / 3;
    metrics.forEach((m, mi) => {
      const mx = x + 0.15 + (mi % 3) * metricW;
      const my = y + 0.55 + Math.floor(mi / 3) * 0.5;

      slide.addText(m.label, {
        x: mx, y: my, w: metricW, h: 0.2,
        fontSize: 7, color: DESIGN.colors.mediumGray, fontFace: DESIGN.fontFamily
      });
      slide.addText(m.value, {
        x: mx, y: my + 0.18, w: metricW, h: 0.25,
        fontSize: 11, bold: true, color: m.color, fontFace: DESIGN.fontFamily
      });
    });
  });

  addFamefactIcon(slide, pageNumber, primaryColor);
}

export const slideFbEinzelkampagnen: SlideModule = {
  id: 'fbEinzelkampagnen',
  name: 'FB Einzelkampagnen',
  description: 'Individuelle Facebook-Kampagnen als Karten mit Metriken',
  platform: 'facebook',
  category: 'ads',
  order: 15,
  generate,
};
