import { Router } from "express";
import { eq, desc, gte, lte, and, asc, gt, like, sql } from "drizzle-orm";
import { db } from "../lib/db.js";
import { requireAuth } from "../middlewares/auth.js";
import { logActivity } from "../lib/activity-log.js";
import {
  salesTable,
  saleItemsTable,
  batchesTable,
  medicinesTable,
  customersTable,
  customerLedgerTable,
  prescriptionsTable,
} from "@workspace/db";

const router = Router();

async function nextInvoiceNo(
  tx: { execute: typeof db.execute },
  yyyymmdd: string,
): Promise<string> {
  // Derive next sequence by inspecting the highest invoice number recorded
  // for today directly in the DB. Combined with the unique constraint on
  // sales.invoice_no, this is durable across process restarts and resists
  // concurrent inserts (the caller retries on unique-violation).
  const prefix = `INV-${yyyymmdd}-`;
  const rows = await tx.execute(
    sql`SELECT MAX(CAST(SUBSTRING(invoice_no FROM ${prefix.length + 1}) AS INTEGER)) AS max_seq
        FROM sales WHERE invoice_no LIKE ${prefix + "%"}`,
  );
  const r = rows.rows?.[0] as { max_seq: number | string | null } | undefined;
  const lastSeq = r?.max_seq == null ? 0 : Number(r.max_seq);
  const next = (Number.isFinite(lastSeq) ? lastSeq : 0) + 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

router.get("/sales", requireAuth, async (req, res) => {
  // Accept both dateFrom/dateTo (generated contract) and from/to (legacy)
  const { from, to, dateFrom, dateTo, customerId } = req.query as {
    from?: string;
    to?: string;
    dateFrom?: string;
    dateTo?: string;
    customerId?: string;
  };

  const startDate = dateFrom ?? from;
  const endDate = dateTo ?? to;

  const conditions = [];
  if (startDate) conditions.push(gte(salesTable.date, startDate));
  if (endDate) conditions.push(lte(salesTable.date, endDate));
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
    prescription,
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
    prescription?: {
      doctorName: string;
      doctorLicense?: string;
      prescriptionDate: string;
    };
    items: Array<{
      medicineId: number;
      batchId?: number | null;
      saleUnit?: string;
      quantity: number;
      salePrice: number;
      discountPercent?: number;
      prescriptionNote?: string | null;
    }>;
  };

  if (!items?.length) {
    res.status(400).json({ error: "Items required" });
    return;
  }

  // Validate item quantities and prices are non-negative numbers
  for (const it of items) {
    if (!Number.isFinite(it.quantity) || it.quantity <= 0) {
      res.status(400).json({ error: "Each item quantity must be a positive number" });
      return;
    }
    if (!Number.isFinite(it.salePrice) || it.salePrice < 0) {
      res.status(400).json({ error: "Each item salePrice must be a non-negative number" });
      return;
    }
    if (it.discountPercent != null && (!Number.isFinite(it.discountPercent) || it.discountPercent < 0 || it.discountPercent > 100)) {
      res.status(400).json({ error: "discountPercent must be between 0 and 100" });
      return;
    }
  }
  if (paidAmount != null && (!Number.isFinite(paidAmount) || paidAmount < 0)) {
    res.status(400).json({ error: "paidAmount must be a non-negative number" });
    return;
  }
  if (discountAmount != null && (!Number.isFinite(discountAmount) || discountAmount < 0)) {
    res.status(400).json({ error: "discountAmount must be a non-negative number" });
    return;
  }

  const today = new Date().toISOString().slice(0, 10);

  type BatchAllocation = {
    medicineId: number;
    medicineName: string;
    batchId: number;
    batchNo: string;
    quantityUnits: number;   // units deducted from stock
    requestedQty: number;    // quantity in the requested unit (packs or units)
    salePrice: number;       // price per requested unit (pack price or unit price)
    discountPercent: number;
    saleUnit: string;
    unitsPerPack: number;
    lineTotal: number;       // total for this allocation = requestedQty × salePrice × discount
  };

  const allocations: BatchAllocation[] = [];

  for (const item of items) {
    // Fetch medicine to check controlled/prescription flag and unitsPerPack
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

    // Controlled drug enforcement: require prescription object with doctor details
    if (med.requiresPrescription || med.isControlled) {
      if (!prescription?.doctorName?.trim() || !prescription?.prescriptionDate?.trim()) {
        res.status(400).json({
          error: `"${med.name}" requires a prescription. Provide prescription.doctorName and prescription.prescriptionDate.`,
        });
        return;
      }
    }

    // Convert requested quantity to units for stock deduction
    const saleUnit = item.saleUnit ?? "unit";
    const unitsPerItem = saleUnit === "pack" ? med.unitsPerPack : 1;
    const quantityInUnits = item.quantity * unitsPerItem;

    // Allocation: price is per the requested unit (pack or single) — keep as-is for total
    // Total = quantity × salePrice (NOT quantityInUnits × salePrice)
    const grossPerItem = item.quantity * item.salePrice;
    const discPct = item.discountPercent ?? 0;
    const lineTotal = grossPerItem - (discPct / 100) * grossPerItem;

    let remaining = quantityInUnits;

    if (item.batchId) {
      // Specific batch requested — validate stock + non-expired, then fall through to FEFO for remainder
      const [specBatch] = await db
        .select({
          id: batchesTable.id,
          batchNo: batchesTable.batchNo,
          quantityUnits: batchesTable.quantityUnits,
          expiryDate: batchesTable.expiryDate,
        })
        .from(batchesTable)
        .where(and(eq(batchesTable.id, item.batchId), eq(batchesTable.medicineId, item.medicineId)))
        .limit(1);

      if (!specBatch) {
        res.status(400).json({ error: `Batch ID ${item.batchId} not found for "${med.name}"` });
        return;
      }

      if (specBatch.expiryDate < today) {
        res.status(400).json({
          error: `Batch ${specBatch.batchNo} of "${med.name}" expired on ${specBatch.expiryDate}; cannot be sold.`,
        });
        return;
      }

      const take = Math.min(specBatch.quantityUnits, remaining);
      if (take > 0) {
        allocations.push({
          medicineId: item.medicineId,
          medicineName: med.name,
          batchId: specBatch.id,
          batchNo: specBatch.batchNo,
          quantityUnits: take,
          requestedQty: take / unitsPerItem,
          salePrice: item.salePrice,
          discountPercent: discPct,
          saleUnit,
          unitsPerPack: med.unitsPerPack,
          lineTotal: (take / quantityInUnits) * lineTotal,
        });
        remaining -= take;
      }
    }

    if (remaining > 0) {
      // FEFO: allocate from earliest non-expired batches
      const batches = await db
        .select({ id: batchesTable.id, batchNo: batchesTable.batchNo, quantityUnits: batchesTable.quantityUnits })
        .from(batchesTable)
        .where(and(
          eq(batchesTable.medicineId, item.medicineId),
          gte(batchesTable.expiryDate, today),
          gt(batchesTable.quantityUnits, 0),
        ))
        .orderBy(asc(batchesTable.expiryDate));

      // If batchId was given, skip that batch (already handled above)
      const fefo = item.batchId
        ? batches.filter((b) => b.id !== item.batchId)
        : batches;

      for (const batch of fefo) {
        if (remaining <= 0) break;
        const take = Math.min(batch.quantityUnits, remaining);
        allocations.push({
          medicineId: item.medicineId,
          medicineName: med.name,
          batchId: batch.id,
          batchNo: batch.batchNo,
          quantityUnits: take,
          requestedQty: take / unitsPerItem,
          salePrice: item.salePrice,
          discountPercent: discPct,
          saleUnit,
          unitsPerPack: med.unitsPerPack,
          lineTotal: (take / quantityInUnits) * lineTotal,
        });
        remaining -= take;
      }
    }

    if (remaining > 0) {
      res.status(400).json({
        error: `Insufficient stock for "${med.name}": requested ${item.quantity} ${saleUnit}(s), short by ${Math.ceil(remaining / unitsPerItem)}`,
      });
      return;
    }
  }

  const subtotal = allocations.reduce((sum, a) => sum + a.lineTotal, 0);
  const disc = discountAmount ?? 0;
  if (disc > subtotal) {
    res.status(400).json({ error: "discountAmount cannot exceed subtotal" });
    return;
  }
  const totalAmount = subtotal - disc;
  if (totalAmount < 0) {
    res.status(400).json({ error: "totalAmount cannot be negative" });
    return;
  }
  const paid = paidAmount ?? totalAmount;
  if (paid < 0) {
    res.status(400).json({ error: "paidAmount cannot be negative" });
    return;
  }
  const status = paid >= totalAmount ? "completed" : paid > 0 ? "partial" : "credit";
  const yyyymmdd = (date ?? new Date().toISOString().slice(0, 10)).replace(
    /-/g,
    "",
  );

  const runOnce = async () =>
    db.transaction(async (tx) => {
      const invoiceNo = await nextInvoiceNo(tx, yyyymmdd);
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
      allocations.map((a) => {
        const cf = a.unitsPerPack;
        const pricePerPack =
          a.saleUnit === "pack" ? a.salePrice : a.salePrice * cf;
        const pricePerUnit =
          a.saleUnit === "unit" ? a.salePrice : a.salePrice / cf;
        const packsQty =
          a.saleUnit === "pack" ? a.requestedQty : 0;
        return {
          saleId: sale.id,
          medicineId: a.medicineId,
          batchId: a.batchId,
          batchNo: a.batchNo,
          saleUnit: a.saleUnit,
          quantityPacks: String(packsQty),
          quantityUnits: a.quantityUnits,
          conversionFactor: cf,
          salePricePack: String(pricePerPack),
          salePriceUnit: String(pricePerUnit),
          discountPct: String(a.discountPercent),
          totalAmount: String(a.lineTotal),
        };
      })
    );

    // Insert prescription record if provided
    if (prescription?.doctorName?.trim()) {
      await tx.insert(prescriptionsTable).values({
        saleId: sale.id,
        doctorName: prescription.doctorName.trim(),
        doctorLicense: prescription.doctorLicense?.trim() ?? null,
        prescriptionDate: prescription.prescriptionDate,
        patientName: patientName ?? null,
        notes: notes ?? null,
      });
    }

    // Deduct stock per batch allocation inside the transaction
    for (const a of allocations) {
      const [current] = await tx
        .select({ quantityUnits: batchesTable.quantityUnits })
        .from(batchesTable)
        .where(eq(batchesTable.id, a.batchId))
        .limit(1);
      if (!current || current.quantityUnits < a.quantityUnits) {
        throw new Error(`Concurrent stock conflict on batch ${a.batchNo}`);
      }
      await tx
        .update(batchesTable)
        .set({ quantityUnits: current.quantityUnits - a.quantityUnits })
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

  let result: Awaited<ReturnType<typeof runOnce>>;
  let attempts = 0;
  while (true) {
    try {
      result = await runOnce();
      break;
    } catch (err) {
      const code =
        (err as { code?: string } | undefined)?.code ??
        (err as { cause?: { code?: string } } | undefined)?.cause?.code;
      // Postgres unique-violation: invoice number was claimed by a concurrent
      // request. Retry a few times to pick the next sequence.
      if (code === "23505" && attempts < 5) {
        attempts++;
        continue;
      }
      throw err;
    }
  }

  await logActivity(
    req.user?.userId,
    "create_sale",
    "sale",
    result.id,
    `Sale ${result.invoiceNo} created, total: ${result.totalAmount}`
  );

  const responseItems = allocations.map((a) => ({
    ...a,
    quantity: a.requestedQty,
    totalAmount: a.lineTotal,
  }));
  res.status(201).json({ ...result, items: responseItems });
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

  const rawItems = await db
    .select({
      id: saleItemsTable.id,
      medicineId: saleItemsTable.medicineId,
      medicineName: medicinesTable.name,
      batchId: saleItemsTable.batchId,
      batchNo: saleItemsTable.batchNo,
      saleUnit: saleItemsTable.saleUnit,
      quantityPacks: saleItemsTable.quantityPacks,
      quantityUnits: saleItemsTable.quantityUnits,
      conversionFactor: saleItemsTable.conversionFactor,
      salePricePack: saleItemsTable.salePricePack,
      salePriceUnit: saleItemsTable.salePriceUnit,
      discountPercent: saleItemsTable.discountPct,
      totalAmount: saleItemsTable.totalAmount,
      isControlled: medicinesTable.isControlled,
    })
    .from(saleItemsTable)
    .leftJoin(medicinesTable, eq(saleItemsTable.medicineId, medicinesTable.id))
    .where(eq(saleItemsTable.saleId, id));

  const items = rawItems.map((r) => ({
    id: r.id,
    medicineId: r.medicineId,
    medicineName: r.medicineName,
    batchId: r.batchId,
    batchNo: r.batchNo,
    saleUnit: r.saleUnit,
    quantity: r.saleUnit === "pack" ? Number(r.quantityPacks) : r.quantityUnits,
    unitQuantity: r.conversionFactor,
    salePrice: r.saleUnit === "pack" ? Number(r.salePricePack) : Number(r.salePriceUnit),
    discountPercent: Number(r.discountPercent),
    totalAmount: Number(r.totalAmount),
    isControlled: r.isControlled ?? false,
  }));

  res.json({ ...sale, items });
});

export default router;
