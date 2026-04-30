import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "../lib/db.js";
import { requireAuth, requirePharmacist } from "../middlewares/auth.js";
import {
  purchaseOrdersTable,
  purchaseOrderItemsTable,
  medicinesTable,
  suppliersTable,
} from "@workspace/db";
import { logActivity } from "../lib/activity-log.js";

const router = Router();

router.get("/purchase-orders", requireAuth, requirePharmacist, async (req, res) => {
  const rows = await db
    .select({
      id: purchaseOrdersTable.id,
      supplierId: purchaseOrdersTable.supplierId,
      supplierName: suppliersTable.name,
      status: purchaseOrdersTable.status,
      notes: purchaseOrdersTable.notes,
      createdAt: purchaseOrdersTable.createdAt,
      updatedAt: purchaseOrdersTable.updatedAt,
    })
    .from(purchaseOrdersTable)
    .leftJoin(suppliersTable, eq(purchaseOrdersTable.supplierId, suppliersTable.id))
    .orderBy(desc(purchaseOrdersTable.createdAt));
  res.json(rows);
});

router.get("/purchase-orders/:id", requireAuth, requirePharmacist, async (req, res) => {
  const id = Number(req.params.id);
  const [po] = await db
    .select({
      id: purchaseOrdersTable.id,
      supplierId: purchaseOrdersTable.supplierId,
      supplierName: suppliersTable.name,
      status: purchaseOrdersTable.status,
      notes: purchaseOrdersTable.notes,
      createdAt: purchaseOrdersTable.createdAt,
    })
    .from(purchaseOrdersTable)
    .leftJoin(suppliersTable, eq(purchaseOrdersTable.supplierId, suppliersTable.id))
    .where(eq(purchaseOrdersTable.id, id))
    .limit(1);

  if (!po) {
    res.status(404).json({ error: "Purchase order not found" });
    return;
  }

  const items = await db
    .select({
      id: purchaseOrderItemsTable.id,
      medicineId: purchaseOrderItemsTable.medicineId,
      medicineName: medicinesTable.name,
      quantityPacks: purchaseOrderItemsTable.quantityPacks,
      notes: purchaseOrderItemsTable.notes,
    })
    .from(purchaseOrderItemsTable)
    .innerJoin(medicinesTable, eq(purchaseOrderItemsTable.medicineId, medicinesTable.id))
    .where(eq(purchaseOrderItemsTable.purchaseOrderId, id));

  res.json({ ...po, items });
});

router.post("/purchase-orders", requireAuth, requirePharmacist, async (req, res) => {
  const { supplierId, notes, items } = req.body as {
    supplierId?: number;
    notes?: string;
    items: Array<{ medicineId: number; quantityPacks: number; notes?: string }>;
  };

  if (!items?.length) {
    res.status(400).json({ error: "Items are required" });
    return;
  }

  const result = await db.transaction(async (tx) => {
    const [po] = await tx
      .insert(purchaseOrdersTable)
      .values({
        supplierId: supplierId ?? null,
        notes: notes ?? null,
        createdBy: req.user!.userId,
      })
      .returning();

    await tx.insert(purchaseOrderItemsTable).values(
      items.map((i) => ({
        purchaseOrderId: po.id,
        medicineId: i.medicineId,
        quantityPacks: i.quantityPacks,
        notes: i.notes ?? null,
      }))
    );

    return po;
  });

  await logActivity(
    req.user!.userId,
    "create_purchase_order",
    "purchase_order",
    result.id,
    `PO #${result.id} created with ${items.length} items`
  );

  res.status(201).json(result);
});

router.patch("/purchase-orders/:id/status", requireAuth, requirePharmacist, async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body as { status: "draft" | "sent" | "received" | "cancelled" };

  const [updated] = await db
    .update(purchaseOrdersTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(purchaseOrdersTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Purchase order not found" });
    return;
  }

  await logActivity(
    req.user!.userId,
    "update_purchase_order_status",
    "purchase_order",
    id,
    `PO #${id} status changed to ${status}`
  );

  res.json(updated);
});

router.delete("/purchase-orders/:id", requireAuth, requirePharmacist, async (req, res) => {
  const id = Number(req.params.id);
  const [deleted] = await db
    .delete(purchaseOrdersTable)
    .where(eq(purchaseOrdersTable.id, id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Purchase order not found" });
    return;
  }

  res.json({ success: true });
});

export default router;
