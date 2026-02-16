import { SlideModule, SlideContext, DESIGN } from './types';
import { addBrandingLine, getShortMonthName } from './helpers';

function generateDivider(ctx: SlideContext, platform: string, icon: string, color: string): void {
  const { pptx, customer, month, primaryColor } = ctx;
  const slide = pptx.addSlide();
  slide.background = { color: DESIGN.colors.background };
  addBrandingLine(slide, color);

  // Large decorative shape
  slide.addShape('rect', {
    x: 6.5, y: -0.5, w: 3, h: 3,
    fill: { color: color, transparency: 10 },
    rotate: 45
  });
  slide.addShape('rect', {
    x: 7.2, y: 0.2, w: 2.3, h: 2.3,
    fill: { color: color, transparency: 20 },
    rotate: 45
  });

  // Platform icon
  if (platform === 'Facebook') {
    slide.addShape('ellipse', {
      x: DESIGN.margin, y: 1.5, w: 1.0, h: 1.0,
      fill: { color: color }
    });
    slide.addText('f', {
      x: DESIGN.margin, y: 1.5, w: 1.0, h: 1.0,
      fontSize: 40, bold: true, color: DESIGN.colors.white,
      align: 'center', valign: 'middle', fontFace: DESIGN.fontFamily
    });
  } else if (platform === 'Instagram') {
    slide.addShape('roundRect', {
      x: DESIGN.margin, y: 1.5, w: 1.0, h: 1.0,
      line: { color: color, width: 4 },
      rectRadius: 0.2
    });
    slide.addShape('ellipse', {
      x: DESIGN.margin + 0.25, y: 1.75, w: 0.5, h: 0.5,
      line: { color: color, width: 3 }
    });
  } else if (platform === 'TikTok') {
    slide.addShape('roundRect', {
      x: DESIGN.margin, y: 1.5, w: 1.0, h: 1.0,
      fill: { color: color },
      rectRadius: 0.15
    });
    slide.addText('♪', {
      x: DESIGN.margin, y: 1.5, w: 1.0, h: 1.0,
      fontSize: 36, color: DESIGN.colors.white,
      align: 'center', valign: 'middle', fontFace: DESIGN.fontFamily
    });
  } else if (platform === 'LinkedIn') {
    slide.addShape('roundRect', {
      x: DESIGN.margin, y: 1.5, w: 1.0, h: 1.0,
      fill: { color: color },
      rectRadius: 0.1
    });
    slide.addText('in', {
      x: DESIGN.margin, y: 1.5, w: 1.0, h: 1.0,
      fontSize: 36, bold: true, color: DESIGN.colors.white,
      align: 'center', valign: 'middle', fontFace: DESIGN.fontFamily
    });
  }

  // Platform name
  slide.addText(platform, {
    x: DESIGN.margin + 1.3, y: 1.5, w: 6, h: 0.6,
    fontSize: 42, bold: true, color: DESIGN.colors.black, fontFace: DESIGN.fontFamily
  });
  slide.addText(getShortMonthName(month), {
    x: DESIGN.margin + 1.3, y: 2.15, w: 6, h: 0.4,
    fontSize: 18, color: color, fontFace: DESIGN.fontFamily
  });

  // Decorative line
  slide.addShape('rect', {
    x: DESIGN.margin + 1.3, y: 2.65, w: 3, h: 0.04,
    fill: { color: color }
  });
}

// Facebook Divider
export const slideFbDivider: SlideModule = {
  id: 'fbDivider',
  name: 'Facebook Trenner',
  description: 'Trennfolie für den Facebook-Abschnitt',
  platform: 'facebook',
  category: 'divider',
  order: 10,
  generate: (ctx) => generateDivider(ctx, 'Facebook', 'f', ctx.primaryColor),
};

// Instagram Divider
export const slideIgDivider: SlideModule = {
  id: 'igDivider',
  name: 'Instagram Trenner',
  description: 'Trennfolie für den Instagram-Abschnitt',
  platform: 'instagram',
  category: 'divider',
  order: 30,
  generate: (ctx) => generateDivider(ctx, 'Instagram', 'ig', ctx.secondaryColor),
};

// TikTok Divider
export const slideTiktokDivider: SlideModule = {
  id: 'tiktokDivider',
  name: 'TikTok Trenner',
  description: 'Trennfolie für den TikTok-Abschnitt',
  platform: 'tiktok',
  category: 'divider',
  order: 50,
  generate: (ctx) => generateDivider(ctx, 'TikTok', '♪', '000000'),
};

// LinkedIn Divider
export const slideLinkedinDivider: SlideModule = {
  id: 'linkedinDivider',
  name: 'LinkedIn Trenner',
  description: 'Trennfolie für den LinkedIn-Abschnitt',
  platform: 'linkedin',
  category: 'divider',
  order: 60,
  generate: (ctx) => generateDivider(ctx, 'LinkedIn', 'in', '0A66C2'),
};
