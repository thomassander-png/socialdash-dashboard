# Premium Visualisierungs-Komponenten

Diese Dokumentation beschreibt die implementierten Premium-Visualisierungskomponenten für das SocialDash Dashboard.

## Übersicht

Nach einer umfassenden Evaluierung von über 10 Chart-Bibliotheken wurde **shadcn/ui Charts** (basierend auf Recharts) als beste Lösung ausgewählt. Die Kombination bietet eine optimale Balance aus visueller Qualität, Anpassbarkeit und Performance.

| Bibliothek | Score | Begründung |
|------------|-------|------------|
| shadcn/ui Charts | 36/40 | Bereits integriert, perfekte Tailwind-Integration, aktiv maintained |
| Tremor.so | 35/40 | Exzellente KPI-Karten, von Vercel übernommen |
| ECharts | 33/40 | Sehr leistungsfähig, aber größere Bundle-Size |
| Nivo | 32/40 | Viele Chart-Typen, weniger React-idiomatic |

## Implementierte Komponenten

### 1. KPI-Karten (`kpi-card.tsx`)

Premium KPI-Karten mit Trend-Indikatoren und Sparklines für die Darstellung von Kennzahlen.

```tsx
import { KpiCard, KpiCardGrid } from "@/components/ui/kpi-card";

<KpiCardGrid columns={4}>
  <KpiCard
    title="Follower gesamt"
    value={182359}
    change={12.5}
    sparklineData={[120, 145, 132, 178, 156, 189, 201]}
    icon={<Users className="w-5 h-5" />}
  />
</KpiCardGrid>
```

**Verfügbare Komponenten:**

| Komponente | Beschreibung |
|------------|--------------|
| `KpiCard` | Hauptkomponente mit Wert, Trend und optionalem Sparkline |
| `KpiCardGrid` | Grid-Layout für 2-4 Spalten |
| `ProgressKpiCard` | Fortschrittsbalken für Ziele |
| `ComparisonKpiCard` | Vergleich aktuell vs. Vormonat |
| `TrendIndicator` | Grün/Rot Badge mit Pfeil |
| `Sparkline` | Mini-Liniendiagramm |

### 2. Balkendiagramme (`premium-bar-chart.tsx`)

Premium Balkendiagramme mit Bildern über Balken und animierten Hover-Effekten.

```tsx
import { PremiumBarChart } from "@/components/ui/premium-bar-chart";

<PremiumBarChart
  data={[
    { name: "Pelikan", value: 142585, imageUrl: "/images/pelikan.jpg" },
    { name: "Oxford", value: 182359, imageUrl: "/images/oxford.jpg" },
  ]}
  title="Top 5 Facebook Pages"
  subtitle="Nach Follower-Anzahl sortiert"
  showImages={true}
  height={350}
/>
```

**Verfügbare Komponenten:**

| Komponente | Beschreibung |
|------------|--------------|
| `PremiumBarChart` | Vertikale/Horizontale Balken mit optionalen Bildern |
| `ComparisonBarChart` | Vergleich zweier Zeiträume (z.B. 2025 vs. 2024) |

### 3. Liniendiagramme (`premium-line-chart.tsx`)

Premium Linien- und Flächendiagramme mit Gradient-Fill und interaktiven Tooltips.

```tsx
import { PremiumLineChart, PremiumAreaChart } from "@/components/ui/premium-line-chart";

<PremiumLineChart
  data={lineChartData}
  xAxisKey="month"
  lines={[
    { dataKey: "reach", name: "Reichweite", color: "#22c55e" },
    { dataKey: "impressions", name: "Impressionen", color: "#3b82f6" },
  ]}
  title="Reichweite & Impressionen"
/>
```

**Verfügbare Komponenten:**

| Komponente | Beschreibung |
|------------|--------------|
| `PremiumLineChart` | Multi-Line Charts mit Legenden |
| `PremiumAreaChart` | Flächen mit Gradient-Fill (gestapelt oder nicht) |

### 4. Premium Tabellen (`premium-table.tsx`)

Sortierbare Tabellen mit eingebetteten Thumbnails und vorgefertigten Cell-Renderern.

```tsx
import { PremiumTable, CellRenderers } from "@/components/ui/premium-table";

const columns = [
  {
    key: "title",
    header: "Beitrag",
    render: CellRenderers.thumbnailWithText("thumbnail", "title", "date"),
  },
  {
    key: "reach",
    header: "Reichweite",
    sortable: true,
    render: CellRenderers.numberWithTrend("reachChange"),
  },
];

<PremiumTable
  data={posts}
  columns={columns}
  title="Top Beiträge"
  striped
  hoverable
/>
```

**Verfügbare Cell-Renderer:**

| Renderer | Beschreibung |
|----------|--------------|
| `thumbnailWithText` | Thumbnail mit Text und optionalem Subtext |
| `numberWithTrend` | Zahl mit Trend-Indikator |
| `link` | Externer Link mit Icon |
| `badge` | Farbiges Badge |
| `progress` | Fortschrittsbalken |
| `date` | Formatiertes Datum |

## Demo-Seite

Eine vollständige Demo aller Komponenten ist unter `/demo/visualizations` verfügbar. Die Demo zeigt alle implementierten Komponenten mit Beispieldaten.

## PPTX Report Generator

Der PPTX Report Generator wurde ebenfalls aktualisiert und verwendet nun ein Premium Dark Theme mit nativen PowerPoint Charts. Die wichtigsten Verbesserungen sind:

- **Premium Dark Theme**: Modernes dunkles Design mit Cyan-Akzenten
- **Native PowerPoint Charts**: Bar Charts werden als native PowerPoint-Objekte eingefügt
- **KPI-Karten Layout**: Übersichtliche Darstellung der Kennzahlen in Karten
- **Verbesserte Typografie**: Konsistente Schriftarten und Größen
- **Ranking-Badges**: Nummerierte Badges für Top-Posts

## Technische Details

### Styling

Alle Komponenten verwenden CSS-Variablen für konsistentes Theming und unterstützen Dark Mode automatisch.

```css
/* Beispiel: Farben über CSS-Variablen */
--color-accent: oklch(0.7 0.2 200);
--color-muted: oklch(0.5 0.02 260);
```

### Deutsche Formatierung

Zahlen werden automatisch im deutschen Format formatiert:

```tsx
import { formatNumber } from "@/components/ui/kpi-card";

formatNumber(1234567); // "1.234.567"
```

### Responsive Design

Alle Komponenten sind vollständig responsive und passen sich automatisch an verschiedene Bildschirmgrößen an.

## Abhängigkeiten

Die Komponenten basieren auf folgenden Bibliotheken:

| Paket | Version | Verwendung |
|-------|---------|------------|
| recharts | ^2.15.2 | Chart-Rendering |
| @tremor/react | ^3.18.7 | Zusätzliche UI-Komponenten |
| lucide-react | ^0.453.0 | Icons |
| tailwindcss | ^4.x | Styling |

## Weiterführende Links

- [shadcn/ui Charts](https://ui.shadcn.com/charts)
- [Recharts Dokumentation](https://recharts.org/)
- [Tremor Blocks](https://blocks.tremor.so/)
