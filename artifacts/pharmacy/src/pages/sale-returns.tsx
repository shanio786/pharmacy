import { useState } from "react";
import { useListSaleReturns, useCreateSaleReturn, useGetSale, useListSales, useListMedicines } from "@workspace/api-client-react";
import type { CreateSaleReturnBody, CreateSaleReturnItemBody, SaleWithItems, SaleItem, MedicineWithStock } from "@workspace/api-client-react";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface ReturnItem {
  medicineId: number;
  medicineName: string;
  batchId: number | null;
  quantity: number;
  salePrice: number;
  saleUnit: string;
  conversionFactor: number;
}

export default function SaleReturnsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedSaleId, setSelectedSaleId] = useState<string>("none");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);

  const { data: saleReturns = [], isLoading } = useListSaleReturns(
    { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }
  );
  const { data: sales = [] } = useListSales({});
  const [medicineSearch, setMedicineSearch] = useState("");
  const { data: medicineMatches = [] } = useListMedicines({ search: medicineSearch || undefined });

  const saleIdNum = Number(selectedSaleId);
  const saleQueryOpts: UseQueryOptions<SaleWithItems, unknown, SaleWithItems> = {
    queryKey: ["sale", saleIdNum],
    enabled: selectedSaleId !== "none" && !isNaN(saleIdNum) && saleIdNum > 0,
  };
  const { data: saleDetail } = useGetSale(saleIdNum, { query: saleQueryOpts });

  const createReturn = useCreateSaleReturn();

  const handleSelectSale = (saleId: string) => {
    setSelectedSaleId(saleId);
    setReturnItems([]);
  };

  const addReturnItem = (item: SaleItem) => {
    const exists = returnItems.find((r) => r.medicineId === item.medicineId && r.batchId === (item.batchId ?? null));
    if (exists) return;
    setReturnItems((prev) => [
      ...prev,
      {
        medicineId: item.medicineId,
        medicineName: item.medicineName,
        batchId: item.batchId ?? null,
        quantity: 1,
        salePrice: item.salePrice,
        saleUnit: item.saleUnit ?? "unit",
        conversionFactor: item.unitQuantity ?? 1,
      },
    ]);
  };

  const updateReturnItem = (idx: number, qty: number) => {
    setReturnItems((prev) => { const u = [...prev]; u[idx] = { ...u[idx], quantity: qty }; return u; });
  };

  const removeReturnItem = (idx: number) => setReturnItems((prev) => prev.filter((_, i) => i !== idx));

  const total = returnItems.reduce((acc, it) => acc + it.salePrice * it.quantity, 0);

  const handleCreate = async () => {
    if (returnItems.length === 0) {
      toast({ title: "Add at least one return item", variant: "destructive" });
      return;
    }
    const body: CreateSaleReturnBody = {
      saleId: selectedSaleId !== "none" ? saleIdNum : null,
      customerId: saleDetail?.customerId ?? null,
      date,
      notes: notes || null,
      items: returnItems.map((it) => ({
        medicineId: it.medicineId,
        batchId: it.batchId,
        quantity: it.quantity,
        salePrice: it.salePrice,
        saleUnit: it.saleUnit,
        conversionFactor: it.conversionFactor,
      })) as CreateSaleReturnItemBody[],
    };
    try {
      await createReturn.mutateAsync({ data: body });
      toast({ title: "Sale return created" });
      setShowDialog(false);
      setReturnItems([]);
      setSelectedSaleId("none");
      qc.invalidateQueries();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Request failed", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Sale Returns</h1>
          <p className="text-sm text-muted-foreground">Manage returned medicines from customers</p>
        </div>
        <Button onClick={() => setShowDialog(true)} data-testid="button-create-return">
          <Plus className="w-4 h-4 mr-2" />New Return
        </Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36" />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Return#</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customer</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount (PKR)</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Notes</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
                ) : saleReturns.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No sale returns found</td></tr>
                ) : (
                  saleReturns.map((r) => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">SR-{String(r.id).padStart(4, "0")}</td>
                      <td className="px-4 py-3">{r.date}</td>
                      <td className="px-4 py-3">{r.customerName ?? "Walk-in"}</td>
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
            <DialogTitle>Create Sale Return</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1">
                <Label>Link to Sale (optional)</Label>
                <Select value={selectedSaleId} onValueChange={handleSelectSale}>
                  <SelectTrigger data-testid="select-original-sale">
                    <SelectValue placeholder="Select original sale..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— No original sale —</SelectItem>
                    {sales.slice(0, 50).map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.invoiceNo} — {s.date} — PKR {s.totalAmount}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Return Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reason for return..." />
              </div>
            </div>

            {selectedSaleId === "none" && (
              <div>
                <Label className="text-sm font-semibold">Add Medicine Manually</Label>
                <Input
                  placeholder="Search medicine by name..."
                  value={medicineSearch}
                  onChange={(e) => setMedicineSearch(e.target.value)}
                  className="mt-2"
                  data-testid="input-manual-medicine-search"
                />
                {medicineSearch && (
                  <div className="mt-2 border rounded-lg max-h-48 overflow-y-auto">
                    {(medicineMatches as MedicineWithStock[]).slice(0, 10).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          if (returnItems.find((r) => r.medicineId === m.id && r.batchId === null)) return;
                          setReturnItems((prev) => [
                            ...prev,
                            {
                              medicineId: m.id,
                              medicineName: m.name,
                              batchId: null,
                              quantity: 1,
                              salePrice: Number(m.salePrice ?? 0),
                              saleUnit: "unit",
                              conversionFactor: m.conversionFactor ?? 1,
                            },
                          ]);
                          setMedicineSearch("");
                        }}
                        data-testid={`button-add-manual-medicine-${m.id}`}
                        className="block w-full text-left px-3 py-2 text-xs hover:bg-muted/40 border-b last:border-0"
                      >
                        <span className="font-medium">{m.name}</span>
                        <span className="text-muted-foreground ml-2">PKR {m.salePrice}</span>
                      </button>
                    ))}
                    {(medicineMatches as MedicineWithStock[]).length === 0 && (
                      <div className="px-3 py-2 text-xs text-muted-foreground">No medicines match</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {saleDetail && saleDetail.items?.length > 0 && (
              <div>
                <Label className="text-sm font-semibold">Original Sale Items (click to add to return)</Label>
                <div className="mt-2 border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="border-b bg-muted/20">
                      <tr>
                        <th className="text-left px-3 py-2 text-muted-foreground">Medicine</th>
                        <th className="text-center px-3 py-2 text-muted-foreground">Qty</th>
                        <th className="text-right px-3 py-2 text-muted-foreground">Price</th>
                        <th className="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {saleDetail.items.map((item) => (
                        <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="px-3 py-2">{item.medicineName}</td>
                          <td className="px-3 py-2 text-center">{item.quantity} {item.saleUnit}</td>
                          <td className="px-3 py-2 text-right">PKR {item.salePrice}</td>
                          <td className="px-3 py-2">
                            <button onClick={() => addReturnItem(item)} className="text-xs text-primary hover:underline">
                              Add
                            </button>
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
                        <th className="text-center px-3 py-2 text-muted-foreground">Return Qty</th>
                        <th className="text-right px-3 py-2 text-muted-foreground">Price</th>
                        <th className="text-right px-3 py-2 text-muted-foreground">Total</th>
                        <th className="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {returnItems.map((it, idx) => (
                        <tr key={idx} className="border-b last:border-0">
                          <td className="px-3 py-2">{it.medicineName}</td>
                          <td className="px-3 py-2 text-center">
                            <Input type="number" min={1} value={it.quantity} onChange={(e) => updateReturnItem(idx, Number(e.target.value))} className="h-6 text-xs w-16 text-center" />
                          </td>
                          <td className="px-3 py-2 text-right">{Number(it.salePrice ?? 0).toFixed(2)}</td>
                          <td className="px-3 py-2 text-right font-medium">{(Number(it.salePrice ?? 0) * it.quantity).toFixed(2)}</td>
                          <td className="px-3 py-2">
                            <button onClick={() => removeReturnItem(idx)} className="text-destructive hover:opacity-70">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t font-bold text-xs">
                        <td colSpan={3} className="px-3 py-2 text-right">Return Total:</td>
                        <td className="px-3 py-2 text-right text-destructive">PKR {total.toFixed(2)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createReturn.isPending} data-testid="button-save-return">
              {createReturn.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Create Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
