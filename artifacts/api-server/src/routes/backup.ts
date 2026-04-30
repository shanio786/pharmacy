import { Router } from "express";
import { spawn } from "node:child_process";
import { promises as fs, createReadStream } from "node:fs";
import path from "node:path";
import os from "node:os";
import multer from "multer";
import SftpClient from "ssh2-sftp-client";
import { eq } from "drizzle-orm";
import { db } from "../lib/db.js";
import { settingsTable } from "@workspace/db";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";
import { logger } from "../lib/logger.js";
import { encryptSecret, decryptSecret } from "../lib/crypto.js";

const router = Router();

const BACKUP_DIR =
  process.env["PHARMACARE_BACKUP_DIR"] ||
  path.join(os.tmpdir(), "pharmacare-backups");

await fs.mkdir(BACKUP_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: BACKUP_DIR,
    filename: (_req, file, cb) =>
      cb(null, `restore-${Date.now()}-${file.originalname.replace(/[^\w.-]/g, "_")}`),
  }),
  limits: { fileSize: 1024 * 1024 * 1024 }, // 1 GB
});

function parseDatabaseUrl(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: u.port || "5432",
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ""),
  };
}

function runPgDump(outFile: string): Promise<void> {
  const dbUrl = process.env["DATABASE_URL"];
  if (!dbUrl) throw new Error("DATABASE_URL not set");
  const { host, port, user, password, database } = parseDatabaseUrl(dbUrl);
  return new Promise((resolve, reject) => {
    const env = { ...process.env, PGPASSWORD: password };
    const args = [
      "-h", host, "-p", port, "-U", user, "-d", database,
      "--no-owner", "--no-privileges", "--clean", "--if-exists",
      "-f", outFile,
    ];
    const proc = spawn("pg_dump", args, { env });
    let stderr = "";
    proc.stderr.on("data", (d) => { stderr += d.toString(); });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`pg_dump exited ${code}: ${stderr.slice(0, 500)}`));
    });
  });
}

function runPsqlRestore(sqlFile: string): Promise<void> {
  const dbUrl = process.env["DATABASE_URL"];
  if (!dbUrl) throw new Error("DATABASE_URL not set");
  const { host, port, user, password, database } = parseDatabaseUrl(dbUrl);
  return new Promise((resolve, reject) => {
    const env = { ...process.env, PGPASSWORD: password };
    const args = [
      "-h", host, "-p", port, "-U", user, "-d", database,
      "-v", "ON_ERROR_STOP=1", "-f", sqlFile,
    ];
    const proc = spawn("psql", args, { env });
    let stderr = "";
    proc.stderr.on("data", (d) => { stderr += d.toString(); });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`psql exited ${code}: ${stderr.slice(0, 800)}`));
    });
  });
}

async function uploadToVps(
  filePath: string,
  filename: string,
  cfg: {
    host: string;
    port: number;
    user: string;
    remotePath: string;
    password?: string | null;
    privateKey?: string | null;
  },
): Promise<void> {
  const sftp = new SftpClient();
  try {
    await sftp.connect({
      host: cfg.host,
      port: cfg.port,
      username: cfg.user,
      ...(cfg.privateKey ? { privateKey: cfg.privateKey } : {}),
      ...(cfg.password ? { password: cfg.password } : {}),
      readyTimeout: 15000,
    });
    const remoteDir = cfg.remotePath || ".";
    try { await sftp.mkdir(remoteDir, true); } catch { /* ignore */ }
    const remoteFile = `${remoteDir.replace(/\/$/, "")}/${filename}`;
    await sftp.fastPut(filePath, remoteFile);
  } finally {
    try { await sftp.end(); } catch { /* ignore */ }
  }
}

async function uploadToDrive(
  filePath: string,
  filename: string,
  cfg: { accessToken: string; folderId?: string | null },
): Promise<{ id: string; name: string }> {
  const data = await fs.readFile(filePath);
  const metadata: Record<string, unknown> = { name: filename };
  if (cfg.folderId) metadata["parents"] = [cfg.folderId];
  const boundary = `----PharmaCare${Date.now()}`;
  const head =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: application/sql\r\n\r\n`;
  const tail = `\r\n--${boundary}--`;
  const body = Buffer.concat([Buffer.from(head, "utf8"), data, Buffer.from(tail, "utf8")]);
  const resp = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
        "Content-Length": String(body.length),
      },
      body,
    },
  );
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Drive upload failed (${resp.status}): ${text.slice(0, 300)}`);
  }
  return (await resp.json()) as { id: string; name: string };
}

