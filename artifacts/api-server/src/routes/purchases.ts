import { Router } from "express";
import { eq, desc, gte, lte, and, sql } from "drizzle-orm";
import { db } from "../lib/db.js";
import { requireAuth } from "../middlewares/auth.js";
import {
  purchasesTable,
  purchaseItemsTable,
  batchesTable,
  medicinesTable,
  suppliersTable,
  supplierLedgerTable,
  saleItemsTable,
  salesTable,
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

router.post("/purchases", requireAuth, async (req, res) => {
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
      quantityPacks: number;
      bonusPacks: number;
      quantityUnits: number;
      purchasePriceUnit: number;
      salePriceUnit: number;
    }>;
  };

  if (!items?.length) {
    res.status(400).json({ error: "Items are required" });
    return;
  }

  let totalAmount = 0;
  const itemsToInsert = items.map((item) => {
    const itemTotal = item.quantityUnits * item.purchasePriceUnit;
    totalAmount += itemTotal;
    return {
      ...item,
      totalAmount: String(itemTotal),
      purchasePriceUnit: String(item.purchasePriceUnit),
      salePriceUnit: String(item.salePriceUnit),
    };
  });

  const paid = paidAmount ?? totalAmount;
  const status = paid >= totalAmount ? "received" : paid > 0 ? "partial" : "pending";

  const [purchase] = await db
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

  await db.insert(purchaseItemsTable).values(
    itemsToInsert.map((item) => ({ ...item, purchaseId: purchase.id }))
  );

  for (const item of items) {
    const existing = await db
      .select()
      .from(batchesTable)
      .where(and(
        eq(batchesTable.medicineId, item.medicineId),
        eq(batchesTable.batchNo, item.batchNo),
      ))
      .limit(1);

    if (existing.length) {
      await db
        .update(batchesTable)
        .set({ quantityUnits: existing[0].quantityUnits + item.quantityUnits })
        .where(eq(batchesTable.id, existing[0].id));
    } else {
      await db.insert(batchesTable).values({
        medicineId: item.medicineId,
        batchNo: item.batchNo,
        expiryDate: item.expiryDate,
        quantityUnits: item.quantityUnits,
        purchasePrice: String(item.purchasePriceUnit),
        salePrice: String(item.salePriceUnit),
      });
    }

    await db
      .update(medicinesTable)
      .set({
        purchasePriceUnit: String(item.purchasePriceUnit),
        salePriceUnit: String(item.salePriceUnit),
        salePricePack: String(item.salePriceUnit),
      })
      .where(eq(medicinesTable.id, item.medicineId));
  }

  if (supplierId) {
    const [supplier] = await db
      .select()
      .from(suppliersTable)
      .where(eq(suppliersTable.id, supplierId))
      .limit(1);
    if (supplier) {
      const creditAmount = totalAmount - paid;
      const newBalance = Number(supplier.balance) + creditAmount;
      await db
        .update(suppliersTable)
        .set({ balance: String(newBalance) })
        .where(eq(suppliersTable.id, supplierId));
      await db.insert(supplierLedgerTable).values({
        supplierId,
        type: "purchase",
        referenceId: purchase.id,
        amount: String(totalAmount),
        balance: String(newBalance),
        date,
      });
    }
  }

  res.status(201).json({ ...purchase, items: itemsToInsert });
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

  const items = await db
    .select({
      id: purchaseItemsTable.id,
      medicineId: purchaseItemsTable.medicineId,
      medicineName: medicinesTable.name,
      batchNo: purchaseItemsTable.batchNo,
      expiryDate: purchaseItemsTable.expiryDate,
      quantityPacks: purchaseItemsTable.quantityPacks,
      bonusPacks: purchaseItemsTable.bonusPacks,
      quantityUnits: purchaseItemsTable.quantityUnits,
      purchasePriceUnit: purchaseItemsTable.purchasePriceUnit,
      salePriceUnit: purchaseItemsTable.salePriceUnit,
      totalAmount: purchaseItemsTable.totalAmount,
    })
    .from(purchaseItemsTable)
    .leftJoin(medicinesTable, eq(purchaseItemsTable.medicineId, medicinesTable.id))
    .where(eq(purchaseItemsTable.purchaseId, id));

  res.json({ ...purchase, items });
});

router.post("/purchases/generate-sale-based-po", requireAuth, async (req, res) => {
  const { from, to } = req.body as { from: string; to: string };
  const rows = await db
    .select({
      medicineId: saleItemsTable.medicineId,
      medicineName: medicinesTable.name,
      soldQty: sql<number>`SUM(${saleItemsTable.quantityUnits})`,
      currentStock: sql<number>`COALESCE((SELECT SUM(b.quantity_units) FROM batches b WHERE b.medicine_id = ${saleItemsTable.medicineId} AND b.expiry_date >= CURRENT_DATE), 0)`,
    })
    .from(saleItemsTable)
    .innerJoin(salesTable, eq(saleItemsTable.saleId, salesTable.id))
    .innerJoin(medicinesTable, eq(saleItemsTable.medicineId, medicinesTable.id))
    .where(and(gte(salesTable.date, from), lte(salesTable.date, to)))
    .groupBy(saleItemsTable.medicineId, medicinesTable.name);

  const poItems = rows.map((r) => ({
    medicineId: r.medicineId,
    medicineName: r.medicineName,
    soldQty: Number(r.soldQty),
    currentStock: Number(r.currentStock),
    suggestedQty: Math.max(0, Number(r.soldQty) - Number(r.currentStock)),
  }));

  res.json(poItems.filter((i) => i.suggestedQty > 0));
});

export default router;
