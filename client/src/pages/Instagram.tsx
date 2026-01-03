import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Heart, 
  MessageCircle, 
  Bookmark,
  Eye, 
  TrendingUp,
  Play,
  ExternalLink,
  Image as ImageIcon
} from "lucide-react";
import { useState, useMemo } from "react";

function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return "-";
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

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("de-DE", { 
    day: "2-digit", 
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getMediaTypeIcon(mediaType: string | null) {
  switch (mediaType?.toUpperCase()) {
    case 'VIDEO':
    case 'REELS':
      return <Play className="h-4 w-4 text-purple-400" />;
    case 'CAROUSEL_ALBUM':
      return <ImageIcon className="h-4 w-4 text-blue-400" />;
    default:
      return <ImageIcon className="h-4 w-4 text-muted-foreground" />;
  }
}

export default function Instagram() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  
  const { data: availableMonths } = trpc.instagram.availableMonths.useQuery();
  const { data: kpis, isLoading: kpisLoading } = trpc.instagram.monthlyKPIs.useQuery(
    { month: selectedMonth },
    { enabled: !!selectedMonth }
  );
  const { data: accountStats, isLoading: statsLoading } = trpc.instagram.monthlyStats.useQuery(
    { month: selectedMonth },
    { enabled: !!selectedMonth }
  );
  const { data: topPosts, isLoading: postsLoading } = trpc.instagram.topPosts.useQuery(
    { month: selectedMonth, limit: 10 },
    { enabled: !!selectedMonth }
  );

  const monthOptions = useMemo(() => {
    if (availableMonths && availableMonths.length > 0) {
      return availableMonths;
    }
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
            Instagram Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Detaillierte KPIs und Top Posts für {formatMonthDisplay(selectedMonth)}
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

      {/* KPI Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <KPICard
          title="Beiträge"
          value={kpis?.totalPosts ?? 0}
          icon={ImageIcon}
          loading={kpisLoading}
        />
        <KPICard
          title="Likes"
          value={kpis?.totalLikes ?? 0}
          icon={Heart}
          loading={kpisLoading}
          iconColor="text-pink-500"
        />
        <KPICard
          title="Kommentare"
          value={kpis?.totalComments ?? 0}
          icon={MessageCircle}
          loading={kpisLoading}
        />
        <KPICard
          title="Interaktionen"
          value={kpis?.totalInteractions ?? 0}
          icon={TrendingUp}
          loading={kpisLoading}
          highlight
        />
        <KPICard
          title="Gespeichert"
          value={kpis?.totalSaved ?? 0}
          icon={Bookmark}
          loading={kpisLoading}
          iconColor="text-secondary"
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <KPICard
          title="Reichweite"
          value={kpis?.totalReach ?? 0}
          icon={Eye}
          loading={kpisLoading}
        />
        <KPICard
          title="Ø Reichweite/Post"
          value={kpis?.avgReachPerPost ?? 0}
          icon={Eye}
          loading={kpisLoading}
        />
        <KPICard
          title="Video Plays"
          value={kpis?.totalPlays ?? 0}
          icon={Play}
          loading={kpisLoading}
          iconColor="text-purple-400"
        />
      </div>

      {/* Account Stats Table */}
      {accountStats && accountStats.length > 0 && (
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="text-lg font-display">Statistiken pro Account</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead>Account ID</TableHead>
                    <TableHead className="text-right">Posts</TableHead>
                    <TableHead className="text-right">Likes</TableHead>
                    <TableHead className="text-right">Comments</TableHead>
                    <TableHead className="text-right">Saves</TableHead>
                    <TableHead className="text-right">Interaktionen</TableHead>
                    <TableHead className="text-right">Reichweite</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accountStats.map((stat) => (
                    <TableRow key={stat.account_id} className="border-border/50">
                      <TableCell className="font-mono text-sm">{stat.account_id}</TableCell>
                      <TableCell className="text-right font-data">{stat.total_posts}</TableCell>
                      <TableCell className="text-right font-data">{formatNumber(stat.total_likes)}</TableCell>
                      <TableCell className="text-right font-data">{formatNumber(stat.total_comments)}</TableCell>
                      <TableCell className="text-right font-data text-secondary">{formatNumber(stat.total_saved)}</TableCell>
                      <TableCell className="text-right font-data font-semibold text-primary">
                        {formatNumber(stat.total_interactions)}
                      </TableCell>
                      <TableCell className="text-right font-data">{formatNumber(stat.total_reach)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Top Posts Table */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg font-display">Top 10 Posts</CardTitle>
          <p className="text-sm text-muted-foreground">
            Sortiert nach Interaktionen (Likes + Comments)
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead className="w-12">#</TableHead>
                    <TableHead className="w-12">Typ</TableHead>
                    <TableHead>Post</TableHead>
                    <TableHead className="text-right">Likes</TableHead>
                    <TableHead className="text-right">Comments</TableHead>
                    <TableHead className="text-right">Saves</TableHead>
                    <TableHead className="text-right">Reichweite</TableHead>
                    <TableHead className="text-right">Interaktionen</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topPosts.map((post, index) => (
                    <TableRow key={post.post_id} className="border-border/50">
                      <TableCell>
                        <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary font-data font-semibold text-xs">
                          {index + 1}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getMediaTypeIcon(post.media_type)}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-md">
                          <p className="text-sm line-clamp-2">
                            {post.caption || "(Kein Text)"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(post.created_time)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-data">
                        <span className="text-pink-500">{formatNumber(post.likes_count)}</span>
                      </TableCell>
                      <TableCell className="text-right font-data">
                        {formatNumber(post.comments_count)}
                      </TableCell>
                      <TableCell className="text-right font-data text-secondary">
                        {formatNumber(post.saved)}
                      </TableCell>
                      <TableCell className="text-right font-data">
                        {formatNumber(post.reach)}
                      </TableCell>
                      <TableCell className="text-right font-data font-semibold text-primary">
                        {formatNumber(post.interactions_total)}
                      </TableCell>
                      <TableCell>
                        {post.permalink && (
                          <a
                            href={post.permalink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-primary transition-colors"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Keine Daten für diesen Monat verfügbar.</p>
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
  highlight?: boolean;
  iconColor?: string;
}

function KPICard({ title, value, icon: Icon, loading, highlight, iconColor }: KPICardProps) {
  return (
    <Card className={`bg-card border-border/50 ${highlight ? "border-primary/30 bg-primary/5" : ""}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={`h-4 w-4 ${iconColor || (highlight ? "text-primary" : "text-muted-foreground")}`} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-7 w-20" />
        ) : (
          <span className={`text-xl font-data font-semibold ${highlight ? "text-primary data-glow" : ""}`}>
            {formatNumber(value)}
          </span>
        )}
      </CardContent>
    </Card>
  );
}
