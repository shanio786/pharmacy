import app from "./app";
import { logger } from "./lib/logger";
import { db } from "./lib/db.js";
import { salesTable, customersTable, settingsTable } from "@workspace/db";
import { gte, lte, and, eq, asc, desc } from "drizzle-orm";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});

// ─── Day-End Auto Z-Report at 23:55 ────────────────────────────────────────
let lastZReportDate = "";
setInterval(async () => {
  const now = new Date();
  const hh = now.getHours();
  const mm = now.getMinutes();
  const today = now.toISOString().slice(0, 10);
  if (hh === 23 && mm === 55 && lastZReportDate !== today) {
    lastZReportDate = today;
    try {
      const rows = await db
        .select({
          totalAmount: salesTable.totalAmount,
          discountAmount: salesTable.discountAmount,
          paidAmount: salesTable.paidAmount,
          paymentMode: salesTable.paymentMode,
          status: salesTable.status,
          customerName: customersTable.name,
        })
        .from(salesTable)
        .leftJoin(customersTable, eq(salesTable.customerId, customersTable.id))
        .where(and(gte(salesTable.date, today), lte(salesTable.date, today)));

      const totalSales = rows.reduce((s, r) => s + Number(r.totalAmount), 0);
      const totalDiscount = rows.reduce((s, r) => s + Number(r.discountAmount), 0);
      const totalPaid = rows.reduce((s, r) => s + Number(r.paidAmount), 0);
      const byMode: Record<string, number> = {};
      for (const r of rows) {
        byMode[r.paymentMode] = (byMode[r.paymentMode] ?? 0) + Number(r.totalAmount);
      }

      logger.info(
        {
          zReport: {
            date: today,
            invoiceCount: rows.length,
            totalSales: totalSales.toFixed(2),
            totalDiscount: totalDiscount.toFixed(2),
            totalPaid: totalPaid.toFixed(2),
            byPaymentMode: Object.fromEntries(
              Object.entries(byMode).map(([k, v]) => [k, v.toFixed(2)])
            ),
          },
        },
        `[Z-REPORT] Day-end auto report for ${today}`
      );
    } catch (err) {
      logger.error({ err }, "Z-report generation failed");
    }
  }
}, 60_000);
