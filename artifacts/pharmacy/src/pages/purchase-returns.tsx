import { useState } from "react";
import { useListPurchaseReturns, useCreatePurchaseReturn, useListSuppliers, useListPurchases, useGetPurchase } from "@workspace/api-client-react";
import type { CreatePurchaseReturnBody, CreatePurchaseReturnItemBody } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, Trash2 } from "lucide-react";
import { format } from "date-fns";

export default function PurchaseReturnsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [suppFilter, setSuppFilter] = useState("all");

  const [supplierId, setSupplierId] = useState<string>("none");
  const [purchaseId, setPurchaseId] = useState<string>("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const [inPacks, setInPacks] = useState(false);
  const [returnItems, setReturnItems] = useState<Array<{ medicineId: number; medicineName: string; batchId: number | null; returnQuantity: number; purchasePrice: number }>>([]);

  const params = {
    supplierId: suppFilter !== "all" ? Number(suppFilter) : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  };

  const { data: purchaseReturns = [], isLoading } = useListPurchaseReturns(params);
  const { data: suppliers = [] } = useListSuppliers();
  const { data: purchases = [] } = useListPurchases({});
  const { data: purchaseDetail } = useGetPurchase(Number(purchaseId), {
    query: { enabled: !!purchaseId && !isNaN(Number(purchaseId)) } as any,
  });
  const createReturn = useCreatePurchaseReturn();

  const addItem = (item: any) => {
    const exists = returnItems.find((r) => r.medicineId === item.medicineId && r.batchId === item.batchId);
    if (exists) return;
    setReturnItems((prev) => [...prev, {
      medicineId: item.medicineId,
      medicineName: item.medicineName,
      batchId: item.batchId ?? null,
      returnQuantity: 1,
      purchasePrice: item.purchasePrice,
    }]);
  };

  const updateQty = (idx: number, qty: number) => {
    setReturnItems((prev) => { const u = [...prev]; u[idx] = { ...u[idx], returnQuantity: qty }; return u; });
  };

  const removeItem = (idx: number) => setReturnItems((prev) => prev.filter((_, i) => i !== idx));

  const total = returnItems.reduce((acc, it) => acc + it.purchasePrice * it.returnQuantity, 0);

  const handleCreate = async () => {
    if (returnItems.length === 0) {
      toast({ title: "Add at least one item", variant: "destructive" });
      return;
    }
    const body: CreatePurchaseReturnBody = {
      supplierId: supplierId !== "none" ? Number(supplierId) : null,
      date,
      notes: notes || null,
      inPacks,
      items: returnItems.map((it): CreatePurchaseReturnItemBody => ({
        medicineId: it.medicineId,
        batchId: it.batchId,
        returnQuantity: it.returnQuantity,
        purchasePrice: it.purchasePrice,
      })),
    };
    try {
      await createReturn.mutateAsync({ data: body });
      toast({ title: "Purchase return created" });
      setShowDialog(false);
      setReturnItems([]);
      setPurchaseId("");
      qc.invalidateQueries();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Request failed", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Purchase Returns</h1>
          <p className="text-sm text-muted-foreground">Return medicines to suppliers</p>
        </div>
        <Button onClick={() => setShowDialog(true)} data-testid="button-create-purchase-return">
          <Plus className="w-4 h-4 mr-2" />New Return
        </Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Select value={suppFilter} onValueChange={setSuppFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Suppliers" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Suppliers</SelectItem>
            {(suppliers as any[]).map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36" />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Supplier</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total (PKR)</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Notes</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
                ) : (purchaseReturns as any[]).length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">No purchase returns found</td></tr>
                ) : (
                  (purchaseReturns as any[]).map((r) => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3">{r.date}</td>
                      <td className="px-4 py-3">{r.supplierName ?? "—"}</td>
                      <td className="px-4 py-3 text-right font-medium text-destructive">
                        PKR {Number(r.totalAmount).toLocaleString("en-PK", { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{r.notes ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Purchase Return</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1">
              <Label>Supplier</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {(suppliers as any[]).map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Link to Purchase (optional)</Label>
              <Select value={purchaseId} onValueChange={setPurchaseId}>
                <SelectTrigger><SelectValue placeholder="Select GRN..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— None —</SelectItem>
                  {(purchases as any[]).slice(0, 50).map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.invoiceNo ?? `GRN-${p.id}`} — {p.date} — {p.supplierName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Return reason..." />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={inPacks} onCheckedChange={setInPacks} />
              <Label>Quantities in Packs</Label>
            </div>
          </div>

          {purchaseDetail && (purchaseDetail as any).items?.length > 0 && (
            <div>
              <Label className="text-sm font-semibold">Purchase Items (click to add)</Label>
              <div className="mt-2 border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="border-b bg-muted/20">
                    <tr>
                      <th className="text-left px-3 py-2 text-muted-foreground">Medicine</th>
                      <th className="text-left px-3 py-2 text-muted-foreground">Batch</th>
                      <th className="text-center px-3 py-2 text-muted-foreground">Packs</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {(purchaseDetail as any).items.map((item: any) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="px-3 py-2">{item.medicineName}</td>
                        <td className="px-3 py-2 text-muted-foreground">{item.batchNo}</td>
                        <td className="px-3 py-2 text-center">{item.packsReceived}</td>
                        <td className="px-3 py-2">
                          <button onClick={() => addItem(item)} className="text-xs text-primary hover:underline">Add</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {returnItems.length > 0 && (
            <div>
              <Label className="text-sm font-semibold">Return Items</Label>
              <div className="mt-2 border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="border-b bg-muted/20">
                    <tr>
                      <th className="text-left px-3 py-2 text-muted-foreground">Medicine</th>
                      <th className="text-center px-3 py-2 text-muted-foreground">Qty</th>
                      <th className="text-right px-3 py-2 text-muted-foreground">Total</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {returnItems.map((it, idx) => (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="px-3 py-2">{it.medicineName}</td>
                        <td className="px-3 py-2 text-center">
                          <Input type="number" min={1} value={it.returnQuantity} onChange={(e) => updateQty(idx, Number(e.target.value))} className="h-6 text-xs w-16 text-center" />
                        </td>
                        <td className="px-3 py-2 text-right font-medium">PKR {(Number(it.purchasePrice ?? 0) * it.returnQuantity).toFixed(2)}</td>
                        <td className="px-3 py-2">
                          <button onClick={() => removeItem(idx)} className="text-destructive hover:opacity-70"><Trash2 className="w-3 h-3" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t font-bold text-xs">
                      <td colSpan={2} className="px-3 py-2 text-right">Total:</td>
                      <td className="px-3 py-2 text-right text-destructive">PKR {total.toFixed(2)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createReturn.isPending} data-testid="button-save-purchase-return">
              {createReturn.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Create Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
