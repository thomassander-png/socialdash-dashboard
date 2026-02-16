import { SlideModule, SlideContext, DESIGN, AGENCY } from './types';
import { addBrandingLine, getMonthName } from './helpers';

function generate(ctx: SlideContext): void {
  const { pptx, customer, month, primaryColor, secondaryColor, pageNumber, imageCache } = ctx;
  const slide = pptx.addSlide();
  slide.background = { color: DESIGN.colors.background };
  addBrandingLine(slide, primaryColor);

  // famefact logo
  slide.addText('famefact.', {
    x: DESIGN.margin, y: 0.25, w: 2, h: 0.4,
    fontSize: 18, bold: true, color: DESIGN.colors.black, fontFace: DESIGN.fontFamily
  });

  // Meta Business Partner badge
  slide.addShape('roundRect', {
    x: DESIGN.margin, y: 0.7, w: 2.2, h: 0.25,
    fill: { color: '1877F2' },
    rectRadius: 0.04
  });
  slide.addText(AGENCY.metaPartner, {
    x: DESIGN.margin + 0.05, y: 0.7, w: 2.1, h: 0.25,
    fontSize: 7, bold: true, color: DESIGN.colors.white, fontFace: DESIGN.fontFamily, valign: 'middle'
  });

  // Decorative shapes
  slide.addShape('rect', {
    x: 7.5, y: 0.15, w: 1.4, h: 1.4,
    fill: { color: primaryColor },
    rotate: 45
  });
  slide.addShape('rect', {
    x: 8.15, y: 0.7, w: 1.1, h: 1.1,
    fill: { color: secondaryColor },
    rotate: 45
  });

  // Customer logo or name (use imageCache for base64)
  if (customer.logo_url) {
    const logoData = imageCache.get(customer.logo_url);
    try {
      const imgOpts: any = {
        x: 3, y: 1.5, w: 4, h: 1.5,
        sizing: { type: 'contain', w: 4, h: 1.5 }
      };
      if (logoData) {
        imgOpts.data = logoData;
      } else {
        imgOpts.path = customer.logo_url;
      }
      slide.addImage(imgOpts);
    } catch {
      slide.addText(customer.name, {
        x: 0, y: 1.8, w: '100%', h: 0.8,
        fontSize: 36, bold: true, color: DESIGN.colors.darkGray, align: 'center', fontFace: DESIGN.fontFamily
      });
    }
  } else {
    slide.addText(customer.name, {
      x: 0, y: 1.8, w: '100%', h: 0.8,
      fontSize: 36, bold: true, color: DESIGN.colors.darkGray, align: 'center', fontFace: DESIGN.fontFamily
    });
  }

  // Title
  slide.addText('Social Media Reporting', {
    x: 0, y: 3.4, w: '100%', h: 0.55,
    fontSize: 30, bold: true, color: DESIGN.colors.black, align: 'center', fontFace: DESIGN.fontFamily
  });
  slide.addText(getMonthName(month), {
    x: 0, y: 3.95, w: '100%', h: 0.4,
    fontSize: 18, color: primaryColor, align: 'center', fontFace: DESIGN.fontFamily
  });
}

export const slideCover: SlideModule = {
  id: 'cover',
  name: 'Cover',
  description: 'Titelfolie mit Kundenlogo und Monat',
  platform: 'general',
  category: 'cover',
  order: 0,
  generate,
};
