import { Router } from "express";
import { eq, ilike, or, sql, and, gt, min } from "drizzle-orm";
import { db } from "../lib/db.js";
import { requireAuth, requireManager } from "../middlewares/auth.js";
import {
  medicinesTable,
  batchesTable,
  genericNamesTable,
  categoriesTable,
  companiesTable,
  unitsTable,
  racksTable,
} from "@workspace/db";

const router = Router();

// Helper: map DB fields to the generated Medicine API contract
const medicineSelect = {
  id: medicinesTable.id,
  name: medicinesTable.name,
  genericNameId: medicinesTable.genericNameId,
  genericName: genericNamesTable.name,
  categoryId: medicinesTable.categoryId,
  categoryName: categoriesTable.name,
  companyId: medicinesTable.companyId,
  companyName: companiesTable.name,
  unitId: medicinesTable.unitId,
  unitName: unitsTable.name,
  rackId: medicinesTable.rackId,
  rackName: racksTable.name,
  strength: medicinesTable.strength,
  packingLabel: medicinesTable.packingLabel,
  conversionFactor: medicinesTable.unitsPerPack,
  purchasePrice: medicinesTable.purchasePriceUnit,
  salePrice: medicinesTable.salePriceUnit,
  salePricePack: medicinesTable.salePricePack,
  reorderLevel: medicinesTable.minStock,
  isControlled: medicinesTable.isControlled,
  requiresPrescription: medicinesTable.requiresPrescription,
  description: medicinesTable.description,
  isActive: medicinesTable.isActive,
  createdAt: medicinesTable.createdAt,
};

// Enrich a medicine row with stock fields matching MedicineWithStock contract
function withStock(select: typeof medicineSelect) {
  return {
    ...select,
    totalUnits: sql<number>`COALESCE((SELECT SUM(b.quantity_units) FROM batches b WHERE b.medicine_id = ${medicinesTable.id} AND b.expiry_date >= CURRENT_DATE), 0)`,
    totalPacks: sql<number>`COALESCE((SELECT SUM(b.quantity_units) / NULLIF(${medicinesTable.unitsPerPack}, 0) FROM batches b WHERE b.medicine_id = ${medicinesTable.id} AND b.expiry_date >= CURRENT_DATE), 0)`,
    nearestExpiry: sql<string | null>`(SELECT MIN(b.expiry_date) FROM batches b WHERE b.medicine_id = ${medicinesTable.id} AND b.expiry_date >= CURRENT_DATE AND b.quantity_units > 0)`,
    barcode: medicinesTable.barcode,
    defaultSaleUnit: medicinesTable.defaultSaleUnit,
  };
}

// Map incoming API body fields (generated contract) to DB column names
function mapBodyToDb(body: Record<string, unknown>): Record<string, unknown> {
  const mapped: Record<string, unknown> = { ...body };
  if ("conversionFactor" in body) {
    mapped["unitsPerPack"] = body["conversionFactor"];
    delete mapped["conversionFactor"];
  }
  if ("salePrice" in body) {
    mapped["salePriceUnit"] = body["salePrice"];
    delete mapped["salePrice"];
  }
  if ("purchasePrice" in body) {
    mapped["purchasePriceUnit"] = body["purchasePrice"];
    delete mapped["purchasePrice"];
  }
  if ("reorderLevel" in body) {
    mapped["minStock"] = body["reorderLevel"];
    delete mapped["reorderLevel"];
  }
  // Normalize defaultSaleUnit if invalid
  if (
    "defaultSaleUnit" in mapped &&
    mapped["defaultSaleUnit"] !== "unit" &&
    mapped["defaultSaleUnit"] !== "pack"
  ) {
    delete mapped["defaultSaleUnit"];
  }
  // Remove derived/virtual fields not in DB
  delete mapped["totalUnits"];
  delete mapped["totalPacks"];
  delete mapped["nearestExpiry"];
  delete mapped["genericName"];
  delete mapped["categoryName"];
  delete mapped["companyName"];
  delete mapped["unitName"];
  delete mapped["rackName"];
  return mapped;
}

