import { Router } from "express";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { db } from "../lib/db.js";
import { requireAuth, requireManager } from "../middlewares/auth.js";
import { deliveriesTable, customersTable } from "@workspace/db";

const router = Router();

type DeliveryRow = {
  id: number;
  saleId: number | null;
  customerId: number | null;
  customerName: string | null;
  phone: string | null;
  address: string;
  date: string;
  totalAmount: string | null;
  paidAmount: string | null;
  status: string;
  notes: string | null;
  proofNote: string | null;
  deliveredAt: Date | null;
  createdAt: Date;
};

function toDto(r: DeliveryRow) {
  return {
    id: r.id,
    saleId: r.saleId,
    customerId: r.customerId,
    customerName: r.customerName,
    customerPhone: r.phone,
    deliveryAddress: r.address,
    scheduledDate: r.date,
    status: r.status,
    totalAmount: r.totalAmount,
    paidAmount: r.paidAmount,
    notes: r.notes,
    proofNote: r.proofNote,
    deliveredAt:
      r.deliveredAt instanceof Date ? r.deliveredAt.toISOString() : r.deliveredAt,
    createdAt:
      r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
  };
}

router.get("/deliveries", requireAuth, async (req, res) => {
  const { status, from, to } = req.query as {
    status?: string;
    from?: string;
    to?: string;
  };
  const conditions = [];
  if (status)
    conditions.push(
      eq(
        deliveriesTable.status,
        status as "pending" | "dispatched" | "delivered" | "cancelled",
      ),
    );
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

  res.json(rows.map(toDto));
});

router.post("/deliveries", requireAuth, async (req, res) => {
  const body = req.body as {
    customerId?: number | null;
    customerName?: string | null;
    phone?: string | null;
    customerPhone?: string | null;
    address?: string | null;
    deliveryAddress?: string | null;
    date?: string | null;
    scheduledDate?: string | null;
    totalAmount?: number | string;
    paidAmount?: number | string;
    notes?: string | null;
    saleId?: number | null;
  };
  const address = body.deliveryAddress ?? body.address;
  const date = body.scheduledDate ?? body.date;
  const phone = body.customerPhone ?? body.phone;

  if (!address) {
    res.status(400).json({ error: "deliveryAddress is required" });
    return;
  }

  const [row] = await db
    .insert(deliveriesTable)
    .values({
      customerId: body.customerId ?? null,
      customerName: body.customerName ?? null,
      phone: phone ?? null,
      address,
      date: date ?? new Date().toISOString().slice(0, 10),
      totalAmount: String(body.totalAmount ?? 0),
      paidAmount: String(body.paidAmount ?? 0),
      notes: body.notes ?? null,
      saleId: body.saleId ?? null,
    })
    .returning();

  res.status(201).json(toDto(row as DeliveryRow));
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
  res.json(toDto(row as DeliveryRow));
});

router.patch(
  "/deliveries/:id",
  requireAuth,
  requireManager,
  async (req, res) => {
    const id = Number(req.params["id"]);
    const body = req.body as {
      status?: string;
      notes?: string | null;
      phone?: string | null;
      customerPhone?: string | null;
      address?: string | null;
      deliveryAddress?: string | null;
      scheduledDate?: string | null;
      proofNote?: string | null;
      deliveredAt?: string | null;
    };

    const updates: Record<string, unknown> = {};
    if (body.status) {
      updates["status"] = body.status;
      if (body.status === "delivered" && body.deliveredAt === undefined) {
        updates["deliveredAt"] = new Date();
      }
    }
    if (body.notes !== undefined) updates["notes"] = body.notes;
    const phone = body.customerPhone ?? body.phone;
    if (phone !== undefined) updates["phone"] = phone;
    const address = body.deliveryAddress ?? body.address;
    if (address !== undefined) updates["address"] = address;
    if (body.scheduledDate !== undefined) updates["date"] = body.scheduledDate;
    if (body.proofNote !== undefined) updates["proofNote"] = body.proofNote;
    if (body.deliveredAt !== undefined) {
      updates["deliveredAt"] = body.deliveredAt
        ? new Date(body.deliveredAt)
        : null;
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
    res.json(toDto(row as DeliveryRow));
  },
);

export default router;
