import { useState } from "react";
import { useListMissedSales, useCreateMissedSale, useDeleteMissedSale } from "@workspace/api-client-react";
import type { CreateMissedSaleBody, MissedSale } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Loader2, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function MissedSalesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState<CreateMissedSaleBody>({
    medicineName: "",
    genericName: null,
    quantityDemanded: 1,
    customerNote: null,
    date: format(new Date(), "yyyy-MM-dd"),
  });

  const { data: missedSales = [], isLoading } = useListMissedSales();
  const createMissed = useCreateMissedSale();
  const deleteMissed = useDeleteMissedSale();

  const handleCreate = async () => {
    if (!form.medicineName) {
      toast({ title: "Medicine name is required", variant: "destructive" });
      return;
    }
    try {
      await createMissed.mutateAsync({ data: form });
      toast({ title: "Missed sale recorded" });
      setShowDialog(false);
      setForm({ medicineName: "", genericName: null, quantityDemanded: 1, customerNote: null, date: format(new Date(), "yyyy-MM-dd") });
      qc.invalidateQueries();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Request failed", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Remove this missed sale record?")) return;
    try {
      await deleteMissed.mutateAsync({ id });
      toast({ title: "Record removed" });
      qc.invalidateQueries();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Request failed", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Missed Sales</h1>
          <p className="text-sm text-muted-foreground">Track medicine demand that couldn't be fulfilled</p>
        </div>
        <Button onClick={() => setShowDialog(true)} data-testid="button-add-missed-sale">
          <Plus className="w-4 h-4 mr-2" />Record Missed Sale
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Medicine Demanded</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Generic Name</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Qty Demanded</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customer Note</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
                ) : (missedSales as MissedSale[]).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12">
                      <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">No missed sales recorded</p>
                    </td>
                  </tr>
                ) : (
                  (missedSales as MissedSale[]).map((m) => (
                    <tr key={m.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3">{m.date}</td>
                      <td className="px-4 py-3 font-medium">{m.medicineName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{m.genericName ?? "—"}</td>
                      <td className="px-4 py-3 text-center font-medium text-orange-600">{m.quantityDemanded}</td>
                      <td className="px-4 py-3 text-muted-foreground">{m.customerNote ?? "—"}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="text-muted-foreground hover:text-destructive"
                          data-testid={`button-delete-missed-${m.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Missed Sale</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Medicine Name *</Label>
              <Input
                value={form.medicineName}
                onChange={(e) => setForm((p) => ({ ...p, medicineName: e.target.value }))}
                placeholder="e.g. Panadol Extra"
                data-testid="input-missed-medicine"
              />
            </div>
            <div className="space-y-1">
              <Label>Generic Name</Label>
              <Input
                value={form.genericName ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, genericName: e.target.value || null }))}
                placeholder="e.g. Paracetamol"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Quantity Demanded</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.quantityDemanded}
                  onChange={(e) => setForm((p) => ({ ...p, quantityDemanded: Number(e.target.value) }))}
                  data-testid="input-missed-qty"
                />
              </div>
              <div className="space-y-1">
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Customer Note</Label>
              <Input
                value={form.customerNote ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, customerNote: e.target.value || null }))}
                placeholder="Any customer comment..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMissed.isPending} data-testid="button-save-missed">
              {createMissed.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
