import { useState } from "react";
import { useGetSalesReport, getGetSalesReportQueryKey, useGetSale, getGetSaleQueryKey, useGetSettings } from "@workspace/api-client-react";
import type { SalesReport, SalesReportRow, SaleWithItems, SaleItem, Settings } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Printer, Search, BarChart2, Eye, X } from "lucide-react";
import { format, subDays } from "date-fns";

export default function SalesReportPage() {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [searched, setSearched] = useState(false);
  const [reprintSaleId, setReprintSaleId] = useState<number | null>(null);

  const params = { dateFrom, dateTo };

  const { data: report, isLoading, refetch } = useGetSalesReport(params, {
    query: {
      queryKey: getGetSalesReportQueryKey(params),
      enabled: searched,
    },
  });

  const { data: reprintSaleData, isLoading: reprintLoading } = useGetSale(
    reprintSaleId ?? 0,
    { query: { enabled: reprintSaleId !== null, queryKey: getGetSaleQueryKey(reprintSaleId ?? 0) } }
  );

  const { data: settingsData } = useGetSettings();
  const settings = settingsData as Settings | undefined;
  const reprintSale = reprintSaleData as SaleWithItems | undefined;

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
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
                ) : !searched ? (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Set date range and click Generate</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No data for this period</td></tr>
                ) : (
                  (rows as SalesReportRow[]).map((row, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3">{row.date}</td>
                      <td className="px-4 py-3 font-mono text-xs">{row.invoiceNo}</td>
                      <td className="px-4 py-3">{row.customerName ?? "Walk-in"}</td>
                      <td className="px-4 py-3 text-muted-foreground capitalize">{row.paymentMode}</td>
                      <td className="px-4 py-3 text-right font-medium">{Number(row.totalAmount).toLocaleString("en-PK", { maximumFractionDigits: 0 })}</td>
                      <td className="px-4 py-3 text-right text-destructive">{Number(row.discountAmount).toLocaleString("en-PK", { maximumFractionDigits: 0 })}</td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => setReprintSaleId(row.id)}
                        >
                          <Eye className="w-3 h-3 mr-1" />Reprint
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Past Receipt Reprint Modal */}
      {reprintSaleId !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:static print:bg-transparent print:p-0">
          <div className="bg-white dark:bg-card rounded-xl shadow-2xl w-full max-w-sm print:rounded-none print:shadow-none print:max-w-none">
            {reprintLoading || !reprintSale ? (
              <div className="p-8 text-center text-muted-foreground">Loading receipt...</div>
            ) : (
              <>
                <div className="receipt-print p-4 font-mono text-xs text-black bg-white">
                  <div className="text-center space-y-0.5">
                    <h2 className="font-bold text-base leading-tight">{settings?.pharmacyName ?? "PharmaCare"}</h2>
                    {settings?.address && <p className="text-[10px] leading-tight">{settings.address}</p>}
                    {settings?.phone && <p className="text-[10px] leading-tight">Tel: {settings.phone}</p>}
                    {settings?.ntn && <p className="text-[10px] leading-tight">NTN: {settings.ntn}</p>}
                    {settings?.strn && <p className="text-[10px] leading-tight">STRN: {settings.strn}</p>}
                    {settings?.drugLicense && <p className="text-[10px] leading-tight">Drug Lic#: {settings.drugLicense}</p>}
                    <p className="text-[9px] font-semibold border border-black inline-block px-2 py-0.5 mt-1">DUPLICATE COPY</p>
                  </div>
                  <div className="border-t border-dashed border-black my-2" />
                  <div className="text-[10px] space-y-0.5">
                    <div className="flex justify-between">
                      <span>Invoice#:</span>
                      <span className="font-bold">{reprintSale.invoiceNo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Date:</span>
                      <span>{reprintSale.date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Customer:</span>
                      <span>{reprintSale.customerName ?? "Walk-in"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Payment:</span>
                      <span className="capitalize">{reprintSale.paymentMode}</span>
                    </div>
                  </div>
                  <div className="border-t border-dashed border-black my-2" />
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="border-b border-dashed border-black">
                        <th className="text-left font-semibold pb-1">Item</th>
                        <th className="text-right font-semibold pb-1 pl-1">Qty</th>
                        <th className="text-right font-semibold pb-1 pl-1">Price</th>
                        <th className="text-right font-semibold pb-1 pl-1">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reprintSale.items.map((item: SaleItem, i: number) => (
                        <tr key={i} className="align-top">
                          <td className="py-0.5 pr-1">
                            <div className="leading-tight">{item.medicineName}</div>
                            {item.batchNo && <div className="text-[9px] opacity-70">B: {item.batchNo}</div>}
                          </td>
                          <td className="text-right py-0.5 pl-1">{Number(item.quantity)} {item.saleUnit === "pack" ? "pk" : "u"}</td>
                          <td className="text-right py-0.5 pl-1">{Number(item.salePrice).toFixed(2)}</td>
                          <td className="text-right py-0.5 pl-1">{Number(item.totalAmount).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="border-t border-dashed border-black my-2" />
                  <div className="text-[10px] space-y-0.5">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>PKR {Number(reprintSale.subtotal).toFixed(2)}</span>
                    </div>
                    {Number(reprintSale.discountAmount) > 0 && (
                      <div className="flex justify-between">
                        <span>Discount:</span>
                        <span>- PKR {Number(reprintSale.discountAmount).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-sm border-t border-black pt-1 mt-1">
                      <span>NET TOTAL:</span>
                      <span>PKR {Number(reprintSale.totalAmount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Paid:</span>
                      <span>PKR {Number(reprintSale.paidAmount).toFixed(2)}</span>
                    </div>
                    {Number(reprintSale.paidAmount) < Number(reprintSale.totalAmount) && (
                      <div className="flex justify-between">
                        <span>Balance Due:</span>
                        <span>PKR {(Number(reprintSale.totalAmount) - Number(reprintSale.paidAmount)).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                  {settings?.fbrEnabled && settings.fbrPosId && (
                    <>
                      <div className="border-t border-dashed border-black my-2" />
                      <div className="text-center text-[10px] leading-tight">
                        <p className="font-bold">FBR POS Invoice</p>
                        <p>POS ID: {settings.fbrPosId}</p>
                        {(reprintSale as SaleWithItems & { fbrInvoiceNo?: string }).fbrInvoiceNo && (
                          <p>FBR#: {(reprintSale as SaleWithItems & { fbrInvoiceNo?: string }).fbrInvoiceNo}</p>
                        )}
                      </div>
                    </>
                  )}
                  {settings?.receiptFooter && (
                    <>
                      <div className="border-t border-dashed border-black my-2" />
                      <p className="text-center text-[10px] leading-tight">{settings.receiptFooter}</p>
                    </>
                  )}
                  <div className="text-center text-[9px] opacity-70 mt-2">--- end of receipt ---</div>
                </div>
                <div className="flex gap-2 p-3 border-t no-print">
                  <Button size="sm" variant="outline" onClick={() => window.print()} className="flex-1">
                    <Printer className="w-3 h-3 mr-1" />Print
                  </Button>
                  <Button size="sm" onClick={() => setReprintSaleId(null)} className="flex-1">
                    <X className="w-3 h-3 mr-1" />Close
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