router.get("/medicines", requireAuth, async (req, res) => {
  const { search, categoryId, companyId, genericNameId, isControlled } =
    req.query as {
      search?: string;
      categoryId?: string;
      companyId?: string;
      genericNameId?: string;
      isControlled?: string;
    };

  const conditions = [eq(medicinesTable.isActive, true)];

  if (search) {
    conditions.push(
      or(
        ilike(medicinesTable.name, `%${search}%`),
        ilike(genericNamesTable.name, `%${search}%`),
        ilike(companiesTable.name, `%${search}%`),
        ilike(medicinesTable.strength, `%${search}%`),
        ilike(medicinesTable.barcode, `%${search}%`)
      )!
    );
  }
  if (categoryId) conditions.push(eq(medicinesTable.categoryId, Number(categoryId)));
  if (companyId) conditions.push(eq(medicinesTable.companyId, Number(companyId)));
  if (genericNameId) conditions.push(eq(medicinesTable.genericNameId, Number(genericNameId)));
  if (isControlled === "true") conditions.push(eq(medicinesTable.isControlled, true));

  const limit = search ? 200 : 100;

  const rows = await db
    .select(withStock(medicineSelect))
    .from(medicinesTable)
    .leftJoin(genericNamesTable, eq(medicinesTable.genericNameId, genericNamesTable.id))
    .leftJoin(categoriesTable, eq(medicinesTable.categoryId, categoriesTable.id))
    .leftJoin(companiesTable, eq(medicinesTable.companyId, companiesTable.id))
    .leftJoin(unitsTable, eq(medicinesTable.unitId, unitsTable.id))
    .leftJoin(racksTable, eq(medicinesTable.rackId, racksTable.id))
    .where(and(...conditions))
    .orderBy(medicinesTable.name)
    .limit(limit);

  res.json(rows);
});

router.post("/medicines", requireAuth, requireManager, async (req, res) => {
  const body = mapBodyToDb(req.body as Record<string, unknown>);
  const [med] = await db.insert(medicinesTable).values(body as typeof medicinesTable.$inferInsert).returning();
  res.status(201).json({
    ...med,
    conversionFactor: med.unitsPerPack,
    salePrice: med.salePriceUnit,
    purchasePrice: med.purchasePriceUnit,
    reorderLevel: med.minStock,
    barcode: med.barcode,
    defaultSaleUnit: med.defaultSaleUnit,
  });
});

router.get("/medicines/:id", requireAuth, async (req, res) => {
  const id = Number(req.params["id"]);
  const [row] = await db
    .select(withStock(medicineSelect))
    .from(medicinesTable)
    .leftJoin(genericNamesTable, eq(medicinesTable.genericNameId, genericNamesTable.id))
    .leftJoin(categoriesTable, eq(medicinesTable.categoryId, categoriesTable.id))
    .leftJoin(companiesTable, eq(medicinesTable.companyId, companiesTable.id))
    .leftJoin(unitsTable, eq(medicinesTable.unitId, unitsTable.id))
    .leftJoin(racksTable, eq(medicinesTable.rackId, racksTable.id))
    .where(eq(medicinesTable.id, id))
    .limit(1);

  if (!row) {
    res.status(404).json({ error: "Medicine not found" });
    return;
  }
  res.json(row);
});

router.patch("/medicines/:id", requireAuth, requireManager, async (req, res) => {
  const id = Number(req.params["id"]);
  const body = mapBodyToDb(req.body as Record<string, unknown>);
  const [med] = await db
    .update(medicinesTable)
    .set(body as Partial<typeof medicinesTable.$inferInsert>)
    .where(eq(medicinesTable.id, id))
    .returning();
  if (!med) {
    res.status(404).json({ error: "Medicine not found" });
    return;
  }
  res.json({
    ...med,
    conversionFactor: med.unitsPerPack,
    salePrice: med.salePriceUnit,
    purchasePrice: med.purchasePriceUnit,
    reorderLevel: med.minStock,
    barcode: med.barcode,
    defaultSaleUnit: med.defaultSaleUnit,
  });
});

router.delete("/medicines/:id", requireAuth, requireManager, async (req, res) => {
  const id = Number(req.params["id"]);
  await db
    .update(medicinesTable)
    .set({ isActive: false })
    .where(eq(medicinesTable.id, id));
  res.status(204).send();
});

