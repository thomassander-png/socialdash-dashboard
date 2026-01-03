import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  Building2,
  Facebook,
  Instagram,
} from "lucide-react";

export default function AdminCustomers() {
  const [newCustomerName, setNewCustomerName] = useState("");
  const [editingCustomer, setEditingCustomer] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const utils = trpc.useUtils();
  const { data: customers, isLoading } = trpc.admin.customers.list.useQuery();

  const createCustomer = trpc.admin.customers.create.useMutation({
    onSuccess: () => {
      toast.success("Kunde erfolgreich erstellt");
      setNewCustomerName("");
      setIsCreateDialogOpen(false);
      utils.admin.customers.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  const updateCustomer = trpc.admin.customers.update.useMutation({
    onSuccess: () => {
      toast.success("Kunde erfolgreich aktualisiert");
      setEditingCustomer(null);
      setIsEditDialogOpen(false);
      utils.admin.customers.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  const deleteCustomer = trpc.admin.customers.delete.useMutation({
    onSuccess: () => {
      toast.success("Kunde erfolgreich gelöscht");
      utils.admin.customers.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  const handleCreate = () => {
    if (!newCustomerName.trim()) {
      toast.error("Bitte geben Sie einen Namen ein");
      return;
    }
    createCustomer.mutate({ name: newCustomerName.trim() });
  };

  const handleUpdate = () => {
    if (!editingCustomer || !editingCustomer.name.trim()) {
      toast.error("Bitte geben Sie einen Namen ein");
      return;
    }
    updateCustomer.mutate({
      customerId: editingCustomer.id,
      name: editingCustomer.name.trim(),
    });
  };

  const handleToggleActive = (customerId: string, currentActive: boolean) => {
    updateCustomer.mutate({
      customerId,
      isActive: !currentActive,
    });
  };

  const handleDelete = (customerId: string, customerName: string) => {
    if (
      confirm(
        `Möchten Sie den Kunden "${customerName}" wirklich löschen? Dies ist nur möglich, wenn keine Accounts zugeordnet sind.`
      )
    ) {
      deleteCustomer.mutate({ customerId });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="h-6 w-6 text-cyan-400" />
            Kundenverwaltung
          </h1>
          <p className="text-muted-foreground mt-1">
            Verwalten Sie Ihre Kunden und deren Social Media Accounts
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-cyan-500 hover:bg-cyan-600 text-black">
              <Plus className="h-4 w-4 mr-2" />
              Neuer Kunde
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neuen Kunden erstellen</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Input
                placeholder="Kundenname"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createCustomer.isPending}
                className="bg-cyan-500 hover:bg-cyan-600 text-black"
              >
                {createCustomer.isPending ? "Erstelle..." : "Erstellen"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Gesamt Kunden
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-cyan-400">
              {customers?.length ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Facebook className="h-4 w-4" />
              FB Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-400">
              {customers?.reduce(
                (sum, c) => sum + (c.fb_account_count ?? 0),
                0
              ) ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Instagram className="h-4 w-4" />
              IG Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-pink-400">
              {customers?.reduce(
                (sum, c) => sum + (c.ig_account_count ?? 0),
                0
              ) ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customers Table */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle>Kundenliste</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Lade Kunden...
            </div>
          ) : customers?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Keine Kunden vorhanden. Erstellen Sie Ihren ersten Kunden.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-center">FB Accounts</TableHead>
                  <TableHead className="text-center">IG Accounts</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Aktiv</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers?.map((customer) => (
                  <TableRow key={customer.customer_id}>
                    <TableCell className="font-medium">
                      {customer.name}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className="border-blue-500/50 text-blue-400"
                      >
                        {customer.fb_account_count ?? 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className="border-pink-500/50 text-pink-400"
                      >
                        {customer.ig_account_count ?? 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {(customer.total_account_count ?? 0) > 0 ? (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                          Konfiguriert
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-yellow-500/50 text-yellow-400"
                        >
                          Keine Accounts
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={customer.is_active}
                        onCheckedChange={() =>
                          handleToggleActive(
                            customer.customer_id,
                            customer.is_active
                          )
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingCustomer({
                              id: customer.customer_id,
                              name: customer.name,
                            });
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() =>
                            handleDelete(customer.customer_id, customer.name)
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kunde bearbeiten</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Kundenname"
              value={editingCustomer?.name ?? ""}
              onChange={(e) =>
                setEditingCustomer((prev) =>
                  prev ? { ...prev, name: e.target.value } : null
                )
              }
              onKeyDown={(e) => e.key === "Enter" && handleUpdate()}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={updateCustomer.isPending}
              className="bg-cyan-500 hover:bg-cyan-600 text-black"
            >
              {updateCustomer.isPending ? "Speichere..." : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
