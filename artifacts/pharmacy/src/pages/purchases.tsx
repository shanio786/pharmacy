import { useState } from "react";
import { useListPurchases, useCreatePurchase, useListSuppliers, useListMedicines, useCreateSupplier } from "@workspace/api-client-react";
import type { CreatePurchaseBody, CreatePurchaseItemBody, Supplier, Purchase, MedicineWithStock } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Search, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface GRNItem extends CreatePurchaseItemBody {
  medicineName: string;
}

type BadgeVariant = "default" | "destructive" | "outline" | "secondary";
const STATUS_COLORS: Record<string, BadgeVariant> = {
  draft: "secondary",
  received: "default",
  partial: "outline",
};

export default function PurchasesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [suppFilter, setSuppFilter] = useState("all");

  const [supplierId, setSupplierId] = useState<string>("none");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<GRNItem[]>([]);

  const [medSearch, setMedSearch] = useState("");
  const [addingMed, setAddingMed] = useState(false);

  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierContact, setNewSupplierContact] = useState("");

  const params = {
    supplierId: suppFilter !== "all" ? Number(suppFilter) : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  };

  const { data: purchases = [], isLoading } = useListPurchases(params);
  const { data: suppliers = [] } = useListSuppliers();
  const { data: medResults = [] } = useListMedicines(medSearch.length >= 2 ? { search: medSearch } : undefined);
  const createPurchase = useCreatePurchase();
  const createSupplier = useCreateSupplier();

  const supplierOptions = (suppliers as Supplier[]).map((s) => ({
    value: String(s.id),
    label: s.name + (s.contact ? ` — ${s.contact}` : ""),
  }));

  const addItem = (med: MedicineWithStock) => {
    setItems((prev) => [
      ...prev,
      {
        medicineId: med.id,
        medicineName: med.name,
        batchNo: "",
        expiryDate: "",
        packsReceived: 1,
        purchasePrice: med.purchasePrice ?? 0,
        salePrice: med.salePrice ?? 0,
      },
    ]);
    setMedSearch("");
    setAddingMed(false);
  };

  const updateItem = (idx: number, field: string, value: string | number) => {
    setItems((prev) => {
      const u = [...prev];
      u[idx] = { ...u[idx], [field]: value };
      return u;
    });
  };

  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const total = items.reduce((acc, it) => acc + Number(it.packsReceived ?? 0) * Number(it.purchasePrice ?? 0), 0);

  const handleCreate = async () => {
    if (items.length === 0) {
      toast({ title: "Add at least one item", variant: "destructive" });
      return;
    }
    const invalidItems = items.filter((it) => !it.batchNo || !it.expiryDate);
    if (invalidItems.length > 0) {
      toast({ title: "All items must have Batch# and Expiry Date", variant: "destructive" });
      return;
    }
    const body: CreatePurchaseBody = {
      supplierId: supplierId !== "none" ? Number(supplierId) : null,
      invoiceNo: invoiceNo || null,
      date,
      notes: notes || null,
      items: items.map((it) => ({
        medicineId: it.medicineId,
        batchNo: it.batchNo,
        expiryDate: it.expiryDate,
        packsReceived: it.packsReceived,
        purchasePrice: it.purchasePrice,
        salePrice: it.salePrice,
      })),
    };
    try {
      await createPurchase.mutateAsync({ data: body });
      toast({ title: "GRN created successfully" });
      setShowDialog(false);
      setItems([]);
      setInvoiceNo("");
      setNotes("");
      qc.invalidateQueries();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Request failed", variant: "destructive" });
    }
  };

  const handleAddSupplier = async () => {
    if (!newSupplierName.trim()) return;
    try {
      const created = await createSupplier.mutateAsync({ data: { name: newSupplierName.trim(), contact: newSupplierContact || undefined } });
      await qc.invalidateQueries();
      setSupplierId(String((created as Supplier).id));
      setShowAddSupplier(false);
      setNewSupplierName("");
      setNewSupplierContact("");
      toast({ title: `Supplier "${newSupplierName.trim()}" added` });
    } catch {
      toast({ title: "Error adding supplier", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">GRN / Purchases</h1>
          <p className="text-sm text-muted-foreground">Goods Received Notes with mandatory batch tracking</p>
        </div>
        <Button onClick={() => setShowDialog(true)} data-testid="button-create-grn">
          <Plus className="w-4 h-4 mr-2" />New GRN
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="w-56">
          <SearchableCombobox
            options={(suppliers as Supplier[]).map((s) => ({ value: String(s.id), label: s.name }))}
            value={suppFilter}
            onValueChange={(v) => setSuppFilter(v === "none" ? "all" : v)}
            placeholder="All Suppliers"
          />
        </div>
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36" placeholder="From" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36" placeholder="To" />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Invoice#</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Supplier</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total (PKR)</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
                ) : (purchases as Purchase[]).length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No purchases found</td></tr>
                ) : (
                  (purchases as Purchase[]).map((p) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3">{p.date}</td>
                      <td className="px-4 py-3 font-medium">{p.invoiceNo ?? "—"}</td>
                      <td className="px-4 py-3">{p.supplierName ?? "Walk-in"}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        PKR {Number(p.totalAmount).toLocaleString("en-PK", { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={STATUS_COLORS[p.status] ?? "secondary"}>
                          {p.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* GRN Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New GRN (Goods Received Note)</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-4 py-2">
            <div className="space-y-1">
              <Label>Supplier</Label>
              <SearchableCombobox
                options={supplierOptions}
                value={supplierId}
                onValueChange={setSupplierId}
                placeholder="Select supplier..."
                onAddNew={() => { setNewSupplierName(""); setNewSupplierContact(""); setShowAddSupplier(true); }}
                addNewLabel="Add New Supplier"
              />
            </div>
            <div className="space-y-1">
              <Label>Invoice#</Label>
              <Input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="Supplier invoice#" data-testid="input-invoice-no" />
            </div>
            <div className="space-y-1">
              <Label>Date *</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} data-testid="input-grn-date" />
            </div>
            <div className="col-span-3 space-y-1">
              <Label>Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." />
            </div>
          </div>

          {/* Medicine Search */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Items ({items.length})</Label>
              <Button size="sm" variant="outline" onClick={() => setAddingMed(!addingMed)} data-testid="button-add-grn-item">
                <Plus className="w-3 h-3 mr-1" />Add Medicine
              </Button>
            </div>

            {addingMed && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={medSearch}
                  onChange={(e) => setMedSearch(e.target.value)}
                  placeholder="Search medicine (type 2+ chars)..."
                  className="pl-9"
                  autoFocus
                  data-testid="input-grn-med-search"
                />
                {medSearch.length >= 2 && (
                  <div className="absolute z-10 top-full left-0 right-0 bg-popover border rounded-lg shadow-lg max-h-48 overflow-y-auto mt-1">
                    {(medResults as MedicineWithStock[]).map((m) => (
                      <button
                        key={m.id}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50"
                        onClick={() => addItem(m)}
                        data-testid={`button-select-grn-med-${m.id}`}
                      >
                        <span className="font-medium">{m.name}</span>
                        {m.strength && <span className="text-muted-foreground ml-2">{m.strength}</span>}
                        <span className="text-muted-foreground ml-2">{m.companyName}</span>
                      </button>
                    ))}
                    {(medResults as MedicineWithStock[]).length === 0 && (
                      <p className="px-3 py-4 text-sm text-muted-foreground text-center">No results</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Items Table */}
          {items.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b bg-muted/20">
                  <tr>
                    <th className="text-left px-2 py-2 font-medium text-muted-foreground">Medicine</th>
                    <th className="text-left px-2 py-2 font-medium text-muted-foreground">Batch# *</th>
                    <th className="text-left px-2 py-2 font-medium text-muted-foreground">Expiry *</th>
                    <th className="text-center px-2 py-2 font-medium text-muted-foreground">Packs</th>
                    <th className="text-right px-2 py-2 font-medium text-muted-foreground">Buy Price/Pack</th>
                    <th className="text-right px-2 py-2 font-medium text-muted-foreground">Sale Price</th>
                    <th className="text-right px-2 py-2 font-medium text-muted-foreground">Total</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="px-2 py-2 font-medium">{it.medicineName}</td>
                      <td className="px-2 py-2">
                        <Input
                          value={it.batchNo}
                          onChange={(e) => updateItem(idx, "batchNo", e.target.value)}
                          className="h-7 text-xs w-24"
                          placeholder="Batch#"
                          data-testid={`input-batch-no-${idx}`}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="date"
                          value={it.expiryDate}
                          onChange={(e) => updateItem(idx, "expiryDate", e.target.value)}
                          className="h-7 text-xs w-32"
                          data-testid={`input-expiry-${idx}`}
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <Input
                          type="number"
                          min={1}
                          value={it.packsReceived}
                          onChange={(e) => updateItem(idx, "packsReceived", Number(e.target.value))}
                          className="h-7 text-xs w-16 text-center"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="number"
                          value={it.purchasePrice}
                          onChange={(e) => updateItem(idx, "purchasePrice", Number(e.target.value))}
                          className="h-7 text-xs w-20 text-right"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="number"
                          value={it.salePrice}
                          onChange={(e) => updateItem(idx, "salePrice", Number(e.target.value))}
                          className="h-7 text-xs w-20 text-right"
                        />
                      </td>
                      <td className="px-2 py-2 text-right font-medium">
                        PKR {(Number(it.packsReceived ?? 0) * Number(it.purchasePrice ?? 0)).toFixed(2)}
                      </td>
                      <td className="px-2 py-2">
                        <button onClick={() => removeItem(idx)} className="text-destructive hover:opacity-70">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t font-bold">
                    <td colSpan={6} className="px-2 py-2 text-right">Total:</td>
                    <td className="px-2 py-2 text-right text-primary">PKR {total.toFixed(2)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createPurchase.isPending} data-testid="button-save-grn">
              {createPurchase.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save GRN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Add Supplier Dialog */}
      <Dialog open={showAddSupplier} onOpenChange={setShowAddSupplier}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add New Supplier</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Supplier Name *</Label>
              <Input
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
                placeholder="e.g. Ali Brothers Pharma"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleAddSupplier()}
              />
            </div>
            <div className="space-y-1">
              <Label>Contact (optional)</Label>
              <Input
                value={newSupplierContact}
                onChange={(e) => setNewSupplierContact(e.target.value)}
                placeholder="e.g. 0300-1234567"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSupplier(false)}>Cancel</Button>
            <Button onClick={handleAddSupplier} disabled={!newSupplierName.trim() || createSupplier.isPending}>
              {createSupplier.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Supplier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
