import { useState } from "react";
import { trpc } from "@/lib/trpc";
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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Link2,
  Facebook,
  Instagram,
  Building2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export default function AdminAccounts() {
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [assignmentFilter, setAssignmentFilter] = useState<string>("all");

  const utils = trpc.useUtils();
  const { data: accounts, isLoading: accountsLoading } =
    trpc.admin.accounts.list.useQuery({
      platform:
        platformFilter === "all"
          ? undefined
          : (platformFilter as "facebook" | "instagram"),
      unassignedOnly: assignmentFilter === "unassigned",
    });

  const { data: customers } = trpc.admin.customers.list.useQuery();

  const assignAccount = trpc.admin.accounts.assign.useMutation({
    onSuccess: () => {
      toast.success("Account erfolgreich zugeordnet");
      utils.admin.accounts.list.invalidate();
      utils.admin.customers.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  const toggleActive = trpc.admin.accounts.toggleActive.useMutation({
    onSuccess: () => {
      toast.success("Account-Status aktualisiert");
      utils.admin.accounts.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  const handleAssign = (
    accountId: string,
    platform: "facebook" | "instagram",
    customerId: string | null
  ) => {
    assignAccount.mutate({ accountId, platform, customerId });
  };

  const handleToggleActive = (
    accountId: string,
    platform: "facebook" | "instagram",
    currentActive: boolean
  ) => {
    toggleActive.mutate({ accountId, platform, isActive: !currentActive });
  };

  const unassignedCount =
    accounts?.filter((a) => !a.customer_id).length ?? 0;
  const fbCount =
    accounts?.filter((a) => a.platform === "facebook").length ?? 0;
  const igCount =
    accounts?.filter((a) => a.platform === "instagram").length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Link2 className="h-6 w-6 text-primary" />
          Account-Zuordnung
        </h1>
        <p className="text-muted-foreground mt-1">
          Ordnen Sie Social Media Accounts Ihren Kunden zu
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gesamt Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {accounts?.length ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Facebook className="h-4 w-4 text-blue-400" />
              Facebook
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-400">{fbCount}</div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Instagram className="h-4 w-4 text-secondary" />
              Instagram
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-secondary">{igCount}</div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-400" />
              Nicht zugeordnet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-400">
              {unassignedCount}
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
                Plattform
              </label>
              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Plattformen</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-48">
              <label className="text-sm text-muted-foreground mb-1 block">
                Zuordnung
              </label>
              <Select
                value={assignmentFilter}
                onValueChange={setAssignmentFilter}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Accounts</SelectItem>
                  <SelectItem value="unassigned">Nicht zugeordnet</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accounts Table */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {accountsLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Lade Accounts...
            </div>
          ) : accounts?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-yellow-400" />
              <p>Keine Accounts gefunden.</p>
              <p className="text-sm mt-2">
                Führen Sie den Account Discovery Workflow aus, um Accounts zu
                erkennen.
              </p>
              <p className="text-xs mt-4 font-mono bg-muted/50 p-2 rounded inline-block">
                python -m src.main --mode discover
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plattform</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Account ID</TableHead>
                  <TableHead>Zugeordneter Kunde</TableHead>
                  <TableHead className="text-center">Aktiv</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts?.map((account) => (
                  <TableRow key={`${account.platform}-${account.account_id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {account.platform === "facebook" ? (
                          <Facebook className="h-4 w-4 text-blue-400" />
                        ) : (
                          <Instagram className="h-4 w-4 text-secondary" />
                        )}
                        <span className="capitalize">{account.platform}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {account.account_name || "-"}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {account.account_id}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={account.customer_id || "unassigned"}
                        onValueChange={(value) =>
                          handleAssign(
                            account.account_id,
                            account.platform as "facebook" | "instagram",
                            value === "unassigned" ? null : value
                          )
                        }
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Kunde auswählen" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">
                            <span className="text-muted-foreground">
                              Nicht zugeordnet
                            </span>
                          </SelectItem>
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
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={account.is_active}
                        onCheckedChange={() =>
                          handleToggleActive(
                            account.account_id,
                            account.platform as "facebook" | "instagram",
                            account.is_active
                          )
                        }
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      {account.customer_id ? (
                        <Badge className="bg-primary/20 text-primary border-primary/50">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Zugeordnet
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-yellow-500/50 text-yellow-400"
                        >
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Offen
                        </Badge>
                      )}
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
