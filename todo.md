# SocialDash Dashboard - Visual Update TODO

## Visuelle Elemente vom alten Dashboard übernehmen

- [x] KPI-Karten mit Prozent-Änderung (vs. Vormonat) und farbigen Badges
- [x] Facebook/Instagram Interaktionen Vergleichskarten (aktueller vs. vorheriger Monat)
- [x] Engagement Rate Karte mit Gauge-Visualisierung und Prozent-Skala
- [x] Ziel-Fortschrittsbalken (Reichweiten-Ziel, Interaktions-Ziel, Beitrags-Ziel)
- [x] Top 5 Posts Karten mit Bildern und Interaktionszahlen
- [x] Facebook API Einschränkungen Hinweisbox
- [x] Emoji-Icons in der Navigation
- [x] Gefiltert nach Badge
- [x] Report erstellen Button
- [x] Detaillierte Facebook/Instagram Karten mit Icons

## Management Summary Features

- [x] Top 5 Posts Charts mit Bildern über Balken (Facebook & Instagram)
- [x] Top Posts Liste mit Thumbnails, Titel und Interaktionszahlen
- [x] Posts Tabelle mit Sortierung nach Reactions, Comments, Reichweite, Interaktionen
- [x] Management Summary Button auf Facebook/Instagram Seiten
- [x] API-Routen für Facebook und Instagram Posts
- [x] Instagram API Hinweise Info-Box

## Design-Anpassungen an altes Dashboard

- [x] Navigation: Follower-Link hinzufügen (📈 Follower)
- [x] KPI-Karten: Zahlen in Weiß statt Gelb, Emoji-Icons statt Lucide-Icons
- [x] Interaktionen Vergleich: Beide Zahlen nebeneinander (aktuell links, vorherig rechts)
- [x] Top 5 Posts Chart: Größere Bilder über den Balken, bessere Proportionen
- [x] Posts Tabelle: Exakt wie im alten Dashboard mit allen Spalten
- [x] Follower-Seite: Integration sicherstellen


## Top 5 Posts Chart Anpassungen

- [x] Bilder über den Balken positionieren (nicht neben dem Balken)
- [x] Datum des Posts unter jedem Post anzeigen
- [x] Layout exakt wie im alten Dashboard


## Sortieroptionen für Posts

- [x] Engagement-Rate Sortierung implementieren (Interaktionen ÷ Reichweite × 100)
- [x] Dropdown für Sortierauswahl in Posts-Tabellen hinzufügen
- [x] Top 5 Posts Charts mit Sortierauswahl erweitern
- [x] Engagement-Rate Spalte in Posts-Tabelle anzeigen


## Farbliche Elemente wie im alten Dashboard

- [x] KPI-Karten mit farbigen linken Rahmen (grau, gelb, grün, rot)
- [x] Prozent-Änderungen in Farbe (grün für positiv, rot für negativ mit rotem Hintergrund)
- [x] Interaktionen-Karten mit gelben/grünen Akzentlinien links
- [x] Monatslabels in Farbe (01/2026 gelb/grün, 12/2025 grau)
- [x] Engagement Rate mit rotem "Niedrig" Badge und roter Zahl wenn niedrig
- [x] Roter Punkt auf der Engagement Gauge
- [x] Platform Details: Blaue Zahlen für Facebook, Pinke für Instagram
- [x] Farbige Fortschrittsbalken (grün)


## Top 5 Posts Charts - Behebung

- [ ] Prüfe warum Top 5 Posts Charts im neuen Dashboard nicht sichtbar sind
- [ ] Stelle sicher dass Daten aus der Datenbank geladen werden
- [ ] Teste die Top 5 Facebook Posts Chart mit echten Daten
- [ ] Teste die Top 5 Instagram Posts Chart mit echten Daten
- [ ] Stelle sicher dass Bilder, Interaktionszahlen und Datum angezeigt werden


## Performance-Optimierungen

