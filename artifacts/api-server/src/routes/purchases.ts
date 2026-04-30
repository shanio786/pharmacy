import { Router } from "express";
import { eq, desc, gte, lte, and, sql } from "drizzle-orm";
import { db } from "../lib/db.js";
import { requireAuth, requireManager } from "../middlewares/auth.js";
import {
  purchasesTable,
  purchaseItemsTable,
  batchesTable,
  medicinesTable,
  suppliersTable,
  supplierLedgerTable,
  saleItemsTable,
  salesTable,
  companiesTable,
} from "@workspace/db";

const router = Router();

router.get("/purchases", requireAuth, async (req, res) => {
  const { from, to, supplierId } = req.query as {
    from?: string;
    to?: string;
    supplierId?: string;
  };
  const conditions = [];
  if (from) conditions.push(gte(purchasesTable.date, from));
  if (to) conditions.push(lte(purchasesTable.date, to));
  if (supplierId) conditions.push(eq(purchasesTable.supplierId, Number(supplierId)));

  const rows = await db
    .select({
      id: purchasesTable.id,
      supplierId: purchasesTable.supplierId,
      supplierName: suppliersTable.name,
      invoiceNo: purchasesTable.invoiceNo,
      date: purchasesTable.date,
      totalAmount: purchasesTable.totalAmount,
      paidAmount: purchasesTable.paidAmount,
      status: purchasesTable.status,
      notes: purchasesTable.notes,
      createdAt: purchasesTable.createdAt,
    })
    .from(purchasesTable)
    .leftJoin(suppliersTable, eq(purchasesTable.supplierId, suppliersTable.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(purchasesTable.date));

  res.json(rows);
});

router.post("/purchases", requireAuth, requireManager, async (req, res) => {
  const { supplierId, invoiceNo, date, notes, items, paidAmount } = req.body as {
    supplierId?: number;
    invoiceNo?: string;
    date: string;
    notes?: string;
    paidAmount?: number;
    items: Array<{
      medicineId: number;
      batchNo: string;
      expiryDate: string;
      packsReceived: number;
      purchasePrice: number;
      salePrice: number;
    }>;
  };

  if (!items?.length) {
    res.status(400).json({ error: "Items are required" });
    return;
  }

  let totalAmount = 0;
  const enrichedItems = await Promise.all(
    items.map(async (item) => {
      const [med] = await db
        .select({ unitsPerPack: medicinesTable.unitsPerPack })
        .from(medicinesTable)
        .where(eq(medicinesTable.id, item.medicineId))
        .limit(1);
      const cf = Number(med?.unitsPerPack ?? 1);
      const quantityUnits = item.packsReceived * cf;
      const purchasePriceUnit = cf > 0 ? item.purchasePrice / cf : item.purchasePrice;
      const itemTotal = item.packsReceived * item.purchasePrice;
      totalAmount += itemTotal;
      return {
        ...item,
        quantityPacks: item.packsReceived,
        quantityUnits,
        conversionFactor: cf,
        purchasePriceUnit,
        salePriceUnit: item.salePrice,
        salePricePackCalc: item.salePrice * cf,
        totalAmount: String(itemTotal),
      };
    })
  );

  const paid = paidAmount ?? totalAmount;
  const status = paid >= totalAmount ? "received" : paid > 0 ? "partial" : "pending";

  const purchase = await db.transaction(async (tx) => {
    const [newPurchase] = await tx
      .insert(purchasesTable)
      .values({
        supplierId,
        invoiceNo,
        date,
        totalAmount: String(totalAmount),
        paidAmount: String(paid),
        status: status as "received" | "partial" | "pending",
        notes,
      })
      .returning();

    await tx.insert(purchaseItemsTable).values(
      enrichedItems.map((item) => ({
        purchaseId: newPurchase.id,
        medicineId: item.medicineId,
        batchNo: item.batchNo,
        expiryDate: item.expiryDate,
        quantityPacks: item.quantityPacks,
        quantityUnits: item.quantityUnits,
        purchasePriceUnit: String(item.purchasePriceUnit),
        salePriceUnit: String(item.salePriceUnit),
        totalAmount: item.totalAmount,
      }))
    );

    for (const item of enrichedItems) {
      const existing = await tx
        .select()
        .from(batchesTable)
        .where(and(
          eq(batchesTable.medicineId, item.medicineId),
          eq(batchesTable.batchNo, item.batchNo),
        ))
        .limit(1);

      if (existing.length) {
        await tx
          .update(batchesTable)
          .set({ quantityUnits: existing[0].quantityUnits + item.quantityUnits })
          .where(eq(batchesTable.id, existing[0].id));
      } else {
        await tx.insert(batchesTable).values({
          medicineId: item.medicineId,
          batchNo: item.batchNo,
          expiryDate: item.expiryDate,
          quantityUnits: item.quantityUnits,
          purchasePrice: String(item.purchasePriceUnit),
          salePrice: String(item.salePriceUnit),
        });
      }

      await tx
        .update(medicinesTable)
        .set({
          purchasePriceUnit: String(item.purchasePriceUnit),
          salePriceUnit: String(item.salePriceUnit),
          salePricePack: String(item.salePricePackCalc),
        })
        .where(eq(medicinesTable.id, item.medicineId));
    }

    if (supplierId) {
      const [supplier] = await tx
        .select()
        .from(suppliersTable)
        .where(eq(suppliersTable.id, supplierId))
        .limit(1);
      if (supplier) {
        const creditAmount = totalAmount - paid;
        const newBalance = Number(supplier.balance) + creditAmount;
        await tx
          .update(suppliersTable)
          .set({ balance: String(newBalance) })
          .where(eq(suppliersTable.id, supplierId));
        await tx.insert(supplierLedgerTable).values({
          supplierId,
          type: "purchase",
          referenceId: newPurchase.id,
          amount: String(totalAmount),
          balance: String(newBalance),
          date,
        });
      }
    }

    return newPurchase;
  });

  res.status(201).json({ ...purchase, items: enrichedItems });
});

router.get("/purchases/:id", requireAuth, async (req, res) => {
  const id = Number(req.params["id"]);
  const [purchase] = await db
    .select({
      id: purchasesTable.id,
      supplierId: purchasesTable.supplierId,
      supplierName: suppliersTable.name,
      invoiceNo: purchasesTable.invoiceNo,
      date: purchasesTable.date,
      totalAmount: purchasesTable.totalAmount,
      paidAmount: purchasesTable.paidAmount,
      status: purchasesTable.status,
      notes: purchasesTable.notes,
      createdAt: purchasesTable.createdAt,
    })
    .from(purchasesTable)
    .leftJoin(suppliersTable, eq(purchasesTable.supplierId, suppliersTable.id))
    .where(eq(purchasesTable.id, id))
    .limit(1);

  if (!purchase) {
    res.status(404).json({ error: "Purchase not found" });
    return;
  }

  const rawItems = await db
    .select({
      id: purchaseItemsTable.id,
      medicineId: purchaseItemsTable.medicineId,
      medicineName: medicinesTable.name,
      batchNo: purchaseItemsTable.batchNo,
      expiryDate: purchaseItemsTable.expiryDate,
      packsReceived: purchaseItemsTable.quantityPacks,
      unitsReceived: purchaseItemsTable.quantityUnits,
      purchasePrice: purchaseItemsTable.purchasePriceUnit,
      salePrice: purchaseItemsTable.salePriceUnit,
      totalAmount: purchaseItemsTable.totalAmount,
    })
    .from(purchaseItemsTable)
    .leftJoin(medicinesTable, eq(purchaseItemsTable.medicineId, medicinesTable.id))
    .where(eq(purchaseItemsTable.purchaseId, id));

  const items = await Promise.all(rawItems.map(async (item) => {
    const [batch] = await db
      .select({ id: batchesTable.id })
      .from(batchesTable)
      .where(and(eq(batchesTable.medicineId, item.medicineId), eq(batchesTable.batchNo, item.batchNo)))
      .limit(1);
    return { ...item, batchId: batch?.id ?? null };
  }));

  res.json({ ...purchase, items });
});

// POST /purchases/sale-based-po → DraftPOItem[] (matches generated client URL and contract)
router.post("/purchases/sale-based-po", requireAuth, requireManager, async (req, res) => {
  const { dateFrom, dateTo } = req.body as {
    dateFrom: string;
    dateTo: string;
  };

  const rows = await db
    .select({
      medicineId: saleItemsTable.medicineId,
      medicineName: medicinesTable.name,
      companyName: companiesTable.name,
      unitsPerPack: medicinesTable.unitsPerPack,
      purchasePrice: medicinesTable.purchasePriceUnit,
      unitsSold: sql<number>`SUM(${saleItemsTable.quantityUnits})`,
      currentStock: sql<number>`COALESCE((SELECT SUM(b.quantity_units) FROM batches b WHERE b.medicine_id = ${saleItemsTable.medicineId} AND b.expiry_date >= CURRENT_DATE), 0)`,
    })
    .from(saleItemsTable)
    .innerJoin(salesTable, eq(saleItemsTable.saleId, salesTable.id))
    .innerJoin(medicinesTable, eq(saleItemsTable.medicineId, medicinesTable.id))
    .leftJoin(companiesTable, eq(medicinesTable.companyId, companiesTable.id))
    .where(and(gte(salesTable.date, dateFrom), lte(salesTable.date, dateTo)))
    .groupBy(
      saleItemsTable.medicineId, medicinesTable.name, companiesTable.name,
      medicinesTable.unitsPerPack, medicinesTable.purchasePriceUnit,
    );

  const items = rows.map((r) => {
    const unitsSold = Number(r.unitsSold);
    const currentStock = Number(r.currentStock);
    const suggestedUnits = Math.max(0, unitsSold - currentStock);
    const unitsPerPack = r.unitsPerPack > 0 ? r.unitsPerPack : 1;
    return {
      medicineId: r.medicineId,
      medicineName: r.medicineName,
      companyName: r.companyName ?? null,
      unitsSold,
      suggestedPacks: Math.ceil(suggestedUnits / unitsPerPack),
      purchasePrice: Number(r.purchasePrice),
    };
  });

  res.json(items.filter((i) => i.suggestedPacks > 0));
});

export default router;
