import { useState } from "react";
import { useGetSalesReport, getGetSalesReportQueryKey } from "@workspace/api-client-react";
import type { SalesReport, SalesReportRow } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Printer, Search, BarChart2 } from "lucide-react";
import { format, subDays } from "date-fns";

export default function SalesReportPage() {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [searched, setSearched] = useState(false);

  const params = { dateFrom, dateTo };

  const { data: report, isLoading, refetch } = useGetSalesReport(params, {
    query: {
      queryKey: getGetSalesReportQueryKey(params),
      enabled: searched,
    },
  });

  const handleSearch = () => { setSearched(true); refetch(); };

  const typedReport = report as SalesReport | undefined;
  const rows = typedReport?.rows ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Sales Report</h1>
          <p className="text-sm text-muted-foreground">Detailed sales analysis with date range</p>
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
            <Button onClick={handleSearch} data-testid="button-sales-report-search">
              <Search className="w-4 h-4 mr-2" />Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      {typedReport && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Sales", value: `PKR ${Number(typedReport.totalSales).toLocaleString("en-PK", { maximumFractionDigits: 0 })}` },
            { label: "Net Sales", value: `PKR ${Number(typedReport.netSales).toLocaleString("en-PK", { maximumFractionDigits: 0 })}` },
            { label: "Invoices", value: typedReport.saleCount },
            { label: "Total Discount", value: `PKR ${Number(typedReport.totalDiscount).toLocaleString("en-PK", { maximumFractionDigits: 0 })}` },
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
            <BarChart2 className="w-4 h-4 text-primary" />
            Sales Data
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Invoice#</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customer</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Payment</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount (PKR)</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Discount</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
                ) : !searched ? (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Set date range and click Generate</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No data for this period</td></tr>
                ) : (
                  (rows as SalesReportRow[]).map((row, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3">{row.date}</td>
                      <td className="px-4 py-3 font-mono text-xs">{row.invoiceNo}</td>
                      <td className="px-4 py-3">{row.customerName ?? "Walk-in"}</td>
                      <td className="px-4 py-3 text-muted-foreground capitalize">{row.paymentMode}</td>
                      <td className="px-4 py-3 text-right font-medium">{Number(row.totalAmount).toLocaleString("en-PK", { maximumFractionDigits: 0 })}</td>
                      <td className="px-4 py-3 text-right text-destructive">{Number(row.discountAmount).toLocaleString("en-PK", { maximumFractionDigits: 0 })}</td>
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
