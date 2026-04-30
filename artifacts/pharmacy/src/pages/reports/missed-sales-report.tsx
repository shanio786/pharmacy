import { useState } from "react";
import { useGetMissedSalesReport, getGetMissedSalesReportQueryKey } from "@workspace/api-client-react";
import type { MissedSalesReport } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Printer, AlertCircle, Loader2 } from "lucide-react";
import { format, subDays } from "date-fns";

export default function MissedSalesReportPage() {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [searched, setSearched] = useState(false);
  const params = { dateFrom, dateTo };

  const { data, isLoading, refetch } = useGetMissedSalesReport(params, {
    query: { queryKey: getGetMissedSalesReportQueryKey(params), enabled: searched },
  });
  const report = data as MissedSalesReport | undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><AlertCircle className="h-8 w-8 text-orange-600" />Missed Sales Report</h1>
          <p className="text-sm text-muted-foreground">Top medicines requested but unavailable.</p>
        </div>
        <Button variant="outline" onClick={() => window.print()} disabled={!report}>
          <Printer className="h-4 w-4 mr-1" /> Print
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label>From</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <Label>To</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button onClick={() => { setSearched(true); refetch(); }} className="w-full">
              <Search className="h-4 w-4 mr-1" /> Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading && <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>}

      {report && (
        <>
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold mb-3">Top Missed Items</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Medicine</TableHead>
                    <TableHead>Generic</TableHead>
                    <TableHead className="text-right">Total Demanded</TableHead>
                    <TableHead className="text-right">Occurrences</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.summary.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No data</TableCell></TableRow>
                  )}
                  {report.summary.map((s, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{s.medicineName}</TableCell>
                      <TableCell>{s.genericName ?? "—"}</TableCell>
                      <TableCell className="text-right">{s.totalDemanded}</TableCell>
                      <TableCell className="text-right">{s.occurrences}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold mb-3">All Entries</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Medicine</TableHead>
                    <TableHead>Generic</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.entries.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No entries</TableCell></TableRow>
                  )}
                  {report.entries.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>{e.date}</TableCell>
                      <TableCell>{e.medicineName}</TableCell>
                      <TableCell>{e.genericName ?? "—"}</TableCell>
                      <TableCell className="text-right">{e.quantityDemanded}</TableCell>
                      <TableCell className="text-xs">{e.customerNote ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
