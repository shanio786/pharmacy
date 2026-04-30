import { Router } from "express";
import { sql, gte, lte, and, eq } from "drizzle-orm";
import { db } from "../lib/db.js";
import { requireAuth } from "../middlewares/auth.js";
import {
  salesTable,
  purchasesTable,
  medicinesTable,
  batchesTable,
  settingsTable,
  missedSalesTable,
  deliveriesTable,
  customersTable,
  suppliersTable,
} from "@workspace/db";

const router = Router();

router.get("/dashboard/summary", requireAuth, async (_req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + "-01";

  const [settings] = await db.select().from(settingsTable).limit(1);
  const lowStockThreshold = settings?.lowStockThreshold ?? 10;
  const expiryAlertDays = settings?.expiryAlertDays ?? 90;
  const alertDate = new Date();
  alertDate.setDate(alertDate.getDate() + expiryAlertDays);
  const alertDateStr = alertDate.toISOString().slice(0, 10);

  const [todaySalesRow] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${salesTable.totalAmount}), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(salesTable)
    .where(eq(salesTable.date, today));

  const [monthSalesRow] = await db
    .select({ total: sql<number>`COALESCE(SUM(${salesTable.totalAmount}), 0)` })
    .from(salesTable)
    .where(and(gte(salesTable.date, monthStart), lte(salesTable.date, today)));

  const [todayPurchasesRow] = await db
    .select({ total: sql<number>`COALESCE(SUM(${purchasesTable.totalAmount}), 0)` })
    .from(purchasesTable)
    .where(eq(purchasesTable.date, today));

  const [totalMedicines] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(medicinesTable)
    .where(eq(medicinesTable.isActive, true));

  const [totalCustomers] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(customersTable);

  const [totalSuppliers] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(suppliersTable);

  const [missedToday] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(missedSalesTable)
    .where(eq(missedSalesTable.date, today));

  const [pendingDeliveries] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(deliveriesTable)
    .where(eq(deliveriesTable.status, "pending"));

  const lowStockItems = await db
    .select({
      medicineId: medicinesTable.id,
      medicineName: medicinesTable.name,
      stock: sql<number>`COALESCE(SUM(${batchesTable.quantityUnits}), 0)`,
    })
    .from(medicinesTable)
    .leftJoin(batchesTable, and(
      eq(batchesTable.medicineId, medicinesTable.id),
      gte(batchesTable.expiryDate, today),
    ))
    .where(eq(medicinesTable.isActive, true))
    .groupBy(medicinesTable.id, medicinesTable.name)
    .having(sql`COALESCE(SUM(${batchesTable.quantityUnits}), 0) <= ${lowStockThreshold}`);

  const expiringBatches = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(batchesTable)
    .innerJoin(medicinesTable, eq(batchesTable.medicineId, medicinesTable.id))
    .where(and(
      gte(batchesTable.expiryDate, today),
      lte(batchesTable.expiryDate, alertDateStr),
      gte(batchesTable.quantityUnits, 1),
    ));

  res.json({
    todaySales: Number(todaySalesRow?.total ?? 0),
    todaySalesCount: Number(todaySalesRow?.count ?? 0),
    todayPurchases: Number(todayPurchasesRow?.total ?? 0),
    monthSales: Number(monthSalesRow?.total ?? 0),
    totalMedicines: Number(totalMedicines?.count ?? 0),
    totalCustomers: Number(totalCustomers?.count ?? 0),
    totalSuppliers: Number(totalSuppliers?.count ?? 0),
    lowStockCount: lowStockItems.length,
    expiringCount: Number(expiringBatches[0]?.count ?? 0),
    missedSalesToday: Number(missedToday?.count ?? 0),
    pendingDeliveries: Number(pendingDeliveries?.count ?? 0),
    lowStockItems: lowStockItems.slice(0, 10),
  });
});

