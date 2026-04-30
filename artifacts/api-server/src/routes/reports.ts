import { Router } from "express";
import { eq, gte, lte, and, sql, desc } from "drizzle-orm";
import { db } from "../lib/db.js";
import { requireAuth, requireManager } from "../middlewares/auth.js";
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
  missedSalesTable,
  stockAuditsTable,
  stockAuditItemsTable,
  purchaseReturnsTable,
  customerLedgerTable,
  supplierLedgerTable,
} from "@workspace/db";

const router = Router();

function dateRange(q: Record<string, string | undefined>) {
  return {
    startDate: q["dateFrom"] ?? q["from"],
    endDate: q["dateTo"] ?? q["to"],
  };
}


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


router.get("/reports/purchase", requireAuth, requireManager, async (req, res) => {
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
router.get("/reports/purchases", requireAuth, requireManager, (req, res) => {
  const qs = new URLSearchParams(req.query as Record<string, string>).toString();
  res.redirect(307, `/api/reports/purchase${qs ? `?${qs}` : ""}`);
});


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


router.get("/reports/controlled-drugs", requireAuth, requireManager, async (req, res) => {
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

router.get("/reports/profit-loss", requireAuth, requireManager, async (req, res) => {
  const { startDate, endDate } = dateRange(req.query as Record<string, string | undefined>);

  const saleConditions = [];
  if (startDate) saleConditions.push(gte(salesTable.date, startDate));
  if (endDate) saleConditions.push(lte(salesTable.date, endDate));

  const returnConditions = [];
  if (startDate) returnConditions.push(gte(saleReturnsTable.date, startDate));
  if (endDate) returnConditions.push(lte(saleReturnsTable.date, endDate));

  const [revenueRow] = await db
    .select({ revenue: sql<number>`COALESCE(SUM(${salesTable.totalAmount}), 0)` })
    .from(salesTable)
    .where(saleConditions.length ? and(...saleConditions) : undefined);

  const [cogsRow] = await db
    .select({
      cogs: sql<number>`COALESCE(SUM(${saleItemsTable.quantityUnits} * ${batchesTable.purchasePrice}::numeric), 0)`,
    })
    .from(saleItemsTable)
    .innerJoin(salesTable, eq(saleItemsTable.saleId, salesTable.id))
    .leftJoin(batchesTable, eq(saleItemsTable.batchId, batchesTable.id))
    .where(saleConditions.length ? and(...saleConditions) : undefined);

  const [returnsRow] = await db
    .select({ total: sql<number>`COALESCE(SUM(${saleReturnsTable.totalAmount}), 0)` })
    .from(saleReturnsTable)
    .where(returnConditions.length ? and(...returnConditions) : undefined);

  const revenue = Number(revenueRow?.revenue ?? 0);
  const costOfGoods = Number(cogsRow?.cogs ?? 0);
  const saleReturnsAmount = Number(returnsRow?.total ?? 0);
  const grossProfit = revenue - costOfGoods;
  const netProfit = grossProfit - saleReturnsAmount;
  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

  res.json({ revenue, costOfGoods, grossProfit, grossMargin, saleReturnsAmount, netProfit });
});

// ─── Missed Sales Report ──────────────────────────────────────────────────
router.get("/reports/missed-sales", requireAuth, async (req, res) => {
  const { startDate, endDate } = dateRange(req.query as Record<string, string | undefined>);
  const conditions = [];
  if (startDate) conditions.push(gte(missedSalesTable.date, startDate));
  if (endDate) conditions.push(lte(missedSalesTable.date, endDate));

  const rows = await db
    .select({
      id: missedSalesTable.id,
      date: missedSalesTable.date,
      medicineName: missedSalesTable.medicineName,
      quantityDemanded: missedSalesTable.quantity,
      customerNote: missedSalesTable.reason,
      createdAt: missedSalesTable.createdAt,
    })
    .from(missedSalesTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(missedSalesTable.date));

  // Aggregate by medicine for top-missed-items summary
  const summary = await db
    .select({
      medicineName: missedSalesTable.medicineName,
      totalDemanded: sql<number>`COALESCE(SUM(${missedSalesTable.quantity}), 0)`,
      occurrences: sql<number>`COUNT(*)`,
    })
    .from(missedSalesTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .groupBy(missedSalesTable.medicineName)
    .orderBy(sql`COUNT(*) DESC`);

  res.json({
    summary: summary.map((s) => ({
      medicineName: s.medicineName,
      genericName: null as string | null,
      totalDemanded: Number(s.totalDemanded),
      occurrences: Number(s.occurrences),
    })),
    entries: rows.map((r) => ({ ...r, genericName: null as string | null })),
  });
});

// ─── Stock Audit Variance Report ──────────────────────────────────────────
router.get("/reports/stock-audit-variance", requireAuth, requireManager, async (req, res) => {
  const { startDate, endDate } = dateRange(req.query as Record<string, string | undefined>);
  const conditions = [];
  if (startDate) conditions.push(gte(stockAuditsTable.date, startDate));
  if (endDate) conditions.push(lte(stockAuditsTable.date, endDate));

  const rows = await db
    .select({
      auditId: stockAuditsTable.id,
      auditTitle: stockAuditsTable.title,
      auditDate: stockAuditsTable.date,
      medicineName: medicinesTable.name,
      systemQty: stockAuditItemsTable.systemCountUnits,
      countedQty: stockAuditItemsTable.physicalTotalUnits,
      variance: stockAuditItemsTable.variance,
      reason: stockAuditItemsTable.notes,
    })
    .from(stockAuditItemsTable)
    .innerJoin(stockAuditsTable, eq(stockAuditItemsTable.auditId, stockAuditsTable.id))
    .leftJoin(medicinesTable, eq(stockAuditItemsTable.medicineId, medicinesTable.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(stockAuditsTable.date));

  // Variance only (where system != counted)
  const withVariance = rows.filter((r) => Number(r.variance) !== 0);
  const totals = withVariance.reduce(
    (acc, r) => {
      const v = Number(r.variance);
      if (v > 0) acc.totalSurplus += v;
      else acc.totalShortage += Math.abs(v);
      return acc;
    },
    { totalSurplus: 0, totalShortage: 0 },
  );

  res.json({
    totalEntries: rows.length,
    varianceCount: withVariance.length,
    totalSurplus: totals.totalSurplus,
    totalShortage: totals.totalShortage,
    items: withVariance.map((r) => ({
      ...r,
      systemQty: Number(r.systemQty),
      countedQty: Number(r.countedQty),
      variance: Number(r.variance),
    })),
  });
});

// ─── Customer Ledger Report ───────────────────────────────────────────────
router.get("/reports/customer-ledger", requireAuth, requireManager, async (req, res) => {
  const { startDate, endDate } = dateRange(req.query as Record<string, string | undefined>);
  const customerIdRaw = (req.query as Record<string, string | undefined>)["customerId"];
  if (!customerIdRaw) {
    res.status(400).json({ error: "customerId is required" });
    return;
  }
  const customerId = Number(customerIdRaw);
  if (!Number.isFinite(customerId) || customerId <= 0) {
    res.status(400).json({ error: "Invalid customerId" });
    return;
  }

  const [customer] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.id, customerId))
    .limit(1);
  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }

  // Opening balance: latest ledger balance strictly before startDate (or 0)
  let openingBalance = 0;
  if (startDate) {
    const [prior] = await db
      .select({ balance: customerLedgerTable.balance })
      .from(customerLedgerTable)
      .where(
        and(
          eq(customerLedgerTable.customerId, customerId),
          sql`${customerLedgerTable.date} < ${startDate}`,
        ),
      )
      .orderBy(desc(customerLedgerTable.date), desc(customerLedgerTable.id))
      .limit(1);
    if (prior) openingBalance = Number(prior.balance);
  }

  // Period entries from canonical ledger
  const conds = [eq(customerLedgerTable.customerId, customerId)];
  if (startDate) conds.push(gte(customerLedgerTable.date, startDate));
  if (endDate) conds.push(lte(customerLedgerTable.date, endDate));

  const ledgerRows = await db
    .select({
      id: customerLedgerTable.id,
      date: customerLedgerTable.date,
      type: customerLedgerTable.type,
      referenceId: customerLedgerTable.referenceId,
      amount: customerLedgerTable.amount,
      balance: customerLedgerTable.balance,
      notes: customerLedgerTable.notes,
    })
    .from(customerLedgerTable)
    .where(and(...conds))
    .orderBy(customerLedgerTable.date, customerLedgerTable.id);

  // Map type → debit/credit columns (debit increases balance, credit decreases)
  const entries = ledgerRows.map((r) => {
    const amt = Number(r.amount);
    const absAmt = Math.abs(amt);
    let debit = 0;
    let credit = 0;
    let label: "Sale" | "Return" | "Payment" | "Adjustment" = "Adjustment";
    if (r.type === "sale") { debit = absAmt; label = "Sale"; }
    else if (r.type === "return") { credit = absAmt; label = "Return"; }
    else if (r.type === "payment") { credit = absAmt; label = "Payment"; }
    else { if (amt >= 0) debit = absAmt; else credit = absAmt; }
    return {
      date: r.date,
      type: label,
      reference: r.referenceId ? `${label.toUpperCase()}-${r.referenceId}` : (r.notes ?? ""),
      debit,
      credit,
      balance: Number(r.balance),
    };
  });

  const closingBalance = entries.length
    ? entries[entries.length - 1].balance
    : openingBalance;

  const totalSales = entries.reduce((s, e) => s + (e.type === "Sale" ? e.debit : 0), 0);
  const totalPaid = entries.reduce((s, e) => s + (e.type === "Payment" ? e.credit : 0), 0);
  const totalReturned = entries.reduce((s, e) => s + (e.type === "Return" ? e.credit : 0), 0);

  res.json({
    customer: { id: customer.id, name: customer.name, phone: customer.phone },
    openingBalance,
    totalSales,
    totalPaid,
    totalReturned,
    closingBalance,
    entries,
  });
});

// ─── Supplier Ledger Report ───────────────────────────────────────────────
router.get("/reports/supplier-ledger", requireAuth, requireManager, async (req, res) => {
  const { startDate, endDate } = dateRange(req.query as Record<string, string | undefined>);
  const supplierIdRaw = (req.query as Record<string, string | undefined>)["supplierId"];
  if (!supplierIdRaw) {
    res.status(400).json({ error: "supplierId is required" });
    return;
  }
  const supplierId = Number(supplierIdRaw);
  if (!Number.isFinite(supplierId) || supplierId <= 0) {
    res.status(400).json({ error: "Invalid supplierId" });
    return;
  }

  const [supplier] = await db
    .select()
    .from(suppliersTable)
    .where(eq(suppliersTable.id, supplierId))
    .limit(1);
  if (!supplier) {
    res.status(404).json({ error: "Supplier not found" });
    return;
  }

  // Opening balance: latest ledger balance strictly before startDate (or 0)
  let openingBalance = 0;
  if (startDate) {
    const [prior] = await db
      .select({ balance: supplierLedgerTable.balance })
      .from(supplierLedgerTable)
      .where(
        and(
          eq(supplierLedgerTable.supplierId, supplierId),
          sql`${supplierLedgerTable.date} < ${startDate}`,
        ),
      )
      .orderBy(desc(supplierLedgerTable.date), desc(supplierLedgerTable.id))
      .limit(1);
    if (prior) openingBalance = Number(prior.balance);
  }

  // Period entries from canonical ledger
  const conds = [eq(supplierLedgerTable.supplierId, supplierId)];
  if (startDate) conds.push(gte(supplierLedgerTable.date, startDate));
  if (endDate) conds.push(lte(supplierLedgerTable.date, endDate));

  const ledgerRows = await db
    .select({
      id: supplierLedgerTable.id,
      date: supplierLedgerTable.date,
      type: supplierLedgerTable.type,
      referenceId: supplierLedgerTable.referenceId,
      amount: supplierLedgerTable.amount,
      balance: supplierLedgerTable.balance,
      notes: supplierLedgerTable.notes,
    })
    .from(supplierLedgerTable)
    .where(and(...conds))
    .orderBy(supplierLedgerTable.date, supplierLedgerTable.id);

  // Supplier ledger convention: balance = how much WE owe supplier.
  // credit (we owe more): purchase. debit (we owe less): payment, return.
  const entries = ledgerRows.map((r) => {
    const amt = Number(r.amount);
    const absAmt = Math.abs(amt);
    let debit = 0;
    let credit = 0;
    let label: "Purchase" | "Return" | "Payment" | "Adjustment" = "Adjustment";
    if (r.type === "purchase") { credit = absAmt; label = "Purchase"; }
    else if (r.type === "return") { debit = absAmt; label = "Return"; }
    else if (r.type === "payment") { debit = absAmt; label = "Payment"; }
    else { if (amt >= 0) credit = absAmt; else debit = absAmt; }
    return {
      date: r.date,
      type: label,
      reference: r.referenceId ? `${label.toUpperCase()}-${r.referenceId}` : (r.notes ?? ""),
      debit,
      credit,
      balance: Number(r.balance),
    };
  });

  const closingBalance = entries.length
    ? entries[entries.length - 1].balance
    : openingBalance;

  const totalPurchases = entries.reduce((s, e) => s + (e.type === "Purchase" ? e.credit : 0), 0);
  const totalPaid = entries.reduce((s, e) => s + (e.type === "Payment" ? e.debit : 0), 0);
  const totalReturned = entries.reduce((s, e) => s + (e.type === "Return" ? e.debit : 0), 0);

  res.json({
    supplier: { id: supplier.id, name: supplier.name, contact: supplier.contact },
    openingBalance,
    totalPurchases,
    totalPaid,
    totalReturned,
    closingBalance,
    entries,
  });
});

export default router;
