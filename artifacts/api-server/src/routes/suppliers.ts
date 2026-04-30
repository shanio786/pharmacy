import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "../lib/db.js";
import { requireAuth, requirePharmacist } from "../middlewares/auth.js";
import { suppliersTable, supplierLedgerTable } from "@workspace/db";

const router = Router();

router.get("/suppliers", requireAuth, async (_req, res) => {
  const rows = await db
    .select()
    .from(suppliersTable)
    .orderBy(suppliersTable.name);
  res.json(rows);
});

router.post("/suppliers", requireAuth, requirePharmacist, async (req, res) => {
  const { name, contact, address, email, ntn } = req.body as {
    name: string;
    contact?: string;
    address?: string;
    email?: string;
    ntn?: string;
  };
  if (!name) {
    res.status(400).json({ error: "Name is required" });
    return;
  }
  const [row] = await db
    .insert(suppliersTable)
    .values({ name, contact, address, email, ntn })
    .returning();
  res.status(201).json(row);
});

router.get("/suppliers/:id", requireAuth, async (req, res) => {
  const id = Number(req.params["id"]);
  const [row] = await db
    .select()
    .from(suppliersTable)
    .where(eq(suppliersTable.id, id))
    .limit(1);
  if (!row) {
    res.status(404).json({ error: "Supplier not found" });
    return;
  }
  res.json(row);
});

router.patch("/suppliers/:id", requireAuth, requirePharmacist, async (req, res) => {
  const id = Number(req.params["id"]);
  const { name, contact, address, email, ntn } = req.body as {
    name?: string;
    contact?: string;
    address?: string;
    email?: string;
    ntn?: string;
  };
  const [row] = await db
    .update(suppliersTable)
    .set({ name, contact, address, email, ntn })
    .where(eq(suppliersTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(row);
});

router.delete("/suppliers/:id", requireAuth, requirePharmacist, async (req, res) => {
  const id = Number(req.params["id"]);
  await db.delete(suppliersTable).where(eq(suppliersTable.id, id));
  res.status(204).send();
});

router.get("/suppliers/:id/ledger", requireAuth, async (req, res) => {
  const id = Number(req.params["id"]);
  const [supplier] = await db
    .select()
    .from(suppliersTable)
    .where(eq(suppliersTable.id, id))
    .limit(1);
  if (!supplier) {
    res.status(404).json({ error: "Supplier not found" });
    return;
  }
  const entries = await db
    .select()
    .from(supplierLedgerTable)
    .where(eq(supplierLedgerTable.supplierId, id))
    .orderBy(desc(supplierLedgerTable.date));

  res.json({ supplier, entries, balance: Number(supplier.balance) });
});

router.post("/suppliers/:id/pay", requireAuth, requirePharmacist, async (req, res) => {
  const id = Number(req.params["id"]);
  const { amount, date, notes } = req.body as {
    amount: number;
    date: string;
    notes?: string;
  };

  const [supplier] = await db
    .select()
    .from(suppliersTable)
    .where(eq(suppliersTable.id, id))
    .limit(1);
  if (!supplier) {
    res.status(404).json({ error: "Supplier not found" });
    return;
  }

  const newBalance = Number(supplier.balance) - amount;
  await db
    .update(suppliersTable)
    .set({ balance: String(newBalance) })
    .where(eq(suppliersTable.id, id));

  await db.insert(supplierLedgerTable).values({
    supplierId: id,
    type: "payment",
    amount: String(amount),
    balance: String(newBalance),
    notes,
    date: date ?? new Date().toISOString().slice(0, 10),
  });

  res.json({ success: true, balance: newBalance });
});

export default router;
