import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  MessageCircle, 
  Heart, 
  Eye, 
  ExternalLink,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Video,
  Image as ImageIcon,
  Link as LinkIcon,
  FileText
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

function getPostTypeIcon(type: string | null) {
  switch (type?.toLowerCase()) {
    case "video":
      return <Video className="h-4 w-4" />;
    case "photo":
      return <ImageIcon className="h-4 w-4" />;
    case "link":
      return <LinkIcon className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
}

const POST_TYPES = [
  { value: "all", label: "Alle Typen" },
  { value: "photo", label: "Foto" },
  { value: "video", label: "Video" },
  { value: "link", label: "Link" },
  { value: "status", label: "Status" },
];

const SORT_OPTIONS = [
  { value: "interactions", label: "Interaktionen" },
  { value: "reach", label: "Reichweite" },
  { value: "date", label: "Datum" },
];

const ITEMS_PER_PAGE = 20;

export default function Posts() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [postType, setPostType] = useState("all");
  const [sortBy, setSortBy] = useState<"interactions" | "reach" | "date">("interactions");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  
  const { data: availableMonths } = trpc.facebook.availableMonths.useQuery();
  const { data: posts, isLoading } = trpc.facebook.posts.useQuery(
    { 
      month: selectedMonth,
      postType: postType === "all" ? undefined : postType,
      sortBy,
      sortOrder,
      limit: ITEMS_PER_PAGE,
      offset: page * ITEMS_PER_PAGE,
    },
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

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === "asc" ? "desc" : "asc");
  };

  const handleFilterChange = () => {
    setPage(0); // Reset to first page when filters change
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Posts
          </h1>
          <p className="text-muted-foreground mt-1">
            Alle Posts mit Metriken für {formatMonthDisplay(selectedMonth)}
          </p>
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select 
            value={selectedMonth} 
            onValueChange={(v) => { setSelectedMonth(v); handleFilterChange(); }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Monat" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((month) => (
                <SelectItem key={month} value={month}>
                  {formatMonthDisplay(month)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select 
            value={postType} 
            onValueChange={(v) => { setPostType(v); handleFilterChange(); }}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Post-Typ" />
            </SelectTrigger>
            <SelectContent>
              {POST_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select 
            value={sortBy} 
            onValueChange={(v) => { setSortBy(v as any); handleFilterChange(); }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sortieren nach" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={toggleSortOrder}
            className="shrink-0"
          >
            <ArrowUpDown className={`h-4 w-4 transition-transform ${sortOrder === "asc" ? "rotate-180" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Posts Table */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : posts && posts.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead className="w-12">Typ</TableHead>
                      <TableHead>Post</TableHead>
                      <TableHead className="text-right">
                        <Heart className="h-4 w-4 inline mr-1" />
                        Reactions
                      </TableHead>
                      <TableHead className="text-right">
                        <MessageCircle className="h-4 w-4 inline mr-1" />
                        Comments
                      </TableHead>
                      <TableHead className="text-right">
                        <Eye className="h-4 w-4 inline mr-1" />
                        Reichweite
                      </TableHead>
                      <TableHead className="text-right">Interaktionen</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {posts.map((post) => (
                      <TableRow key={post.post_id} className="border-border/50">
                        <TableCell>
                          <div className="flex items-center justify-center h-8 w-8 rounded bg-secondary text-muted-foreground">
                            {getPostTypeIcon(post.post_type)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-lg">
                            <p className="text-sm line-clamp-2">
                              {post.message || "(Kein Text)"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDate(post.post_created_time)}
                              {post.post_type && (
                                <span className="ml-2 px-1.5 py-0.5 rounded bg-secondary text-xs">
                                  {post.post_type}
                                </span>
                              )}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-data">
                          {formatNumber(post.reactions_total)}
                        </TableCell>
                        <TableCell className="text-right font-data">
                          {formatNumber(post.comments_total)}
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

              {/* Pagination */}
              <div className="flex items-center justify-between p-4 border-t border-border/50">
                <p className="text-sm text-muted-foreground">
                  Seite {page + 1}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Zurück
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={posts.length < ITEMS_PER_PAGE}
                  >
                    Weiter
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>Keine Posts für diesen Monat gefunden.</p>
              <p className="text-sm mt-1">
                Versuchen Sie einen anderen Monat oder Filter.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
