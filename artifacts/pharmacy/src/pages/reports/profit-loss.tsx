import { useState } from "react";
import { useGetProfitLossReport, getGetProfitLossReportQueryKey } from "@workspace/api-client-react";
import type { ProfitLossReport } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Printer, Search, TrendingUp } from "lucide-react";
import { format, subDays } from "date-fns";

export default function ProfitLossPage() {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [searched, setSearched] = useState(false);

  const params = { dateFrom, dateTo };

  const { data: report, isLoading, refetch } = useGetProfitLossReport(params, {
    query: {
      queryKey: getGetProfitLossReportQueryKey(params),
      enabled: searched,
    },
  });

  const handleSearch = () => { setSearched(true); refetch(); };

  const r = report as ProfitLossReport | undefined;

  const fmt = (n: number | undefined) =>
    `PKR ${Number(n ?? 0).toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Profit &amp; Loss Report</h1>
          <p className="text-sm text-muted-foreground">Financial performance overview</p>
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
            <Button onClick={handleSearch} data-testid="button-pl-generate">
              <Search className="w-4 h-4 mr-2" />Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading && searched && (
        <p className="text-center text-muted-foreground py-8">Loading...</p>
      )}

      {!searched && (
        <p className="text-center text-muted-foreground py-8">Set date range and click Generate</p>
      )}

      {r && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card className="border-green-200 dark:border-green-800">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Revenue</p>
                <p className="text-xl font-bold text-green-600 mt-1">{fmt(r.revenue)}</p>
              </CardContent>
            </Card>
            <Card className="border-red-200 dark:border-red-800">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Cost of Goods (COGS)</p>
                <p className="text-xl font-bold text-red-500 mt-1">{fmt(r.costOfGoods)}</p>
              </CardContent>
            </Card>
            <Card className="border-primary/30">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Gross Profit</p>
                <p className="text-xl font-bold text-primary mt-1">{fmt(r.grossProfit)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Gross Margin</p>
                <p className="text-xl font-bold mt-1">{Number(r.grossMargin).toFixed(1)}%</p>
              </CardContent>
            </Card>
            <Card className="border-orange-200 dark:border-orange-800">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Sale Returns</p>
                <p className="text-xl font-bold text-orange-500 mt-1">{fmt(r.saleReturnsAmount)}</p>
              </CardContent>
            </Card>
            <Card className="border-primary/30">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Net Profit
                </p>
                <p className={`text-xl font-bold mt-1 ${r.netProfit >= 0 ? "text-primary" : "text-destructive"}`}>
                  {fmt(r.netProfit)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <tbody>
                  {[
                    { label: "Revenue (Gross Sales)", value: r.revenue, color: "text-green-600" },
                    { label: "Cost of Goods Sold", value: -r.costOfGoods, color: "text-destructive" },
                    { label: "Gross Profit", value: r.grossProfit, color: "text-primary", bold: true },
                    { label: "Sale Returns", value: -r.saleReturnsAmount, color: "text-orange-500" },
                    { label: "Net Profit", value: r.netProfit, color: r.netProfit >= 0 ? "text-primary" : "text-destructive", bold: true },
                  ].map((row) => (
                    <tr key={row.label} className="border-b last:border-0">
                      <td className={`px-4 py-3 ${row.bold ? "font-semibold" : ""}`}>{row.label}</td>
                      <td className={`px-4 py-3 text-right font-medium ${row.color} ${row.bold ? "font-semibold" : ""}`}>
                        {row.value < 0 ? `(${fmt(-row.value)})` : fmt(row.value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
