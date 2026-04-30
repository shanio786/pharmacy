import { useState } from "react";
import { useListStockAudits, useCreateStockAudit, useGetStockAudit, useListMedicines } from "@workspace/api-client-react";
import type { CreateStockAuditBody, CreateStockAuditItemBody } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, ClipboardCheck, Eye, Search, Trash2 } from "lucide-react";
import { format } from "date-fns";

export default function StockAuditPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [viewAuditId, setViewAuditId] = useState<number | null>(null);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const [auditItems, setAuditItems] = useState<Array<{ medicineId: number; medicineName: string; physicalUnits: number; physicalPacks: number }>>([]);
  const [medSearch, setMedSearch] = useState("");
  const [addingMed, setAddingMed] = useState(false);

  const { data: audits = [], isLoading } = useListStockAudits();
  const { data: auditDetail } = useGetStockAudit(viewAuditId ?? 0, {
    query: { enabled: !!viewAuditId } as any,
  });
  const { data: medResults = [] } = useListMedicines(medSearch.length >= 2 ? { search: medSearch } : undefined);
  const createAudit = useCreateStockAudit();

  const addMed = (med: any) => {
    const exists = auditItems.find((i) => i.medicineId === med.id);
    if (exists) return;
    setAuditItems((prev) => [...prev, { medicineId: med.id, medicineName: med.name, physicalUnits: med.totalUnits ?? 0, physicalPacks: 0 }]);
    setMedSearch("");
    setAddingMed(false);
  };

  const updateItem = (idx: number, field: string, value: number) => {
    setAuditItems((prev) => { const u = [...prev]; u[idx] = { ...u[idx], [field]: value }; return u; });
  };

  const removeItem = (idx: number) => setAuditItems((prev) => prev.filter((_, i) => i !== idx));

  const handleCreate = async () => {
    if (!title) { toast({ title: "Title is required", variant: "destructive" }); return; }
    if (auditItems.length === 0) { toast({ title: "Add at least one medicine", variant: "destructive" }); return; }

    const body: CreateStockAuditBody = {
      title,
      date,
      notes: notes || null,
      items: auditItems.map((it): CreateStockAuditItemBody => ({
        medicineId: it.medicineId,
        physicalUnits: it.physicalUnits,
        physicalPacks: it.physicalPacks,
      })),
    };
    try {
      await createAudit.mutateAsync({ data: body });
      toast({ title: "Stock audit created" });
      setShowCreate(false);
      setTitle("");
      setNotes("");
      setAuditItems([]);
      qc.invalidateQueries();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const detail = auditDetail as any;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Stock Audit</h1>
          <p className="text-sm text-muted-foreground">Compare physical stock with system records</p>
        </div>
        <Button onClick={() => setShowCreate(true)} data-testid="button-new-audit">
          <Plus className="w-4 h-4 mr-2" />New Audit
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Title</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Notes</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
                ) : (audits as any[]).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12">
                      <ClipboardCheck className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">No audits conducted yet</p>
                    </td>
                  </tr>
                ) : (
                  (audits as any[]).map((a) => (
                    <tr key={a.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{a.title}</td>
                      <td className="px-4 py-3">{a.date}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={a.status === "completed" ? "default" : "secondary"} className="capitalize">
                          {a.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{a.notes ?? "—"}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setViewAuditId(a.id)}
                          className="text-muted-foreground hover:text-primary"
                          data-testid={`button-view-audit-${a.id}`}
                        >
                          <Eye className="w-4 h-4" />
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Stock Audit</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-4 py-2">
            <div className="col-span-2 space-y-1">
              <Label>Audit Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Monthly Audit April 2025" data-testid="input-audit-title" />
            </div>
            <div className="space-y-1">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="col-span-3 space-y-1">
              <Label>Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any notes about this audit..." />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Medicines to Audit ({auditItems.length})</Label>
              <Button size="sm" variant="outline" onClick={() => setAddingMed(!addingMed)} data-testid="button-add-audit-item">
                <Plus className="w-3 h-3 mr-1" />Add Medicine
              </Button>
            </div>

            {addingMed && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={medSearch} onChange={(e) => setMedSearch(e.target.value)} placeholder="Search medicine..." className="pl-9" autoFocus />
                {medSearch.length >= 2 && (
                  <div className="absolute z-10 top-full left-0 right-0 bg-popover border rounded-lg shadow-lg max-h-48 overflow-y-auto mt-1">
                    {(medResults as any[]).map((m) => (
                      <button key={m.id} className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50" onClick={() => addMed(m)}>
                        <span className="font-medium">{m.name}</span>
                        <span className="text-muted-foreground ml-2">Stock: {m.stockUnits ?? 0}</span>
                      </button>
                    ))}
                    {(medResults as any[]).length === 0 && <p className="px-3 py-4 text-sm text-muted-foreground text-center">No results</p>}
                  </div>
                )}
              </div>
            )}
          </div>

          {auditItems.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b bg-muted/20">
                  <tr>
                    <th className="text-left px-3 py-2 text-muted-foreground">Medicine</th>
                    <th className="text-center px-3 py-2 text-muted-foreground">Physical Units</th>
                    <th className="text-center px-3 py-2 text-muted-foreground">Physical Packs</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {auditItems.map((it, idx) => (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="px-3 py-2 font-medium">{it.medicineName}</td>
                      <td className="px-3 py-2 text-center">
                        <Input type="number" min={0} value={it.physicalUnits} onChange={(e) => updateItem(idx, "physicalUnits", Number(e.target.value))} className="h-7 text-xs w-20 text-center" />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Input type="number" min={0} value={it.physicalPacks} onChange={(e) => updateItem(idx, "physicalPacks", Number(e.target.value))} className="h-7 text-xs w-20 text-center" />
                      </td>
                      <td className="px-3 py-2">
                        <button onClick={() => removeItem(idx)} className="text-destructive hover:opacity-70"><Trash2 className="w-3 h-3" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createAudit.isPending} data-testid="button-save-audit">
              {createAudit.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save Audit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Audit Sheet */}
      <Sheet open={!!viewAuditId} onOpenChange={(o) => { if (!o) setViewAuditId(null); }}>
        <SheetContent className="w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{detail?.title}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div className="text-sm text-muted-foreground">Date: {detail?.date} · Status: {detail?.status}</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="text-left py-2 font-medium text-muted-foreground">Medicine</th>
                    <th className="text-center py-2 font-medium text-muted-foreground">System</th>
                    <th className="text-center py-2 font-medium text-muted-foreground">Physical</th>
                    <th className="text-center py-2 font-medium text-muted-foreground">Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {(detail?.items ?? []).map((it: any) => {
                    const variance = it.physicalUnits - it.systemUnits;
                    return (
                      <tr key={it.id} className="border-b last:border-0">
                        <td className="py-2 font-medium">{it.medicineName}</td>
                        <td className="py-2 text-center">{it.systemUnits}</td>
                        <td className="py-2 text-center">{it.physicalUnits}</td>
                        <td className="py-2 text-center">
                          <Badge variant={variance === 0 ? "secondary" : variance > 0 ? "default" : "destructive"}>
                            {variance > 0 ? "+" : ""}{variance}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                  {(detail?.items ?? []).length === 0 && (
                    <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No items in this audit</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
