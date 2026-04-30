import { Router } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db } from "../lib/db.js";
import { requireAuth, requireManager } from "../middlewares/auth.js";
import {
  purchaseReturnsTable,
  purchaseReturnItemsTable,
  batchesTable,
  medicinesTable,
  suppliersTable,
  supplierLedgerTable,
} from "@workspace/db";

const router = Router();

router.get("/purchase-returns", requireAuth, async (req, res) => {
  const { supplierId } = req.query as { supplierId?: string };
  const rows = await db
    .select({
      id: purchaseReturnsTable.id,
      purchaseId: purchaseReturnsTable.purchaseId,
      supplierId: purchaseReturnsTable.supplierId,
      supplierName: suppliersTable.name,
      date: purchaseReturnsTable.date,
      totalAmount: purchaseReturnsTable.totalAmount,
      reason: purchaseReturnsTable.reason,
      notes: purchaseReturnsTable.notes,
      createdAt: purchaseReturnsTable.createdAt,
    })
    .from(purchaseReturnsTable)
    .leftJoin(suppliersTable, eq(purchaseReturnsTable.supplierId, suppliersTable.id))
    .where(supplierId ? eq(purchaseReturnsTable.supplierId, Number(supplierId)) : undefined)
    .orderBy(desc(purchaseReturnsTable.date));
  res.json(rows);
});

router.post("/purchase-returns", requireAuth, requireManager, async (req, res) => {
  const { purchaseId, supplierId, date, reason, notes, inPacks, items } = req.body as {
    purchaseId?: number;
    supplierId?: number;
    date: string;
    reason?: string;
    notes?: string;
    inPacks?: boolean;
    items: Array<{
      medicineId: number;
      batchId?: number;
      batchNo?: string;
      returnQuantity?: number;
      purchasePrice?: number;
      quantityUnits?: number;
      purchasePriceUnit?: number;
    }>;
  };

  const normalizedItems = await Promise.all(items.map(async (item) => {
    const qty = item.returnQuantity ?? item.quantityUnits ?? 0;
    const pricePerUnit = item.purchasePrice ?? item.purchasePriceUnit ?? 0;
    let quantityUnits = qty;
    let purchasePriceUnit = pricePerUnit;
    if (inPacks) {
      const [med] = await db.select({ unitsPerPack: medicinesTable.unitsPerPack })
        .from(medicinesTable).where(eq(medicinesTable.id, item.medicineId)).limit(1);
      const cf = Number(med?.unitsPerPack ?? 1);
      quantityUnits = qty * cf;
      purchasePriceUnit = pricePerUnit / cf;
    }
    return { ...item, quantityUnits, purchasePriceUnit };
  }));

  const totalAmount = normalizedItems.reduce((sum, i) => sum + i.quantityUnits * i.purchasePriceUnit, 0);

  const ret = await db.transaction(async (tx) => {
    const [ret] = await tx
      .insert(purchaseReturnsTable)
      .values({
        purchaseId,
        supplierId,
        date,
        totalAmount: String(totalAmount),
        reason,
        notes,
      })
      .returning();

    await tx.insert(purchaseReturnItemsTable).values(
      normalizedItems.map((item) => ({
        purchaseReturnId: ret.id,
        medicineId: item.medicineId,
        batchId: item.batchId,
        batchNo: item.batchNo,
        quantityUnits: item.quantityUnits,
        purchasePriceUnit: String(item.purchasePriceUnit),
        totalAmount: String(item.quantityUnits * item.purchasePriceUnit),
      }))
    );

    for (const item of normalizedItems) {
      if (item.batchId) {
        const [batch] = await tx
          .select()
          .from(batchesTable)
          .where(eq(batchesTable.id, item.batchId))
          .limit(1);
        if (batch) {
          await tx
            .update(batchesTable)
            .set({ quantityUnits: Math.max(0, batch.quantityUnits - item.quantityUnits) })
            .where(eq(batchesTable.id, item.batchId));
        }
      }
    }

    if (supplierId) {
      const [supplier] = await tx
        .select()
        .from(suppliersTable)
        .where(eq(suppliersTable.id, supplierId))
        .limit(1);
      if (supplier) {
        const newBalance = Number(supplier.balance) - totalAmount;
        await tx
          .update(suppliersTable)
          .set({ balance: String(newBalance) })
          .where(eq(suppliersTable.id, supplierId));
        await tx.insert(supplierLedgerTable).values({
          supplierId,
          type: "return",
          referenceId: ret.id,
          amount: String(-totalAmount),
          balance: String(newBalance),
          date,
        });
      }
    }

    return ret;
  });

  res.status(201).json(ret);
});

router.get("/purchase-returns/:id", requireAuth, async (req, res) => {
  const id = Number(req.params["id"]);
  const [ret] = await db
    .select()
    .from(purchaseReturnsTable)
    .where(eq(purchaseReturnsTable.id, id))
    .limit(1);
  if (!ret) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const items = await db
    .select({
      id: purchaseReturnItemsTable.id,
      medicineId: purchaseReturnItemsTable.medicineId,
      medicineName: medicinesTable.name,
      batchId: purchaseReturnItemsTable.batchId,
      batchNo: purchaseReturnItemsTable.batchNo,
      quantityUnits: purchaseReturnItemsTable.quantityUnits,
      purchasePriceUnit: purchaseReturnItemsTable.purchasePriceUnit,
      totalAmount: purchaseReturnItemsTable.totalAmount,
    })
    .from(purchaseReturnItemsTable)
    .leftJoin(medicinesTable, eq(purchaseReturnItemsTable.medicineId, medicinesTable.id))
    .where(eq(purchaseReturnItemsTable.purchaseReturnId, id));

  res.json({ ...ret, items });
});

export default router;
