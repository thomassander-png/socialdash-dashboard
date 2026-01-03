import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  FileText,
  Download,
  RefreshCw,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Calendar,
  Building2,
} from "lucide-react";

export default function AdminReports() {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newReportCustomerId, setNewReportCustomerId] = useState<string>("");
  const [newReportMonth, setNewReportMonth] = useState<string>("");

  const utils = trpc.useUtils();
  const { data: reports, isLoading: reportsLoading } =
    trpc.admin.reports.list.useQuery({
      customerId: selectedCustomerId || undefined,
      month: selectedMonth || undefined,
    });

  const { data: customers } = trpc.admin.customers.list.useQuery();

  const createReport = trpc.admin.reports.create.useMutation({
    onSuccess: () => {
      toast.success("Report erstellt");
      setIsCreateDialogOpen(false);
      setNewReportCustomerId("");
      setNewReportMonth("");
      utils.admin.reports.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  const regenerateReport = trpc.admin.reports.regenerate.useMutation({
    onSuccess: (data) => {
      if (data.success && data.data) {
        // Download the generated report
        const blob = new Blob(
          [Uint8Array.from(atob(data.data), (c) => c.charCodeAt(0))],
          {
            type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          }
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = data.filename || "report.pptx";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success("Report erfolgreich generiert und heruntergeladen");
      }
      utils.admin.reports.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
      utils.admin.reports.list.invalidate();
    },
  });

  const handleCreateReport = () => {
    if (!newReportCustomerId || !newReportMonth) {
      toast.error("Bitte wählen Sie Kunde und Monat aus");
      return;
    }
    createReport.mutate({
      customerId: newReportCustomerId,
      month: newReportMonth,
    });
  };

  const handleRegenerate = (reportId: string) => {
    regenerateReport.mutate({ reportId });
  };

  // Generate month options (last 12 months)
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const value = date.toISOString().slice(0, 7);
    const label = date.toLocaleDateString("de-DE", {
      year: "numeric",
      month: "long",
    });
    return { value, label };
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "generated":
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Generiert
          </Badge>
        );
      case "generating":
        return (
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Wird generiert
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
            <AlertCircle className="h-3 w-3 mr-1" />
            Fehlgeschlagen
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="border-yellow-500/50 text-yellow-400"
          >
            <Clock className="h-3 w-3 mr-1" />
            Ausstehend
          </Badge>
        );
    }
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("de-DE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatMonth = (date: Date | string) => {
    return new Date(date).toLocaleDateString("de-DE", {
      year: "numeric",
      month: "long",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 text-cyan-400" />
            Report-Verwaltung
          </h1>
          <p className="text-muted-foreground mt-1">
            Erstellen und verwalten Sie monatliche Kundenreports
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-cyan-500 hover:bg-cyan-600 text-black">
              <Plus className="h-4 w-4 mr-2" />
              Neuer Report
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neuen Report erstellen</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  Kunde
                </label>
                <Select
                  value={newReportCustomerId}
                  onValueChange={setNewReportCustomerId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Kunde auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers?.map((customer) => (
                      <SelectItem
                        key={customer.customer_id}
                        value={customer.customer_id}
                      >
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3 w-3" />
                          {customer.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  Monat
                </label>
                <Select
                  value={newReportMonth}
                  onValueChange={setNewReportMonth}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Monat auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleCreateReport}
                disabled={createReport.isPending}
                className="bg-cyan-500 hover:bg-cyan-600 text-black"
              >
                {createReport.isPending ? "Erstelle..." : "Erstellen"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gesamt Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-cyan-400">
              {reports?.length ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              Generiert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-400">
              {reports?.filter((r) => r.status === "generated").length ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-400" />
              Ausstehend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-400">
              {reports?.filter((r) => r.status === "pending").length ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-400" />
              Fehlgeschlagen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-400">
              {reports?.filter((r) => r.status === "failed").length ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="w-48">
              <label className="text-sm text-muted-foreground mb-1 block">
                Kunde
              </label>
              <Select
                value={selectedCustomerId || "all"}
                onValueChange={(v) =>
                  setSelectedCustomerId(v === "all" ? "" : v)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Kunden</SelectItem>
                  {customers?.map((customer) => (
                    <SelectItem
                      key={customer.customer_id}
                      value={customer.customer_id}
                    >
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-48">
              <label className="text-sm text-muted-foreground mb-1 block">
                Monat
              </label>
              <Select
                value={selectedMonth || "all"}
                onValueChange={(v) => setSelectedMonth(v === "all" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Monate</SelectItem>
                  {monthOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle>Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {reportsLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Lade Reports...
            </div>
          ) : reports?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>Keine Reports gefunden.</p>
              <p className="text-sm mt-2">
                Erstellen Sie einen neuen Report für einen Kunden.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kunde</TableHead>
                  <TableHead>Monat</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Generiert am</TableHead>
                  <TableHead>Fehler</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports?.map((report) => (
                  <TableRow key={report.report_id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {report.customer_name || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatMonth(report.month)}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(report.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(report.generated_at)}
                    </TableCell>
                    <TableCell>
                      {report.error_message && (
                        <span
                          className="text-red-400 text-sm truncate max-w-[200px] block"
                          title={report.error_message}
                        >
                          {report.error_message}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRegenerate(report.report_id)}
                          disabled={
                            regenerateReport.isPending ||
                            report.status === "generating"
                          }
                        >
                          {regenerateReport.isPending &&
                          regenerateReport.variables?.reportId ===
                            report.report_id ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4 mr-1" />
                          )}
                          Generieren
                        </Button>
                        {report.pptx_url && (
                          <Button variant="outline" size="sm" asChild>
                            <a
                              href={report.pptx_url}
                              download
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Download className="h-4 w-4 mr-1" />
                              PPTX
                            </a>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
