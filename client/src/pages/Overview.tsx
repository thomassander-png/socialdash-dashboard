import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, 
  MessageCircle, 
  Heart, 
  Eye, 
  TrendingUp,
  AlertCircle,
  Share2
} from "lucide-react";
import { useState, useMemo } from "react";

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toLocaleString("de-DE");
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthDisplay(month: string): string {
  const [year, m] = month.split("-");
  const date = new Date(parseInt(year), parseInt(m) - 1);
  return date.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
}

export default function Overview() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  
  const { data: availableMonths, isLoading: monthsLoading } = trpc.facebook.availableMonths.useQuery();
  const { data: kpis, isLoading: kpisLoading } = trpc.facebook.monthlyKPIs.useQuery(
    { month: selectedMonth },
    { enabled: !!selectedMonth }
  );
  const { data: topPosts, isLoading: postsLoading } = trpc.facebook.topPosts.useQuery(
    { month: selectedMonth, limit: 5 },
    { enabled: !!selectedMonth }
  );

  const monthOptions = useMemo(() => {
    if (availableMonths && availableMonths.length > 0) {
      return availableMonths;
    }
    // Fallback: generate last 12 months
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    return months;
  }, [availableMonths]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Dashboard Overview
          </h1>
          <p className="text-muted-foreground mt-1">
            Facebook Performance Metriken für {formatMonthDisplay(selectedMonth)}
          </p>
        </div>
        
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Monat wählen" />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((month) => (
              <SelectItem key={month} value={month}>
                {formatMonthDisplay(month)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Beiträge"
          value={kpis?.totalPosts ?? 0}
          icon={Users}
          loading={kpisLoading}
          description="Veröffentlichte Posts"
        />
        <KPICard
          title="Interaktionen"
          value={kpis?.totalInteractions ?? 0}
          icon={Heart}
          loading={kpisLoading}
          description="Reactions + Comments"
          highlight
        />
        <KPICard
          title="Reichweite"
          value={kpis?.totalReach ?? 0}
          icon={Eye}
          loading={kpisLoading}
          description="Unique Users erreicht"
        />
        <KPICard
          title="Ø Reichweite/Post"
          value={kpis?.avgReachPerPost ?? 0}
          icon={TrendingUp}
          loading={kpisLoading}
          description="Durchschnittliche Reichweite"
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <KPICard
          title="Reactions"
          value={kpis?.totalReactions ?? 0}
          icon={Heart}
          loading={kpisLoading}
          small
        />
        <KPICard
          title="Kommentare"
          value={kpis?.totalComments ?? 0}
          icon={MessageCircle}
          loading={kpisLoading}
          small
        />
        <Card className="bg-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Shares
            </CardTitle>
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {kpisLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-data font-semibold">
                  {formatNumber(kpis?.totalShares ?? 0)}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  Limited
                </span>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Nicht in Interaktionen enthalten
            </p>
          </CardContent>
        </Card>
      </div>

      {/* API Limitations Notice */}
      <Card className="bg-amber-500/5 border-amber-500/20">
        <CardContent className="flex items-start gap-3 pt-4">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-amber-500">
              Facebook API Einschränkungen
            </p>
            <p className="text-xs text-muted-foreground">
              <strong>Shares:</strong> Nicht für alle Posts verfügbar, daher separat ausgewiesen und nicht in Interaktionen enthalten.
              <br />
              <strong>Saves:</strong> Nicht über die Graph API abrufbar und werden nicht angezeigt.
              <br />
              <strong>Organisch vs. Paid:</strong> Nur über Ads API verfügbar (nicht implementiert).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Top Posts */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg font-display">Top Posts</CardTitle>
          <p className="text-sm text-muted-foreground">
            Die 5 Posts mit den meisten Interaktionen
          </p>
        </CardHeader>
        <CardContent>
          {postsLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : topPosts && topPosts.length > 0 ? (
            <div className="space-y-3">
              {topPosts.map((post, index) => (
                <div
                  key={post.post_id}
                  className="flex items-start gap-4 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary font-data font-semibold text-sm shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground line-clamp-2">
                      {post.message || "(Kein Text)"}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {post.reactions_total}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        {post.comments_total}
                      </span>
                      {post.reach && (
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {formatNumber(post.reach)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-lg font-data font-semibold text-primary data-glow">
                      {formatNumber(post.interactions_total)}
                    </span>
                    <p className="text-xs text-muted-foreground">Interaktionen</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Keine Daten für diesen Monat verfügbar.</p>
              <p className="text-sm mt-1">
                Stellen Sie sicher, dass der Collector läuft und Daten gecached wurden.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface KPICardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
  description?: string;
  highlight?: boolean;
  small?: boolean;
}

function KPICard({ title, value, icon: Icon, loading, description, highlight, small }: KPICardProps) {
  return (
    <Card className={`bg-card border-border/50 ${highlight ? "border-primary/30 bg-primary/5" : ""}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={`h-4 w-4 ${highlight ? "text-primary" : "text-muted-foreground"}`} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className={small ? "h-6 w-20" : "h-8 w-24"} />
        ) : (
          <span className={`font-data font-semibold ${small ? "text-xl" : "text-2xl"} ${highlight ? "text-primary data-glow" : ""}`}>
            {formatNumber(value)}
          </span>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
