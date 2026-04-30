import { Router } from "express";
import { sql, gte, lte, and, eq, lt } from "drizzle-orm";
import { db } from "../lib/db.js";
import { requireAuth } from "../middlewares/auth.js";
import {
  salesTable,
  purchasesTable,
  medicinesTable,
  batchesTable,
  settingsTable,
} from "@workspace/db";

const router = Router();

router.get("/dashboard/summary", requireAuth, async (_req, res) => {
  const today = new Date().toISOString().slice(0, 10);

  const [settings] = await db.select().from(settingsTable).limit(1);
  const lowStockThreshold = settings?.lowStockThreshold ?? 10;
  const expiryAlertDays = settings?.expiryAlertDays ?? 90;
  const alertDate = new Date();
  alertDate.setDate(alertDate.getDate() + expiryAlertDays);
  const alertDateStr = alertDate.toISOString().slice(0, 10);

  const [todaySales] = await db
    .select({ total: sql<number>`COALESCE(SUM(${salesTable.totalAmount}), 0)` })
    .from(salesTable)
    .where(eq(salesTable.date, today));

  const [todayPurchases] = await db
    .select({ total: sql<number>`COALESCE(SUM(${purchasesTable.totalAmount}), 0)` })
    .from(purchasesTable)
    .where(eq(purchasesTable.date, today));

  const [totalMedicines] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(medicinesTable)
    .where(eq(medicinesTable.isActive, true));

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

  const expiringSoon = await db
    .select({
      id: batchesTable.id,
      medicineId: batchesTable.medicineId,
      medicineName: medicinesTable.name,
      batchNo: batchesTable.batchNo,
      expiryDate: batchesTable.expiryDate,
      quantityUnits: batchesTable.quantityUnits,
    })
    .from(batchesTable)
    .innerJoin(medicinesTable, eq(batchesTable.medicineId, medicinesTable.id))
    .where(and(
      gte(batchesTable.expiryDate, today),
      lte(batchesTable.expiryDate, alertDateStr),
    ))
    .orderBy(batchesTable.expiryDate);

  res.json({
    todaySales: Number(todaySales?.total ?? 0),
    todayPurchases: Number(todayPurchases?.total ?? 0),
    totalMedicines: Number(totalMedicines?.count ?? 0),
    lowStockCount: lowStockItems.length,
    expiringSoonCount: expiringSoon.length,
    lowStockItems: lowStockItems.slice(0, 10),
    expiringSoon: expiringSoon.slice(0, 10),
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
      total: sql<number>`COALESCE(SUM(${salesTable.totalAmount}), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(salesTable)
    .where(and(gte(salesTable.date, fromStr), lte(salesTable.date, today)))
    .groupBy(salesTable.date)
    .orderBy(salesTable.date);

  res.json(rows);
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
      id: batchesTable.id,
      medicineId: batchesTable.medicineId,
      medicineName: medicinesTable.name,
      batchNo: batchesTable.batchNo,
      expiryDate: batchesTable.expiryDate,
      quantityUnits: batchesTable.quantityUnits,
    })
    .from(batchesTable)
    .innerJoin(medicinesTable, eq(batchesTable.medicineId, medicinesTable.id))
    .where(and(
      gte(batchesTable.expiryDate, today),
      lte(batchesTable.expiryDate, alertDateStr),
      gte(batchesTable.quantityUnits, 1),
    ))
    .orderBy(batchesTable.expiryDate);

  res.json(rows);
});

router.get("/dashboard/low-stock", requireAuth, async (_req, res) => {
  const [settings] = await db.select().from(settingsTable).limit(1);
  const lowStockThreshold = settings?.lowStockThreshold ?? 10;
  const today = new Date().toISOString().slice(0, 10);

  const rows = await db
    .select({
      medicineId: medicinesTable.id,
      medicineName: medicinesTable.name,
      stock: sql<number>`COALESCE(SUM(${batchesTable.quantityUnits}), 0)`,
      minStock: medicinesTable.minStock,
    })
    .from(medicinesTable)
    .leftJoin(batchesTable, and(
      eq(batchesTable.medicineId, medicinesTable.id),
      gte(batchesTable.expiryDate, today),
    ))
    .where(eq(medicinesTable.isActive, true))
    .groupBy(medicinesTable.id, medicinesTable.name, medicinesTable.minStock)
    .having(sql`COALESCE(SUM(${batchesTable.quantityUnits}), 0) <= ${lowStockThreshold}`)
    .orderBy(sql`COALESCE(SUM(${batchesTable.quantityUnits}), 0)`);

  res.json(rows);
});

export default router;
