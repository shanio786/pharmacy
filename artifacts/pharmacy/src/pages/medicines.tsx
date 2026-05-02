import { useState } from "react";
import {
  useListMedicines, useCreateMedicine, useUpdateMedicine, useDeleteMedicine,
  useGetMedicineBatches, useListCategories, useListCompanies, useListUnits,
  useListRacks, useListGenericNames, useAdjustStock, getGetMedicineBatchesQueryKey,
  useCreateCompany, useCreateGenericName,
} from "@workspace/api-client-react";
import type { MedicineWithStock, CreateMedicineBody, Batch, Category, Company, Unit, Rack, GenericName } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Edit, Trash2, Loader2, PackageOpen, Settings2 } from "lucide-react";

const PRODUCT_TYPES = [
  { value: "medicine", label: "Medicine" },
  { value: "cosmetic", label: "Cosmetic" },
  { value: "baby_care", label: "Baby Care" },
  { value: "fmcg", label: "FMCG" },
  { value: "surgical", label: "Surgical" },
  { value: "other", label: "Other" },
];

const EMPTY_FORM: Partial<CreateMedicineBody> & { productType?: string } = {
  name: "",
  strength: "",
  packingLabel: "",
  conversionFactor: 10,
  salePrice: 0,
  purchasePrice: 0,
  reorderLevel: 10,
  isControlled: false,
  defaultSaleUnit: "unit",
  barcode: "",
  productType: "medicine",
};

