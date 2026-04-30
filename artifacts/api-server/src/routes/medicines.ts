import { Router } from "express";
import { eq, ilike, or, sql, and, gt } from "drizzle-orm";
import { db } from "../lib/db.js";
import { requireAuth, requirePharmacist } from "../middlewares/auth.js";
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

const medicineWithDetails = {
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
  unitsPerPack: medicinesTable.unitsPerPack,
  purchasePriceUnit: medicinesTable.purchasePriceUnit,
  salePriceUnit: medicinesTable.salePriceUnit,
  salePricePack: medicinesTable.salePricePack,
  minStock: medicinesTable.minStock,
  isControlled: medicinesTable.isControlled,
  requiresPrescription: medicinesTable.requiresPrescription,
  description: medicinesTable.description,
  isActive: medicinesTable.isActive,
  createdAt: medicinesTable.createdAt,
};

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
        ilike(medicinesTable.strength, `%${search}%`)
      )!
    );
  }
  if (categoryId) conditions.push(eq(medicinesTable.categoryId, Number(categoryId)));
  if (companyId) conditions.push(eq(medicinesTable.companyId, Number(companyId)));
  if (genericNameId) conditions.push(eq(medicinesTable.genericNameId, Number(genericNameId)));
  if (isControlled === "true") conditions.push(eq(medicinesTable.isControlled, true));

  const rows = await db
    .select({
      ...medicineWithDetails,
      stockQty: sql<number>`COALESCE((SELECT SUM(${batchesTable.quantityUnits}) FROM ${batchesTable} WHERE ${batchesTable.medicineId} = ${medicinesTable.id} AND ${batchesTable.expiryDate} >= CURRENT_DATE), 0)`,
    })
    .from(medicinesTable)
    .leftJoin(genericNamesTable, eq(medicinesTable.genericNameId, genericNamesTable.id))
    .leftJoin(categoriesTable, eq(medicinesTable.categoryId, categoriesTable.id))
    .leftJoin(companiesTable, eq(medicinesTable.companyId, companiesTable.id))
    .leftJoin(unitsTable, eq(medicinesTable.unitId, unitsTable.id))
    .leftJoin(racksTable, eq(medicinesTable.rackId, racksTable.id))
    .where(and(...conditions))
    .orderBy(medicinesTable.name);

  res.json(rows);
});

router.post("/medicines", requireAuth, requirePharmacist, async (req, res) => {
  const body = req.body;
  const [med] = await db.insert(medicinesTable).values(body).returning();
  res.status(201).json(med);
});

router.get("/medicines/:id", requireAuth, async (req, res) => {
  const id = Number(req.params["id"]);
  const [row] = await db
    .select({
      ...medicineWithDetails,
      stockQty: sql<number>`COALESCE((SELECT SUM(${batchesTable.quantityUnits}) FROM ${batchesTable} WHERE ${batchesTable.medicineId} = ${medicinesTable.id} AND ${batchesTable.expiryDate} >= CURRENT_DATE), 0)`,
    })
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

router.patch("/medicines/:id", requireAuth, requirePharmacist, async (req, res) => {
  const id = Number(req.params["id"]);
  const body = req.body;
  const [med] = await db
    .update(medicinesTable)
    .set(body)
    .where(eq(medicinesTable.id, id))
    .returning();
  if (!med) {
    res.status(404).json({ error: "Medicine not found" });
    return;
  }
  res.json(med);
});

router.delete("/medicines/:id", requireAuth, requirePharmacist, async (req, res) => {
  const id = Number(req.params["id"]);
  await db
    .update(medicinesTable)
    .set({ isActive: false })
    .where(eq(medicinesTable.id, id));
  res.status(204).send();
});

router.get("/medicines/:id/batches", requireAuth, async (req, res) => {
  const id = Number(req.params["id"]);
  const batches = await db
    .select()
    .from(batchesTable)
    .where(and(eq(batchesTable.medicineId, id), gt(batchesTable.quantityUnits, 0)))
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
    .select({
      ...medicineWithDetails,
      stockQty: sql<number>`COALESCE((SELECT SUM(${batchesTable.quantityUnits}) FROM ${batchesTable} WHERE ${batchesTable.medicineId} = ${medicinesTable.id} AND ${batchesTable.expiryDate} >= CURRENT_DATE), 0)`,
    })
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

router.post("/medicines/:id/adjust-stock", requireAuth, requirePharmacist, async (req, res) => {
  const id = Number(req.params["id"]);
  const { batchId, adjustment, reason } = req.body as {
    batchId: number;
    adjustment: number;
    reason?: string;
  };

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
    .set({ quantityUnits: Math.max(0, batch.quantityUnits + adjustment) })
    .where(eq(batchesTable.id, batchId))
    .returning();

  res.json({ batch: updated, reason });
});

export default router;
