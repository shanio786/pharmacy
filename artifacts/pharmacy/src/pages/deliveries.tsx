import { useState } from "react";
import { useListDeliveries, useCreateDelivery, useUpdateDelivery, useListCustomers, useListSales } from "@workspace/api-client-react";
import type { CreateDeliveryBody, UpdateDeliveryBody, Delivery, Customer, Sale } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, Truck, Edit } from "lucide-react";
import { format } from "date-fns";

const STATUS_BADGE: Record<string, any> = {
  pending: "secondary",
  dispatched: "default",
  delivered: "default",
  cancelled: "destructive",
  returned: "outline",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "text-yellow-600",
  dispatched: "text-blue-600",
  delivered: "text-green-600",
  cancelled: "text-red-600",
  returned: "text-orange-600",
};

export default function DeliveriesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [updateStatus, setUpdateStatus] = useState("pending");
  const [updateNote, setUpdateNote] = useState("");

  const [form, setForm] = useState<CreateDeliveryBody>({
    saleId: null,
    customerId: null,
    deliveryAddress: "",
    scheduledDate: null,
    notes: null,
  });

  const { data: deliveries = [], isLoading } = useListDeliveries();
  const { data: customers = [] } = useListCustomers();
  const { data: sales = [] } = useListSales();
  const createDelivery = useCreateDelivery();
  const updateDelivery = useUpdateDelivery();

  const handleCreate = async () => {
    if (!form.deliveryAddress) {
      toast({ title: "Delivery address is required", variant: "destructive" });
      return;
    }
    try {
      await createDelivery.mutateAsync({ data: form });
      toast({ title: "Delivery created" });
      setShowCreate(false);
      setForm({ saleId: null, customerId: null, deliveryAddress: "", scheduledDate: null, notes: null });
      qc.invalidateQueries();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Request failed", variant: "destructive" });
    }
  };

  const handleUpdate = async () => {
    if (!selectedId) return;
    const body: UpdateDeliveryBody = {
      status: updateStatus,
      deliveredAt: updateStatus === "delivered" ? new Date().toISOString() : null,
      proofNote: updateNote || null,
    };
    try {
      await updateDelivery.mutateAsync({ id: selectedId, data: body });
      toast({ title: "Delivery status updated" });
      setShowUpdate(false);
      qc.invalidateQueries();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Request failed", variant: "destructive" });
    }
  };

  const openUpdate = (d: Delivery) => {
    setSelectedId(d.id);
    setUpdateStatus(d.status);
    setUpdateNote("");
    setShowUpdate(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Home Deliveries</h1>
          <p className="text-sm text-muted-foreground">Manage medicine delivery orders</p>
        </div>
        <Button onClick={() => setShowCreate(true)} data-testid="button-new-delivery">
          <Plus className="w-4 h-4 mr-2" />New Delivery
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">ID</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customer</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Address</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Scheduled</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Notes</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
                ) : (deliveries as Delivery[]).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12">
                      <Truck className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">No deliveries yet</p>
                    </td>
                  </tr>
                ) : (
                  (deliveries as Delivery[]).map((d) => (
                    <tr key={d.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium text-muted-foreground">DEL-{String(d.id).padStart(4, "0")}</td>
                      <td className="px-4 py-3">
                        <div>{d.customerName ?? "—"}</div>
                        {d.customerPhone && <div className="text-xs text-muted-foreground">{d.customerPhone}</div>}
                      </td>
                      <td className="px-4 py-3 max-w-[180px] truncate">{d.deliveryAddress}</td>
                      <td className="px-4 py-3">{d.scheduledDate ?? "—"}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={STATUS_BADGE[d.status] ?? "secondary"} className={STATUS_COLOR[d.status]}>
                          {d.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground truncate max-w-[120px]">{d.notes ?? "—"}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openUpdate(d)}
                          className="text-muted-foreground hover:text-primary"
                          data-testid={`button-update-delivery-${d.id}`}
                        >
                          <Edit className="w-4 h-4" />
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

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Delivery</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Customer</Label>
              <Select
                value={form.customerId ? String(form.customerId) : "none"}
                onValueChange={(v) => setForm((p) => ({ ...p, customerId: v === "none" ? null : Number(v) }))}
              >
                <SelectTrigger><SelectValue placeholder="Select customer..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {(customers as Customer[]).map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name} ({c.phone})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Link to Sale (optional)</Label>
              <Select
                value={form.saleId ? String(form.saleId) : "none"}
                onValueChange={(v) => setForm((p) => ({ ...p, saleId: v === "none" ? null : Number(v) }))}
              >
                <SelectTrigger><SelectValue placeholder="Select sale..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {(sales as Sale[]).slice(0, 30).map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.invoiceNo} — {s.date}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Delivery Address *</Label>
              <Input
                value={form.deliveryAddress}
                onChange={(e) => setForm((p) => ({ ...p, deliveryAddress: e.target.value }))}
                placeholder="Full delivery address..."
                data-testid="input-delivery-address"
              />
            </div>
            <div className="space-y-1">
              <Label>Scheduled Date</Label>
              <Input
                type="date"
                value={form.scheduledDate ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, scheduledDate: e.target.value || null }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Input
                value={form.notes ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value || null }))}
                placeholder="Special delivery instructions..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createDelivery.isPending} data-testid="button-save-delivery">
              {createDelivery.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Create Delivery
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={showUpdate} onOpenChange={setShowUpdate}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Delivery Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={updateStatus} onValueChange={setUpdateStatus}>
                <SelectTrigger data-testid="select-delivery-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="dispatched">Dispatched</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="returned">Returned</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Proof / Note</Label>
              <Input value={updateNote} onChange={(e) => setUpdateNote(e.target.value)} placeholder="Delivery confirmation note..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpdate(false)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateDelivery.isPending} data-testid="button-confirm-status">
              {updateDelivery.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
