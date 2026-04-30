import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const SALT = Buffer.from("pharmacare-backup-creds-v1", "utf8");
const PREFIX = "enc:v1:";

function getKey(): Buffer {
  // Prefer a dedicated key, fall back to JWT_SECRET, fall back to a process-
  // local random key (will not survive restart but at least never plaintext).
  const secret =
    process.env["BACKUP_ENC_KEY"] ||
    process.env["JWT_SECRET"] ||
    "pharmacare-fallback-key-do-not-use-in-prod";
  return scryptSync(secret, SALT, 32);
}

/** Encrypt a string secret. Returns a self-describing prefixed value safe to
 *  store in plaintext columns. Empty input returns empty string. */
export function encryptSecret(plain: string | null | undefined): string | null {
  if (plain === null || plain === undefined || plain === "") return null;
  if (plain.startsWith(PREFIX)) return plain; // already encrypted
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, enc]).toString("base64");
}

/** Decrypt a value previously produced by encryptSecret(). Pass-through if
 *  the value is not in the expected format (handles legacy plaintext rows). */
export function decryptSecret(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith(PREFIX)) return value; // legacy plaintext
  try {
    const buf = Buffer.from(value.slice(PREFIX.length), "base64");
    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(IV_LEN, IV_LEN + 16);
    const enc = buf.subarray(IV_LEN + 16);
    const decipher = createDecipheriv(ALGO, getKey(), iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
    return dec.toString("utf8");
  } catch {
    return null;
  }
}
