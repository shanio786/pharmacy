import { useState } from "react";
import {
  useListCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer,
  useGetCustomerLedger, useReceiveCustomerPayment,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Loader2, BookOpen, DollarSign } from "lucide-react";
import { format } from "date-fns";

interface CustomerForm {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  openingBalance?: number;
}

export default function CustomersPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<CustomerForm>({ name: "", openingBalance: 0 });
  const [ledgerCustomer, setLedgerCustomer] = useState<any>(null);
  const [showReceive, setShowReceive] = useState(false);
  const [recvAmount, setRecvAmount] = useState(0);
  const [recvDate, setRecvDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [recvNote, setRecvNote] = useState("");
  const [search, setSearch] = useState("");

  const { data: customers = [], isLoading } = useListCustomers();
  const { data: ledger } = useGetCustomerLedger(
    ledgerCustomer?.id ?? 0,
    {},
    { query: { enabled: !!ledgerCustomer } as any }
  );
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();
  const receivePayment = useReceiveCustomerPayment();

  const filtered = (customers as any[]).filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone ?? "").includes(search)
  );

  const openCreate = () => { setEditItem(null); setForm({ name: "", openingBalance: 0 }); setShowDialog(true); };
  const openEdit = (c: any) => {
    setEditItem(c);
    setForm({ name: c.name, phone: c.phone ?? "", email: c.email ?? "", address: c.address ?? "", openingBalance: c.openingBalance ?? 0 });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.name) { toast({ title: "Name is required", variant: "destructive" }); return; }
    try {
      if (editItem) {
        await updateCustomer.mutateAsync({ id: editItem.id, data: form });
        toast({ title: "Customer updated" });
      } else {
        await createCustomer.mutateAsync({ data: form });
        toast({ title: "Customer added" });
      }
      setShowDialog(false);
      qc.invalidateQueries();
    } catch (err: any) { toast({ title: "Error", description: err?.message, variant: "destructive" }); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this customer?")) return;
    try {
      await deleteCustomer.mutateAsync({ id });
      toast({ title: "Customer deleted" });
      qc.invalidateQueries();
    } catch (err: any) { toast({ title: "Error", description: err?.message, variant: "destructive" }); }
  };

  const handleReceive = async () => {
    if (!ledgerCustomer || recvAmount <= 0) { toast({ title: "Enter a valid amount", variant: "destructive" }); return; }
    try {
      await receivePayment.mutateAsync({ id: ledgerCustomer.id, data: { amount: recvAmount, date: recvDate, note: recvNote || null } });
      toast({ title: "Payment received" });
      setShowReceive(false);
      qc.invalidateQueries();
    } catch (err: any) { toast({ title: "Error", description: err?.message, variant: "destructive" }); }
  };

  const f = (field: keyof CustomerForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  const ledgerData = ledger as any;
  const balance = ledgerData?.balance ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Customers</h1>
          <p className="text-sm text-muted-foreground">Manage customers and their credit ledger</p>
        </div>
        <Button onClick={openCreate} data-testid="button-add-customer">
          <Plus className="w-4 h-4 mr-2" />Add Customer
        </Button>
      </div>

      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customers..." className="max-w-xs" data-testid="input-customer-search" />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Phone</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Address</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Balance (PKR)</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No customers found</td></tr>
                ) : (
                  filtered.map((c) => (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.phone ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground truncate max-w-[180px]">{c.address ?? "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <Badge variant={Number(c.balance) > 0 ? "destructive" : "secondary"}>
                          PKR {Number(c.balance ?? 0).toLocaleString("en-PK", { maximumFractionDigits: 0 })}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => setLedgerCustomer(c)} className="text-muted-foreground hover:text-primary p-1" title="View Ledger" data-testid={`button-ledger-customer-${c.id}`}>
                            <BookOpen className="w-4 h-4" />
                          </button>
                          <button onClick={() => openEdit(c)} className="text-muted-foreground hover:text-primary p-1" data-testid={`button-edit-customer-${c.id}`}>
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(c.id)} className="text-muted-foreground hover:text-destructive p-1" data-testid={`button-delete-customer-${c.id}`}>
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
          <DialogHeader><DialogTitle>{editItem ? "Edit Customer" : "Add Customer"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1"><Label>Name *</Label><Input value={form.name} onChange={f("name")} data-testid="input-customer-name" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Phone</Label><Input value={form.phone ?? ""} onChange={f("phone")} /></div>
              <div className="space-y-1"><Label>Email</Label><Input type="email" value={form.email ?? ""} onChange={f("email")} /></div>
            </div>
            <div className="space-y-1"><Label>Address</Label><Input value={form.address ?? ""} onChange={f("address")} /></div>
            <div className="space-y-1"><Label>Opening Balance (PKR)</Label><Input type="number" value={form.openingBalance ?? 0} onChange={(e) => setForm((p) => ({ ...p, openingBalance: Number(e.target.value) }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createCustomer.isPending || updateCustomer.isPending} data-testid="button-save-customer">
              {(createCustomer.isPending || updateCustomer.isPending) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {editItem ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ledger Sheet */}
      <Sheet open={!!ledgerCustomer} onOpenChange={(o) => { if (!o) setLedgerCustomer(null); }}>
        <SheetContent className="w-[520px] sm:w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Ledger — {ledgerCustomer?.name}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Outstanding Balance</p>
                <p className={`text-2xl font-bold ${balance > 0 ? "text-destructive" : "text-primary"}`}>
                  PKR {Math.abs(balance).toLocaleString("en-PK", { maximumFractionDigits: 0 })}
                  {balance > 0 ? " (Receivable)" : balance < 0 ? " (Advance)" : " (Clear)"}
                </p>
              </div>
              <Button size="sm" onClick={() => { setRecvAmount(0); setRecvDate(format(new Date(), "yyyy-MM-dd")); setRecvNote(""); setShowReceive(true); }} data-testid="button-receive-payment">
                <DollarSign className="w-4 h-4 mr-2" />Receive Payment
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
                  {(ledgerData?.entries ?? []).map((e: any, i: number) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2">{e.date}</td>
                      <td className="py-2">
                        <Badge variant={e.type === "sale" ? "default" : "secondary"} className="text-xs capitalize">{e.type}</Badge>
                      </td>
                      <td className={`py-2 text-right font-medium ${e.type === "payment" ? "text-green-600" : "text-destructive"}`}>
                        {e.type === "payment" ? "-" : "+"}PKR {Math.abs(Number(e.amount)).toLocaleString("en-PK", { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-2 text-muted-foreground">{e.notes ?? "—"}</td>
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

      {/* Receive Payment Dialog */}
      <Dialog open={showReceive} onOpenChange={setShowReceive}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Receive Payment — {ledgerCustomer?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1"><Label>Amount (PKR) *</Label><Input type="number" value={recvAmount} onChange={(e) => setRecvAmount(Number(e.target.value))} data-testid="input-recv-amount" /></div>
            <div className="space-y-1"><Label>Date</Label><Input type="date" value={recvDate} onChange={(e) => setRecvDate(e.target.value)} /></div>
            <div className="space-y-1"><Label>Notes</Label><Input value={recvNote} onChange={(e) => setRecvNote(e.target.value)} placeholder="Payment reference..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReceive(false)}>Cancel</Button>
            <Button onClick={handleReceive} disabled={receivePayment.isPending} data-testid="button-confirm-receive">
              {receivePayment.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Receive Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
