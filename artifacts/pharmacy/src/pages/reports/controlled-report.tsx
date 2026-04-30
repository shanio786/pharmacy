import { useState } from "react";
import { useGetControlledDrugsReport } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Printer, Search, Shield } from "lucide-react";
import { format, subDays } from "date-fns";

export default function ControlledReportPage() {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [searched, setSearched] = useState(false);

  const { data: report, isLoading, refetch } = useGetControlledDrugsReport(
    { dateFrom, dateTo },
    { query: { enabled: searched } }
  );

  const handleSearch = () => { setSearched(true); refetch(); };

  const rows = (report as any)?.rows ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Controlled Drugs Report</h1>
          <p className="text-sm text-muted-foreground">Schedule / controlled drug sales for regulatory compliance</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-2" />Print
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-end gap-3 flex-wrap">
            <div className="space-y-1"><Label>From</Label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36" /></div>
            <div className="space-y-1"><Label>To</Label><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36" /></div>
            <Button onClick={handleSearch} data-testid="button-controlled-report-generate">
              <Search className="w-4 h-4 mr-2" />Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />Controlled Drug Sales
            {!isLoading && searched && <Badge variant="secondary">{rows.length} records</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Invoice#</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Medicine</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customer</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Qty</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Batch#</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Prescription Note</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
                ) : !searched ? (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Set date range and click Generate</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No controlled drug sales in this period</td></tr>
                ) : (
                  rows.map((row: any, i: number) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3">{row.date}</td>
                      <td className="px-4 py-3 font-mono text-xs">{row.invoiceNo}</td>
                      <td className="px-4 py-3 font-medium">
                        {row.medicineName}
                        <Badge variant="destructive" className="ml-2 text-xs">Ctrl</Badge>
                      </td>
                      <td className="px-4 py-3">{row.customerName ?? "Walk-in"}</td>
                      <td className="px-4 py-3 text-center font-medium">{row.quantity} {row.saleUnit}</td>
                      <td className="px-4 py-3 font-mono text-xs">{row.batchNo ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.prescriptionNote ?? "—"}</td>
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