router.get("/medicines/:id/batches", requireAuth, async (req, res) => {
  const id = Number(req.params["id"]);
  const today = new Date().toISOString().slice(0, 10);
  const batches = await db
    .select()
    .from(batchesTable)
    .where(
      and(
        eq(batchesTable.medicineId, id),
        gt(batchesTable.quantityUnits, 0),
        sql`${batchesTable.expiryDate} >= ${today}::date`,
      ),
    )
    .orderBy(batchesTable.expiryDate);
  res.json(batches);
});

router.get("/medicines/:id/alternatives", requireAuth, async (req, res) => {
  const id = Number(req.params["id"]);
  const [med] = await db
    .select({ genericNameId: medicinesTable.genericNameId })
    .from(medicinesTable)
    .where(eq(medicinesTable.id, id))
    .limit(1);

  if (!med?.genericNameId) {
    res.json([]);
    return;
  }

  const alts = await db
    .select(withStock(medicineSelect))
    .from(medicinesTable)
    .leftJoin(genericNamesTable, eq(medicinesTable.genericNameId, genericNamesTable.id))
    .leftJoin(categoriesTable, eq(medicinesTable.categoryId, categoriesTable.id))
    .leftJoin(companiesTable, eq(medicinesTable.companyId, companiesTable.id))
    .leftJoin(unitsTable, eq(medicinesTable.unitId, unitsTable.id))
    .leftJoin(racksTable, eq(medicinesTable.rackId, racksTable.id))
    .where(and(
      eq(medicinesTable.genericNameId, med.genericNameId),
      eq(medicinesTable.isActive, true),
    ))
    .orderBy(medicinesTable.name);

  res.json(alts.filter((a) => a.id !== id));
});

router.post("/medicines/adjust-stock", requireAuth, requireManager, async (req, res) => {
  const { medicineId, batchId, adjustmentUnits, reason } = req.body as {
    medicineId: number;
    batchId?: number | null;
    adjustmentUnits: number;
    reason: string;
  };

  if (batchId) {
    const [batch] = await db
      .select()
      .from(batchesTable)
      .where(and(eq(batchesTable.id, batchId), eq(batchesTable.medicineId, medicineId)))
      .limit(1);

    if (!batch) {
      res.status(404).json({ error: "Batch not found for this medicine" });
      return;
    }

    const [updated] = await db
      .update(batchesTable)
      .set({ quantityUnits: Math.max(0, batch.quantityUnits + adjustmentUnits) })
      .where(eq(batchesTable.id, batchId))
      .returning();

    res.json({ batch: updated, reason });
  } else {
    // No batch specified: adjust earliest non-empty batch (FEFO)
    const [batch] = await db
      .select()
      .from(batchesTable)
      .where(and(eq(batchesTable.medicineId, medicineId), gt(batchesTable.quantityUnits, 0)))
      .orderBy(batchesTable.expiryDate)
      .limit(1);

    if (!batch) {
      res.status(404).json({ error: "No available batch found for this medicine" });
      return;
    }

    const [updated] = await db
      .update(batchesTable)
      .set({ quantityUnits: Math.max(0, batch.quantityUnits + adjustmentUnits) })
      .where(eq(batchesTable.id, batch.id))
      .returning();

    res.json({ batch: updated, reason });
  }
});

router.post("/medicines/:id/adjust-stock", requireAuth, requireManager, async (req, res) => {
  const id = Number(req.params["id"]);
  const { batchId, adjustment, adjustmentUnits, reason } = req.body as {
    batchId: number;
    adjustment?: number;
    adjustmentUnits?: number;
    reason?: string;
  };

  const delta = adjustmentUnits ?? adjustment ?? 0;

  const [batch] = await db
    .select()
    .from(batchesTable)
    .where(and(eq(batchesTable.id, batchId), eq(batchesTable.medicineId, id)))
    .limit(1);

  if (!batch) {
    res.status(404).json({ error: "Batch not found" });
    return;
  }

  const [updated] = await db
    .update(batchesTable)
    .set({ quantityUnits: Math.max(0, batch.quantityUnits + delta) })
    .where(eq(batchesTable.id, batchId))
    .returning();

  res.json({ batch: updated, reason });
});

export default router;
