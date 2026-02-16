import { SlideModule, SlideContext, DESIGN } from './types';
import { addSlideHeader, addFamefactIcon, createPremiumKPITable } from './helpers';

function generate(ctx: SlideContext): void {
  const { pptx, customer, fbKpis, primaryColor, secondaryColor, pageNumber } = ctx;
  const slide = pptx.addSlide();
  addSlideHeader(slide, customer, primaryColor, secondaryColor, 'Facebook', 'Kennzahlen');
  createPremiumKPITable(slide, fbKpis, 1.0, 'facebook', primaryColor, secondaryColor);
  addFamefactIcon(slide, pageNumber, primaryColor);
}

export const slideFbKennzahlen: SlideModule = {
  id: 'fbKennzahlen',
  name: 'FB Kennzahlen',
  description: 'Facebook KPI-Tabelle mit 3-Monats-Vergleich',
  platform: 'facebook',
  category: 'kpi',
  order: 11,
  generate,
};
