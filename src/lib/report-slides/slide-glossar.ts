import { SlideModule, SlideContext, DESIGN } from './types';
import { addSlideHeader, addFamefactIcon } from './helpers';

function generate(ctx: SlideContext): void {
  const { pptx, customer, primaryColor, secondaryColor, pageNumber } = ctx;
  const slide = pptx.addSlide();
  addSlideHeader(slide, customer, primaryColor, secondaryColor, 'Glossar', 'KPI-Definitionen');

  const definitions = [
    { term: 'Reichweite', desc: 'Anzahl der Personen, die einen Beitrag mindestens einmal gesehen haben (dedupliziert).' },
    { term: 'Impressionen', desc: 'Gesamtzahl der Anzeigen eines Beitrags (inkl. Mehrfachansichten derselben Person).' },
    { term: 'Engagement-Rate', desc: 'Verhältnis von Interaktionen (Likes, Kommentare, Shares/Saves) zur Reichweite in Prozent.' },
    { term: 'Reaktionen', desc: 'Likes, Love, Haha, Wow, Traurig, Wütend – alle Reaktionstypen zusammengefasst.' },
    { term: 'Saves', desc: 'Anzahl der Nutzer, die einen Instagram-Beitrag gespeichert haben.' },
    { term: 'Shares', desc: 'Anzahl der Nutzer, die einen Facebook-Beitrag geteilt haben.' },
    { term: '3-Sekunden-Views', desc: 'Videoaufrufe, bei denen das Video mindestens 3 Sekunden angesehen wurde.' },
    { term: 'CPC', desc: 'Cost per Click – durchschnittliche Kosten pro Klick auf eine Anzeige.' },
    { term: 'CPM', desc: 'Cost per Mille – Kosten pro 1.000 Impressionen einer Anzeige.' },
    { term: 'CTR', desc: 'Click-Through-Rate – Verhältnis von Klicks zu Impressionen in Prozent.' },
    { term: 'PPA', desc: 'Pay per Action / Beitragsbewerbung – bezahlte Werbung für organische Beiträge.' },
    { term: 'Bezahlte Reichweite', desc: 'Deduplizierte Reichweite auf Account-Ebene (nicht Summe der Kampagnen-Reichweiten).' },
    { term: 'Organische Reichweite', desc: 'Gesamtreichweite minus bezahlte Reichweite = unbezahlte Sichtbarkeit.' },
  ];

  const tableX = DESIGN.margin;
  const tableW = 10 - DESIGN.margin * 2;
  const termW = 2.5;
  const descW = tableW - termW;
  let rowY = 1.0;

  // Header
  slide.addShape('roundRect', {
    x: tableX, y: rowY, w: tableW, h: 0.38,
    fill: { color: primaryColor }, rectRadius: 0.08
  });
  slide.addText('Begriff', {
    x: tableX + 0.1, y: rowY, w: termW - 0.2, h: 0.38,
    fontSize: 9, bold: true, color: DESIGN.colors.white, fontFace: DESIGN.fontFamily, valign: 'middle'
  });
  slide.addText('Definition', {
    x: tableX + termW + 0.1, y: rowY, w: descW - 0.2, h: 0.38,
    fontSize: 9, bold: true, color: DESIGN.colors.white, fontFace: DESIGN.fontFamily, valign: 'middle'
  });

  rowY += 0.42;

  definitions.forEach((def, idx) => {
    if (rowY > 4.7) return;
    const isAlt = idx % 2 === 0;
    const rowH = 0.3;

    if (isAlt) {
      slide.addShape('rect', {
        x: tableX + 0.05, y: rowY, w: tableW - 0.1, h: rowH,
        fill: { color: DESIGN.colors.lightGray }
      });
    }

    slide.addText(def.term, {
      x: tableX + 0.1, y: rowY, w: termW - 0.2, h: rowH,
      fontSize: 8, bold: true, color: primaryColor, fontFace: DESIGN.fontFamily, valign: 'middle'
    });
    slide.addText(def.desc, {
      x: tableX + termW + 0.1, y: rowY, w: descW - 0.2, h: rowH,
      fontSize: 8, color: DESIGN.colors.darkGray, fontFace: DESIGN.fontFamily, valign: 'middle'
    });

    rowY += rowH;
  });

  addFamefactIcon(slide, pageNumber, primaryColor);
}

export const slideGlossar: SlideModule = {
  id: 'glossar',
  name: 'Glossar',
  description: 'KPI-Definitionen und Begriffserklärungen',
  platform: 'general',
  category: 'summary',
  order: 91,
  generate,
};
