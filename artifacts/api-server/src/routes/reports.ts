import { Router } from "express";
import { eq, gte, lte, and, sql, desc } from "drizzle-orm";
import { db } from "../lib/db.js";
import { requireAuth } from "../middlewares/auth.js";
import {
  salesTable,
  saleItemsTable,
  purchasesTable,
  purchaseItemsTable,
  medicinesTable,
  batchesTable,
  categoriesTable,
} from "@workspace/db";

const router = Router();

router.get("/reports/sales", requireAuth, async (req, res) => {
  const { from, to } = req.query as { from?: string; to?: string };
  const conditions = [];
  if (from) conditions.push(gte(salesTable.date, from));
  if (to) conditions.push(lte(salesTable.date, to));

  const rows = await db
    .select({
      date: salesTable.date,
      invoiceNo: salesTable.invoiceNo,
      medicineName: medicinesTable.name,
      qty: saleItemsTable.quantityUnits,
      unitPrice: saleItemsTable.salePriceUnit,
      discountPct: saleItemsTable.discountPct,
      total: saleItemsTable.totalAmount,
    })
    .from(saleItemsTable)
    .innerJoin(salesTable, eq(saleItemsTable.saleId, salesTable.id))
    .innerJoin(medicinesTable, eq(saleItemsTable.medicineId, medicinesTable.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(salesTable.date));

  const totalRevenue = rows.reduce((s, r) => s + Number(r.total), 0);
  const totalQty = rows.reduce((s, r) => s + Number(r.qty), 0);

  res.json({ rows, totalRevenue, totalQty });
});

router.get("/reports/stock", requireAuth, async (req, res) => {
  const { categoryId } = req.query as { categoryId?: string };
  const today = new Date().toISOString().slice(0, 10);

  const conditions = [eq(medicinesTable.isActive, true)];
  if (categoryId) conditions.push(eq(medicinesTable.categoryId, Number(categoryId)));

  const rows = await db
    .select({
      medicineId: medicinesTable.id,
      medicineName: medicinesTable.name,
      categoryName: categoriesTable.name,
      strength: medicinesTable.strength,
      salePriceUnit: medicinesTable.salePriceUnit,
      purchasePriceUnit: medicinesTable.purchasePriceUnit,
      stockQty: sql<number>`COALESCE(SUM(${batchesTable.quantityUnits}), 0)`,
      stockValue: sql<number>`COALESCE(SUM(${batchesTable.quantityUnits} * ${medicinesTable.purchasePriceUnit}), 0)`,
    })
    .from(medicinesTable)
    .leftJoin(categoriesTable, eq(medicinesTable.categoryId, categoriesTable.id))
    .leftJoin(batchesTable, and(
      eq(batchesTable.medicineId, medicinesTable.id),
      gte(batchesTable.expiryDate, today),
    ))
    .where(and(...conditions))
    .groupBy(medicinesTable.id, medicinesTable.name, categoriesTable.name, medicinesTable.strength, medicinesTable.salePriceUnit, medicinesTable.purchasePriceUnit)
    .orderBy(medicinesTable.name);

  const totalValue = rows.reduce((s, r) => s + Number(r.stockValue), 0);
  res.json({ rows, totalValue });
});

router.get("/reports/purchases", requireAuth, async (req, res) => {
  const { from, to } = req.query as { from?: string; to?: string };
  const conditions = [];
  if (from) conditions.push(gte(purchasesTable.date, from));
  if (to) conditions.push(lte(purchasesTable.date, to));

  const rows = await db
    .select({
      date: purchasesTable.date,
      invoiceNo: purchasesTable.invoiceNo,
      medicineName: medicinesTable.name,
      batchNo: purchaseItemsTable.batchNo,
      expiryDate: purchaseItemsTable.expiryDate,
      qty: purchaseItemsTable.quantityUnits,
      purchasePriceUnit: purchaseItemsTable.purchasePriceUnit,
      total: purchaseItemsTable.totalAmount,
    })
    .from(purchaseItemsTable)
    .innerJoin(purchasesTable, eq(purchaseItemsTable.purchaseId, purchasesTable.id))
    .innerJoin(medicinesTable, eq(purchaseItemsTable.medicineId, medicinesTable.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(purchasesTable.date));

  const totalAmount = rows.reduce((s, r) => s + Number(r.total), 0);
  res.json({ rows, totalAmount });
});

router.get("/reports/expiry", requireAuth, async (req, res) => {
  const { days = "90" } = req.query as { days?: string };
  const numDays = Math.min(365, Number(days));
  const today = new Date().toISOString().slice(0, 10);
  const alertDate = new Date();
  alertDate.setDate(alertDate.getDate() + numDays);
  const alertDateStr = alertDate.toISOString().slice(0, 10);

  const rows = await db
    .select({
      medicineId: medicinesTable.id,
      medicineName: medicinesTable.name,
      batchNo: batchesTable.batchNo,
      expiryDate: batchesTable.expiryDate,
      quantityUnits: batchesTable.quantityUnits,
      purchasePrice: batchesTable.purchasePrice,
      value: sql<number>`${batchesTable.quantityUnits} * ${batchesTable.purchasePrice}`,
    })
    .from(batchesTable)
    .innerJoin(medicinesTable, eq(batchesTable.medicineId, medicinesTable.id))
    .where(and(
      gte(batchesTable.expiryDate, today),
      lte(batchesTable.expiryDate, alertDateStr),
      gte(batchesTable.quantityUnits, 1),
    ))
    .orderBy(batchesTable.expiryDate);

  const totalValue = rows.reduce((s, r) => s + Number(r.value), 0);
  res.json({ rows, totalValue });
});

router.get("/reports/controlled-drugs", requireAuth, async (req, res) => {
  const { from, to } = req.query as { from?: string; to?: string };
  const conditions = [eq(medicinesTable.isControlled, true)];
  if (from) conditions.push(gte(salesTable.date, from));
  if (to) conditions.push(lte(salesTable.date, to));

  const rows = await db
    .select({
      date: salesTable.date,
      invoiceNo: salesTable.invoiceNo,
      medicineName: medicinesTable.name,
      qty: saleItemsTable.quantityUnits,
      prescribedBy: salesTable.prescribedBy,
      patientName: salesTable.patientName,
    })
    .from(saleItemsTable)
    .innerJoin(salesTable, eq(saleItemsTable.saleId, salesTable.id))
    .innerJoin(medicinesTable, eq(saleItemsTable.medicineId, medicinesTable.id))
    .where(and(...conditions))
    .orderBy(desc(salesTable.date));

  res.json({ rows });
});

router.get("/reports/profit-loss", requireAuth, async (req, res) => {
  const { from, to } = req.query as { from?: string; to?: string };
  const conditions = [];
  if (from) conditions.push(gte(salesTable.date, from));
  if (to) conditions.push(lte(salesTable.date, to));

  const [revenueRow] = await db
    .select({ revenue: sql<number>`COALESCE(SUM(${salesTable.totalAmount}), 0)` })
    .from(salesTable)
    .where(conditions.length ? and(...conditions) : undefined);

  const purchaseConditions = [];
  if (from) purchaseConditions.push(gte(purchasesTable.date, from));
  if (to) purchaseConditions.push(lte(purchasesTable.date, to));

  const [costRow] = await db
    .select({ cost: sql<number>`COALESCE(SUM(${purchasesTable.totalAmount}), 0)` })
    .from(purchasesTable)
    .where(purchaseConditions.length ? and(...purchaseConditions) : undefined);

  const revenue = Number(revenueRow?.revenue ?? 0);
  const cost = Number(costRow?.cost ?? 0);
  const grossProfit = revenue - cost;
  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

  res.json({ revenue, cost, grossProfit, grossMargin });
});

export default router;
