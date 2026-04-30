import { useState } from "react";
import { useGetProfitLossReport } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Printer, Search, TrendingUp } from "lucide-react";
import { format, subDays } from "date-fns";

export default function ProfitLossPage() {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [searched, setSearched] = useState(false);

  const { data: report, isLoading, refetch } = useGetProfitLossReport(
    { dateFrom, dateTo },
    { query: { enabled: searched } as any }
  );

  const handleSearch = () => { setSearched(true); refetch(); };

  const reportData = report as any;
  const summary = reportData?.summary;
  const rows = reportData?.rows ?? [];

  const profitPercent = summary
    ? ((Number(summary.grossProfit) / Math.max(Number(summary.totalRevenue), 1)) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Profit & Loss Report</h1>
          <p className="text-sm text-muted-foreground">Financial performance overview</p>
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
            <Button onClick={handleSearch} data-testid="button-pl-generate">
              <Search className="w-4 h-4 mr-2" />Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      {summary && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-green-200 dark:border-green-800">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Revenue</p>
                <p className="text-xl font-bold text-green-600 mt-1">PKR {Number(summary.totalRevenue).toLocaleString("en-PK", { maximumFractionDigits: 0 })}</p>
              </CardContent>
            </Card>
            <Card className="border-red-200 dark:border-red-800">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total COGS</p>
                <p className="text-xl font-bold text-red-500 mt-1">PKR {Number(summary.totalCOGS).toLocaleString("en-PK", { maximumFractionDigits: 0 })}</p>
              </CardContent>
            </Card>
            <Card className="border-primary/30">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Gross Profit</p>
                <p className="text-xl font-bold text-primary mt-1">PKR {Number(summary.grossProfit).toLocaleString("en-PK", { maximumFractionDigits: 0 })}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Profit Margin</p>
                <p className="text-xl font-bold mt-1">{profitPercent}%</p>
              </CardContent>
            </Card>
          </div>

          {rows.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />Revenue vs Cost Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={rows}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => [`PKR ${Number(v).toLocaleString()}`, ""]} />
                    <Legend />
                    <Bar dataKey="revenue" name="Revenue" fill="hsl(142 70% 38%)" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="cogs" name="COGS" fill="hsl(0 84% 60%)" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="profit" name="Profit" fill="hsl(198 75% 45%)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Period</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Revenue</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">COGS</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Gross Profit</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Margin%</th>
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
                  rows.map((row: any, i: number) => {
                    const margin = ((Number(row.profit) / Math.max(Number(row.revenue), 1)) * 100).toFixed(1);
                    return (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium">{row.label}</td>
                        <td className="px-4 py-3 text-right text-green-600">{Number(row.revenue).toLocaleString("en-PK", { maximumFractionDigits: 0 })}</td>
                        <td className="px-4 py-3 text-right text-destructive">{Number(row.cogs).toLocaleString("en-PK", { maximumFractionDigits: 0 })}</td>
                        <td className="px-4 py-3 text-right font-medium text-primary">{Number(row.profit).toLocaleString("en-PK", { maximumFractionDigits: 0 })}</td>
                        <td className="px-4 py-3 text-right">{margin}%</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
