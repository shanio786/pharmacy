import { Router } from "express";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { db } from "../lib/db.js";
import { requireAuth, requireManager } from "../middlewares/auth.js";
import {
  saleReturnsTable,
  saleReturnItemsTable,
  batchesTable,
  medicinesTable,
  customersTable,
  customerLedgerTable,
} from "@workspace/db";

const router = Router();

router.get("/sale-returns", requireAuth, async (req, res) => {
  const { from, to, customerId } = req.query as {
    from?: string;
    to?: string;
    customerId?: string;
  };
  const conditions = [];
  if (from) conditions.push(gte(saleReturnsTable.date, from));
  if (to) conditions.push(lte(saleReturnsTable.date, to));
  if (customerId) conditions.push(eq(saleReturnsTable.customerId, Number(customerId)));

  const rows = await db
    .select({
      id: saleReturnsTable.id,
      saleId: saleReturnsTable.saleId,
      customerId: saleReturnsTable.customerId,
      customerName: customersTable.name,
      date: saleReturnsTable.date,
      totalAmount: saleReturnsTable.totalAmount,
      reason: saleReturnsTable.reason,
      notes: saleReturnsTable.notes,
      createdAt: saleReturnsTable.createdAt,
    })
    .from(saleReturnsTable)
    .leftJoin(customersTable, eq(saleReturnsTable.customerId, customersTable.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(saleReturnsTable.date));

  res.json(rows);
});

router.post("/sale-returns", requireAuth, requireManager, async (req, res) => {
  const { saleId, customerId, date, reason, notes, items } = req.body as {
    saleId?: number;
    customerId?: number;
    date: string;
    reason?: string;
    notes?: string;
    items: Array<{
      medicineId: number;
      batchId?: number;
      batchNo?: string;
      saleUnit?: string;
      quantityPacks?: number;
      quantityUnits?: number;
      quantity?: number;
      conversionFactor?: number;
      salePricePack?: number;
      salePriceUnit?: number;
      salePrice?: number;
    }>;
  };

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "items are required" });
    return;
  }
  for (const it of items) {
    const cf = it.conversionFactor ?? 1;
    const saleUnit = it.saleUnit ?? "unit";
    const requestedQty = it.quantityPacks ?? it.quantity ?? 0;
    const computedUnits =
      it.quantityUnits != null
        ? it.quantityUnits
        : saleUnit === "pack"
          ? Math.round(requestedQty * cf)
          : requestedQty;
    if (!Number.isFinite(computedUnits) || computedUnits <= 0) {
      res
        .status(400)
        .json({ error: "Each item return quantity must be a positive number" });
      return;
    }
    const price = it.salePrice ?? it.salePriceUnit ?? it.salePricePack;
    if (price != null && (!Number.isFinite(price) || (price as number) < 0)) {
      res
        .status(400)
        .json({ error: "Each item sale price must be a non-negative number" });
      return;
    }
  }

  const normalizedItems = items.map((item) => {
    const cf = item.conversionFactor ?? 1;
    const saleUnit = item.saleUnit ?? "unit";
    const requestedQty = item.quantityPacks ?? item.quantity ?? 0;
    const quantityUnits = item.quantityUnits != null
      ? item.quantityUnits
      : saleUnit === "pack" ? Math.round(requestedQty * cf) : requestedQty;
    const salePriceUnit = item.salePriceUnit != null
      ? item.salePriceUnit
      : saleUnit === "pack" ? (item.salePrice ?? 0) / cf : (item.salePrice ?? 0);
    const salePricePack = item.salePricePack ?? (saleUnit === "pack" ? (item.salePrice ?? 0) : salePriceUnit * cf);
    return {
      ...item,
      quantityUnits,
      salePriceUnit,
      conversionFactor: cf,
      salePricePack,
    };
  });

  let totalAmount = 0;
  for (const item of normalizedItems) {
    totalAmount += item.quantityUnits * item.salePriceUnit;
  }

  const ret = await db.transaction(async (tx) => {
    const [ret] = await tx
      .insert(saleReturnsTable)
      .values({
        saleId,
        customerId,
        date,
        totalAmount: String(totalAmount),
        reason,
        notes,
      })
      .returning();

    await tx.insert(saleReturnItemsTable).values(
      normalizedItems.map((item) => ({
        saleReturnId: ret.id,
        medicineId: item.medicineId,
        batchId: item.batchId,
        batchNo: item.batchNo,
        saleUnit: item.saleUnit ?? "unit",
        quantityPacks: String(item.quantityPacks ?? 0),
        quantityUnits: item.quantityUnits,
        conversionFactor: item.conversionFactor,
        salePricePack: String(item.salePricePack),
        salePriceUnit: String(item.salePriceUnit),
        totalAmount: String(item.quantityUnits * item.salePriceUnit),
      }))
    );

    for (const item of normalizedItems) {
      let restoreBatchId = item.batchId;
      // Fallback: when no batchId was provided (manual return without
      // original-sale link), restore stock to the most recently received
      // non-expired batch for this medicine, or create a synthetic
      // "RETURN-<date>" batch if none exists.
      if (!restoreBatchId) {
        const today = new Date().toISOString().slice(0, 10);
        const [latest] = await tx
          .select()
          .from(batchesTable)
          .where(
            and(
              eq(batchesTable.medicineId, item.medicineId),
              gte(batchesTable.expiryDate, today),
            ),
          )
          .orderBy(desc(batchesTable.createdAt))
          .limit(1);
        if (latest) {
          restoreBatchId = latest.id;
        } else {
          const expiryStr = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10);
          const [synthetic] = await tx
            .insert(batchesTable)
            .values({
              medicineId: item.medicineId,
              batchNo: item.batchNo ?? `RETURN-${date}`,
              expiryDate: expiryStr,
              quantityUnits: 0,
              purchasePrice: String(item.salePriceUnit),
              salePrice: String(item.salePriceUnit),
            })
            .returning();
          restoreBatchId = synthetic.id;
        }
      }

      const [batch] = await tx
        .select()
        .from(batchesTable)
        .where(eq(batchesTable.id, restoreBatchId))
        .limit(1);
      if (batch) {
        await tx
          .update(batchesTable)
          .set({ quantityUnits: batch.quantityUnits + item.quantityUnits })
          .where(eq(batchesTable.id, restoreBatchId));
      }
    }

    if (customerId) {
      const [customer] = await tx
        .select()
        .from(customersTable)
        .where(eq(customersTable.id, customerId))
        .limit(1);
      if (customer) {
        const newBalance = Number(customer.balance) - totalAmount;
        await tx
          .update(customersTable)
          .set({ balance: String(newBalance) })
          .where(eq(customersTable.id, customerId));
        await tx.insert(customerLedgerTable).values({
          customerId,
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

router.get("/sale-returns/:id", requireAuth, async (req, res) => {
  const id = Number(req.params["id"]);
  const [ret] = await db
    .select()
    .from(saleReturnsTable)
    .where(eq(saleReturnsTable.id, id))
    .limit(1);
  if (!ret) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const items = await db
    .select({
      id: saleReturnItemsTable.id,
      medicineId: saleReturnItemsTable.medicineId,
      medicineName: medicinesTable.name,
      batchId: saleReturnItemsTable.batchId,
      batchNo: saleReturnItemsTable.batchNo,
      quantityUnits: saleReturnItemsTable.quantityUnits,
      salePriceUnit: saleReturnItemsTable.salePriceUnit,
      totalAmount: saleReturnItemsTable.totalAmount,
    })
    .from(saleReturnItemsTable)
    .leftJoin(medicinesTable, eq(saleReturnItemsTable.medicineId, medicinesTable.id))
    .where(eq(saleReturnItemsTable.saleReturnId, id));

  res.json({ ...ret, items });
});

export default router;
