import { Router } from "express";
import { eq, ilike, desc } from "drizzle-orm";
import { db } from "../lib/db.js";
import { requireAuth, requirePharmacist } from "../middlewares/auth.js";
import { customersTable, customerLedgerTable } from "@workspace/db";

const router = Router();

router.get("/customers", requireAuth, async (req, res) => {
  const { search } = req.query as { search?: string };
  let query = db.select().from(customersTable);
  if (search) {
    const rows = await db
      .select()
      .from(customersTable)
      .where(ilike(customersTable.name, `%${search}%`))
      .orderBy(customersTable.name);
    res.json(rows);
    return;
  }
  const rows = await query.orderBy(customersTable.name);
  res.json(rows);
});

router.post("/customers", requireAuth, async (req, res) => {
  const { name, phone, address } = req.body as {
    name: string;
    phone?: string;
    address?: string;
  };
  if (!name) {
    res.status(400).json({ error: "Name is required" });
    return;
  }
  const [row] = await db
    .insert(customersTable)
    .values({ name, phone, address })
    .returning();
  res.status(201).json(row);
});

router.get("/customers/:id", requireAuth, async (req, res) => {
  const id = Number(req.params["id"]);
  const [row] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.id, id))
    .limit(1);
  if (!row) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }
  res.json(row);
});

router.patch("/customers/:id", requireAuth, async (req, res) => {
  const id = Number(req.params["id"]);
  const { name, phone, address } = req.body as {
    name?: string;
    phone?: string;
    address?: string;
  };
  const [row] = await db
    .update(customersTable)
    .set({ name, phone, address })
    .where(eq(customersTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(row);
});

router.delete("/customers/:id", requireAuth, requirePharmacist, async (req, res) => {
  const id = Number(req.params["id"]);
  await db.delete(customersTable).where(eq(customersTable.id, id));
  res.status(204).send();
});

router.get("/customers/:id/ledger", requireAuth, async (req, res) => {
  const id = Number(req.params["id"]);
  const [customer] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.id, id))
    .limit(1);
  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }
  const entries = await db
    .select()
    .from(customerLedgerTable)
    .where(eq(customerLedgerTable.customerId, id))
    .orderBy(desc(customerLedgerTable.date));

  res.json({ customer, entries, balance: Number(customer.balance) });
});

router.post("/customers/:id/payment", requireAuth, requirePharmacist, async (req, res) => {
  const id = Number(req.params["id"]);
  const { amount, date, notes } = req.body as {
    amount: number;
    date: string;
    notes?: string;
  };

  const [customer] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.id, id))
    .limit(1);
  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }

  const newBalance = Number(customer.balance) - amount;
  await db
    .update(customersTable)
    .set({ balance: String(newBalance) })
    .where(eq(customersTable.id, id));

  await db.insert(customerLedgerTable).values({
    customerId: id,
    type: "payment",
    amount: String(amount),
    balance: String(newBalance),
    notes,
    date: date ?? new Date().toISOString().slice(0, 10),
  });

  res.json({ success: true, balance: newBalance });
});

export default router;
