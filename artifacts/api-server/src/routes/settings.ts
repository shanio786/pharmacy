import { Router } from "express";
import { db } from "../lib/db.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";
import { settingsTable } from "@workspace/db";

const router = Router();

router.get("/settings", requireAuth, async (_req, res) => {
  let [row] = await db.select().from(settingsTable).limit(1);
  if (!row) {
    [row] = await db.insert(settingsTable).values({}).returning();
  }
  res.json(row);
});

router.patch("/settings", requireAuth, requireAdmin, async (req, res) => {
  const body = req.body as Partial<typeof settingsTable.$inferInsert>;
  let [row] = await db.select().from(settingsTable).limit(1);

  if (!row) {
    [row] = await db
      .insert(settingsTable)
      .values({ ...body, updatedAt: new Date() })
      .returning();
  } else {
    [row] = await db
      .update(settingsTable)
      .set({ ...body, updatedAt: new Date() })
      .returning();
  }

  res.json(row);
});

export default router;
