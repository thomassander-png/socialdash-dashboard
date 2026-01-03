import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Download,
  FileSpreadsheet,
  Presentation,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

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

export default function Exports() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [isExporting, setIsExporting] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [clientName, setClientName] = useState("");
  
  const { data: availableMonths } = trpc.facebook.availableMonths.useQuery();
  const { data: kpis } = trpc.facebook.monthlyKPIs.useQuery(
    { month: selectedMonth },
    { enabled: !!selectedMonth }
  );
  const { data: posts } = trpc.facebook.posts.useQuery(
    { month: selectedMonth, limit: 100 },
    { enabled: !!selectedMonth }
  );

  const generateReportMutation = trpc.reports.generate.useMutation();

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

  const handleExportCSV = async () => {
    if (!posts || posts.length === 0) {
      toast.error("Keine Daten zum Exportieren vorhanden");
      return;
    }

    setIsExporting(true);
    
    try {
      // Build CSV content
      const headers = [
        "Post ID",
        "Page ID",
        "Erstellt am",
        "Typ",
        "Nachricht",
        "Reactions",
        "Comments",
        "Shares",
        "Shares Limited",
        "Reichweite",
        "Impressions",
        "Video Views (3s)",
        "Interaktionen",
        "Permalink"
      ];

      const rows = posts.map(post => [
        post.post_id,
        post.page_id,
        formatDate(post.created_time),
        post.type || "",
        `"${(post.message || "").replace(/"/g, '""')}"`,
        post.reactions_total,
        post.comments_total,
        post.shares_total ?? "",
        post.shares_limited ? "Ja" : "Nein",
        post.reach ?? "",
        post.impressions ?? "",
        post.video_3s_views ?? "",
        post.interactions_total,
        post.permalink || ""
      ]);

      const csvContent = [
        headers.join(";"),
        ...rows.map(row => row.join(";"))
      ].join("\n");

      // Add BOM for Excel compatibility
      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
      
      // Download
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `facebook-posts-${selectedMonth}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Export erfolgreich", {
        description: `${posts.length} Posts exportiert`
      });
    } catch (error) {
      toast.error("Export fehlgeschlagen", {
        description: "Bitte versuchen Sie es erneut"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportKPIs = async () => {
    if (!kpis) {
      toast.error("Keine KPI-Daten vorhanden");
      return;
    }

    setIsExporting(true);
    
    try {
      const headers = ["Metrik", "Wert", "Hinweis"];
      const rows = [
        ["Monat", formatMonthDisplay(selectedMonth), ""],
        ["Exportiert am", formatDate(new Date()), ""],
        ["", "", ""],
        ["Beiträge", kpis.totalPosts, ""],
        ["Reactions", kpis.totalReactions, ""],
        ["Kommentare", kpis.totalComments, ""],
        ["Interaktionen", kpis.totalInteractions, "Reactions + Comments"],
        ["Shares", kpis.totalShares, "Limited - nicht in Interaktionen"],
        ["Reichweite", kpis.totalReach, ""],
        ["Impressions", kpis.totalImpressions, ""],
        ["Ø Reichweite/Post", kpis.avgReachPerPost, ""],
        ["Ø Interaktionen/Post", kpis.avgInteractionsPerPost, ""],
      ];

      const csvContent = [
        headers.join(";"),
        ...rows.map(row => row.join(";"))
      ].join("\n");

      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `facebook-kpis-${selectedMonth}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("KPI-Export erfolgreich");
    } catch (error) {
      toast.error("Export fehlgeschlagen");
    } finally {
      setIsExporting(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!clientName.trim()) {
      toast.error("Bitte geben Sie einen Kundennamen ein");
      return;
    }

    setIsGeneratingReport(true);
    
    try {
      const result = await generateReportMutation.mutateAsync({
        clientName: clientName.trim(),
        month: selectedMonth,
      });

      if (result.success && result.data) {
        // Convert base64 to blob and download
        const binaryString = atob(result.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: result.mimeType });
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = result.filename || `report-${selectedMonth}.pptx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success("Report erfolgreich generiert", {
          description: `PPTX-Datei wurde heruntergeladen`
        });
      } else {
        throw new Error(result.error || "Report generation failed");
      }
    } catch (error: any) {
      toast.error("Report-Generierung fehlgeschlagen", {
        description: error.message || "Bitte versuchen Sie es erneut"
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const hasData = posts && posts.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Exports
          </h1>
          <p className="text-muted-foreground mt-1">
            Monatliche Reports als CSV oder PPTX exportieren
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

      {/* PPTX Report Card */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center">
              <Presentation className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl font-display">PPTX Report Generator</CardTitle>
              <CardDescription>
                Automatisch generierter Famefact-Style Report
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="clientName">Kundenname</Label>
              <Input
                id="clientName"
                placeholder="z.B. Muster GmbH"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Berichtsmonat</Label>
              <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-input bg-background">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{formatMonthDisplay(selectedMonth)}</span>
              </div>
            </div>
          </div>

          <div className="text-sm text-muted-foreground space-y-1">
            <p><strong>Der Report enthält:</strong></p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li>Cover-Slide mit Kundenname und Monat</li>
              <li>Facebook KPI-Tabelle (Reichweite, Interaktionen, etc.)</li>
              <li>Top Posts nach Interaktionen</li>
              <li>Top Videos nach 3-Sekunden-Views</li>
              <li>Fazit-Slide mit Zusammenfassung</li>
            </ul>
          </div>

          <Button 
            onClick={handleGenerateReport}
            disabled={!clientName.trim() || isGeneratingReport}
            className="w-full md:w-auto"
            size="lg"
          >
            {isGeneratingReport ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generiere Report...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                PPTX Report generieren
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* CSV Export Options */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Posts Export */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-display">Posts Export</CardTitle>
                <CardDescription>
                  Alle Posts mit Metriken
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{formatMonthDisplay(selectedMonth)}</span>
            </div>
            
            {hasData ? (
              <div className="flex items-center gap-2 text-sm text-green-500">
                <CheckCircle2 className="h-4 w-4" />
                <span>{posts.length} Posts verfügbar</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-amber-500">
                <AlertCircle className="h-4 w-4" />
                <span>Keine Daten für diesen Monat</span>
              </div>
            )}

            <div className="text-xs text-muted-foreground space-y-1">
              <p>Enthält: Post ID, Datum, Typ, Text, Reactions, Comments, Shares, Reichweite, Impressions, Interaktionen</p>
              <p>Format: CSV (Excel-kompatibel mit Semikolon-Trennung)</p>
            </div>

            <Button 
              onClick={handleExportCSV}
              disabled={!hasData || isExporting}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? "Exportiere..." : "Posts exportieren"}
            </Button>
          </CardContent>
        </Card>

        {/* KPIs Export */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-display">KPI Summary</CardTitle>
                <CardDescription>
                  Aggregierte Kennzahlen
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{formatMonthDisplay(selectedMonth)}</span>
            </div>
            
            {kpis ? (
              <div className="flex items-center gap-2 text-sm text-green-500">
                <CheckCircle2 className="h-4 w-4" />
                <span>KPIs verfügbar</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-amber-500">
                <AlertCircle className="h-4 w-4" />
                <span>Keine Daten für diesen Monat</span>
              </div>
            )}

            <div className="text-xs text-muted-foreground space-y-1">
              <p>Enthält: Beiträge, Reactions, Comments, Interaktionen, Shares, Reichweite, Impressions, Durchschnittswerte</p>
              <p>Format: CSV (Excel-kompatibel)</p>
            </div>

            <Button 
              onClick={handleExportKPIs}
              disabled={!kpis || isExporting}
              className="w-full"
              variant="outline"
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? "Exportiere..." : "KPIs exportieren"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="bg-secondary/30 border-border/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong>Hinweis zu den Exports:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>Die Daten stammen aus dem gecachten Snapshot des jeweiligen Monats</li>
                <li>Shares sind als "Limited" markiert, da nicht für alle Posts verfügbar</li>
                <li>Saves werden nicht exportiert (nicht über Graph API verfügbar)</li>
                <li>Interaktionen = Reactions + Comments (ohne Shares)</li>
                <li>PPTX-Reports enthalten Thumbnails, sofern in der Datenbank gecacht</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
