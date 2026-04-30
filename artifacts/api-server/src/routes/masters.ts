import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../lib/db.js";
import { requireAuth, requireManager } from "../middlewares/auth.js";
import {
  categoriesTable,
  companiesTable,
  unitsTable,
  racksTable,
  genericNamesTable,
} from "@workspace/db";

const router = Router();

// ─── Categories ───────────────────────────────────────────────────────────────

router.get("/categories", requireAuth, async (_req, res) => {
  const rows = await db
    .select()
    .from(categoriesTable)
    .orderBy(categoriesTable.name);
  res.json(rows);
});

router.post("/categories", requireAuth, requireManager, async (req, res) => {
  const { name, description } = req.body as {
    name: string;
    description?: string;
  };
  if (!name) {
    res.status(400).json({ error: "Name is required" });
    return;
  }
  const [row] = await db
    .insert(categoriesTable)
    .values({ name, description })
    .returning();
  res.status(201).json(row);
});

router.patch("/categories/:id", requireAuth, requireManager, async (req, res) => {
  const id = Number(req.params["id"]);
  const { name, description } = req.body as {
    name?: string;
    description?: string;
  };
  const [row] = await db
    .update(categoriesTable)
    .set({ name, description })
    .where(eq(categoriesTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(row);
});

router.delete("/categories/:id", requireAuth, requireManager, async (req, res) => {
  const id = Number(req.params["id"]);
  await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
  res.status(204).send();
});

// ─── Companies ────────────────────────────────────────────────────────────────

router.get("/companies", requireAuth, async (_req, res) => {
  const rows = await db
    .select()
    .from(companiesTable)
    .orderBy(companiesTable.name);
  res.json(rows);
});

router.post("/companies", requireAuth, requireManager, async (req, res) => {
  const { name, contact } = req.body as { name: string; contact?: string };
  if (!name) {
    res.status(400).json({ error: "Name is required" });
    return;
  }
  const [row] = await db
    .insert(companiesTable)
    .values({ name, contact })
    .returning();
  res.status(201).json(row);
});

router.patch("/companies/:id", requireAuth, requireManager, async (req, res) => {
  const id = Number(req.params["id"]);
  const { name, contact } = req.body as { name?: string; contact?: string };
  const [row] = await db
    .update(companiesTable)
    .set({ name, contact })
    .where(eq(companiesTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(row);
});

router.delete("/companies/:id", requireAuth, requireManager, async (req, res) => {
  const id = Number(req.params["id"]);
  await db.delete(companiesTable).where(eq(companiesTable.id, id));
  res.status(204).send();
});

// ─── Units ────────────────────────────────────────────────────────────────────

router.get("/units", requireAuth, async (_req, res) => {
  const rows = await db.select().from(unitsTable).orderBy(unitsTable.name);
  res.json(rows);
});

router.post("/units", requireAuth, requireManager, async (req, res) => {
  const { name } = req.body as { name: string };
  if (!name) {
    res.status(400).json({ error: "Name is required" });
    return;
  }
  const [row] = await db.insert(unitsTable).values({ name }).returning();
  res.status(201).json(row);
});

router.patch("/units/:id", requireAuth, requireManager, async (req, res) => {
  const id = Number(req.params["id"]);
  const { name } = req.body as { name?: string };
  const [row] = await db
    .update(unitsTable)
    .set({ name })
    .where(eq(unitsTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(row);
});

router.delete("/units/:id", requireAuth, requireManager, async (req, res) => {
  const id = Number(req.params["id"]);
  await db.delete(unitsTable).where(eq(unitsTable.id, id));
  res.status(204).send();
});

// ─── Racks ────────────────────────────────────────────────────────────────────

router.get("/racks", requireAuth, async (_req, res) => {
  const rows = await db.select().from(racksTable).orderBy(racksTable.name);
  res.json(rows);
});

router.post("/racks", requireAuth, requireManager, async (req, res) => {
  const { name, description } = req.body as {
    name: string;
    description?: string;
  };
  if (!name) {
    res.status(400).json({ error: "Name is required" });
    return;
  }
  const [row] = await db
    .insert(racksTable)
    .values({ name, description })
    .returning();
  res.status(201).json(row);
});

router.patch("/racks/:id", requireAuth, requireManager, async (req, res) => {
  const id = Number(req.params["id"]);
  const { name, description } = req.body as {
    name?: string;
    description?: string;
  };
  const [row] = await db
    .update(racksTable)
    .set({ name, description })
    .where(eq(racksTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(row);
});

router.delete("/racks/:id", requireAuth, requireManager, async (req, res) => {
  const id = Number(req.params["id"]);
  await db.delete(racksTable).where(eq(racksTable.id, id));
  res.status(204).send();
});

// ─── Generic Names ────────────────────────────────────────────────────────────

router.get("/generic-names", requireAuth, async (_req, res) => {
  const rows = await db
    .select()
    .from(genericNamesTable)
    .orderBy(genericNamesTable.name);
  res.json(rows);
});

router.post("/generic-names", requireAuth, requireManager, async (req, res) => {
  const { name } = req.body as { name: string };
  if (!name) {
    res.status(400).json({ error: "Name is required" });
    return;
  }
  const [row] = await db
    .insert(genericNamesTable)
    .values({ name })
    .returning();
  res.status(201).json(row);
});

router.patch("/generic-names/:id", requireAuth, requireManager, async (req, res) => {
  const id = Number(req.params["id"]);
  const { name } = req.body as { name?: string };
  const [row] = await db
    .update(genericNamesTable)
    .set({ name })
    .where(eq(genericNamesTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(row);
});

router.delete("/generic-names/:id", requireAuth, requireManager, async (req, res) => {
  const id = Number(req.params["id"]);
  await db.delete(genericNamesTable).where(eq(genericNamesTable.id, id));
  res.status(204).send();
});

export default router;
