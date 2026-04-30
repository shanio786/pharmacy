import { Router } from "express";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { db } from "../lib/db.js";
import { requireAuth, requirePharmacist } from "../middlewares/auth.js";
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

router.post("/sale-returns", requireAuth, requirePharmacist, async (req, res) => {
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
      quantityUnits: number;
      salePriceUnit: number;
    }>;
  };

  let totalAmount = 0;
  for (const item of items) {
    totalAmount += item.quantityUnits * item.salePriceUnit;
  }

  const [ret] = await db
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

  await db.insert(saleReturnItemsTable).values(
    items.map((item) => ({
      saleReturnId: ret.id,
      medicineId: item.medicineId,
      batchId: item.batchId,
      batchNo: item.batchNo,
      quantityUnits: item.quantityUnits,
      salePriceUnit: String(item.salePriceUnit),
      totalAmount: String(item.quantityUnits * item.salePriceUnit),
    }))
  );

  for (const item of items) {
    if (item.batchId) {
      const [batch] = await db
        .select()
        .from(batchesTable)
        .where(eq(batchesTable.id, item.batchId))
        .limit(1);
      if (batch) {
        await db
          .update(batchesTable)
          .set({ quantityUnits: batch.quantityUnits + item.quantityUnits })
          .where(eq(batchesTable.id, item.batchId));
      }
    }
  }

  if (customerId) {
    const [customer] = await db
      .select()
      .from(customersTable)
      .where(eq(customersTable.id, customerId))
      .limit(1);
    if (customer) {
      const newBalance = Number(customer.balance) - totalAmount;
      await db
        .update(customersTable)
        .set({ balance: String(newBalance) })
        .where(eq(customersTable.id, customerId));
      await db.insert(customerLedgerTable).values({
        customerId,
        type: "return",
        referenceId: ret.id,
        amount: String(-totalAmount),
        balance: String(newBalance),
        date,
      });
    }
  }

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