router.get("/dashboard/sales-chart", requireAuth, async (req, res) => {
  const { days = "30" } = req.query as { days?: string };
  const numDays = Math.min(90, Number(days));
  const from = new Date();
  from.setDate(from.getDate() - numDays);
  const fromStr = from.toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  const rows = await db
    .select({
      date: salesTable.date,
      amount: sql<number>`COALESCE(SUM(${salesTable.totalAmount}), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(salesTable)
    .where(and(gte(salesTable.date, fromStr), lte(salesTable.date, today)))
    .groupBy(salesTable.date)
    .orderBy(salesTable.date);

  res.json(rows.map((r) => ({ date: r.date, amount: Number(r.amount), count: Number(r.count) })));
});

router.get("/dashboard/expiring-medicines", requireAuth, async (req, res) => {
  const { days = "90" } = req.query as { days?: string };
  const numDays = Math.min(365, Number(days));
  const today = new Date().toISOString().slice(0, 10);
  const alertDate = new Date();
  alertDate.setDate(alertDate.getDate() + numDays);
  const alertDateStr = alertDate.toISOString().slice(0, 10);

  const rows = await db
    .select({
      batchId: batchesTable.id,
      medicineId: batchesTable.medicineId,
      medicineName: medicinesTable.name,
      batchNo: batchesTable.batchNo,
      expiryDate: batchesTable.expiryDate,
      quantityUnits: batchesTable.quantityUnits,
      quantityPacks: sql<number>`CASE WHEN ${medicinesTable.unitsPerPack} > 0 THEN FLOOR(${batchesTable.quantityUnits}::numeric / ${medicinesTable.unitsPerPack}) ELSE 0 END`,
      daysToExpiry: sql<number>`${batchesTable.expiryDate}::date - CURRENT_DATE`,
    })
    .from(batchesTable)
    .innerJoin(medicinesTable, eq(batchesTable.medicineId, medicinesTable.id))
    .where(and(
      gte(batchesTable.expiryDate, today),
      lte(batchesTable.expiryDate, alertDateStr),
      gte(batchesTable.quantityUnits, 1),
    ))
    .orderBy(batchesTable.expiryDate);

  res.json(rows.map((r) => ({
    batchId: r.batchId,
    medicineId: r.medicineId,
    medicineName: r.medicineName,
    batchNo: r.batchNo,
    expiryDate: r.expiryDate,
    quantityUnits: Number(r.quantityUnits),
    quantityPacks: Number(r.quantityPacks),
    daysToExpiry: Number(r.daysToExpiry),
  })));
});

router.get("/dashboard/low-stock", requireAuth, async (_req, res) => {
  const [settings] = await db.select().from(settingsTable).limit(1);
  const lowStockThreshold = settings?.lowStockThreshold ?? 10;
  const today = new Date().toISOString().slice(0, 10);

  const rows = await db
    .select({
      id: medicinesTable.id,
      name: medicinesTable.name,
      totalUnits: sql<number>`COALESCE(SUM(${batchesTable.quantityUnits}), 0)`,
      totalPacks: sql<number>`CASE WHEN ${medicinesTable.unitsPerPack} > 0 THEN FLOOR(COALESCE(SUM(${batchesTable.quantityUnits}), 0)::numeric / ${medicinesTable.unitsPerPack}) ELSE 0 END`,
      nearestExpiry: sql<string | null>`MIN(CASE WHEN ${batchesTable.quantityUnits} > 0 THEN ${batchesTable.expiryDate} END)`,
    })
    .from(medicinesTable)
    .leftJoin(batchesTable, and(
      eq(batchesTable.medicineId, medicinesTable.id),
      gte(batchesTable.expiryDate, today),
    ))
    .where(eq(medicinesTable.isActive, true))
    .groupBy(medicinesTable.id, medicinesTable.name, medicinesTable.unitsPerPack)
    .having(sql`COALESCE(SUM(${batchesTable.quantityUnits}), 0) <= ${lowStockThreshold}`)
    .orderBy(sql`COALESCE(SUM(${batchesTable.quantityUnits}), 0)`);

  res.json(rows.map((r) => ({
    id: r.id,
    name: r.name,
    totalUnits: Number(r.totalUnits),
    totalPacks: Number(r.totalPacks),
    nearestExpiry: r.nearestExpiry ?? null,
  })));
});

export default router;
