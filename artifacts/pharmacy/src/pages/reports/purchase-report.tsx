import { useState } from "react";
import { useGetPurchaseReport, useListSuppliers, getGetPurchaseReportQueryKey } from "@workspace/api-client-react";
import type { PurchaseReport, PurchaseReportRow, Supplier } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Search, Receipt } from "lucide-react";
import { format, subDays } from "date-fns";

export default function PurchaseReportPage() {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [supplierId, setSupplierId] = useState("all");
  const [searched, setSearched] = useState(false);

  const params = {
    dateFrom,
    dateTo,
    supplierId: supplierId !== "all" ? Number(supplierId) : undefined,
  };

  const { data: report, isLoading, refetch } = useGetPurchaseReport(params, {
    query: {
      queryKey: getGetPurchaseReportQueryKey(params),
      enabled: searched,
    },
  });
  const { data: suppliers = [] } = useListSuppliers();

  const handleSearch = () => { setSearched(true); refetch(); };

  const typedReport = report as PurchaseReport | undefined;
  const rows = typedReport?.rows ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Purchase Report</h1>
          <p className="text-sm text-muted-foreground">Purchase history and supplier analysis</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-2" />Print
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-end gap-3 flex-wrap">
            <div className="space-y-1">
              <Label>From</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36" />
            </div>
            <div className="space-y-1">
              <Label>To</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36" />
            </div>
            <div className="space-y-1">
              <Label>Supplier</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  {(suppliers as Supplier[]).map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSearch} data-testid="button-purchase-report-generate">
              <Search className="w-4 h-4 mr-2" />Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      {typedReport && (
        <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
          {[
            { label: "Total Purchases", value: `PKR ${Number(typedReport.totalPurchases).toLocaleString("en-PK", { maximumFractionDigits: 0 })}` },
            { label: "Total GRNs", value: typedReport.purchaseCount },
          ].map((kpi) => (
            <Card key={kpi.label}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{kpi.label}</p>
                <p className="text-xl font-bold mt-1 text-primary">{kpi.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" />Purchase History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Invoice#</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Supplier</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount (PKR)</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
                ) : !searched ? (
                  <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">Set date range and click Generate</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">No data for this period</td></tr>
                ) : (
                  (rows as PurchaseReportRow[]).map((row, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3">{row.date}</td>
                      <td className="px-4 py-3 font-mono text-xs">{row.invoiceNo ?? "—"}</td>
                      <td className="px-4 py-3">{row.supplierName ?? "Direct"}</td>
                      <td className="px-4 py-3 text-right font-medium">{Number(row.totalAmount).toLocaleString("en-PK", { maximumFractionDigits: 0 })}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
