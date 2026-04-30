import jwt from "jsonwebtoken";
import crypto from "crypto";

const isDev = process.env["NODE_ENV"] !== "production";

const JWT_SECRET = process.env["JWT_SECRET"] ??
  (isDev ? crypto.randomBytes(32).toString("hex") : undefined);

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required in production");
}

if (isDev && !process.env["JWT_SECRET"]) {
  console.warn("[auth] JWT_SECRET not set — using ephemeral random secret. All tokens reset on restart.");
}

const JWT_EXPIRES_IN = "24h";

export interface JwtPayload {
  userId: number;
  username: string;
  role: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET!, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET!) as JwtPayload;
}
