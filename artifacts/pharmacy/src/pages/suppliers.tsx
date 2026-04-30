import { useState } from "react";
import {
  useListSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier,
  useGetSupplierLedger, usePaySupplier, getGetSupplierLedgerQueryKey,
} from "@workspace/api-client-react";
import type { Supplier, LedgerResponse, AccountLedgerEntry } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Loader2, BookOpen, CreditCard } from "lucide-react";
import { format } from "date-fns";

interface SupplierForm {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  ntn?: string;
  openingBalance?: number;
}

export default function SuppliersPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<SupplierForm>({ name: "", openingBalance: 0 });
  const [ledgerSupplier, setLedgerSupplier] = useState<any>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [payAmount, setPayAmount] = useState(0);
  const [payDate, setPayDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [payNote, setPayNote] = useState("");
  const [search, setSearch] = useState("");

  const { data: suppliers = [], isLoading } = useListSuppliers();
  const { data: ledger } = useGetSupplierLedger(
    ledgerSupplier?.id ?? 0,
    {},
    {
      query: {
        queryKey: getGetSupplierLedgerQueryKey(ledgerSupplier?.id ?? 0, {}),
        enabled: !!ledgerSupplier,
      },
    }
  );
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const deleteSupplier = useDeleteSupplier();
  const paySupplier = usePaySupplier();

  const filtered = (suppliers as Supplier[]).filter((s) =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || (s.phone ?? "").includes(search)
  );

  const openCreate = () => { setEditItem(null); setForm({ name: "" }); setShowDialog(true); };
  const openEdit = (s: Supplier) => {
    setEditItem(s);
    setForm({ name: s.name, contactPerson: s.contactPerson ?? "", phone: s.phone ?? "", email: s.email ?? "", address: s.address ?? "" });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.name) { toast({ title: "Name is required", variant: "destructive" }); return; }
    try {
      if (editItem) {
        await updateSupplier.mutateAsync({ id: editItem.id, data: form });
        toast({ title: "Supplier updated" });
      } else {
        await createSupplier.mutateAsync({ data: form });
        toast({ title: "Supplier added" });
      }
      setShowDialog(false);
      qc.invalidateQueries();
    } catch (err: unknown) { toast({ title: "Error", description: err instanceof Error ? err.message : "Request failed", variant: "destructive" }); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this supplier?")) return;
    try {
      await deleteSupplier.mutateAsync({ id });
      toast({ title: "Supplier deleted" });
      qc.invalidateQueries();
    } catch (err: unknown) { toast({ title: "Error", description: err instanceof Error ? err.message : "Request failed", variant: "destructive" }); }
  };

  const handlePay = async () => {
    if (!ledgerSupplier || payAmount <= 0) { toast({ title: "Enter a valid amount", variant: "destructive" }); return; }
    try {
      await paySupplier.mutateAsync({ id: ledgerSupplier.id, data: { amount: payAmount, date: payDate, notes: payNote || null } });
      toast({ title: "Payment recorded" });
      setShowPayment(false);
      qc.invalidateQueries();
    } catch (err: unknown) { toast({ title: "Error", description: err instanceof Error ? err.message : "Request failed", variant: "destructive" }); }
  };

  const f = (field: keyof SupplierForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  const ledgerData = ledger as LedgerResponse | undefined;
  const balance = ledgerData?.balance ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Suppliers</h1>
          <p className="text-sm text-muted-foreground">Manage suppliers and their ledger</p>
        </div>
        <Button onClick={openCreate} data-testid="button-add-supplier">
          <Plus className="w-4 h-4 mr-2" />Add Supplier
        </Button>
      </div>

      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search suppliers..." className="max-w-xs" data-testid="input-supplier-search" />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Contact</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Phone</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Balance (PKR)</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No suppliers found</td></tr>
                ) : (
                  filtered.map((s) => (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{s.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.contactPerson ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.phone ?? "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <Badge variant={Number(s.balance) > 0 ? "destructive" : "secondary"}>
                          PKR {Number(s.balance ?? 0).toLocaleString("en-PK", { maximumFractionDigits: 0 })}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => setLedgerSupplier(s)} className="text-muted-foreground hover:text-primary p-1" title="View Ledger" data-testid={`button-ledger-supplier-${s.id}`}>
                            <BookOpen className="w-4 h-4" />
                          </button>
                          <button onClick={() => openEdit(s)} className="text-muted-foreground hover:text-primary p-1" data-testid={`button-edit-supplier-${s.id}`}>
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(s.id)} className="text-muted-foreground hover:text-destructive p-1" data-testid={`button-delete-supplier-${s.id}`}>
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

      {/* CRUD Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editItem ? "Edit Supplier" : "Add Supplier"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1"><Label>Name *</Label><Input value={form.name} onChange={f("name")} data-testid="input-supplier-name" /></div>
            <div className="space-y-1"><Label>Contact Person</Label><Input value={form.contactPerson ?? ""} onChange={f("contactPerson")} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Phone</Label><Input value={form.phone ?? ""} onChange={f("phone")} /></div>
              <div className="space-y-1"><Label>Email</Label><Input type="email" value={form.email ?? ""} onChange={f("email")} /></div>
            </div>
            <div className="space-y-1"><Label>Address</Label><Input value={form.address ?? ""} onChange={f("address")} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>NTN</Label><Input value={form.ntn ?? ""} onChange={f("ntn")} /></div>
              <div className="space-y-1"><Label>Opening Balance (PKR)</Label><Input type="number" value={form.openingBalance ?? 0} onChange={(e) => setForm((p) => ({ ...p, openingBalance: Number(e.target.value) }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createSupplier.isPending || updateSupplier.isPending} data-testid="button-save-supplier">
              {(createSupplier.isPending || updateSupplier.isPending) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {editItem ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ledger Sheet */}
      <Sheet open={!!ledgerSupplier} onOpenChange={(o) => { if (!o) setLedgerSupplier(null); }}>
        <SheetContent className="w-[520px] sm:w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Ledger — {ledgerSupplier?.name}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Outstanding Balance</p>
                <p className={`text-2xl font-bold ${balance > 0 ? "text-destructive" : "text-primary"}`}>
                  PKR {Math.abs(balance).toLocaleString("en-PK", { maximumFractionDigits: 0 })}
                  {balance > 0 ? " (Payable)" : balance < 0 ? " (Advance)" : " (Clear)"}
                </p>
              </div>
              <Button size="sm" onClick={() => { setPayAmount(0); setPayDate(format(new Date(), "yyyy-MM-dd")); setPayNote(""); setShowPayment(true); }} data-testid="button-pay-supplier">
                <CreditCard className="w-4 h-4 mr-2" />Record Payment
              </Button>
            </div>
            <Separator />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="text-left py-2 font-medium text-muted-foreground">Date</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Type</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Amount</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {(ledgerData?.entries ?? []).map((e: AccountLedgerEntry, i: number) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2">{e.date}</td>
                      <td className="py-2">
                        <Badge variant={e.type === "purchase" ? "default" : "secondary"} className="text-xs capitalize">{e.type}</Badge>
                      </td>
                      <td className={`py-2 text-right font-medium ${e.credit > 0 ? "text-green-600" : "text-destructive"}`}>
                        {e.credit > 0 ? "-" : "+"}PKR {Math.abs(e.debit > 0 ? e.debit : e.credit).toLocaleString("en-PK", { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-2 text-muted-foreground">{e.description ?? "—"}</td>
                    </tr>
                  ))}
                  {(ledgerData?.entries ?? []).length === 0 && (
                    <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No ledger entries</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Payment Dialog */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Pay Supplier — {ledgerSupplier?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1"><Label>Amount (PKR) *</Label><Input type="number" value={payAmount} onChange={(e) => setPayAmount(Number(e.target.value))} data-testid="input-pay-amount" /></div>
            <div className="space-y-1"><Label>Date</Label><Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} /></div>
            <div className="space-y-1"><Label>Notes</Label><Input value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="Payment reference..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayment(false)}>Cancel</Button>
            <Button onClick={handlePay} disabled={paySupplier.isPending} data-testid="button-confirm-payment">
              {paySupplier.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