async function pruneOldBackups(retention: number) {
  if (!Number.isFinite(retention) || retention <= 0) return;
  const files = (await fs.readdir(BACKUP_DIR))
    .filter((f) => f.startsWith("backup-") && f.endsWith(".sql"))
    .sort()
    .reverse();
  for (const f of files.slice(retention)) {
    try { await fs.unlink(path.join(BACKUP_DIR, f)); } catch { /* ignore */ }
  }
}

async function loadSettings() {
  const [s] = await db.select().from(settingsTable).limit(1);
  return s ?? null;
}

async function markBackupRun(status: string) {
  const [s] = await db.select({ id: settingsTable.id }).from(settingsTable).limit(1);
  if (!s) return;
  await db
    .update(settingsTable)
    .set({ backupLastRunAt: new Date(), backupLastStatus: status })
    .where(eq(settingsTable.id, s.id));
}

router.get("/backup/list", requireAuth, requireAdmin, async (_req, res) => {
  const files = (await fs.readdir(BACKUP_DIR)).filter(
    (f) => f.startsWith("backup-") && f.endsWith(".sql"),
  );
  const rows = await Promise.all(
    files.map(async (f) => {
      const st = await fs.stat(path.join(BACKUP_DIR, f));
      return { filename: f, size: st.size, createdAt: st.mtime.toISOString() };
    }),
  );
  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const settings = await loadSettings();
  res.json({
    backups: rows,
    lastRunAt: settings?.backupLastRunAt ?? null,
    lastStatus: settings?.backupLastStatus ?? null,
  });
});

router.post("/backup/now", requireAuth, requireAdmin, async (req, res) => {
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `backup-${ts}.sql`;
  const filepath = path.join(BACKUP_DIR, filename);
  const uploads: { vps?: boolean; drive?: boolean } = {};
  const errors: string[] = [];
  try {
    await runPgDump(filepath);
    const settings = await loadSettings();
    const wantsVps = (req.body as { uploadVps?: boolean })?.uploadVps !== false;
    const wantsDrive = (req.body as { uploadDrive?: boolean })?.uploadDrive !== false;

    if (
      wantsVps && settings?.backupVpsHost && settings.backupVpsUser &&
      (settings.backupVpsPassword || settings.backupVpsPrivateKey)
    ) {
      try {
        await uploadToVps(filepath, filename, {
          host: settings.backupVpsHost,
          port: settings.backupVpsPort ?? 22,
          user: settings.backupVpsUser,
          remotePath: settings.backupVpsPath || ".",
          password: decryptSecret(settings.backupVpsPassword),
          privateKey: decryptSecret(settings.backupVpsPrivateKey),
        });
        uploads.vps = true;
      } catch (e) {
        uploads.vps = false;
        errors.push(`VPS: ${e instanceof Error ? e.message : String(e)}`);
        logger.error({ err: e }, "vps_upload_failed");
      }
    }
    if (wantsDrive && settings?.backupDriveAccessToken) {
      const driveToken = decryptSecret(settings.backupDriveAccessToken);
      if (!driveToken) {
        uploads.drive = false;
        errors.push("Drive: token decrypt failed");
      } else try {
        await uploadToDrive(filepath, filename, {
          accessToken: driveToken,
          folderId: settings.backupDriveFolderId,
        });
        uploads.drive = true;
      } catch (e) {
        uploads.drive = false;
        errors.push(`Drive: ${e instanceof Error ? e.message : String(e)}`);
        logger.error({ err: e }, "drive_upload_failed");
      }
    }
    await pruneOldBackups(settings?.backupRetention ?? 30);
    const status = errors.length ? `partial: ${errors.join("; ")}` : "ok";
    await markBackupRun(status);
    const stat = await fs.stat(filepath);
    res.status(201).json({
      filename,
      size: stat.size,
      uploads,
      errors,
      createdAt: stat.mtime.toISOString(),
    });
  } catch (e) {
    await markBackupRun(`failed: ${e instanceof Error ? e.message : String(e)}`);
    res.status(500).json({
      error: e instanceof Error ? e.message : "Backup failed",
    });
  }
});