- [x] Implementiere Response-Caching für API-Routen (Cache-Control Header)
- [x] Optimiere Datenbankabfragen (Indexes, LIMIT, Pagination)
- [x] Reduziere Anzahl der API-Calls beim initialen Laden
- [x] Implementiere Parallel-Abfragen statt sequenzieller Abfragen
- [ ] Implementiere Lazy Loading für Bilder in Top 5 Posts Charts
- [ ] Optimiere Next.js Build (Tree Shaking, Code Splitting)
- [ ] Implementiere Image Optimization für Thumbnails


## Sicherheitsmaßnahmen

- [ ] Implementiere Authentifizierung (Login/Logout)
- [ ] Implementiere Autorisierung (Rollen-basierter Zugriff)
- [ ] Implementiere HTTPS und sichere Cookies
- [ ] Implementiere Rate Limiting auf API-Routen
- [ ] Implementiere CORS-Schutz
- [ ] Implementiere SQL Injection-Schutz (Prepared Statements)
- [ ] Implementiere XSS-Schutz (Content Security Policy)
- [ ] Implementiere CSRF-Schutz
- [ ] Implementiere Audit Logging
- [ ] Implementiere Datenverschlüsselung für sensitive Daten


## Export-Funktionen

- [ ] Excel-KPI-Export pro Monat auf Overview-Seite hinzufügen
- [ ] Detaillierte Tagesansicht im Excel-Export (wie asphericon Excel)


## Dashboard Verbesserungen (Januar 2026)

- [x] Monatsfilter korrigieren - Posts nur für ausgewählten Monat anzeigen (war bereits korrekt)
- [x] Mobile-responsive Design implementieren
- [x] Sidebar für Mobile optimieren (Hamburger-Menü)
- [x] KPI-Karten für Mobile stacken
- [x] Charts für Mobile anpassen


## PowerPoint Premium Design Upgrade (Januar 2026)

- [x] Globales Styling: Inter/Arial Schriftart, konsistente Branding-Farben
- [x] Branding-Element: Dezente Linie oben auf jeder Slide
- [x] Premium KPI Tabelle: Abgerundete Header, farbige Trend-Werte (grün/rot/gelb)
- [x] Executive Summary Slide: 3 große KPI-Boxen + Gesamtfazit
- [x] Top-Post Galerie: Größere Bilder (1.5 Zoll) mit halbtransparenten Overlays
- [x] Bessere Abstände: 0.5 Zoll Seitenränder


## PowerPoint High-End Agentur-Level Upgrade (Januar 2026)

- [x] Executive Summary: Emojis durch professionelle Shape-Icons ersetzen
- [x] Executive Summary: Sanfte Schatten und abgerundete Ecken für KPI-Boxen
- [x] Executive Summary: Trend-Zahlen in kontrastreicherer Pill-Form
- [x] Top 3 Content Showcase: Bar-Charts durch große Hochformat-Bilder ersetzen
- [x] Top 3 Content Showcase: Elegante halbtransparente Overlays mit Metriken
- [x] Top 3 Content Showcase: Datum dezent oben rechts auf Bildern
- [x] Hintergrund: Hellgrauer Hintergrund (#F9F9F9) statt weiß
- [x] Hintergrund: Subtiles Wasserzeichen/Design-Linie am oberen Rand
- [x] Daten-Handling: Null-Zeilen in KPI-Tabellen automatisch ausblenden
- [x] Typography: Inter Bold für Header, Inter Light für Labels


## Dynamische PowerPoint Route für alle Kunden (Januar 2026)

- [x] Dynamische Route: Von /api/reports/andskincare zu /api/reports/[customerId]
- [x] Kunden-Daten aus DB laden (Name, Logo-URL, Primärfarbe)
- [x] Logo-Integration: famefact statisch aus /public/assets/
- [x] Logo-Integration: Kunden-Logo dynamisch mit Text-Fallback
- [x] Dynamische Branding-Farben aus DB (Default: #84cc16)
- [x] Dynamischer Dateiname: [Kundenname]_Social_Media_Report_[Monat]_[Jahr].pptx
- [x] Design-Konsistenz: High-End-Logik für alle Kunden beibehalten
