import { Router } from "express";
import { eq, desc, sum } from "drizzle-orm";
import { db } from "../lib/db.js";
import { requireAuth, requireManager } from "../middlewares/auth.js";
import {
  stockAuditsTable,
  stockAuditItemsTable,
  batchesTable,
  medicinesTable,
} from "@workspace/db";
import { logActivity } from "../lib/activity-log.js";

const router = Router();

router.get("/stock-audits", requireAuth, async (_req, res) => {
  const rows = await db
    .select()
    .from(stockAuditsTable)
    .orderBy(desc(stockAuditsTable.date));
  res.json(rows);
});

router.post("/stock-audits", requireAuth, requireManager, async (req, res) => {
  const { title, date, notes, items } = req.body as {
    title?: string;
    date: string;
    notes?: string;
    items: Array<{
      medicineId: number;
      batchId?: number;
      physicalCountPacks?: number;
      physicalCountUnits?: number;
      physicalPacks?: number;
      physicalUnits?: number;
    }>;
  };

  const result = await db.transaction(async (tx) => {
    const [audit] = await tx
      .insert(stockAuditsTable)
      .values({
        title: title ?? "Stock Audit",
        status: "completed",
        date: date ?? new Date().toISOString().slice(0, 10),
        notes,
        conductedBy: req.user?.userId,
      })
      .returning();

    const auditItems = [];
    for (const item of items) {
      const [med] = await tx
        .select({ unitsPerPack: medicinesTable.unitsPerPack })
        .from(medicinesTable)
        .where(eq(medicinesTable.id, item.medicineId))
        .limit(1);
      const cf = Number(med?.unitsPerPack ?? 1);

      let systemCountUnits = 0;
      if (item.batchId) {
        const [batch] = await tx
          .select({ quantityUnits: batchesTable.quantityUnits })
          .from(batchesTable)
          .where(eq(batchesTable.id, item.batchId))
          .limit(1);
        systemCountUnits = batch?.quantityUnits ?? 0;
      } else {
        const [agg] = await tx
          .select({ total: sum(batchesTable.quantityUnits) })
          .from(batchesTable)
          .where(eq(batchesTable.medicineId, item.medicineId));
        systemCountUnits = Number(agg?.total ?? 0);
      }

      const packs = item.physicalCountPacks ?? item.physicalPacks ?? 0;
      const units = item.physicalCountUnits ?? item.physicalUnits ?? 0;
      const physicalTotalUnits = Math.round(packs * cf) + units;
      const variance = physicalTotalUnits - systemCountUnits;

      const [auditItem] = await tx
        .insert(stockAuditItemsTable)
        .values({
          auditId: audit.id,
          medicineId: item.medicineId,
          batchId: item.batchId,
          conversionFactor: cf,
          systemCountUnits,
          physicalCountPacks: String(packs),
          physicalCountUnits: units,
          physicalTotalUnits,
          variance,
        })
        .returning();

      auditItems.push(auditItem);

      if (item.batchId && variance !== 0) {
        const [batch] = await tx
          .select({ quantityUnits: batchesTable.quantityUnits })
          .from(batchesTable)
          .where(eq(batchesTable.id, item.batchId))
          .limit(1);
        if (batch) {
          await tx
            .update(batchesTable)
            .set({ quantityUnits: Math.max(0, batch.quantityUnits + variance) })
            .where(eq(batchesTable.id, item.batchId));
        }
      }
    }

    return { audit, auditItems };
  });

  await logActivity(req.user?.userId, "stock_audit_created", "stock_audit", result.audit.id,
    JSON.stringify({ date: result.audit.date, itemCount: result.auditItems.length }));

  res.status(201).json({ ...result.audit, items: result.auditItems });
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

  const rawItems = await db
    .select({
      id: stockAuditItemsTable.id,
      medicineId: stockAuditItemsTable.medicineId,
      medicineName: medicinesTable.name,
      batchId: stockAuditItemsTable.batchId,
      conversionFactor: stockAuditItemsTable.conversionFactor,
      systemCountUnits: stockAuditItemsTable.systemCountUnits,
      physicalCountPacks: stockAuditItemsTable.physicalCountPacks,
      physicalCountUnits: stockAuditItemsTable.physicalCountUnits,
      physicalTotalUnits: stockAuditItemsTable.physicalTotalUnits,
      variance: stockAuditItemsTable.variance,
      notes: stockAuditItemsTable.notes,
    })
    .from(stockAuditItemsTable)
    .leftJoin(medicinesTable, eq(stockAuditItemsTable.medicineId, medicinesTable.id))
    .where(eq(stockAuditItemsTable.auditId, id));

  const items = rawItems.map((r) => ({
    id: r.id,
    medicineId: r.medicineId,
    medicineName: r.medicineName,
    batchId: r.batchId,
    systemUnits: r.systemCountUnits,
    physicalPacks: Number(r.physicalCountPacks),
    physicalUnits: r.physicalCountUnits,
    varianceUnits: r.variance,
    conversionFactor: r.conversionFactor,
    notes: r.notes,
  }));

  res.json({ ...audit, items });
});

export default router;
