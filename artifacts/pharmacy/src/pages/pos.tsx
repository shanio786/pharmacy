import { useState, useCallback, useEffect } from "react";
import { useListMedicines, useListCustomers, useCreateSale, useGetMedicineBatches } from "@workspace/api-client-react";
import type { MedicineWithStock, Batch, CreateSaleBody, CreateSaleItemBody } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Trash2, ShoppingCart, Printer, X, Loader2, User } from "lucide-react";
import { cn } from "@/lib/utils";
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
}

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
  const { data: batches = [], isLoading } = useGetMedicineBatches(medicine.id);
  const [batchId, setBatchId] = useState<string>("");
  const [saleUnit, setSaleUnit] = useState(medicine.defaultSaleUnit ?? "unit");
  const [qty, setQty] = useState(1);
  const [disc, setDisc] = useState(0);

  const availableBatches = (batches as Batch[]).filter((b) => b.quantityUnits > 0);
  const selectedBatch = availableBatches.find((b) => String(b.id) === batchId) ?? availableBatches[0];

  const effectivePrice = saleUnit === "pack" ? medicine.salePrice * medicine.conversionFactor : medicine.salePrice;

  const handleAdd = () => {
    if (!selectedBatch && availableBatches.length > 0) {
      onAdd({
        medicineId: medicine.id,
        medicineName: medicine.name,
        batchId: availableBatches[0]?.id ?? null,
        batchNo: availableBatches[0]?.batchNo ?? "",
        expiryDate: availableBatches[0]?.expiryDate ?? "",
        saleUnit,
        quantity: qty,
        salePrice: effectivePrice,
        discountPercent: disc,
        conversionFactor: medicine.conversionFactor,
        availableQty: availableBatches[0]?.quantityUnits ?? 0,
      });
    } else if (selectedBatch) {
      onAdd({
        medicineId: medicine.id,
        medicineName: medicine.name,
        batchId: selectedBatch.id,
        batchNo: selectedBatch.batchNo,
        expiryDate: selectedBatch.expiryDate,
        saleUnit,
        quantity: qty,
        salePrice: effectivePrice,
        discountPercent: disc,
        conversionFactor: medicine.conversionFactor,
        availableQty: selectedBatch.quantityUnits,
      });
    } else {
      onAdd({
        medicineId: medicine.id,
        medicineName: medicine.name,
        batchId: null,
        batchNo: "",
        expiryDate: "",
        saleUnit,
        quantity: qty,
        salePrice: effectivePrice,
        discountPercent: disc,
        conversionFactor: medicine.conversionFactor,
        availableQty: 0,
      });
    }
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
        onChange={(e) => setQty(Number(e.target.value))}
        className="h-7 text-xs w-16"
      />
      <Input
        type="number"
        min={0}
        max={100}
        value={disc}
        onChange={(e) => setDisc(Number(e.target.value))}
        className="h-7 text-xs w-16"
        placeholder="Disc%"
      />
      <Button size="sm" className="h-7 text-xs px-2" onClick={handleAdd}>
        <Plus className="w-3 h-3 mr-1" />Add
      </Button>
    </div>
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
  const [lastSale, setLastSale] = useState<any>(null);

  const { data: medicines = [] } = useListMedicines(
    search.length >= 2 ? { search } : undefined
  );
  const { data: customers = [] } = useListCustomers();
  const createSale = useCreateSale();

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

  const updateCartItem = (idx: number, field: keyof CartItem, value: any) => {
    setCart((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  useEffect(() => {
    setPaidAmount(Math.ceil(netAmount));
  }, [netAmount]);

  const handleCreateSale = async () => {
    if (cart.length === 0) {
      toast({ title: "Cart is empty", variant: "destructive" });
      return;
    }
    const body: CreateSaleBody = {
      customerId: customerId !== "walk-in" ? Number(customerId) : null,
      date: format(new Date(), "yyyy-MM-dd"),
      discountAmount: discAmount,
      paidAmount,
      paymentMode,
      notes: notes || null,
      items: cart.map((item): CreateSaleItemBody => ({
        medicineId: item.medicineId,
        batchId: item.batchId,
        saleUnit: item.saleUnit,
        quantity: item.quantity,
        salePrice: item.salePrice,
        discountPercent: item.discountPercent,
        prescriptionNote: null,
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
      toast({ title: `Sale ${(result as any).invoiceNo} created successfully` });
    } catch (err: any) {
      toast({ title: "Sale failed", description: err?.message, variant: "destructive" });
    }
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
            data-testid="input-medicine-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search medicine by name, generic, company..."
            className="pl-9"
          />
        </div>

        {/* Medicine Results */}
        {search.length >= 2 && (
          <Card className="max-h-64 overflow-y-auto">
            <CardContent className="p-2 space-y-1">
              {(medicines as MedicineWithStock[]).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No medicines found</p>
              ) : (
                (medicines as MedicineWithStock[]).map((m) => (
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
                          Stock: {m.stockUnits ?? 0} units
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
                          <div className="font-medium truncate max-w-[140px]">{item.medicineName}</div>
                          {item.batchNo && <div className="text-muted-foreground">{item.batchNo} · {item.expiryDate}</div>}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <Select
                            value={item.saleUnit}
                            onValueChange={(v) => updateCartItem(idx, "saleUnit", v)}
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
                            onChange={(e) => updateCartItem(idx, "quantity", Number(e.target.value))}
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
                            onChange={(e) => updateCartItem(idx, "discountPercent", Number(e.target.value))}
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
                  {(customers as any[]).map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name} ({c.phone})</SelectItem>
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

      {/* Invoice Modal */}
      {showInvoice && lastSale && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-card rounded-xl shadow-2xl w-full max-w-sm">
            <div className="p-4 space-y-2 print-area">
              <div className="text-center">
                <h2 className="font-bold text-lg">PharmaCare</h2>
                <p className="text-xs text-muted-foreground">Sales Invoice</p>
                <p className="text-xs font-medium mt-1">#{lastSale.invoiceNo}</p>
                <p className="text-xs text-muted-foreground">{lastSale.date}</p>
              </div>
              <Separator />
              <div className="text-xs space-y-1">
                {lastSale.items?.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between">
                    <span>{item.medicineName} x{item.quantity} {item.saleUnit}</span>
                    <span>PKR {item.lineTotal?.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="text-xs space-y-1">
                <div className="flex justify-between"><span>Net Amount:</span><span className="font-bold">PKR {lastSale.totalAmount?.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Paid:</span><span>PKR {lastSale.paidAmount?.toFixed(2)}</span></div>
              </div>
            </div>
            <div className="flex gap-2 p-3 border-t">
              <Button size="sm" variant="outline" onClick={() => window.print()} className="flex-1">
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
