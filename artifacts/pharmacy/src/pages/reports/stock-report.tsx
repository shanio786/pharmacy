import { useState } from "react";
import {
  useGetStockReport, useListCategories, useListCompanies,
  getGetStockReportQueryKey,
} from "@workspace/api-client-react";
import type { StockReportItem, Category, Company } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Printer, Search, Boxes } from "lucide-react";

export default function StockReportPage() {
  const [categoryId, setCategoryId] = useState("all");
  const [companyId, setCompanyId] = useState("all");
  const [showPacks, setShowPacks] = useState(false);
  const [searched, setSearched] = useState(false);

  const params = {
    categoryId: categoryId !== "all" ? Number(categoryId) : undefined,
    companyId: companyId !== "all" ? Number(companyId) : undefined,
    showPackQty: showPacks,
  };

  const { data: rows = [], isLoading, refetch } = useGetStockReport(params, {
    query: {
      queryKey: getGetStockReportQueryKey(params),
      enabled: searched,
    },
  });
  const { data: categories = [] } = useListCategories();
  const { data: companies = [] } = useListCompanies();

  const handleSearch = () => { setSearched(true); refetch(); };

  const typedRows = rows as StockReportItem[];
  const totalValue = typedRows.reduce((acc, r) => acc + Number(r.stockValue), 0);
  const colCount = showPacks ? 5 : 4;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Stock Report</h1>
          <p className="text-sm text-muted-foreground">Current inventory levels and values</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-2" />Print
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-end gap-3 flex-wrap">
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {(categories as Category[]).map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Company</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {(companies as Company[]).map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={showPacks} onCheckedChange={setShowPacks} />
              <Label>Show Pack Qty</Label>
            </div>
            <Button onClick={handleSearch} data-testid="button-stock-report-generate">
              <Search className="w-4 h-4 mr-2" />Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      {searched && typedRows.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Medicines</p>
              <p className="text-2xl font-bold text-primary mt-1">{typedRows.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Stock Value</p>
              <p className="text-2xl font-bold text-primary mt-1">
                PKR {totalValue.toLocaleString("en-PK", { maximumFractionDigits: 0 })}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Zero Stock Items</p>
              <p className="text-2xl font-bold text-orange-500 mt-1">
                {typedRows.filter((r) => r.totalUnits === 0).length}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Boxes className="w-4 h-4 text-primary" />
            Stock Inventory
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Medicine</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Category / Company</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Stock (Units)</th>
                  {showPacks && <th className="text-right px-4 py-3 font-medium text-muted-foreground">Stock (Packs)</th>}
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Value (PKR)</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={colCount} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
                ) : !searched ? (
                  <tr><td colSpan={colCount} className="text-center py-8 text-muted-foreground">Click Generate to view stock report</td></tr>
                ) : typedRows.length === 0 ? (
                  <tr><td colSpan={colCount} className="text-center py-8 text-muted-foreground">No stock data found</td></tr>
                ) : (
                  typedRows.map((row) => (
                    <tr key={row.medicineId} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{row.medicineName}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {row.categoryName ?? "—"} · {row.companyName ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Badge variant={row.totalUnits === 0 ? "destructive" : "secondary"}>{row.totalUnits}</Badge>
                      </td>
                      {showPacks && <td className="px-4 py-3 text-right text-muted-foreground">{row.totalPacks}</td>}
                      <td className="px-4 py-3 text-right font-medium">
                        {Number(row.stockValue).toLocaleString("en-PK", { maximumFractionDigits: 0 })}
                      </td>
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
