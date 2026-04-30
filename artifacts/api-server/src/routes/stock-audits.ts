import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "../lib/db.js";
import { requireAuth } from "../middlewares/auth.js";
import {
  stockAuditsTable,
  stockAuditItemsTable,
  batchesTable,
  medicinesTable,
} from "@workspace/db";

const router = Router();

router.get("/stock-audits", requireAuth, async (_req, res) => {
  const rows = await db
    .select()
    .from(stockAuditsTable)
    .orderBy(desc(stockAuditsTable.date));
  res.json(rows);
});

router.post("/stock-audits", requireAuth, async (req, res) => {
  const { date, notes, items } = req.body as {
    date: string;
    notes?: string;
    items: Array<{
      medicineId: number;
      batchId?: number;
      physicalCount: number;
    }>;
  };

  const [audit] = await db
    .insert(stockAuditsTable)
    .values({
      date: date ?? new Date().toISOString().slice(0, 10),
      notes,
      conductedBy: req.user?.userId,
    })
    .returning();

  const auditItems = [];
  for (const item of items) {
    let systemCount = 0;
    if (item.batchId) {
      const [batch] = await db
        .select()
        .from(batchesTable)
        .where(eq(batchesTable.id, item.batchId))
        .limit(1);
      systemCount = batch?.quantityUnits ?? 0;
    }

    const variance = item.physicalCount - systemCount;
    const [auditItem] = await db
      .insert(stockAuditItemsTable)
      .values({
        auditId: audit.id,
        medicineId: item.medicineId,
        batchId: item.batchId,
        systemCount,
        physicalCount: item.physicalCount,
        variance,
      })
      .returning();

    auditItems.push(auditItem);

    if (item.batchId && variance !== 0) {
      const [batch] = await db
        .select()
        .from(batchesTable)
        .where(eq(batchesTable.id, item.batchId))
        .limit(1);
      if (batch) {
        await db
          .update(batchesTable)
          .set({ quantityUnits: Math.max(0, batch.quantityUnits + variance) })
          .where(eq(batchesTable.id, item.batchId));
      }
    }
  }

  res.status(201).json({ ...audit, items: auditItems });
});

router.get("/stock-audits/:id", requireAuth, async (req, res) => {
  const id = Number(req.params["id"]);
  const [audit] = await db
    .select()
    .from(stockAuditsTable)
    .where(eq(stockAuditsTable.id, id))
    .limit(1);
  if (!audit) {
    res.status(404).json({ error: "Audit not found" });
    return;
  }

  const items = await db
    .select({
      id: stockAuditItemsTable.id,
      medicineId: stockAuditItemsTable.medicineId,
      medicineName: medicinesTable.name,
      batchId: stockAuditItemsTable.batchId,
      systemCount: stockAuditItemsTable.systemCount,
      physicalCount: stockAuditItemsTable.physicalCount,
      variance: stockAuditItemsTable.variance,
      notes: stockAuditItemsTable.notes,
    })
    .from(stockAuditItemsTable)
    .leftJoin(medicinesTable, eq(stockAuditItemsTable.medicineId, medicinesTable.id))
    .where(eq(stockAuditItemsTable.auditId, id));

  res.json({ ...audit, items });
});

export default router;
