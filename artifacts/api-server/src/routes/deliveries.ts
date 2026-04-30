import { Router } from "express";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { db } from "../lib/db.js";
import { requireAuth, requireManager } from "../middlewares/auth.js";
import { deliveriesTable, customersTable } from "@workspace/db";

const router = Router();

router.get("/deliveries", requireAuth, async (req, res) => {
  const { status, from, to } = req.query as {
    status?: string;
    from?: string;
    to?: string;
  };
  const conditions = [];
  if (status) conditions.push(eq(deliveriesTable.status, status as "pending" | "dispatched" | "delivered" | "cancelled"));
  if (from) conditions.push(gte(deliveriesTable.date, from));
  if (to) conditions.push(lte(deliveriesTable.date, to));

  const rows = await db
    .select({
      id: deliveriesTable.id,
      customerId: deliveriesTable.customerId,
      customerName: deliveriesTable.customerName,
      phone: deliveriesTable.phone,
      address: deliveriesTable.address,
      date: deliveriesTable.date,
      totalAmount: deliveriesTable.totalAmount,
      paidAmount: deliveriesTable.paidAmount,
      status: deliveriesTable.status,
      notes: deliveriesTable.notes,
      proofNote: deliveriesTable.proofNote,
      deliveredAt: deliveriesTable.deliveredAt,
      saleId: deliveriesTable.saleId,
      createdAt: deliveriesTable.createdAt,
    })
    .from(deliveriesTable)
    .leftJoin(customersTable, eq(deliveriesTable.customerId, customersTable.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(deliveriesTable.date));

  res.json(rows);
});

router.post("/deliveries", requireAuth, async (req, res) => {
  const body = req.body as {
    customerId?: number;
    customerName?: string;
    phone?: string;
    address?: string;
    deliveryAddress?: string;
    date?: string;
    scheduledDate?: string;
    totalAmount?: number;
    paidAmount?: number;
    notes?: string;
    saleId?: number;
  };
  const {
    customerId,
    customerName,
    phone,
    totalAmount,
    paidAmount,
    notes,
    saleId,
  } = body;
  const address = body.address ?? body.deliveryAddress;
  const date = body.date ?? body.scheduledDate;

  if (!address) {
    res.status(400).json({ error: "Address is required" });
    return;
  }

  const [row] = await db
    .insert(deliveriesTable)
    .values({
      customerId,
      customerName,
      phone,
      address,
      date: date ?? new Date().toISOString().slice(0, 10),
      totalAmount: String(totalAmount ?? 0),
      paidAmount: String(paidAmount ?? 0),
      notes,
      saleId,
    })
    .returning();

  res.status(201).json(row);
});

router.get("/deliveries/:id", requireAuth, async (req, res) => {
  const id = Number(req.params["id"]);
  const [row] = await db
    .select()
    .from(deliveriesTable)
    .where(eq(deliveriesTable.id, id))
    .limit(1);
  if (!row) {
    res.status(404).json({ error: "Delivery not found" });
    return;
  }
  res.json(row);
});

router.patch("/deliveries/:id", requireAuth, requireManager, async (req, res) => {
  const id = Number(req.params["id"]);
  const { status, notes, phone, address, proofNote, deliveredAt } = req.body as {
    status?: string;
    notes?: string;
    phone?: string;
    address?: string;
    proofNote?: string | null;
    deliveredAt?: string | null;
  };

  const updates: Record<string, unknown> = {};
  if (status) {
    updates["status"] = status;
    // Auto-stamp deliveredAt when client transitions to delivered without sending it
    if (status === "delivered" && deliveredAt === undefined) {
      updates["deliveredAt"] = new Date();
    }
  }
  if (notes !== undefined) updates["notes"] = notes;
  if (phone !== undefined) updates["phone"] = phone;
  if (address !== undefined) updates["address"] = address;
  if (proofNote !== undefined) updates["proofNote"] = proofNote;
  if (deliveredAt !== undefined) {
    updates["deliveredAt"] = deliveredAt ? new Date(deliveredAt) : null;
  }

  const [row] = await db
    .update(deliveriesTable)
    .set(updates)
    .where(eq(deliveriesTable.id, id))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Delivery not found" });
    return;
  }
  res.json(row);
});

export default router;