export default function MedicinesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<MedicineWithStock | null>(null);
  const [form, setForm] = useState<Partial<CreateMedicineBody> & { productType?: string }>(EMPTY_FORM);
  const [batchMed, setBatchMed] = useState<MedicineWithStock | null>(null);
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustMed, setAdjustMed] = useState<MedicineWithStock | null>(null);
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustReason, setAdjustReason] = useState("");

  const [showAddCompany, setShowAddCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [showAddGeneric, setShowAddGeneric] = useState(false);
  const [newGenericName, setNewGenericName] = useState("");

  const params = {
    search: search.length >= 2 ? search : undefined,
    categoryId: categoryFilter !== "all" ? Number(categoryFilter) : undefined,
  };

  const { data: medicines = [], isLoading } = useListMedicines(params);
  const { data: categories = [] } = useListCategories();
  const { data: companies = [] } = useListCompanies();
  const { data: units = [] } = useListUnits();
  const { data: racks = [] } = useListRacks();
  const { data: generics = [] } = useListGenericNames();
  const { data: batches = [] } = useGetMedicineBatches(batchMed?.id ?? 0, {
    query: {
      queryKey: getGetMedicineBatchesQueryKey(batchMed?.id ?? 0),
      enabled: !!batchMed,
    },
  });

  const createMed = useCreateMedicine();
  const updateMed = useUpdateMedicine();
  const deleteMed = useDeleteMedicine();
  const adjustStock = useAdjustStock();
  const createCompany = useCreateCompany();
  const createGeneric = useCreateGenericName();

  const openCreate = () => {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setShowDialog(true);
  };

  const openEdit = (m: MedicineWithStock) => {
    setEditItem(m);
    setForm({
      name: m.name,
      genericNameId: m.genericNameId ?? undefined,
      categoryId: m.categoryId ?? undefined,
      companyId: m.companyId ?? undefined,
      unitId: m.unitId ?? undefined,
      rackId: m.rackId ?? undefined,
      strength: m.strength ?? "",
      packingLabel: m.packingLabel ?? "",
      conversionFactor: m.conversionFactor,
      salePrice: m.salePrice,
      purchasePrice: m.purchasePrice,
      reorderLevel: m.reorderLevel,
      isControlled: m.isControlled,
      defaultSaleUnit: m.defaultSaleUnit,
      barcode: m.barcode ?? "",
      productType: (m as MedicineWithStock & { productType?: string }).productType ?? "medicine",
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.name) {
      toast({ title: "Medicine name is required", variant: "destructive" });
      return;
    }
    const body = { ...form } as CreateMedicineBody;
    try {
      if (editItem) {
        await updateMed.mutateAsync({ id: editItem.id, data: body });
        toast({ title: "Medicine updated" });
      } else {
        await createMed.mutateAsync({ data: body });
        toast({ title: "Medicine created" });
      }
      setShowDialog(false);
      qc.invalidateQueries();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Request failed", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this medicine?")) return;
    try {
      await deleteMed.mutateAsync({ id });
      toast({ title: "Medicine deleted" });
      qc.invalidateQueries();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Request failed", variant: "destructive" });
    }
  };

  const handleAdjust = async () => {
    if (!adjustMed) return;
    try {
      await adjustStock.mutateAsync({
        data: { medicineId: adjustMed.id, adjustmentUnits: adjustQty, reason: adjustReason },
      });
      toast({ title: "Stock adjusted" });
      setShowAdjust(false);
      qc.invalidateQueries();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Request failed", variant: "destructive" });
    }
  };

  const handleAddCompany = async () => {
    if (!newCompanyName.trim()) return;
    try {
      const created = await createCompany.mutateAsync({ data: { name: newCompanyName.trim() } });
      await qc.invalidateQueries();
      setForm((prev) => ({ ...prev, companyId: (created as Company).id }));
      setShowAddCompany(false);
      setNewCompanyName("");
      toast({ title: `Company "${newCompanyName.trim()}" added` });
    } catch {
      toast({ title: "Error adding company", variant: "destructive" });
    }
  };

  const handleAddGeneric = async () => {
    if (!newGenericName.trim()) return;
    try {
      const created = await createGeneric.mutateAsync({ data: { name: newGenericName.trim() } });
      await qc.invalidateQueries();
      setForm((prev) => ({ ...prev, genericNameId: (created as GenericName).id }));
      setShowAddGeneric(false);
      setNewGenericName("");
      toast({ title: `Generic name "${newGenericName.trim()}" added` });
    } catch {
      toast({ title: "Error adding generic name", variant: "destructive" });
    }
  };

  const f = (field: keyof typeof form) => (value: string | number | boolean | null) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const companyOptions = (companies as Company[]).map((c) => ({ value: String(c.id), label: c.name }));
  const genericOptions = (generics as GenericName[]).map((g) => ({ value: String(g.id), label: g.name }));
  const categoryOptions = (categories as Category[]).map((c) => ({ value: String(c.id), label: c.name }));
  const unitOptions = (units as Unit[]).map((u) => ({ value: String(u.id), label: u.name }));
  const rackOptions = (racks as Rack[]).map((r) => ({ value: String(r.id), label: r.name }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Medicines / Products</h1>
          <p className="text-sm text-muted-foreground">Master product list with stock. Search ≥ 2 chars to filter from 57k+ items.</p>
        </div>
        <Button onClick={openCreate} data-testid="button-add-medicine">
          <Plus className="w-4 h-4 mr-2" />Add Product
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search medicines (type 2+ chars)..."
            className="pl-9"
            data-testid="input-medicine-filter"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48" data-testid="select-category-filter">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {(categories as Category[]).map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Generic</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Company</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Category</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Stock</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Sale Price</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Rack</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Ctrl</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={9} className="text-center py-8 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Loading...</td></tr>
                ) : search.length < 2 && (medicines as MedicineWithStock[]).length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">Type at least 2 characters to search medicines</td></tr>
                ) : (medicines as MedicineWithStock[]).length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">No medicines found</td></tr>
                ) : (
                  (medicines as MedicineWithStock[]).map((m) => (
                    <tr key={m.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <div className="font-medium">{m.name}</div>
                        {m.strength && <div className="text-xs text-muted-foreground">{m.strength}</div>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{m.genericName ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{m.companyName ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{m.categoryName ?? "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <Badge variant={Number(m.totalUnits) <= m.reorderLevel ? "destructive" : "secondary"}>
                          {m.totalUnits ?? 0}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        PKR {Number(m.salePrice ?? 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{m.rackName ?? "—"}</td>
                      <td className="px-4 py-3 text-center">
                        {m.isControlled && <Badge variant="destructive" className="text-xs">Rx</Badge>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => { setBatchMed(m); }}
                            className="text-muted-foreground hover:text-primary p-1"
                            title="View Batches"
                            data-testid={`button-batches-${m.id}`}
                          >
                            <PackageOpen className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setAdjustMed(m); setAdjustQty(0); setAdjustReason(""); setShowAdjust(true); }}
                            className="text-muted-foreground hover:text-primary p-1"
                            title="Adjust Stock"
                            data-testid={`button-adjust-${m.id}`}
                          >
                            <Settings2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEdit(m)}
                            className="text-muted-foreground hover:text-primary p-1"
                            data-testid={`button-edit-medicine-${m.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(m.id)}
                            className="text-muted-foreground hover:text-destructive p-1"
                            data-testid={`button-delete-medicine-${m.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Medicine / Product" : "Add Medicine / Product"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">

            <div className="col-span-2 space-y-1">
              <Label>Name *</Label>
              <Input value={form.name ?? ""} onChange={(e) => f("name")(e.target.value)} data-testid="input-medicine-name" />
            </div>

            <div className="space-y-1">
              <Label>Product Type</Label>
              <Select value={form.productType ?? "medicine"} onValueChange={(v) => setForm((p) => ({ ...p, productType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRODUCT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Category</Label>
              <SearchableCombobox
                options={categoryOptions}
                value={form.categoryId ? String(form.categoryId) : "none"}
                onValueChange={(v) => f("categoryId")(v === "none" ? null : Number(v))}
                placeholder="Select category..."
              />
            </div>

            <div className="space-y-1">
              <Label>Generic Name</Label>
              <SearchableCombobox
                options={genericOptions}
                value={form.genericNameId ? String(form.genericNameId) : "none"}
                onValueChange={(v) => f("genericNameId")(v === "none" ? null : Number(v))}
                placeholder="Select generic name..."
                onAddNew={() => { setNewGenericName(""); setShowAddGeneric(true); }}
                addNewLabel="Add New Generic Name"
              />
            </div>

            <div className="space-y-1">
              <Label>Company / Manufacturer</Label>
              <SearchableCombobox
                options={companyOptions}
                value={form.companyId ? String(form.companyId) : "none"}
                onValueChange={(v) => f("companyId")(v === "none" ? null : Number(v))}
                placeholder="Select company..."
                onAddNew={() => { setNewCompanyName(""); setShowAddCompany(true); }}
                addNewLabel="Add New Company"
              />
            </div>

            <div className="space-y-1">
              <Label>Unit (Tablet / Syrup / etc.)</Label>
              <SearchableCombobox
                options={unitOptions}
                value={form.unitId ? String(form.unitId) : "none"}
                onValueChange={(v) => f("unitId")(v === "none" ? null : Number(v))}
                placeholder="Select unit..."
              />
            </div>

            <div className="space-y-1">
              <Label>Rack / Location</Label>
              <SearchableCombobox
                options={rackOptions}
                value={form.rackId ? String(form.rackId) : "none"}
                onValueChange={(v) => f("rackId")(v === "none" ? null : Number(v))}
                placeholder="Select rack..."
              />
            </div>

            <div className="space-y-1">
              <Label>Strength</Label>
              <Input value={form.strength ?? ""} onChange={(e) => f("strength")(e.target.value)} placeholder="e.g. 500mg" data-testid="input-strength" />
            </div>

            <div className="space-y-1">
              <Label>Packing Label</Label>
              <Input value={form.packingLabel ?? ""} onChange={(e) => f("packingLabel")(e.target.value)} placeholder="e.g. Strip of 10" />
            </div>

            <div className="space-y-1">
              <Label>Units Per Pack (Strip size / Bottle ml)</Label>
              <Input type="number" value={form.conversionFactor ?? 10} onChange={(e) => f("conversionFactor")(Number(e.target.value))} data-testid="input-conversion-factor" />
            </div>

            <div className="space-y-1">
              <Label>Sale Price per Unit/Tab (PKR)</Label>
              <Input type="number" value={form.salePrice ?? 0} onChange={(e) => f("salePrice")(Number(e.target.value))} data-testid="input-sale-price" />
            </div>

            <div className="space-y-1">
              <Label>Purchase Price per Unit/Tab (PKR)</Label>
              <Input type="number" value={form.purchasePrice ?? 0} onChange={(e) => f("purchasePrice")(Number(e.target.value))} />
            </div>

            <div className="space-y-1">
              <Label>Reorder Level (units)</Label>
              <Input type="number" value={form.reorderLevel ?? 10} onChange={(e) => f("reorderLevel")(Number(e.target.value))} />
            </div>

            <div className="space-y-1">
              <Label>Default Sale Unit</Label>
              <Select value={form.defaultSaleUnit ?? "unit"} onValueChange={f("defaultSaleUnit")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unit">Per Unit / Tab</SelectItem>
                  <SelectItem value="pack">Per Pack / Strip</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Barcode</Label>
              <Input value={form.barcode ?? ""} onChange={(e) => f("barcode")(e.target.value)} placeholder="Scan or enter barcode" />
            </div>

            <div className="flex items-center gap-3 col-span-2">
              <Switch
                checked={form.isControlled ?? false}
                onCheckedChange={f("isControlled")}
                data-testid="switch-controlled"
              />
              <Label>Controlled Drug — Prescription required at sale</Label>
            </div>
          </div>

          <div className="bg-muted/30 rounded-md p-3 text-xs text-muted-foreground border mt-1">
            <strong>Pack vs Unit system:</strong> "Units Per Pack" batata hai strip mein kitni tablets hain (e.g. 10). 
            "Sale Price per Unit" aik tablet ki price hai. Pack price = Unit Price × Units Per Pack.
            POS par sale karte waqt "Unit" ya "Pack" choose kar sakte hain.
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMed.isPending || updateMed.isPending} data-testid="button-save-medicine">
              {(createMed.isPending || updateMed.isPending) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {editItem ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Add Company Dialog */}
      <Dialog open={showAddCompany} onOpenChange={setShowAddCompany}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add New Company</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Company Name *</Label>
            <Input
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
              placeholder="e.g. Abbott Pakistan"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleAddCompany()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCompany(false)}>Cancel</Button>
            <Button onClick={handleAddCompany} disabled={!newCompanyName.trim() || createCompany.isPending}>
              {createCompany.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Company
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Add Generic Name Dialog */}
      <Dialog open={showAddGeneric} onOpenChange={setShowAddGeneric}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add New Generic Name</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Generic Name *</Label>
            <Input
              value={newGenericName}
              onChange={(e) => setNewGenericName(e.target.value)}
              placeholder="e.g. Paracetamol"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleAddGeneric()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddGeneric(false)}>Cancel</Button>
            <Button onClick={handleAddGeneric} disabled={!newGenericName.trim() || createGeneric.isPending}>
              {createGeneric.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Generic Name
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Sheet */}
      <Sheet open={!!batchMed} onOpenChange={(o) => { if (!o) setBatchMed(null); }}>
        <SheetContent className="w-96">
          <SheetHeader>
            <SheetTitle>Batches — {batchMed?.name}</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="text-left py-2 font-medium text-muted-foreground">Batch#</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Expiry</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Qty (units)</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Price/unit</th>
                </tr>
              </thead>
              <tbody>
                {(batches as Batch[]).map((b) => (
                  <tr key={b.id} className="border-b last:border-0">
                    <td className="py-2">{b.batchNo}</td>
                    <td className="py-2">{b.expiryDate}</td>
                    <td className="py-2 text-right">{b.quantityUnits}</td>
                    <td className="py-2 text-right">PKR {Number(b.salePrice ?? 0).toFixed(2)}</td>
                  </tr>
                ))}
                {(batches as Batch[]).length === 0 && (
                  <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No batches — add via GRN</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 p-3 bg-muted/30 rounded text-xs text-muted-foreground">
            Stock units = total tablets/pieces across all batches. Add stock via Purchases → New GRN.
          </div>
        </SheetContent>
      </Sheet>

      {/* Stock Adjust Dialog */}
      <Dialog open={showAdjust} onOpenChange={setShowAdjust}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Adjust Stock — {adjustMed?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="text-sm text-muted-foreground">
              Current Stock: <strong>{adjustMed?.totalUnits ?? 0} units</strong>
            </div>
            <div className="space-y-1">
              <Label>Adjustment Units (+ add, - remove)</Label>
              <Input type="number" value={adjustQty} onChange={(e) => setAdjustQty(Number(e.target.value))} data-testid="input-adjust-qty" />
            </div>
            <div className="space-y-1">
              <Label>Reason *</Label>
              <Input value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} placeholder="e.g. Physical count correction" data-testid="input-adjust-reason" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdjust(false)}>Cancel</Button>
            <Button onClick={handleAdjust} disabled={adjustStock.isPending || !adjustReason} data-testid="button-confirm-adjust">
              {adjustStock.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Apply Adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
