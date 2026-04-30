import { useState } from "react";
import { useGetExpiryReport } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Printer, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

function getDaysLeft(expiryDate: string) {
  return Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function ExpiryReportPage() {
  const [daysAhead, setDaysAhead] = useState("90");

  const { data: items = [], isLoading } = useGetExpiryReport({ daysAhead: Number(daysAhead) });

  const getColor = (daysLeft: number) => {
    if (daysLeft < 0) return "destructive";
    if (daysLeft <= 30) return "destructive";
    if (daysLeft <= 90) return "secondary";
    return "outline";
  };

  const totalValue = (items as any[]).reduce((acc, it) => acc + (it.quantityUnits * it.salePrice), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Expiry Report</h1>
          <p className="text-sm text-muted-foreground">Medicines approaching expiry dates</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-2" />Print
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="space-y-1">
          <Label>Show medicines expiring within:</Label>
          <Select value={daysAhead} onValueChange={setDaysAhead}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 Days</SelectItem>
              <SelectItem value="60">60 Days</SelectItem>
              <SelectItem value="90">90 Days</SelectItem>
              <SelectItem value="180">180 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {!isLoading && (
          <div className="mt-5 text-sm text-muted-foreground">
            {(items as any[]).length} batches found · Est. value PKR {totalValue.toLocaleString("en-PK", { maximumFractionDigits: 0 })}
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Expiry Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Medicine</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Company</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Batch#</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Expiry Date</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Days Left</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Qty</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Value (PKR)</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
                ) : (items as any[]).length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No medicines expiring in the selected period</td></tr>
                ) : (
                  (items as any[]).map((item, i) => {
                    const daysLeft = getDaysLeft(item.expiryDate);
                    return (
                      <tr key={i} className={cn("border-b last:border-0 hover:bg-muted/20", daysLeft < 0 ? "bg-red-50/30 dark:bg-red-950/10" : daysLeft <= 30 ? "bg-orange-50/30" : "")}>
                        <td className="px-4 py-3 font-medium">{item.medicineName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{item.companyName ?? "—"}</td>
                        <td className="px-4 py-3 font-mono text-xs">{item.batchNo}</td>
                        <td className="px-4 py-3">{item.expiryDate}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={getColor(daysLeft) as any}>
                            {daysLeft < 0 ? `${Math.abs(daysLeft)}d expired` : `${daysLeft}d`}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">{item.quantityUnits}</td>
                        <td className="px-4 py-3 text-right font-medium">
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