router.get(
  "/backup/download/:filename",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const raw = req.params["filename"];
    const filename = path.basename(typeof raw === "string" ? raw : "");
    if (!filename.startsWith("backup-") || !filename.endsWith(".sql")) {
      res.status(400).json({ error: "Invalid filename" });
      return;
    }
    const filepath = path.join(BACKUP_DIR, filename);
    try {
      await fs.access(filepath);
    } catch {
      res.status(404).json({ error: "Backup not found" });
      return;
    }
    res.setHeader("Content-Type", "application/sql");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`,
    );
    createReadStream(filepath).pipe(res);
  },
);

router.delete(
  "/backup/:filename",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const raw = req.params["filename"];
    const filename = path.basename(typeof raw === "string" ? raw : "");
    if (!filename.startsWith("backup-") || !filename.endsWith(".sql")) {
      res.status(400).json({ error: "Invalid filename" });
      return;
    }
    try {
      await fs.unlink(path.join(BACKUP_DIR, filename));
    } catch {
      res.status(404).json({ error: "Backup not found" });
      return;
    }
    res.status(204).send();
  },
);

router.post(
  "/backup/restore",
  requireAuth,
  requireAdmin,
  upload.single("file"),
  async (req, res) => {
    const file = (req as { file?: Express.Multer.File }).file;
    if (!file) {
      res.status(400).json({ error: "SQL file is required" });
      return;
    }
    try {
      await runPsqlRestore(file.path);
      res.json({
        ok: true,
        restoredFrom: file.originalname,
        size: file.size,
      });
    } catch (e) {
      res.status(500).json({
        error: e instanceof Error ? e.message : "Restore failed",
      });
    } finally {
      try { await fs.unlink(file.path); } catch { /* ignore */ }
    }
  },
);

router.post(
  "/backup/test-vps",
  requireAuth,
  requireAdmin,
  async (_req, res) => {
    const settings = await loadSettings();
    if (!settings?.backupVpsHost || !settings.backupVpsUser) {
      res.status(400).json({ error: "VPS host and user are required" });
      return;
    }
    if (!settings.backupVpsPassword && !settings.backupVpsPrivateKey) {
      res.status(400).json({ error: "VPS password or private key is required" });
      return;
    }
    const sftp = new SftpClient();
    try {
      await sftp.connect({
        host: settings.backupVpsHost,
        port: settings.backupVpsPort ?? 22,
        username: settings.backupVpsUser,
        ...(settings.backupVpsPrivateKey ? { privateKey: settings.backupVpsPrivateKey } : {}),
        ...(settings.backupVpsPassword ? { password: settings.backupVpsPassword } : {}),
        readyTimeout: 15000,
      });
      try { await sftp.list(settings.backupVpsPath || "."); } catch { /* ok */ }
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({
        error: e instanceof Error ? e.message : "VPS connection failed",
      });
    } finally {
      try { await sftp.end(); } catch { /* ignore */ }
    }
  },
);

router.get("/backup/config", requireAuth, requireAdmin, async (_req, res) => {
  const settings = await loadSettings();
  if (!settings) {
    res.json({});
    return;
  }
  res.json({
    backupSchedule: settings.backupSchedule,
    backupHour: settings.backupHour,
    backupRetention: settings.backupRetention,
    backupVpsHost: settings.backupVpsHost,
    backupVpsPort: settings.backupVpsPort,
    backupVpsUser: settings.backupVpsUser,
    backupVpsPath: settings.backupVpsPath,
    // Never echo raw credentials back; just indicate presence.
    backupVpsPasswordSet: Boolean(settings.backupVpsPassword),
    backupVpsPrivateKeySet: Boolean(settings.backupVpsPrivateKey),
    backupDriveFolderId: settings.backupDriveFolderId,
    backupDriveAccessTokenSet: Boolean(settings.backupDriveAccessToken),
    backupLastRunAt: settings.backupLastRunAt,
    backupLastStatus: settings.backupLastStatus,
  });
});

router.put("/backup/config", requireAuth, requireAdmin, async (req, res) => {
  const body = req.body as {
    backupSchedule?: string;
    backupHour?: number;
    backupRetention?: number;
    backupVpsHost?: string | null;
    backupVpsPort?: number;
    backupVpsUser?: string | null;
    backupVpsPath?: string | null;
    backupVpsPassword?: string | null;
    backupVpsPrivateKey?: string | null;
    backupDriveFolderId?: string | null;
    backupDriveAccessToken?: string | null;
  };
  const [s] = await db.select({ id: settingsTable.id }).from(settingsTable).limit(1);
  if (!s) {
    res.status(500).json({ error: "Settings row missing" });
    return;
  }
  const patch: Record<string, unknown> = {};
  if (body.backupSchedule !== undefined) {
    if (!["off", "daily", "weekly"].includes(body.backupSchedule)) {
      res.status(400).json({ error: "backupSchedule must be off|daily|weekly" });
      return;
    }
    patch["backupSchedule"] = body.backupSchedule;
  }
  if (body.backupHour !== undefined) {
    const h = Number(body.backupHour);
    if (!Number.isInteger(h) || h < 0 || h > 23) {
      res.status(400).json({ error: "backupHour must be 0-23" });
      return;
    }
    patch["backupHour"] = h;
  }
  if (body.backupRetention !== undefined) {
    const n = Number(body.backupRetention);
    if (!Number.isInteger(n) || n < 1 || n > 365) {
      res.status(400).json({ error: "backupRetention must be 1-365" });
      return;
    }
    patch["backupRetention"] = n;
  }
  if (body.backupVpsHost !== undefined) patch["backupVpsHost"] = body.backupVpsHost || null;
  if (body.backupVpsPort !== undefined) {
    const p = Number(body.backupVpsPort);
    if (!Number.isInteger(p) || p < 1 || p > 65535) {
      res.status(400).json({ error: "backupVpsPort must be 1-65535" });
      return;
    }
    patch["backupVpsPort"] = p;
  }
  if (body.backupVpsUser !== undefined) patch["backupVpsUser"] = body.backupVpsUser || null;
  if (body.backupVpsPath !== undefined) patch["backupVpsPath"] = body.backupVpsPath || null;
  // Only update credentials when caller sends a non-empty value.
  // Encrypt-at-rest with AES-256-GCM keyed off BACKUP_ENC_KEY||JWT_SECRET so
  // a DB dump alone never exposes a usable VPS / Drive credential.
  if (typeof body.backupVpsPassword === "string" && body.backupVpsPassword) {
    patch["backupVpsPassword"] = encryptSecret(body.backupVpsPassword);
  } else if (body.backupVpsPassword === null) {
    patch["backupVpsPassword"] = null;
  }
  if (typeof body.backupVpsPrivateKey === "string" && body.backupVpsPrivateKey) {
    patch["backupVpsPrivateKey"] = encryptSecret(body.backupVpsPrivateKey);
  } else if (body.backupVpsPrivateKey === null) {
    patch["backupVpsPrivateKey"] = null;
  }
  if (body.backupDriveFolderId !== undefined) patch["backupDriveFolderId"] = body.backupDriveFolderId || null;
  if (typeof body.backupDriveAccessToken === "string" && body.backupDriveAccessToken) {
    patch["backupDriveAccessToken"] = encryptSecret(body.backupDriveAccessToken);
  } else if (body.backupDriveAccessToken === null) {
    patch["backupDriveAccessToken"] = null;
  }
  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }
  await db.update(settingsTable).set(patch).where(eq(settingsTable.id, s.id));
  res.json({ ok: true });
});

router.post(
  "/backup/test-drive",
  requireAuth,
  requireAdmin,
  async (_req, res) => {
    const settings = await loadSettings();
    if (!settings?.backupDriveAccessToken) {
      res.status(400).json({ error: "Drive access token is required" });
      return;
    }
    try {
      const r = await fetch("https://www.googleapis.com/drive/v3/about?fields=user", {
        headers: { Authorization: `Bearer ${settings.backupDriveAccessToken}` },
      });
      if (!r.ok) {
        const t = await r.text();
        res.status(400).json({ error: `Drive auth failed (${r.status}): ${t.slice(0, 200)}` });
        return;
      }
      const data = (await r.json()) as { user?: { emailAddress?: string } };
      res.json({ ok: true, account: data.user?.emailAddress ?? null });
    } catch (e) {
      res.status(400).json({
        error: e instanceof Error ? e.message : "Drive connection failed",
      });
    }
  },
);

export default router;
