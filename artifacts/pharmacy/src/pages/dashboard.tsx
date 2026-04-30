import { useGetDashboardSummary, useGetSalesChart, useGetExpiringMedicines, useGetLowStockMedicines } from "@workspace/api-client-react";
import type { SalesChartPoint, ExpiringBatch, MedicineWithStock } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ShoppingCart, PackagePlus, Pill, AlertTriangle, Clock, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function KpiCard({
  title,
  value,
  icon: Icon,
  color,
  isLoading,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  isLoading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{title}</p>
            {isLoading ? (
              <Skeleton className="h-7 w-24 mt-1" />
            ) : (
              <p className="text-2xl font-bold mt-0.5" data-testid={`kpi-${title.toLowerCase().replace(/\s+/g, "-")}`}>
                {value}
              </p>
            )}
          </div>
          <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: summary, isLoading } = useGetDashboardSummary();
  const { data: salesChart, isLoading: chartLoading } = useGetSalesChart({ days: 30 });
  const { data: expiringItems = [], isLoading: expiryLoading } = useGetExpiringMedicines({ days: 90 });
  const { data: lowStockItems = [], isLoading: lowLoading } = useGetLowStockMedicines();

  const formatCurrency = (v: number) =>
    `PKR ${Number(v).toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of pharmacy activity</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard
          title="Today's Sales"
          value={isLoading ? "..." : formatCurrency(Number(summary?.todaySales ?? 0))}
          icon={ShoppingCart}
          color="bg-green-500"
          isLoading={isLoading}
        />
        <KpiCard
          title="Today's Purchases"
          value={isLoading ? "..." : formatCurrency(Number(summary?.todayPurchases ?? 0))}
          icon={PackagePlus}
          color="bg-blue-500"
          isLoading={isLoading}
        />
        <KpiCard
          title="Total Medicines"
          value={isLoading ? "..." : String(summary?.totalMedicines ?? 0)}
          icon={Pill}
          color="bg-purple-500"
          isLoading={isLoading}
        />
        <KpiCard
          title="Low Stock Items"
          value={isLoading ? "..." : String(summary?.lowStockCount ?? 0)}
          icon={AlertTriangle}
          color="bg-orange-500"
          isLoading={isLoading}
        />
        <KpiCard
          title="Expiring Soon"
          value={isLoading ? "..." : String(summary?.expiringCount ?? 0)}
          icon={Clock}
          color="bg-red-500"
          isLoading={isLoading}
        />
      </div>

      {/* Sales Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Sales – Last 30 Days
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartLoading ? (
            <Skeleton className="h-52 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={(salesChart as SalesChartPoint[]) ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(d) => d.slice(5)}
                />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v: number) => [`PKR ${Number(v).toLocaleString()}`, "Sales"]}
                  labelFormatter={(l) => `Date: ${l}`}
                />
                <Bar dataKey="amount" fill="hsl(142 70% 38%)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Bottom Tables */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Expiring Soon */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-red-500" />
              Expiring Soon (90 days)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {expiryLoading ? (
              <div className="p-4 space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">Medicine</th>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">Expiry</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(expiringItems as ExpiringBatch[]).slice(0, 8).map((item: ExpiringBatch, idx: number) => {
                      const daysLeft = Math.ceil(
                        (new Date(item.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                      );
                      return (
                        <tr key={idx} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-2 font-medium truncate max-w-[140px]">{item.medicineName}</td>
                          <td className="px-4 py-2">
                            <Badge
                              variant={daysLeft <= 30 ? "destructive" : "secondary"}
                              className="text-xs"
                            >
                              {item.expiryDate}
                            </Badge>
                          </td>
                          <td className="px-4 py-2 text-right text-muted-foreground">{item.quantityUnits}</td>
                        </tr>
                      );
                    })}
                    {(expiringItems as ExpiringBatch[]).length === 0 && (
                      <tr><td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">No medicines expiring soon</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              Low Stock Items
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {lowLoading ? (
              <div className="p-4 space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">Medicine</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(lowStockItems as MedicineWithStock[]).slice(0, 8).map((item: MedicineWithStock, idx: number) => (
                      <tr key={idx} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-2 font-medium truncate max-w-[200px]">{item.name}</td>
                        <td className="px-4 py-2 text-right">
                          <Badge variant={item.totalUnits === 0 ? "destructive" : "secondary"}>
                            {item.totalUnits} units
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {(lowStockItems as MedicineWithStock[]).length === 0 && (
                      <tr><td colSpan={2} className="px-4 py-6 text-center text-muted-foreground">All medicines are well stocked</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
