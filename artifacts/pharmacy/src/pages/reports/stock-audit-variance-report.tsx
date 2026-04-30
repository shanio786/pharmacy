import { useState } from "react";
import { useGetStockAuditVarianceReport, getGetStockAuditVarianceReportQueryKey } from "@workspace/api-client-react";
import type { StockAuditVarianceReport } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Printer, ClipboardList, Loader2 } from "lucide-react";
import { format, subDays } from "date-fns";

export default function StockAuditVarianceReportPage() {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 90), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [searched, setSearched] = useState(false);
  const params = { dateFrom, dateTo };

  const { data, isLoading, refetch } = useGetStockAuditVarianceReport(params, {
    query: { queryKey: getGetStockAuditVarianceReportQueryKey(params), enabled: searched },
  });
  const r = data as StockAuditVarianceReport | undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><ClipboardList className="h-8 w-8 text-amber-600" />Stock Audit Variance</h1>
          <p className="text-sm text-muted-foreground">Surplus and shortages found during physical counts.</p>
        </div>
        <Button variant="outline" onClick={() => window.print()} disabled={!r}>
          <Printer className="h-4 w-4 mr-1" /> Print
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div><Label>From</Label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></div>
          <div><Label>To</Label><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></div>
          <div className="flex items-end">
            <Button onClick={() => { setSearched(true); refetch(); }} className="w-full">
              <Search className="h-4 w-4 mr-1" /> Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading && <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>}

      {r && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Total Items</div><div className="text-2xl font-bold">{r.totalEntries}</div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Variance Items</div><div className="text-2xl font-bold">{r.varianceCount}</div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Total Surplus</div><div className="text-2xl font-bold text-green-600">+{r.totalSurplus}</div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Total Shortage</div><div className="text-2xl font-bold text-red-600">-{r.totalShortage}</div></CardContent></Card>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Audit Date</TableHead>
                    <TableHead>Audit</TableHead>
                    <TableHead>Medicine</TableHead>
                    <TableHead className="text-right">System</TableHead>
                    <TableHead className="text-right">Counted</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {r.items.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No variances</TableCell></TableRow>
                  )}
                  {r.items.map((it, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs">{it.auditDate ? format(new Date(it.auditDate), "yyyy-MM-dd") : "—"}</TableCell>
                      <TableCell className="text-xs">{it.auditTitle ?? `#${it.auditId}`}</TableCell>
                      <TableCell>{it.medicineName ?? "—"}</TableCell>
                      <TableCell className="text-right">{it.systemQty}</TableCell>
                      <TableCell className="text-right">{it.countedQty}</TableCell>
                      <TableCell className={`text-right font-bold ${it.variance > 0 ? "text-green-600" : "text-red-600"}`}>{it.variance > 0 ? `+${it.variance}` : it.variance}</TableCell>
                      <TableCell className="text-xs">{it.reason ?? "—"}</TableCell>
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
