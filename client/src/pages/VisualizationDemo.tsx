import {
  KpiCard,
  KpiCardGrid,
  ProgressKpiCard,
  ComparisonKpiCard,
  formatNumber,
} from "@/components/ui/kpi-card";
import { PremiumBarChart, ComparisonBarChart } from "@/components/ui/premium-bar-chart";
import { PremiumLineChart, PremiumAreaChart } from "@/components/ui/premium-line-chart";
import { PremiumTable, CellRenderers, Thumbnail } from "@/components/ui/premium-table";
import type { Column } from "@/components/ui/premium-table";
import {
  Users,
  Eye,
  Heart,
  MessageCircle,
  TrendingUp,
  Share2,
  Video,
  Image as ImageIcon,
} from "lucide-react";

// Demo data
const kpiData = {
  followers: 182359,
  followersChange: 12.5,
  reach: 1245678,
  reachChange: -3.2,
  interactions: 45678,
  interactionsChange: 8.7,
  posts: 156,
  postsChange: 0,
};

const sparklineData = [
  120, 145, 132, 178, 156, 189, 201, 234, 212, 256, 278, 289,
];

const barChartData = [
  { name: "Pelikan", value: 142585, imageUrl: "https://picsum.photos/seed/pelikan/100/100" },
  { name: "Oxford", value: 182359, imageUrl: "https://picsum.photos/seed/oxford/100/100" },
  { name: "Herlitz", value: 78043, imageUrl: "https://picsum.photos/seed/herlitz/100/100" },
  { name: "ABDA", value: 39899, imageUrl: "https://picsum.photos/seed/abda/100/100" },
  { name: "Contipark", value: 29775, imageUrl: "https://picsum.photos/seed/contipark/100/100" },
];

const comparisonData = [
  { name: "Jan", current: 4500, previous: 4200 },
  { name: "Feb", current: 5200, previous: 4800 },
  { name: "Mar", current: 4800, previous: 5100 },
  { name: "Apr", current: 6100, previous: 5500 },
  { name: "Mai", current: 5800, previous: 5200 },
  { name: "Jun", current: 7200, previous: 6100 },
];

const lineChartData = [
  { month: "Jan", reach: 125000, impressions: 180000, interactions: 4500 },
  { month: "Feb", reach: 142000, impressions: 195000, interactions: 5200 },
  { month: "Mär", reach: 138000, impressions: 188000, interactions: 4800 },
  { month: "Apr", reach: 165000, impressions: 220000, interactions: 6100 },
  { month: "Mai", reach: 158000, impressions: 210000, interactions: 5800 },
  { month: "Jun", reach: 182000, impressions: 245000, interactions: 7200 },
];

const areaChartData = [
  { month: "Jan", facebook: 85000, instagram: 40000 },
  { month: "Feb", facebook: 92000, instagram: 50000 },
  { month: "Mär", facebook: 88000, instagram: 50000 },
  { month: "Apr", facebook: 105000, instagram: 60000 },
  { month: "Mai", facebook: 98000, instagram: 60000 },
  { month: "Jun", facebook: 115000, instagram: 67000 },
];

interface PostData {
  id: string;
  thumbnail: string;
  title: string;
  date: string;
  type: string;
  reach: number;
  reachChange: number;
  interactions: number;
  interactionsChange: number;
  engagement: number;
  permalink: string;
}

