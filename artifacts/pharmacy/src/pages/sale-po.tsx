import { useState } from "react";
import { useGenerateSaleBasedPO, useListSuppliers } from "@workspace/api-client-react";
import type { SaleBasedPOBody, DraftPOItem } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileText, Printer } from "lucide-react";
import { format, subDays } from "date-fns";

export default function SalePOPage() {
  const { toast } = useToast();
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [supplierId, setSupplierId] = useState<string>("none");
  const [poItems, setPoItems] = useState<DraftPOItem[]>([]);
  const [generated, setGenerated] = useState(false);

  const { data: suppliers = [] } = useListSuppliers();
  const generatePO = useGenerateSaleBasedPO();

  const handleGenerate = async () => {
    if (!dateFrom || !dateTo) {
      toast({ title: "Date range is required", variant: "destructive" });
      return;
    }
    const body: SaleBasedPOBody = {
      dateFrom,
      dateTo,
      supplierId: supplierId !== "none" ? Number(supplierId) : null,
    };
    try {
      const result = await generatePO.mutateAsync({ data: body });
      setPoItems(result as DraftPOItem[]);
      setGenerated(true);
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Request failed", variant: "destructive" });
    }
  };

  const totalValue = poItems.reduce((acc, it) => acc + it.suggestedPacks * it.purchasePrice, 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Sale-Based Purchase Order</h1>
        <p className="text-sm text-muted-foreground">Auto-generate PO based on sales velocity</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Generate PO Parameters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1">
              <Label>Date From</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} data-testid="input-po-date-from" />
            </div>
            <div className="space-y-1">
              <Label>Date To</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} data-testid="input-po-date-to" />
            </div>
            <div className="space-y-1">
              <Label>Supplier Filter</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger><SelectValue placeholder="All suppliers" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All Suppliers</SelectItem>
                  {(suppliers as any[]).map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerate} disabled={generatePO.isPending} data-testid="button-generate-po">
              {generatePO.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
              Generate PO
            </Button>
          </div>
        </CardContent>
      </Card>

      {generated && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">
              Suggested Purchase Order — {poItems.length} items
              {totalValue > 0 && (
                <span className="ml-2 text-muted-foreground font-normal">
                  (Est. PKR {totalValue.toLocaleString("en-PK", { maximumFractionDigits: 0 })})
                </span>
              )}
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              <Printer className="w-3 h-3 mr-1" />Print PO
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">#</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Medicine</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Company</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Units Sold</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Suggested Packs</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Buy Price</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Est. Total</th>
                  </tr>
                </thead>
                <tbody>
                  {poItems.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No items to suggest — all medicines are well stocked for this period</td></tr>
                  ) : (
                    poItems.map((item, idx) => (
                      <tr key={item.medicineId} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium">{item.medicineName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{item.companyName ?? "—"}</td>
                        <td className="px-4 py-3 text-right">{item.unitsSold}</td>
                        <td className="px-4 py-3 text-right font-bold text-primary">{item.suggestedPacks}</td>
                        <td className="px-4 py-3 text-right">PKR {Number(item.purchasePrice ?? 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-medium">
                          PKR {(item.suggestedPacks * item.purchasePrice).toLocaleString("en-PK", { maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {poItems.length > 0 && (
                  <tfoot>
                    <tr className="border-t font-bold">
                      <td colSpan={6} className="px-4 py-3 text-right">Estimated Total:</td>
                      <td className="px-4 py-3 text-right text-primary">
                        PKR {totalValue.toLocaleString("en-PK", { maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
