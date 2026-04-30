import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { verifyToken, type JwtPayload } from "../lib/jwt.js";
import { db } from "../lib/db.js";
import { usersTable } from "@workspace/db";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const payload = verifyToken(token);
    const [user] = await db
      .select({
        isActive: usersTable.isActive,
        role: usersTable.role,
        username: usersTable.username,
      })
      .from(usersTable)
      .where(eq(usersTable.id, payload.userId))
      .limit(1);
    if (!user?.isActive) {
      res.status(401).json({ error: "Account disabled" });
      return;
    }
    // Re-hydrate role/username from DB so downgrades take effect immediately
    // instead of waiting for the JWT to expire.
    req.user = { ...payload, role: user.role, username: user.username };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Forbidden: admin role required" });
    return;
  }
  next();
}

export function requireManager(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "admin" && req.user?.role !== "manager") {
    res.status(403).json({ error: "Forbidden: manager or admin role required" });
    return;
  }
  next();
}
