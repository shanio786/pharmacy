import { Router } from "express";
import { eq, desc, gte, lte, and } from "drizzle-orm";
import { db } from "../lib/db.js";
import { genericNamesTable } from "@workspace/db";
import { requireAuth, requireManager } from "../middlewares/auth.js";
import { missedSalesTable, medicinesTable } from "@workspace/db";

const router = Router();

router.get("/missed-sales", requireAuth, async (req, res) => {
  const { from, to } = req.query as { from?: string; to?: string };
  const conditions = [];
  if (from) conditions.push(gte(missedSalesTable.date, from));
  if (to) conditions.push(lte(missedSalesTable.date, to));

  const rows = await db
    .select({
      id: missedSalesTable.id,
      medicineName: missedSalesTable.medicineName,
      medicineId: missedSalesTable.medicineId,
      quantity: missedSalesTable.quantity,
      reason: missedSalesTable.reason,
      date: missedSalesTable.date,
      createdAt: missedSalesTable.createdAt,
      genericName: genericNamesTable.name,
    })
    .from(missedSalesTable)
    .leftJoin(medicinesTable, eq(missedSalesTable.medicineId, medicinesTable.id))
    .leftJoin(
      genericNamesTable,
      eq(medicinesTable.genericNameId, genericNamesTable.id),
    )
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(missedSalesTable.date));

  // Expose canonical OpenAPI field names alongside the DB names so both
  // legacy callers and the generated client see the data they expect.
  res.json(
    rows.map((r) => ({
      id: r.id,
      medicineId: r.medicineId,
      medicineName: r.medicineName,
      genericName: r.genericName ?? null,
      quantityDemanded: r.quantity,
      customerNote: r.reason,
      // Back-compat aliases:
      quantity: r.quantity,
      reason: r.reason,
      date: r.date,
      createdAt:
        r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    })),
  );
});

router.post("/missed-sales", requireAuth, async (req, res) => {
  const body = req.body as {
    medicineName?: string;
    medicineId?: number | null;
    genericName?: string | null;
    quantity?: number;
    quantityDemanded?: number;
    reason?: string | null;
    customerNote?: string | null;
    date?: string;
  };

  if (!body.medicineName || !body.medicineName.trim()) {
    res.status(400).json({ error: "Medicine name is required" });
    return;
  }
  const qty = body.quantityDemanded ?? body.quantity ?? 1;
  if (!Number.isFinite(qty) || qty <= 0) {
    res
      .status(400)
      .json({ error: "quantityDemanded must be a positive number" });
    return;
  }
  const note = body.customerNote ?? body.reason ?? null;

  const [row] = await db
    .insert(missedSalesTable)
    .values({
      medicineName: body.medicineName.trim(),
      medicineId: body.medicineId ?? null,
      quantity: Math.round(qty),
      reason: note,
      date: body.date ?? new Date().toISOString().slice(0, 10),
    })
    .returning();

  res.status(201).json({
    id: row.id,
    medicineId: row.medicineId,
    medicineName: row.medicineName,
    genericName: body.genericName ?? null,
    quantityDemanded: row.quantity,
    customerNote: row.reason,
    quantity: row.quantity,
    reason: row.reason,
    date: row.date,
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : row.createdAt,
  });
});

router.delete(
  "/missed-sales/:id",
  requireAuth,
  requireManager,
  async (req, res) => {
    const id = Number(req.params["id"]);
    await db.delete(missedSalesTable).where(eq(missedSalesTable.id, id));
    res.status(204).send();
  },
);

export default router;
