import jwt from "jsonwebtoken";

const isDev = process.env["NODE_ENV"] !== "production";

const JWT_SECRET = process.env["JWT_SECRET"] ??
  (isDev ? "pharmacare-dev-only-not-for-production" : undefined);

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required in production");
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
