import { useState, useCallback, useEffect, useRef } from "react";
import { useListMedicines, useListCustomers, useCreateSale, useGetMedicineBatches, useGetSettings } from "@workspace/api-client-react";
import type { MedicineWithStock, Batch, Customer, CreateSaleBody, CreateSaleItemBody, SaleWithItems, SaleItem, Settings } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Trash2, ShoppingCart, Printer, X, Loader2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface CartItem {
  medicineId: number;
  medicineName: string;
  batchId: number | null;
  batchNo: string;
  expiryDate: string;
  saleUnit: string;
  quantity: number;
  salePrice: number;
  discountPercent: number;
  conversionFactor: number;
  availableQty: number;
  isControlled: boolean;
}

type CartField = keyof CartItem;
type CartFieldValue<K extends CartField> = CartItem[K];

function formatCurrency(n: number) {
  return `PKR ${n.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function MedicineBatchSelector({
  medicine,
  onAdd,
}: {
  medicine: MedicineWithStock;
  onAdd: (item: CartItem) => void;
}) {
  const { data: batchData = [], isLoading } = useGetMedicineBatches(medicine.id);
  const [batchId, setBatchId] = useState<string>("");
  const [saleUnit, setSaleUnit] = useState(medicine.defaultSaleUnit ?? "unit");
  const [qty, setQty] = useState(1);
  const [disc, setDisc] = useState(0);

  const batches = batchData as Batch[];
  const availableBatches = batches.filter((b) => b.quantityUnits > 0);
  const selectedBatch = availableBatches.find((b) => String(b.id) === batchId) ?? availableBatches[0];

  const effectivePrice = saleUnit === "pack"
    ? Number(medicine.salePrice) * Number(medicine.conversionFactor)
    : Number(medicine.salePrice);

  const buildCartItem = (batch: Batch | undefined): CartItem => ({
    medicineId: medicine.id,
    medicineName: medicine.name,
    batchId: batch?.id ?? null,
    batchNo: batch?.batchNo ?? "",
    expiryDate: batch?.expiryDate ?? "",
    saleUnit,
    quantity: Math.max(1, Number(qty) || 1),
    salePrice: Number(effectivePrice) || 0,
    discountPercent: Math.min(100, Math.max(0, Number(disc) || 0)),
    conversionFactor: Number(medicine.conversionFactor) || 1,
    availableQty: batch?.quantityUnits ?? 0,
    isControlled: medicine.isControlled,
  });

  const handleAdd = () => {
    if (isLoading) return;
    onAdd(buildCartItem(selectedBatch ?? availableBatches[0]));
  };

  return (
    <div className="flex items-center gap-2 mt-1">
      {availableBatches.length > 1 && (
        <Select value={batchId} onValueChange={setBatchId}>
          <SelectTrigger className="h-7 text-xs w-28">
            <SelectValue placeholder="Batch" />
          </SelectTrigger>
          <SelectContent>
            {availableBatches.map((b) => (
              <SelectItem key={b.id} value={String(b.id)} className="text-xs">
                {b.batchNo} (exp {b.expiryDate})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Select value={saleUnit} onValueChange={setSaleUnit}>
        <SelectTrigger className="h-7 text-xs w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unit" className="text-xs">Unit</SelectItem>
          <SelectItem value="pack" className="text-xs">Pack</SelectItem>
        </SelectContent>
      </Select>
      <Input
        type="number"
        min={1}
        value={qty}
        onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
        className="h-7 text-xs w-16"
      />
      <Input
        type="number"
        min={0}
        max={100}
        value={disc}
        onChange={(e) => setDisc(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
        className="h-7 text-xs w-16"
        placeholder="Disc%"
      />
      <Button size="sm" className="h-7 text-xs px-2" onClick={handleAdd} disabled={isLoading}>
        <Plus className="w-3 h-3 mr-1" />Add
      </Button>
    </div>
  );
}

interface PrescriptionInfo {
  doctorName: string;
  doctorLicense: string;
  prescriptionDate: string;
  patientName: string;
}

function PrescriptionDialog({
  open,
  controlledItems,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  controlledItems: string[];
  onConfirm: (info: PrescriptionInfo) => void;
  onCancel: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<PrescriptionInfo>({
    doctorName: "",
    doctorLicense: "",
    prescriptionDate: today,
    patientName: "",
  });

  const handleConfirm = () => {
    if (!form.doctorName.trim() || !form.prescriptionDate) return;
    onConfirm({ ...form, doctorName: form.doctorName.trim() });
    setForm({ doctorName: "", doctorLicense: "", prescriptionDate: today, patientName: "" });
  };

  const set = (key: keyof PrescriptionInfo) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [key]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Prescription Required
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            The following controlled substances require a valid prescription:
          </p>
          <ul className="list-disc list-inside text-xs bg-amber-50 dark:bg-amber-950/20 rounded p-2 space-y-0.5">
            {controlledItems.map((name) => (
              <li key={name} className="text-amber-700 dark:text-amber-400">{name}</li>
            ))}
          </ul>
          <div className="space-y-1">
            <Label className="text-xs">Doctor Name <span className="text-destructive">*</span></Label>
            <Input value={form.doctorName} onChange={set("doctorName")} placeholder="Dr. Ahmed Khan" className="h-8 text-xs" data-testid="input-prescribed-by" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Doctor License / PMDC No.</Label>
            <Input value={form.doctorLicense} onChange={set("doctorLicense")} placeholder="PMDC-12345 (optional)" className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Prescription Date <span className="text-destructive">*</span></Label>
            <Input type="date" value={form.prescriptionDate} onChange={set("prescriptionDate")} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Patient Name</Label>
            <Input value={form.patientName} onChange={set("patientName")} placeholder="Patient name (optional)" className="h-8 text-xs" data-testid="input-patient-name" />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={!form.doctorName.trim() || !form.prescriptionDate}
            data-testid="button-confirm-prescription"
          >
            Confirm &amp; Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function POSPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState<string>("walk-in");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [overallDisc, setOverallDisc] = useState(0);
  const [notes, setNotes] = useState("");
  const [activeMed, setActiveMed] = useState<number | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [lastSale, setLastSale] = useState<SaleWithItems | null>(null);
  const [showPrescriptionDialog, setShowPrescriptionDialog] = useState(false);

  const { data: medicineData = [] } = useListMedicines(
    search.length >= 2 ? { search } : undefined
  );
  const { data: customerData = [] } = useListCustomers();
  const { data: settingsData } = useGetSettings();
  const createSale = useCreateSale();

  const medicines = medicineData as MedicineWithStock[];
  const customers = customerData as Customer[];
  const settings = settingsData as Settings | undefined;

  const searchInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  const subtotal = cart.reduce((acc, item) => {
    const lineTotal = item.salePrice * item.quantity;
    const lineDisc = lineTotal * (item.discountPercent / 100);
    return acc + lineTotal - lineDisc;
  }, 0);
  const discAmount = subtotal * (overallDisc / 100);
  const netAmount = subtotal - discAmount;
  const change = paidAmount - netAmount;

  const addToCart = useCallback((item: CartItem) => {
    setCart((prev) => {
      const idx = prev.findIndex(
        (c) => c.medicineId === item.medicineId && c.batchId === item.batchId && c.saleUnit === item.saleUnit
      );
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + item.quantity };
        return updated;
      }
      return [...prev, item];
    });
    setActiveMed(null);
  }, []);

  const removeFromCart = (idx: number) => {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateCartItem = <K extends CartField>(idx: number, field: K, value: CartFieldValue<K>) => {
    setCart((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  useEffect(() => {
    setPaidAmount(Math.ceil(netAmount));
  }, [netAmount]);

  const controlledInCart = cart.filter((i) => i.isControlled);

  const buildAndSubmitSale = async (prescriptionInfo: PrescriptionInfo | null) => {
    const body: CreateSaleBody = {
      customerId: customerId !== "walk-in" ? Number(customerId) : null,
      date: format(new Date(), "yyyy-MM-dd"),
      discountAmount: Number(discAmount) || 0,
      paidAmount: Number(paidAmount) || 0,
      paymentMode,
      notes: notes || null,
      patientName: prescriptionInfo?.patientName || null,
      prescribedBy: prescriptionInfo?.doctorName || null,
      prescription: prescriptionInfo
        ? {
            doctorName: prescriptionInfo.doctorName,
            doctorLicense: prescriptionInfo.doctorLicense || undefined,
            prescriptionDate: prescriptionInfo.prescriptionDate,
          }
        : undefined,
      items: cart.map((item): CreateSaleItemBody => ({
        medicineId: item.medicineId,
        batchId: item.batchId,
        saleUnit: item.saleUnit,
        quantity: Math.max(1, Number(item.quantity) || 1),
        salePrice: Number(item.salePrice) || 0,
        discountPercent: Math.min(100, Math.max(0, Number(item.discountPercent) || 0)),
      })),
    };
    try {
      const result = await createSale.mutateAsync({ data: body });
      setLastSale(result);
      setShowInvoice(true);
      setCart([]);
      setOverallDisc(0);
      setPaidAmount(0);
      setNotes("");
      setCustomerId("walk-in");
      queryClient.invalidateQueries();
      toast({ title: `Sale ${result.invoiceNo} created successfully` });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Sale failed", description: message, variant: "destructive" });
    }
  };

  const handleCreateSale = async () => {
    if (cart.length === 0) {
      toast({ title: "Cart is empty", variant: "destructive" });
      return;
    }
    if (controlledInCart.length > 0) {
      setShowPrescriptionDialog(true);
      return;
    }
    await buildAndSubmitSale(null);
  };

  const handlePrescriptionConfirm = async (info: PrescriptionInfo) => {
    setShowPrescriptionDialog(false);
    await buildAndSubmitSale(info);
  };

  return (
    <div className="flex h-full gap-4 -m-4 p-4">
      {/* Left Panel */}
      <div className="flex-1 flex flex-col min-w-0 space-y-3">
        <div>
          <h1 className="text-lg font-bold">POS / Billing</h1>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            data-testid="input-medicine-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search medicine by name, generic, barcode..."
            className="pl-9"
          />
        </div>

        {/* Medicine Results */}
        {search.length >= 2 && (
          <Card className="max-h-64 overflow-y-auto">
            <CardContent className="p-2 space-y-1">
              {medicines.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No medicines found</p>
              ) : (
                medicines.map((m) => (
                  <div key={m.id} className="rounded-lg border p-2 text-sm hover:bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{m.name}</span>
                          {m.strength && <span className="text-xs text-muted-foreground">{m.strength}</span>}
                          {m.isControlled && <Badge variant="destructive" className="text-xs">Rx</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {m.genericName && `Generic: ${m.genericName} · `}
                          {m.companyName && `${m.companyName} · `}
                          Stock: {m.totalUnits ?? 0} units
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <div className="font-medium text-primary">{formatCurrency(m.salePrice)}/unit</div>
                        <button
                          onClick={() => setActiveMed(activeMed === m.id ? null : m.id)}
                          className="text-xs text-muted-foreground hover:text-primary"
                          data-testid={`button-add-medicine-${m.id}`}
                        >
                          {activeMed === m.id ? "Cancel" : "Add"}
                        </button>
                      </div>
                    </div>
                    {activeMed === m.id && (
                      <MedicineBatchSelector medicine={m} onAdd={addToCart} />
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {/* Cart */}
        <Card className="flex-1 overflow-hidden flex flex-col">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-primary" />
              Cart ({cart.length} items)
              {controlledInCart.length > 0 && (
                <Badge variant="outline" className="text-xs text-amber-600 border-amber-400">
                  <AlertTriangle className="w-3 h-3 mr-1" />{controlledInCart.length} Rx required
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                Search and add medicines to cart
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead className="border-b">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Medicine</th>
                    <th className="text-center px-2 py-2 font-medium text-muted-foreground">Unit</th>
                    <th className="text-center px-2 py-2 font-medium text-muted-foreground">Qty</th>
                    <th className="text-right px-2 py-2 font-medium text-muted-foreground">Price</th>
                    <th className="text-center px-2 py-2 font-medium text-muted-foreground">Disc%</th>
                    <th className="text-right px-2 py-2 font-medium text-muted-foreground">Total</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item, idx) => {
                    const lineTotal = item.salePrice * item.quantity;
                    const lineDisc = lineTotal * (item.discountPercent / 100);
                    return (
                      <tr key={idx} className="border-b hover:bg-muted/20">
                        <td className="px-3 py-2">
                          <div className="font-medium truncate max-w-[140px]">
                            {item.medicineName}
                            {item.isControlled && <span className="ml-1 text-amber-500">Rx</span>}
                          </div>
                          {item.batchNo && <div className="text-muted-foreground">{item.batchNo} · {item.expiryDate}</div>}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <Select
                            value={item.saleUnit}
                            onValueChange={(v) => {
                              const baseUnitPrice = item.saleUnit === "pack"
                                ? item.salePrice / (item.conversionFactor || 1)
                                : item.salePrice;
                              const newPrice = v === "pack"
                                ? baseUnitPrice * (item.conversionFactor || 1)
                                : baseUnitPrice;
                              setCart((prev) => {
                                const updated = [...prev];
                                updated[idx] = { ...updated[idx], saleUnit: v, salePrice: newPrice };
                                return updated;
                              });
                            }}
                          >
                            <SelectTrigger className="h-6 text-xs w-16">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unit">Unit</SelectItem>
                              <SelectItem value="pack">Pack</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => updateCartItem(idx, "quantity", Math.max(1, Number(e.target.value) || 1))}
                            className="h-6 text-xs w-14 text-center"
                          />
                        </td>
                        <td className="px-2 py-2 text-right">{Number(item.salePrice ?? 0).toFixed(2)}</td>
                        <td className="px-2 py-2 text-center">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={item.discountPercent}
                            onChange={(e) => updateCartItem(idx, "discountPercent", Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                            className="h-6 text-xs w-14 text-center"
                          />
                        </td>
                        <td className="px-2 py-2 text-right font-medium text-primary">
                          {(lineTotal - lineDisc).toFixed(2)}
                        </td>
                        <td className="px-2 py-2">
                          <button onClick={() => removeFromCart(idx)} className="text-destructive hover:opacity-70">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Invoice */}
      <div className="w-72 flex-shrink-0">
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-sm">Invoice</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-3 text-sm">
            {/* Customer */}
            <div className="space-y-1">
              <Label className="text-xs">Customer</Label>
              <Select value={customerId} onValueChange={setCustomerId} data-testid="select-customer">
                <SelectTrigger className="h-8 text-xs" data-testid="select-customer-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk-in">Walk-in Customer</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name} ({c.phone ?? "—"})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Totals */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Overall Disc%:</span>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={overallDisc}
                  onChange={(e) => setOverallDisc(Number(e.target.value))}
                  className="h-6 w-20 text-xs text-right"
                  data-testid="input-overall-discount"
                />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount:</span>
                <span className="text-destructive">-{formatCurrency(discAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-base">
                <span>Net Amount:</span>
                <span className="text-primary">{formatCurrency(netAmount)}</span>
              </div>
            </div>

            <Separator />

            {/* Payment */}
            <div className="space-y-2">
              <div className="space-y-1">
                <Label className="text-xs">Payment Mode</Label>
                <Select value={paymentMode} onValueChange={setPaymentMode} data-testid="select-payment-mode">
                  <SelectTrigger className="h-8 text-xs" data-testid="select-payment-mode-trigger">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="credit">Credit</SelectItem>
                    <SelectItem value="partial">Partial (Cash+Credit)</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Paid Amount (PKR)</Label>
                <Input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Number(e.target.value))}
                  className="h-8 text-xs"
                  data-testid="input-paid-amount"
                />
              </div>

              {paymentMode === "cash" && paidAmount >= netAmount && (
                <div className="flex justify-between text-xs bg-green-50 dark:bg-green-950/20 rounded p-2">
                  <span className="text-muted-foreground">Change:</span>
                  <span className="text-green-600 font-medium">{formatCurrency(change)}</span>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs">Notes</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes..."
                  className="h-8 text-xs"
                  data-testid="input-sale-notes"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Button
                className="w-full"
                onClick={handleCreateSale}
                disabled={cart.length === 0 || createSale.isPending}
                data-testid="button-create-sale"
              >
                {createSale.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>
                ) : (
                  `Create Sale (${formatCurrency(netAmount)})`
                )}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => { setCart([]); setOverallDisc(0); }}
                data-testid="button-clear-cart"
              >
                Clear Cart
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Prescription Dialog for controlled substances */}
      <PrescriptionDialog
        open={showPrescriptionDialog}
        controlledItems={[...new Set(controlledInCart.map((i) => i.medicineName))]}
        onConfirm={handlePrescriptionConfirm}
        onCancel={() => setShowPrescriptionDialog(false)}
      />

      {/* Invoice Modal - 80mm thermal receipt */}
      {showInvoice && lastSale && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:static print:bg-transparent print:p-0">
          <div className="bg-white dark:bg-card rounded-xl shadow-2xl w-full max-w-sm print:rounded-none print:shadow-none print:max-w-none">
            <div className="receipt-print p-4 font-mono text-xs text-black bg-white" data-testid="receipt-print-area">
              <div className="text-center space-y-0.5">
                <h2 className="font-bold text-base leading-tight">{settings?.pharmacyName ?? "PharmaCare"}</h2>
                {settings?.address && <p className="text-[10px] leading-tight">{settings.address}</p>}
                {settings?.phone && <p className="text-[10px] leading-tight">Tel: {settings.phone}</p>}
                {settings?.ntn && <p className="text-[10px] leading-tight">NTN: {settings.ntn}</p>}
                {settings?.strn && <p className="text-[10px] leading-tight" data-testid="receipt-strn">STRN: {settings.strn}</p>}
                {settings?.drugLicense && <p className="text-[10px] leading-tight">Drug Lic#: {settings.drugLicense}</p>}
              </div>
              <div className="border-t border-dashed border-black my-2" />
              <div className="text-[10px] space-y-0.5">
                <div className="flex justify-between">
                  <span>Invoice#:</span>
                  <span className="font-bold" data-testid="receipt-invoice-no">{lastSale.invoiceNo}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date/Time:</span>
                  <span data-testid="receipt-datetime">{format(new Date(lastSale.createdAt ?? lastSale.date), "yyyy-MM-dd HH:mm")}</span>
                </div>
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span>{lastSale.customerName ?? "Walk-in"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment:</span>
                  <span className="capitalize">{lastSale.paymentMode}</span>
                </div>
              </div>
              <div className="border-t border-dashed border-black my-2" />
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-dashed border-black">
                    <th className="text-left font-semibold pb-1">Item</th>
                    <th className="text-right font-semibold pb-1 pl-1">Qty</th>
                    <th className="text-right font-semibold pb-1 pl-1">Price</th>
                    <th className="text-right font-semibold pb-1 pl-1">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lastSale.items.map((item: SaleItem, i: number) => (
                    <tr key={i} className="align-top">
                      <td className="py-0.5 pr-1">
                        <div className="leading-tight">{item.medicineName}</div>
                        {item.batchNo && <div className="text-[9px] opacity-70">B: {item.batchNo}</div>}
                      </td>
                      <td className="text-right py-0.5 pl-1">{Number(item.quantity)} {item.saleUnit === "pack" ? "pk" : "u"}</td>
                      <td className="text-right py-0.5 pl-1">{Number(item.salePrice).toFixed(2)}</td>
                      <td className="text-right py-0.5 pl-1">{Number(item.totalAmount).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-dashed border-black my-2" />
              <div className="text-[10px] space-y-0.5">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>PKR {Number(lastSale.subtotal).toFixed(2)}</span>
                </div>
                {Number(lastSale.discountAmount) > 0 && (
                  <div className="flex justify-between">
                    <span>Discount:</span>
                    <span>- PKR {Number(lastSale.discountAmount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm border-t border-black pt-1 mt-1">
                  <span>NET TOTAL:</span>
                  <span data-testid="receipt-total">PKR {Number(lastSale.totalAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Paid:</span>
                  <span>PKR {Number(lastSale.paidAmount).toFixed(2)}</span>
                </div>
                {Number(lastSale.paidAmount) > Number(lastSale.totalAmount) && (
                  <div className="flex justify-between">
                    <span>Change:</span>
                    <span>PKR {(Number(lastSale.paidAmount) - Number(lastSale.totalAmount)).toFixed(2)}</span>
                  </div>
                )}
                {Number(lastSale.paidAmount) < Number(lastSale.totalAmount) && (
                  <div className="flex justify-between">
                    <span>Balance Due:</span>
                    <span>PKR {(Number(lastSale.totalAmount) - Number(lastSale.paidAmount)).toFixed(2)}</span>
                  </div>
                )}
              </div>
              {settings?.fbrEnabled && settings.fbrPosId && (
                <>
                  <div className="border-t border-dashed border-black my-2" />
                  <div className="text-center text-[10px] leading-tight" data-testid="receipt-fbr">
                    <p className="font-bold">FBR POS Invoice</p>
                    <p>POS ID: {settings.fbrPosId}</p>
                    <p className="opacity-70">Verify at fbr.gov.pk</p>
                  </div>
                </>
              )}
              {settings?.receiptFooter && (
                <>
                  <div className="border-t border-dashed border-black my-2" />
                  <p className="text-center text-[10px] leading-tight">{settings.receiptFooter}</p>
                </>
              )}
              <div className="text-center text-[9px] opacity-70 mt-2">--- end of receipt ---</div>
            </div>
            <div className="flex gap-2 p-3 border-t no-print">
              <Button size="sm" variant="outline" onClick={() => window.print()} className="flex-1" data-testid="button-print-receipt">
                <Printer className="w-3 h-3 mr-1" />Print
              </Button>
              <Button size="sm" onClick={() => setShowInvoice(false)} className="flex-1" data-testid="button-close-invoice">
                <X className="w-3 h-3 mr-1" />Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
