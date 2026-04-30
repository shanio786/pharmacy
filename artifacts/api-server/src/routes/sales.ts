import { Router } from "express";
import { eq, desc, gte, lte, and, asc, gt } from "drizzle-orm";
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
      saleUnit?: string;
      quantity: number;
      salePrice: number;
      discountPercent?: number;
    }>;
  };

  if (!items?.length) {
    res.status(400).json({ error: "Items required" });
    return;
  }

  const today = new Date().toISOString().slice(0, 10);

  // ------------------------------------------------------------------
  // Pre-flight: validate medicines, controlled drug enforcement, and
  // build multi-batch FEFO allocations (may span multiple batches).
  // ------------------------------------------------------------------
  type BatchAllocation = {
    medicineId: number;
    batchId: number;
    batchNo: string;
    quantity: number;
    salePrice: number;
    discountPercent: number;
    saleUnit: string;
    unitsPerPack: number;
  };

  const allocations: BatchAllocation[] = [];

  for (const item of items) {
    // Fetch medicine to check controlled/prescription flag
    const [med] = await db
      .select({
        id: medicinesTable.id,
        name: medicinesTable.name,
        isControlled: medicinesTable.isControlled,
        requiresPrescription: medicinesTable.requiresPrescription,
        unitsPerPack: medicinesTable.unitsPerPack,
      })
      .from(medicinesTable)
      .where(eq(medicinesTable.id, item.medicineId))
      .limit(1);

    if (!med) {
      res.status(400).json({ error: `Medicine ID ${item.medicineId} not found` });
      return;
    }

    if (med.requiresPrescription && (!prescribedBy?.trim() || !patientName?.trim())) {
      res.status(400).json({
        error: `Medicine "${med.name}" requires a prescription. Provide prescribedBy and patientName.`,
      });
      return;
    }

    // Convert pack quantity to units for stock tracking
    const quantityInUnits = item.saleUnit === "pack"
      ? item.quantity * med.unitsPerPack
      : item.quantity;

    let remaining = quantityInUnits;

    if (item.batchId) {
      // Caller specified a batch — validate it belongs to this medicine
      const [batch] = await db
        .select({ id: batchesTable.id, batchNo: batchesTable.batchNo, quantityUnits: batchesTable.quantityUnits })
        .from(batchesTable)
        .where(and(eq(batchesTable.id, item.batchId), eq(batchesTable.medicineId, item.medicineId)))
        .limit(1);

      if (!batch) {
        res.status(400).json({ error: `Batch ID ${item.batchId} not found for medicine "${med.name}"` });
        return;
      }
      if (batch.quantityUnits < remaining) {
        res.status(400).json({
          error: `Insufficient stock in batch ${batch.batchNo}: available ${batch.quantityUnits}, requested ${remaining}`,
        });
        return;
      }
      allocations.push({
        medicineId: item.medicineId,
        batchId: batch.id,
        batchNo: batch.batchNo,
        quantity: remaining,
        salePrice: item.salePrice,
        discountPercent: item.discountPercent ?? 0,
        saleUnit: item.saleUnit ?? "unit",
        unitsPerPack: med.unitsPerPack,
      });
    } else {
      // FEFO: allocate across earliest-expiry non-expired batches until fulfilled
      const batches = await db
        .select({ id: batchesTable.id, batchNo: batchesTable.batchNo, quantityUnits: batchesTable.quantityUnits })
        .from(batchesTable)
        .where(and(
          eq(batchesTable.medicineId, item.medicineId),
          gte(batchesTable.expiryDate, today),
          gt(batchesTable.quantityUnits, 0),
        ))
        .orderBy(asc(batchesTable.expiryDate));

      for (const batch of batches) {
        if (remaining <= 0) break;
        const take = Math.min(batch.quantityUnits, remaining);
        allocations.push({
          medicineId: item.medicineId,
          batchId: batch.id,
          batchNo: batch.batchNo,
          quantity: take,
          salePrice: item.salePrice,
          discountPercent: item.discountPercent ?? 0,
          saleUnit: item.saleUnit ?? "unit",
          unitsPerPack: med.unitsPerPack,
        });
        remaining -= take;
      }

      if (remaining > 0) {
        res.status(400).json({
          error: `Insufficient stock for "${med.name}": requested ${item.quantity}, available ${item.quantity - remaining}`,
        });
        return;
      }
    }
  }

  // ------------------------------------------------------------------
  // Compute totals
  // ------------------------------------------------------------------
  let subtotal = 0;
  const allocationsWithTotal = allocations.map((a) => {
    const gross = a.quantity * a.salePrice;
    const discount = (a.discountPercent / 100) * gross;
    const total = gross - discount;
    subtotal += total;
    return { ...a, total };
  });

  const disc = discountAmount ?? 0;
  const totalAmount = subtotal - disc;
  const paid = paidAmount ?? totalAmount;
  const status = paid >= totalAmount ? "completed" : paid > 0 ? "partial" : "credit";
  const invoiceNo = generateInvoiceNo();

  // ------------------------------------------------------------------
  // All DB writes inside a single transaction
  // ------------------------------------------------------------------
  const result = await db.transaction(async (tx) => {
    const [sale] = await tx
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

    await tx.insert(saleItemsTable).values(
      allocationsWithTotal.map((a) => ({
        saleId: sale.id,
        medicineId: a.medicineId,
        batchId: a.batchId,
        batchNo: a.batchNo,
        quantityUnits: a.quantity,
        salePriceUnit: String(a.salePrice),
        discountPct: String(a.discountPercent),
        totalAmount: String(a.total),
      }))
    );

    // Deduct stock per batch inside the transaction (re-read for safety)
    for (const a of allocationsWithTotal) {
      const [current] = await tx
        .select({ quantityUnits: batchesTable.quantityUnits })
        .from(batchesTable)
        .where(eq(batchesTable.id, a.batchId))
        .limit(1);
      if (!current || current.quantityUnits < a.quantity) {
        throw new Error(`Concurrent stock conflict on batch ${a.batchNo}`);
      }
      await tx
        .update(batchesTable)
        .set({ quantityUnits: current.quantityUnits - a.quantity })
        .where(eq(batchesTable.id, a.batchId));
    }

    // Update customer balance and ledger
    if (customerId) {
      const [customer] = await tx
        .select({ balance: customersTable.balance })
        .from(customersTable)
        .where(eq(customersTable.id, customerId))
        .limit(1);
      if (customer) {
        const credit = totalAmount - paid;
        const newBalance = Number(customer.balance) + credit;
        await tx
          .update(customersTable)
          .set({ balance: String(newBalance) })
          .where(eq(customersTable.id, customerId));
        await tx.insert(customerLedgerTable).values({
          customerId,
          type: "sale",
          referenceId: sale.id,
          amount: String(totalAmount),
          balance: String(newBalance),
          date,
        });
      }
    }

    return sale;
  });

  res.status(201).json({ ...result, items: allocationsWithTotal });
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
