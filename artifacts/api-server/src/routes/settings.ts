import { Router } from "express";
import { eq, asc } from "drizzle-orm";
import { db } from "../lib/db.js";
import { requireAuth, requireManager } from "../middlewares/auth.js";
import { settingsTable } from "@workspace/db";

const router = Router();

// Settings is a singleton row. Always work with the row that has the
// smallest id (defensively, in case a stray row ever exists).
async function getOrCreateSettings() {
  const [existing] = await db
    .select()
    .from(settingsTable)
    .orderBy(asc(settingsTable.id))
    .limit(1);
  if (existing) return existing;
  const [created] = await db.insert(settingsTable).values({}).returning();
  return created;
}

router.get("/settings", requireAuth, async (_req, res) => {
  const row = await getOrCreateSettings();
  res.json(row);
});

router.patch("/settings", requireAuth, requireManager, async (req, res) => {
  const body = req.body as Partial<typeof settingsTable.$inferInsert>;
  const current = await getOrCreateSettings();
  const [row] = await db
    .update(settingsTable)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(settingsTable.id, current.id))
    .returning();
  res.json(row);
});

export default router;
