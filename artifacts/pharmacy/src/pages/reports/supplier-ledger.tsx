import { useState } from "react";
import {
  useGetSupplierLedgerReport,
  getGetSupplierLedgerReportQueryKey,
  useListSuppliers,
} from "@workspace/api-client-react";
import type { SupplierLedgerReport } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Printer, BookOpen, Loader2 } from "lucide-react";
import { format, subDays } from "date-fns";

export default function SupplierLedgerPage() {
  const [supplierId, setSupplierId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 90), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [searched, setSearched] = useState(false);

  const { data: suppliers = [] } = useListSuppliers();
  const params = supplierId ? { supplierId: Number(supplierId), dateFrom, dateTo } : ({ supplierId: 0, dateFrom, dateTo } as { supplierId: number; dateFrom: string; dateTo: string });

  const { data, isLoading, refetch } = useGetSupplierLedgerReport(params, {
    query: { queryKey: getGetSupplierLedgerReportQueryKey(params), enabled: searched && !!supplierId },
  });
  const r = data as SupplierLedgerReport | undefined;

  const fmt = (n: number) => `PKR ${Number(n).toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><BookOpen className="h-8 w-8 text-purple-600" />Supplier Ledger</h1>
          <p className="text-sm text-muted-foreground">Statement of account for a supplier.</p>
        </div>
        <Button variant="outline" onClick={() => window.print()} disabled={!r}>
          <Printer className="h-4 w-4 mr-1" /> Print
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="sm:col-span-2">
            <Label>Supplier</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
              <SelectContent>
                {(suppliers as Array<{ id: number; name: string; contact?: string | null }>).map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.name}{s.contact ? ` — ${s.contact}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label>From</Label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></div>
          <div><Label>To</Label><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></div>
          <div className="sm:col-span-4">
            <Button onClick={() => { setSearched(true); refetch(); }} disabled={!supplierId} className="w-full sm:w-auto">
              <Search className="h-4 w-4 mr-1" /> Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading && <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>}

      {r && (
        <>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold">{r.supplier.name}</div>
                  <div className="text-xs text-muted-foreground">{r.supplier.contact ?? "—"}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Outstanding Payable</div>
                  <div className={`text-2xl font-bold ${r.closingBalance > 0 ? "text-red-600" : "text-green-600"}`}>{fmt(r.closingBalance)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-3 gap-4">
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Total Purchases</div><div className="text-xl font-bold">{fmt(r.totalPurchases)}</div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Total Paid</div><div className="text-xl font-bold text-green-600">{fmt(r.totalPaid)}</div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Returned</div><div className="text-xl font-bold">{fmt(r.totalReturned)}</div></CardContent></Card>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {r.entries.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No transactions</TableCell></TableRow>
                  )}
                  {r.entries.map((e, i) => (
                    <TableRow key={i}>
                      <TableCell>{e.date}</TableCell>
                      <TableCell>{e.type}</TableCell>
                      <TableCell className="text-xs">{e.reference}</TableCell>
                      <TableCell className="text-right">{e.debit > 0 ? fmt(e.debit) : "—"}</TableCell>
                      <TableCell className="text-right">{e.credit > 0 ? fmt(e.credit) : "—"}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(e.balance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