const tableData: PostData[] = [
  {
    id: "1",
    thumbnail: "https://picsum.photos/seed/post1/200/200",
    title: "Neues Produkt Launch - Pelikan Füller Serie 2025",
    date: "2025-12-15",
    type: "Foto",
    reach: 45678,
    reachChange: 12.5,
    interactions: 2345,
    interactionsChange: 8.3,
    engagement: 5.1,
    permalink: "https://facebook.com/post/1",
  },
  {
    id: "2",
    thumbnail: "https://picsum.photos/seed/post2/200/200",
    title: "Behind the Scenes - Unser Team bei der Arbeit",
    date: "2025-12-12",
    type: "Video",
    reach: 38456,
    reachChange: -5.2,
    interactions: 1876,
    interactionsChange: 15.7,
    engagement: 4.9,
    permalink: "https://facebook.com/post/2",
  },
  {
    id: "3",
    thumbnail: "https://picsum.photos/seed/post3/200/200",
    title: "Weihnachtsaktion - 20% auf alle Schreibwaren",
    date: "2025-12-10",
    type: "Foto",
    reach: 52341,
    reachChange: 22.1,
    interactions: 3456,
    interactionsChange: 28.4,
    engagement: 6.6,
    permalink: "https://facebook.com/post/3",
  },
  {
    id: "4",
    thumbnail: "https://picsum.photos/seed/post4/200/200",
    title: "Kundenfeedback - Was unsere Kunden sagen",
    date: "2025-12-08",
    type: "Karussell",
    reach: 28765,
    reachChange: -2.8,
    interactions: 1234,
    interactionsChange: 5.1,
    engagement: 4.3,
    permalink: "https://facebook.com/post/4",
  },
  {
    id: "5",
    thumbnail: "https://picsum.photos/seed/post5/200/200",
    title: "Tipps für kreatives Schreiben im neuen Jahr",
    date: "2025-12-05",
    type: "Link",
    reach: 19876,
    reachChange: 8.9,
    interactions: 876,
    interactionsChange: -3.2,
    engagement: 4.4,
    permalink: "https://facebook.com/post/5",
  },
];

const tableColumns: Column<PostData>[] = [
  {
    key: "title",
    header: "Beitrag",
    width: "40%",
    render: CellRenderers.thumbnailWithText("thumbnail", "title", "date"),
  },
  {
    key: "type",
    header: "Typ",
    width: "10%",
    render: CellRenderers.badge({
      Foto: "blue",
      Video: "purple",
      Karussell: "green",
      Link: "yellow",
    }),
  },
  {
    key: "reach",
    header: "Reichweite",
    width: "15%",
    align: "right",
    sortable: true,
    render: CellRenderers.numberWithTrend("reachChange"),
  },
  {
    key: "interactions",
    header: "Interaktionen",
    width: "15%",
    align: "right",
    sortable: true,
    render: CellRenderers.numberWithTrend("interactionsChange"),
  },
  {
    key: "engagement",
    header: "Engagement",
    width: "10%",
    align: "right",
    sortable: true,
    render: (value: number) => `${value.toFixed(1)}%`,
  },
  {
    key: "permalink",
    header: "Link",
    width: "10%",
    align: "center",
    render: CellRenderers.link("permalink", "Öffnen"),
  },
];

