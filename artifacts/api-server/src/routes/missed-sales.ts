import { Router } from "express";
import { eq, desc, gte, lte, and } from "drizzle-orm";
import { db } from "../lib/db.js";
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
    })
    .from(missedSalesTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(missedSalesTable.date));

  res.json(rows);
});

router.post("/missed-sales", requireAuth, async (req, res) => {
  const { medicineName, medicineId, quantity, reason, date } = req.body as {
    medicineName: string;
    medicineId?: number;
    quantity: number;
    reason?: string;
    date: string;
  };

  if (!medicineName) {
    res.status(400).json({ error: "Medicine name is required" });
    return;
  }

  const [row] = await db
    .insert(missedSalesTable)
    .values({
      medicineName,
      medicineId,
      quantity: quantity ?? 1,
      reason,
      date: date ?? new Date().toISOString().slice(0, 10),
    })
    .returning();

  res.status(201).json(row);
});

router.delete("/missed-sales/:id", requireAuth, requireManager, async (req, res) => {
  const id = Number(req.params["id"]);
  await db.delete(missedSalesTable).where(eq(missedSalesTable.id, id));
  res.status(204).send();
});

export default router;
