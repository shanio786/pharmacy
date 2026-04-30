import { db } from "./db.js";
import { activityLogsTable } from "@workspace/db";

export async function logActivity(
  userId: number | undefined,
  action: string,
  entityType?: string,
  entityId?: number,
  details?: string,
  ipAddress?: string
) {
  try {
    await db.insert(activityLogsTable).values({
      userId: userId ?? null,
      action,
      entityType: entityType ?? null,
      entityId: entityId ?? null,
      details: details ?? null,
      ipAddress: ipAddress ?? null,
    });
  } catch {
    // Non-fatal: don't let logging failures break requests
  }
}
