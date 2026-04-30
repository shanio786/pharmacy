import { useState } from "react";
import { useGetExpiringMedicines } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Clock, Printer, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

function getDaysLeft(expiryDate: string) {
  return Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function ExpiryAlertsPage() {
  const [days, setDays] = useState("90");
  const { data: items = [], isLoading } = useGetExpiringMedicines({ days: Number(days) });

  const expired = (items as any[]).filter((i) => getDaysLeft(i.expiryDate) < 0);
  const critical = (items as any[]).filter((i) => getDaysLeft(i.expiryDate) >= 0 && getDaysLeft(i.expiryDate) <= 30);
  const warning = (items as any[]).filter((i) => getDaysLeft(i.expiryDate) > 30 && getDaysLeft(i.expiryDate) <= 90);
  const safe = (items as any[]).filter((i) => getDaysLeft(i.expiryDate) > 90);

  const getColor = (daysLeft: number) => {
    if (daysLeft < 0) return "destructive";
    if (daysLeft <= 30) return "destructive";
    if (daysLeft <= 90) return "secondary";
    return "outline";
  };

  const getRowClass = (daysLeft: number) => {
    if (daysLeft < 0) return "bg-red-50/50 dark:bg-red-950/20";
    if (daysLeft <= 30) return "bg-orange-50/50 dark:bg-orange-950/20";
    if (daysLeft <= 90) return "bg-yellow-50/50 dark:bg-yellow-950/20";
    return "";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Expiry Alerts</h1>
          <p className="text-sm text-muted-foreground">Monitor medicines approaching expiry</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-2" />Print Report
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-red-50 dark:bg-red-950/20 p-4">
          <div className="text-xs text-red-600 font-medium uppercase tracking-wide">Expired</div>
          <div className="text-2xl font-bold text-red-600 mt-1">{expired.length}</div>
        </div>
        <div className="rounded-xl border bg-orange-50 dark:bg-orange-950/20 p-4">
          <div className="text-xs text-orange-600 font-medium uppercase tracking-wide">Critical (≤30 days)</div>
          <div className="text-2xl font-bold text-orange-600 mt-1">{critical.length}</div>
        </div>
        <div className="rounded-xl border bg-yellow-50 dark:bg-yellow-950/20 p-4">
          <div className="text-xs text-yellow-700 font-medium uppercase tracking-wide">Warning (31-90 days)</div>
          <div className="text-2xl font-bold text-yellow-700 mt-1">{warning.length}</div>
        </div>
        <div className="rounded-xl border bg-green-50 dark:bg-green-950/20 p-4">
          <div className="text-xs text-green-600 font-medium uppercase tracking-wide">Safe ({">"}90 days)</div>
          <div className="text-2xl font-bold text-green-600 mt-1">{safe.length}</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Label className="text-sm">Show expiring within:</Label>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-40" data-testid="select-expiry-days">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">30 Days</SelectItem>
            <SelectItem value="60">60 Days</SelectItem>
            <SelectItem value="90">90 Days</SelectItem>
            <SelectItem value="180">180 Days</SelectItem>
            <SelectItem value="365">1 Year</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {isLoading ? "Loading..." : `${(items as any[]).length} batches found`}
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Medicine</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Batch#</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Expiry Date</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Days Left</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Qty (Units)</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Rack</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Value (PKR)</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
                ) : (items as any[]).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12">
                      <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">No medicines expiring within {days} days</p>
                    </td>
                  </tr>
                ) : (
                  (items as any[]).map((item) => {
                    const daysLeft = getDaysLeft(item.expiryDate);
                    return (
                      <tr
                        key={`${item.medicineId}-${item.batchNo}`}
                        className={cn("border-b last:border-0", getRowClass(daysLeft))}
                        data-testid={`expiry-row-${item.medicineId}`}
                      >
                        <td className="px-4 py-3 font-medium">{item.medicineName}</td>
                        <td className="px-4 py-3 font-mono text-xs">{item.batchNo}</td>
                        <td className="px-4 py-3">{item.expiryDate}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={getColor(daysLeft) as any}>
                            {daysLeft < 0 ? `${Math.abs(daysLeft)}d expired` : `${daysLeft}d`}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">{item.quantityUnits}</td>
                        <td className="px-4 py-3 text-muted-foreground">{item.rackName ?? "—"}</td>
                        <td className="px-4 py-3 text-right">
                          {(item.quantityUnits * item.salePrice).toLocaleString("en-PK", { maximumFractionDigits: 0 })}
                        </td>
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
