import { SlideModule, SlideContext, DESIGN, AGENCY } from './types';

function generate(ctx: SlideContext): void {
  const { pptx, primaryColor, secondaryColor } = ctx;
  const slide = pptx.addSlide();
  slide.background = { color: DESIGN.colors.black };

  // famefact logo
  slide.addText('famefact.', {
    x: DESIGN.margin, y: 0.35, w: 2.5, h: 0.5,
    fontSize: 20, bold: true, color: DESIGN.colors.white, fontFace: DESIGN.fontFamily
  });

  // Photo placeholder
  slide.addShape('roundRect', {
    x: DESIGN.margin, y: 1.1, w: 2.4, h: 2.7,
    fill: { color: DESIGN.colors.darkGray },
    line: { color: '555555', width: 1 },
    rectRadius: 0.1
  });
  slide.addText('Foto', {
    x: DESIGN.margin, y: 2.3, w: 2.4, h: 0.4,
    fontSize: 11, color: DESIGN.colors.mediumGray, align: 'center', fontFace: DESIGN.fontFamily
  });

  // Contact info
  slide.addText(AGENCY.contact.name, {
    x: DESIGN.margin, y: 3.95, w: 4, h: 0.3,
    fontSize: 13, color: DESIGN.colors.white, fontFace: DESIGN.fontFamily
  });
  slide.addText(AGENCY.contact.title, {
    x: DESIGN.margin, y: 4.25, w: 4, h: 0.25,
    fontSize: 10, color: DESIGN.colors.mediumGray, fontFace: DESIGN.fontFamily
  });

  // Agency name
  slide.addText('famefact', {
    x: DESIGN.margin, y: 4.7, w: 4, h: 0.35,
    fontSize: 15, bold: true, color: DESIGN.colors.white, fontFace: DESIGN.fontFamily
  });
  slide.addText(AGENCY.tagline, {
    x: DESIGN.margin, y: 5.0, w: 4, h: 0.25,
    fontSize: 8, color: DESIGN.colors.mediumGray, charSpacing: 2, fontFace: DESIGN.fontFamily
  });

  // Address
  slide.addText(`${AGENCY.contact.company}\n${AGENCY.contact.address}\n${AGENCY.contact.city}`, {
    x: DESIGN.margin, y: 5.4, w: 4, h: 0.7,
    fontSize: 9, color: DESIGN.colors.white, fontFace: DESIGN.fontFamily
  });

  // Email & phone
  slide.addText(`E-Mail: ${AGENCY.contact.email}\nTel.: ${AGENCY.contact.phone}`, {
    x: DESIGN.margin, y: 6.15, w: 4, h: 0.45,
    fontSize: 9, color: DESIGN.colors.white, fontFace: DESIGN.fontFamily
  });

  // Decorative shapes
  slide.addShape('rect', {
    x: 6.8, y: 0.4, w: 2.4, h: 2.4,
    fill: { color: primaryColor },
    rotate: 45
  });
  slide.addShape('rect', {
    x: 7.5, y: 1.3, w: 1.9, h: 1.9,
    fill: { color: secondaryColor },
    rotate: 45
  });
}

export const slideKontakt: SlideModule = {
  id: 'kontakt',
  name: 'Kontakt',
  description: 'Kontaktfolie mit Ansprechpartner und famefact Branding',
  platform: 'general',
  category: 'contact',
  order: 99,
  generate,
};