export default function VisualizationDemo() {
  return (
    <div className="p-6 space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Premium Visualisierungen
          </h1>
          <p className="text-muted-foreground mt-2">
            Demo-Seite für alle verfügbaren Chart- und KPI-Komponenten
          </p>
        </div>

        {/* Section: KPI Cards */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            KPI-Karten mit Trend-Indikatoren
          </h2>
          <KpiCardGrid columns={4}>
            <KpiCard
              title="Follower gesamt"
              value={kpiData.followers}
              change={kpiData.followersChange}
              sparklineData={sparklineData}
              icon={<Users className="w-5 h-5" />}
              size="md"
            />
            <KpiCard
              title="Reichweite"
              value={kpiData.reach}
              change={kpiData.reachChange}
              sparklineData={sparklineData.slice().reverse()}
              icon={<Eye className="w-5 h-5" />}
              size="md"
            />
            <KpiCard
              title="Interaktionen"
              value={kpiData.interactions}
              change={kpiData.interactionsChange}
              sparklineData={sparklineData}
              icon={<Heart className="w-5 h-5" />}
              size="md"
            />
            <KpiCard
              title="Beiträge"
              value={kpiData.posts}
              change={kpiData.postsChange}
              icon={<ImageIcon className="w-5 h-5" />}
              size="md"
            />
          </KpiCardGrid>
        </section>

        {/* Section: Progress & Comparison Cards */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Progress- und Vergleichs-Karten
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <ProgressKpiCard
              title="Monatsziel Reichweite"
              current={1245678}
              target={1500000}
            />
            <ProgressKpiCard
              title="Engagement-Rate"
              current={4.8}
              target={5.0}
              unit="%"
            />
            <ComparisonKpiCard
              title="Interaktionen"
              currentValue={45678}
              previousValue={42100}
              currentLabel="Dezember"
              previousLabel="November"
            />
          </div>
        </section>

        {/* Section: Bar Charts */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Balkendiagramme
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PremiumBarChart
              data={barChartData}
              title="Top 5 Facebook Pages"
              subtitle="Nach Follower-Anzahl sortiert"
              valueLabel="Follower"
              showImages={true}
              height={350}
            />
            <ComparisonBarChart
              data={comparisonData}
              title="Reichweite im Vergleich"
              subtitle="Aktueller vs. Vormonat"
              currentLabel="2025"
              previousLabel="2024"
              height={350}
            />
          </div>
        </section>

        {/* Section: Horizontal Bar Chart */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Horizontales Balkendiagramm
          </h2>
          <PremiumBarChart
            data={barChartData}
            title="Follower nach Account"
            subtitle="Alle verwalteten Facebook Pages"
            valueLabel="Follower"
            orientation="horizontal"
            showImages={false}
            height={300}
          />
        </section>

        {/* Section: Line Charts */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Liniendiagramme
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PremiumLineChart
              data={lineChartData}
              xAxisKey="month"
              lines={[
                { dataKey: "reach", name: "Reichweite", color: "#22c55e" },
                { dataKey: "impressions", name: "Impressionen", color: "#3b82f6" },
              ]}
              title="Reichweite & Impressionen"
              subtitle="Entwicklung über 6 Monate"
              height={300}
            />
            <PremiumLineChart
              data={lineChartData}
              xAxisKey="month"
              lines={[
                { dataKey: "interactions", name: "Interaktionen", color: "#8b5cf6" },
              ]}
              title="Interaktionen"
              subtitle="Monatliche Entwicklung"
              showLegend={false}
              height={300}
            />
          </div>
        </section>

        {/* Section: Area Charts */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Flächendiagramme
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PremiumAreaChart
              data={areaChartData}
              xAxisKey="month"
              areas={[
                { dataKey: "facebook", name: "Facebook", color: "#3b82f6" },
                { dataKey: "instagram", name: "Instagram", color: "#ec4899" },
              ]}
              title="Reichweite nach Plattform"
              subtitle="Facebook vs. Instagram"
              stacked={false}
              height={300}
            />
            <PremiumAreaChart
              data={areaChartData}
              xAxisKey="month"
              areas={[
                { dataKey: "facebook", name: "Facebook", color: "#3b82f6" },
                { dataKey: "instagram", name: "Instagram", color: "#ec4899" },
              ]}
              title="Gestapelte Reichweite"
              subtitle="Gesamtreichweite beider Plattformen"
              stacked={true}
              height={300}
            />
          </div>
        </section>

        {/* Section: Premium Table */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Premium Tabelle mit Thumbnails
          </h2>
          <PremiumTable
            data={tableData}
            columns={tableColumns}
            title="Top Beiträge im Dezember 2025"
            subtitle="Sortiert nach Reichweite"
            defaultSort={{ key: "reach", direction: "desc" }}
            hoverable
            striped
          />
        </section>

        {/* Section: Compact Table */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Kompakte Tabelle
          </h2>
          <PremiumTable
            data={tableData.slice(0, 3)}
            columns={[
              {
                key: "title",
                header: "Beitrag",
                render: (_, row) => (
                  <div className="flex items-center gap-2">
                    <Thumbnail src={row.thumbnail} size="sm" />
                    <span className="font-medium line-clamp-1">{row.title}</span>
                  </div>
                ),
              },
              {
                key: "reach",
                header: "Reichweite",
                align: "right",
                sortable: true,
                render: (value: number) => formatNumber(value),
              },
              {
                key: "interactions",
                header: "Interaktionen",
                align: "right",
                sortable: true,
                render: (value: number) => formatNumber(value),
              },
            ]}
            compact
            striped={false}
          />
        </section>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground pt-8 border-t border-border">
          <p>
            Diese Komponenten basieren auf <strong>shadcn/ui</strong> und <strong>Recharts</strong>.
          </p>
          <p className="mt-1">
            Alle Visualisierungen sind vollständig anpassbar und responsive.
          </p>
        </div>
    </div>
  );
}
