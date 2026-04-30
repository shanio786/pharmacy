import { Router } from "express";
import { eq, gte, lte, and, sql, desc } from "drizzle-orm";
import { db } from "../lib/db.js";
import { requireAuth } from "../middlewares/auth.js";
import {
  salesTable,
  saleItemsTable,
  purchasesTable,
  medicinesTable,
  batchesTable,
  categoriesTable,
  companiesTable,
  genericNamesTable,
  racksTable,
  customersTable,
  suppliersTable,
  saleReturnsTable,
} from "@workspace/db";

const router = Router();

// Helper: accept dateFrom/dateTo (generated client) or from/to (legacy)
function dateRange(q: Record<string, string | undefined>) {
  return {
    startDate: q["dateFrom"] ?? q["from"],
    endDate: q["dateTo"] ?? q["to"],
  };
}

// GET /reports/sales → SalesReport (matches generated SalesReport type)
router.get("/reports/sales", requireAuth, async (req, res) => {
  const { startDate, endDate } = dateRange(req.query as Record<string, string | undefined>);
  const conditions = [];
  if (startDate) conditions.push(gte(salesTable.date, startDate));
  if (endDate) conditions.push(lte(salesTable.date, endDate));

  const rows = await db
    .select({
      date: salesTable.date,
      invoiceNo: salesTable.invoiceNo,
      customerName: customersTable.name,
      totalAmount: salesTable.totalAmount,
      discountAmount: salesTable.discountAmount,
      paymentMode: salesTable.paymentMode,
    })
    .from(salesTable)
    .leftJoin(customersTable, eq(salesTable.customerId, customersTable.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(salesTable.date));

  const totalSales = rows.reduce((s, r) => s + Number(r.totalAmount), 0);
  const totalDiscount = rows.reduce((s, r) => s + Number(r.discountAmount), 0);
  const netSales = totalSales - totalDiscount;

  res.json({
    totalSales,
    totalDiscount,
    netSales,
    saleCount: rows.length,
    rows: rows.map((r) => ({
      date: r.date,
      invoiceNo: r.invoiceNo,
      customerName: r.customerName ?? null,
      totalAmount: Number(r.totalAmount),
      discountAmount: Number(r.discountAmount),
      paymentMode: r.paymentMode,
    })),
  });
});

// GET /reports/stock → StockReportItem[] (array — matches generated return type)
router.get("/reports/stock", requireAuth, async (req, res) => {
  const { categoryId, companyId } = req.query as { categoryId?: string; companyId?: string };
  const today = new Date().toISOString().slice(0, 10);

  const conditions = [eq(medicinesTable.isActive, true)];
  if (categoryId) conditions.push(eq(medicinesTable.categoryId, Number(categoryId)));
  if (companyId) conditions.push(eq(medicinesTable.companyId, Number(companyId)));

  const rows = await db
    .select({
      medicineId: medicinesTable.id,
      medicineName: medicinesTable.name,
      genericName: genericNamesTable.name,
      companyName: companiesTable.name,
      categoryName: categoriesTable.name,
      rackName: racksTable.name,
      unitsPerPack: medicinesTable.unitsPerPack,
      salePrice: medicinesTable.salePriceUnit,
      isControlled: medicinesTable.isControlled,
      totalUnits: sql<number>`COALESCE(SUM(CASE WHEN ${batchesTable.expiryDate} >= ${today}::date THEN ${batchesTable.quantityUnits} ELSE 0 END), 0)`,
      stockValue: sql<number>`COALESCE(SUM(CASE WHEN ${batchesTable.expiryDate} >= ${today}::date THEN ${batchesTable.quantityUnits} * ${medicinesTable.purchasePriceUnit} ELSE 0 END), 0)`,
    })
    .from(medicinesTable)
    .leftJoin(genericNamesTable, eq(medicinesTable.genericNameId, genericNamesTable.id))
    .leftJoin(companiesTable, eq(medicinesTable.companyId, companiesTable.id))
    .leftJoin(categoriesTable, eq(medicinesTable.categoryId, categoriesTable.id))
    .leftJoin(racksTable, eq(medicinesTable.rackId, racksTable.id))
    .leftJoin(batchesTable, eq(batchesTable.medicineId, medicinesTable.id))
    .where(and(...conditions))
    .groupBy(
      medicinesTable.id, medicinesTable.name, genericNamesTable.name,
      companiesTable.name, categoriesTable.name, racksTable.name,
      medicinesTable.unitsPerPack, medicinesTable.salePriceUnit,
      medicinesTable.purchasePriceUnit, medicinesTable.isControlled,
    )
    .orderBy(medicinesTable.name);

  res.json(rows.map((r) => ({
    medicineId: r.medicineId,
    medicineName: r.medicineName,
    genericName: r.genericName ?? null,
    companyName: r.companyName ?? null,
    categoryName: r.categoryName ?? null,
    rackName: r.rackName ?? null,
    totalUnits: Number(r.totalUnits),
    totalPacks: r.unitsPerPack > 0 ? Math.floor(Number(r.totalUnits) / r.unitsPerPack) : 0,
    salePrice: Number(r.salePrice),
    stockValue: Number(r.stockValue),
    isControlled: r.isControlled,
  })));
});

// GET /reports/purchase (singular — matches generated client URL) → PurchaseReport
router.get("/reports/purchase", requireAuth, async (req, res) => {
  const { startDate, endDate } = dateRange(req.query as Record<string, string | undefined>);
  const { supplierId } = req.query as { supplierId?: string };

  const conditions = [];
  if (startDate) conditions.push(gte(purchasesTable.date, startDate));
  if (endDate) conditions.push(lte(purchasesTable.date, endDate));
  if (supplierId) conditions.push(eq(purchasesTable.supplierId, Number(supplierId)));

  const rows = await db
    .select({
      date: purchasesTable.date,
      invoiceNo: purchasesTable.invoiceNo,
      supplierName: suppliersTable.name,
      totalAmount: purchasesTable.totalAmount,
    })
    .from(purchasesTable)
    .leftJoin(suppliersTable, eq(purchasesTable.supplierId, suppliersTable.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(purchasesTable.date));

  const totalPurchases = rows.reduce((s, r) => s + Number(r.totalAmount), 0);

  res.json({
    totalPurchases,
    purchaseCount: rows.length,
    rows: rows.map((r) => ({
      date: r.date,
      invoiceNo: r.invoiceNo ?? null,
      supplierName: r.supplierName ?? null,
      totalAmount: Number(r.totalAmount),
    })),
  });
});

// Legacy plural path — redirect to singular
router.get("/reports/purchases", requireAuth, (req, res) => {
  const qs = new URLSearchParams(req.query as Record<string, string>).toString();
  res.redirect(307, `/api/reports/purchase${qs ? `?${qs}` : ""}`);
});

// GET /reports/expiry → ExpiringBatch[] (matches generated return type)
router.get("/reports/expiry", requireAuth, async (req, res) => {
  const { daysAhead = "90" } = req.query as { daysAhead?: string };
  const numDays = Math.min(365, Number(daysAhead));
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const alertDate = new Date(today);
  alertDate.setDate(alertDate.getDate() + numDays);
  const alertDateStr = alertDate.toISOString().slice(0, 10);

  const rows = await db
    .select({
      batchId: batchesTable.id,
      medicineId: medicinesTable.id,
      medicineName: medicinesTable.name,
      batchNo: batchesTable.batchNo,
      expiryDate: batchesTable.expiryDate,
      quantityUnits: batchesTable.quantityUnits,
      unitsPerPack: medicinesTable.unitsPerPack,
    })
    .from(batchesTable)
    .innerJoin(medicinesTable, eq(batchesTable.medicineId, medicinesTable.id))
    .where(and(
      gte(batchesTable.expiryDate, todayStr),
      lte(batchesTable.expiryDate, alertDateStr),
      gte(batchesTable.quantityUnits, 1),
    ))
    .orderBy(batchesTable.expiryDate);

  const todayMs = today.getTime();
  res.json(rows.map((r) => {
    const expiryMs = new Date(r.expiryDate).getTime();
    const daysToExpiry = Math.ceil((expiryMs - todayMs) / (1000 * 60 * 60 * 24));
    return {
      batchId: r.batchId,
      medicineId: r.medicineId,
      medicineName: r.medicineName,
      batchNo: r.batchNo,
      expiryDate: r.expiryDate,
      quantityUnits: r.quantityUnits,
      quantityPacks: r.unitsPerPack > 0 ? Math.floor(r.quantityUnits / r.unitsPerPack) : 0,
      daysToExpiry,
    };
  }));
});

// GET /reports/controlled-drugs → ControlledDrugEntry[] (array — matches generated type)
router.get("/reports/controlled-drugs", requireAuth, async (req, res) => {
  const { startDate, endDate } = dateRange(req.query as Record<string, string | undefined>);
  const conditions = [eq(medicinesTable.isControlled, true)];
  if (startDate) conditions.push(gte(salesTable.date, startDate));
  if (endDate) conditions.push(lte(salesTable.date, endDate));

  const rows = await db
    .select({
      date: salesTable.date,
      medicineId: medicinesTable.id,
      medicineName: medicinesTable.name,
      qty: saleItemsTable.quantityUnits,
      invoiceNo: salesTable.invoiceNo,
      prescribedBy: salesTable.prescribedBy,
      patientName: salesTable.patientName,
      customerName: customersTable.name,
    })
    .from(saleItemsTable)
    .innerJoin(salesTable, eq(saleItemsTable.saleId, salesTable.id))
    .innerJoin(medicinesTable, eq(saleItemsTable.medicineId, medicinesTable.id))
    .leftJoin(customersTable, eq(salesTable.customerId, customersTable.id))
    .where(and(...conditions))
    .orderBy(desc(salesTable.date));

  res.json(rows.map((r) => ({
    date: r.date,
    medicineId: r.medicineId,
    medicineName: r.medicineName,
    transactionType: "sale",
    quantity: r.qty,
    invoiceNo: r.invoiceNo ?? null,
    prescriptionNote: r.prescribedBy
      ? `Dr. ${r.prescribedBy}${r.patientName ? ` | Patient: ${r.patientName}` : ""}`
      : null,
    customerName: r.customerName ?? null,
  })));
});

// GET /reports/profit-loss → ProfitLossReport (matches generated type exactly)
router.get("/reports/profit-loss", requireAuth, async (req, res) => {
  const { startDate, endDate } = dateRange(req.query as Record<string, string | undefined>);

  const saleConditions = [];
  if (startDate) saleConditions.push(gte(salesTable.date, startDate));
  if (endDate) saleConditions.push(lte(salesTable.date, endDate));

  const purchaseConditions = [];
  if (startDate) purchaseConditions.push(gte(purchasesTable.date, startDate));
  if (endDate) purchaseConditions.push(lte(purchasesTable.date, endDate));

  const returnConditions = [];
  if (startDate) returnConditions.push(gte(saleReturnsTable.date, startDate));
  if (endDate) returnConditions.push(lte(saleReturnsTable.date, endDate));

  const [revenueRow] = await db
    .select({ revenue: sql<number>`COALESCE(SUM(${salesTable.totalAmount}), 0)` })
    .from(salesTable)
    .where(saleConditions.length ? and(...saleConditions) : undefined);

  const [costRow] = await db
    .select({ cost: sql<number>`COALESCE(SUM(${purchasesTable.totalAmount}), 0)` })
    .from(purchasesTable)
    .where(purchaseConditions.length ? and(...purchaseConditions) : undefined);

  const [returnsRow] = await db
    .select({ total: sql<number>`COALESCE(SUM(${saleReturnsTable.totalAmount}), 0)` })
    .from(saleReturnsTable)
    .where(returnConditions.length ? and(...returnConditions) : undefined);

  const revenue = Number(revenueRow?.revenue ?? 0);
  const costOfGoods = Number(costRow?.cost ?? 0);
  const saleReturnsAmount = Number(returnsRow?.total ?? 0);
  const grossProfit = revenue - costOfGoods;
  const netProfit = grossProfit - saleReturnsAmount;
  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

  res.json({ revenue, costOfGoods, grossProfit, grossMargin, saleReturnsAmount, netProfit });
});

export default router;
