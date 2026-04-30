import { useState } from "react";
import { useGetSalesReport } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Search, BarChart2 } from "lucide-react";
import { format, subDays } from "date-fns";

export default function SalesReportPage() {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [groupBy, setGroupBy] = useState("day");
  const [searched, setSearched] = useState(false);

  const { data: report, isLoading, refetch } = useGetSalesReport(
    { dateFrom, dateTo, groupBy },
    { query: { enabled: searched } as any }
  );

  const handleSearch = () => { setSearched(true); refetch(); };

  const reportData = report as any;
  const summary = reportData?.summary;
  const rows = reportData?.rows ?? [];

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
            <div className="space-y-1">
              <Label>Group By</Label>
              <Select value={groupBy} onValueChange={setGroupBy}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="medicine">Medicine</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSearch} data-testid="button-sales-report-search">
              <Search className="w-4 h-4 mr-2" />Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Revenue", value: `PKR ${Number(summary.totalRevenue).toLocaleString("en-PK", { maximumFractionDigits: 0 })}` },
            { label: "Total Invoices", value: summary.totalInvoices },
            { label: "Total Discount", value: `PKR ${Number(summary.totalDiscount).toLocaleString("en-PK", { maximumFractionDigits: 0 })}` },
            { label: "Avg. Sale Value", value: `PKR ${Number(summary.avgSaleValue).toLocaleString("en-PK", { maximumFractionDigits: 0 })}` },
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
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">{groupBy === "day" ? "Date" : groupBy === "medicine" ? "Medicine" : "Customer"}</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Qty Sold</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Revenue (PKR)</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Discount (PKR)</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Net (PKR)</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
                ) : !searched ? (
                  <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Set date range and click Generate</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No data for this period</td></tr>
                ) : (
                  rows.map((row: any, i: number) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{row.label}</td>
                      <td className="px-4 py-3 text-right">{row.qtySold ?? "—"}</td>
                      <td className="px-4 py-3 text-right">{Number(row.revenue).toLocaleString("en-PK", { maximumFractionDigits: 0 })}</td>
                      <td className="px-4 py-3 text-right text-destructive">{Number(row.discount).toLocaleString("en-PK", { maximumFractionDigits: 0 })}</td>
                      <td className="px-4 py-3 text-right font-medium text-primary">{Number(row.net).toLocaleString("en-PK", { maximumFractionDigits: 0 })}</td>
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
