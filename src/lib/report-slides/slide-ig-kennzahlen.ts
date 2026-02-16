import { SlideModule, SlideContext, DESIGN } from './types';
import { addSlideHeader, addFamefactIcon, createPremiumKPITable } from './helpers';

function generate(ctx: SlideContext): void {
  const { pptx, customer, igKpis, primaryColor, secondaryColor, pageNumber , imageCache } = ctx;
  const slide = pptx.addSlide();
  addSlideHeader(slide, customer, primaryColor, secondaryColor, 'Instagram', 'Kennzahlen', imageCache);
  createPremiumKPITable(slide, igKpis, 1.0, 'instagram', primaryColor, secondaryColor);
  addFamefactIcon(slide, pageNumber, secondaryColor);
}

export const slideIgKennzahlen: SlideModule = {
  id: 'igKennzahlen',
  name: 'IG Kennzahlen',
  description: 'Instagram KPI-Tabelle mit 3-Monats-Vergleich',
  platform: 'instagram',
  category: 'kpi',
  order: 31,
  generate,
};
