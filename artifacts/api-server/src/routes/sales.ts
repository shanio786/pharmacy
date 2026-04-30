import { Router } from "express";
import { eq, desc, gte, lte, and } from "drizzle-orm";
import { db } from "../lib/db.js";
import { requireAuth } from "../middlewares/auth.js";
import {
  salesTable,
  saleItemsTable,
  batchesTable,
  medicinesTable,
  customersTable,
  customerLedgerTable,
} from "@workspace/db";

const router = Router();

let invoiceCounter = 1000;

function generateInvoiceNo(): string {
  const date = new Date();
  const yyyymmdd = date.toISOString().slice(0, 10).replace(/-/g, "");
  return `INV-${yyyymmdd}-${String(++invoiceCounter).padStart(4, "0")}`;
}

router.get("/sales", requireAuth, async (req, res) => {
  const { from, to, customerId } = req.query as {
    from?: string;
    to?: string;
    customerId?: string;
  };
  const conditions = [];
  if (from) conditions.push(gte(salesTable.date, from));
  if (to) conditions.push(lte(salesTable.date, to));
  if (customerId) conditions.push(eq(salesTable.customerId, Number(customerId)));

  const rows = await db
    .select({
      id: salesTable.id,
      invoiceNo: salesTable.invoiceNo,
      customerId: salesTable.customerId,
      customerName: customersTable.name,
      date: salesTable.date,
      subtotal: salesTable.subtotal,
      discountAmount: salesTable.discountAmount,
      totalAmount: salesTable.totalAmount,
      paidAmount: salesTable.paidAmount,
      status: salesTable.status,
      paymentMode: salesTable.paymentMode,
      notes: salesTable.notes,
      createdAt: salesTable.createdAt,
    })
    .from(salesTable)
    .leftJoin(customersTable, eq(salesTable.customerId, customersTable.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(salesTable.date));

  res.json(rows);
});

router.post("/sales", requireAuth, async (req, res) => {
  const {
    customerId,
    date,
    discountAmount,
    paidAmount,
    paymentMode,
    notes,
    prescribedBy,
    patientName,
    items,
  } = req.body as {
    customerId?: number;
    date: string;
    discountAmount?: number;
    paidAmount?: number;
    paymentMode?: string;
    notes?: string;
    prescribedBy?: string;
    patientName?: string;
    items: Array<{
      medicineId: number;
      batchId?: number;
      batchNo?: string;
      saleUnit?: string;
      quantity: number;
      salePrice: number;
      discountPercent?: number;
      prescriptionNote?: string;
    }>;
  };

  if (!items?.length) {
    res.status(400).json({ error: "Items required" });
    return;
  }

  let subtotal = 0;
  const itemsWithTotals = items.map((item) => {
    const gross = item.quantity * item.salePrice;
    const discount = ((item.discountPercent ?? 0) / 100) * gross;
    const total = gross - discount;
    subtotal += total;
    return { ...item, total };
  });

  const disc = discountAmount ?? 0;
  const totalAmount = subtotal - disc;
  const paid = paidAmount ?? totalAmount;
  const status = paid >= totalAmount ? "completed" : paid > 0 ? "partial" : "credit";
  const invoiceNo = generateInvoiceNo();

  const [sale] = await db
    .insert(salesTable)
    .values({
      invoiceNo,
      customerId,
      date,
      subtotal: String(subtotal),
      discountAmount: String(disc),
      totalAmount: String(totalAmount),
      paidAmount: String(paid),
      status: status as "completed" | "credit" | "partial",
      paymentMode: paymentMode ?? "cash",
      notes,
      prescribedBy,
      patientName,
      createdBy: req.user?.userId,
    })
    .returning();

  await db.insert(saleItemsTable).values(
    itemsWithTotals.map((item) => ({
      saleId: sale.id,
      medicineId: item.medicineId,
      batchId: item.batchId,
      batchNo: item.batchNo,
      quantityUnits: item.quantity,
      salePriceUnit: String(item.salePrice),
      discountPct: String(item.discountPercent ?? 0),
      totalAmount: String(item.total),
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
        const newQty = Math.max(0, batch.quantityUnits - item.quantity);
        await db
          .update(batchesTable)
          .set({ quantityUnits: newQty })
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
      const credit = totalAmount - paid;
      const newBalance = Number(customer.balance) + credit;
      await db
        .update(customersTable)
        .set({ balance: String(newBalance) })
        .where(eq(customersTable.id, customerId));
      await db.insert(customerLedgerTable).values({
        customerId,
        type: "sale",
        referenceId: sale.id,
        amount: String(totalAmount),
        balance: String(newBalance),
        date,
      });
    }
  }

  res.status(201).json({ ...sale, items: itemsWithTotals });
});

router.get("/sales/:id", requireAuth, async (req, res) => {
  const id = Number(req.params["id"]);
  const [sale] = await db
    .select({
      id: salesTable.id,
      invoiceNo: salesTable.invoiceNo,
      customerId: salesTable.customerId,
      customerName: customersTable.name,
      date: salesTable.date,
      subtotal: salesTable.subtotal,
      discountAmount: salesTable.discountAmount,
      totalAmount: salesTable.totalAmount,
      paidAmount: salesTable.paidAmount,
      status: salesTable.status,
      paymentMode: salesTable.paymentMode,
      notes: salesTable.notes,
      prescribedBy: salesTable.prescribedBy,
      patientName: salesTable.patientName,
      createdAt: salesTable.createdAt,
    })
    .from(salesTable)
    .leftJoin(customersTable, eq(salesTable.customerId, customersTable.id))
    .where(eq(salesTable.id, id))
    .limit(1);

  if (!sale) {
    res.status(404).json({ error: "Sale not found" });
    return;
  }

  const items = await db
    .select({
      id: saleItemsTable.id,
      medicineId: saleItemsTable.medicineId,
      medicineName: medicinesTable.name,
      batchId: saleItemsTable.batchId,
      batchNo: saleItemsTable.batchNo,
      quantity: saleItemsTable.quantityUnits,
      salePrice: saleItemsTable.salePriceUnit,
      discountPercent: saleItemsTable.discountPct,
      totalAmount: saleItemsTable.totalAmount,
    })
    .from(saleItemsTable)
    .leftJoin(medicinesTable, eq(saleItemsTable.medicineId, medicinesTable.id))
    .where(eq(saleItemsTable.saleId, id));

  res.json({ ...sale, items });
});

export default router;
