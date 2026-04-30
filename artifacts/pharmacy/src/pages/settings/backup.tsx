import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  DatabaseBackup,
  Download,
  Trash2,
  Upload,
  Save,
  Cloud,
  Server,
  HardDrive,
} from "lucide-react";

const API = "/api";

function authHeader(): Record<string, string> {
  const t = localStorage.getItem("pharma_token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
      ...(init?.headers ?? {}),
    },
  });
  if (!r.ok) {
    const txt = await r.text();
    let msg = `Request failed (${r.status})`;
    try {
      const j = JSON.parse(txt) as { error?: string };
      if (j?.error) msg = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  if (r.status === 204) return undefined as T;
  return (await r.json()) as T;
}

interface BackupRow {
  filename: string;
  size: number;
  createdAt: string;
}

interface BackupListResp {
  backups: BackupRow[];
  lastRunAt: string | null;
  lastStatus: string | null;
}

interface BackupConfig {
  backupSchedule?: string;
  backupHour?: number;
  backupRetention?: number;
  backupVpsHost?: string | null;
  backupVpsPort?: number;
  backupVpsUser?: string | null;
  backupVpsPath?: string | null;
  backupVpsPasswordSet?: boolean;
  backupVpsPrivateKeySet?: boolean;
  backupDriveFolderId?: string | null;
  backupDriveAccessTokenSet?: boolean;
}

function formatSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export default function BackupSettingsPage() {
  const { toast } = useToast();
  const [list, setList] = useState<BackupListResp | null>(null);
  const [cfg, setCfg] = useState<BackupConfig>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [vpsPassword, setVpsPassword] = useState("");
  const [vpsPrivateKey, setVpsPrivateKey] = useState("");
  const [driveToken, setDriveToken] = useState("");
  const restoreRef = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    try {
      const [l, c] = await Promise.all([
        apiJson<BackupListResp>("/backup/list"),
        apiJson<BackupConfig>("/backup/config"),
      ]);
      setList(l);
      setCfg(c);
    } catch (e) {
      toast({
        title: "Load failed",
        description: e instanceof Error ? e.message : "Failed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const runBackup = async () => {
    setBusy("backup");
    try {
      const r = await apiJson<{
        filename: string;
        uploads: { vps?: boolean; drive?: boolean };
        errors: string[];
      }>("/backup/now", { method: "POST", body: JSON.stringify({}) });
      const parts = [
        `Backup ${r.filename} created.`,
        r.uploads.vps === true ? "VPS ✓" : null,
        r.uploads.drive === true ? "Drive ✓" : null,
      ].filter(Boolean);
      toast({
        title: "Backup ready",
        description: parts.join(" • "),
        ...(r.errors.length ? { variant: "destructive" as const } : {}),
      });
      await refresh();
    } catch (e) {
      toast({
        title: "Backup failed",
        description: e instanceof Error ? e.message : "Failed",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  const downloadBackup = async (filename: string) => {
    const r = await fetch(`${API}/backup/download/${filename}`, {
      headers: authHeader(),
    });
    if (!r.ok) {
      toast({ title: "Download failed", variant: "destructive" });
      return;
    }
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteBackup = async (filename: string) => {
    if (!confirm(`Delete ${filename}?`)) return;
    setBusy(filename);
    try {
      await apiJson(`/backup/${filename}`, { method: "DELETE" });
      toast({ title: "Deleted" });
      await refresh();
    } catch (e) {
      toast({
        title: "Delete failed",
        description: e instanceof Error ? e.message : "Failed",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  const restore = async (file: File) => {
    if (
      !confirm(
        `Restore from ${file.name}? This will OVERWRITE current data. Are you absolutely sure?`,
      )
    )
      return;
    if (!confirm("Final confirm: this cannot be undone. Proceed?")) return;
    setBusy("restore");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch(`${API}/backup/restore`, {
        method: "POST",
        headers: authHeader(),
        body: fd,
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || `HTTP ${r.status}`);
      }
      toast({
        title: "Restore complete",
        description: "Database restored successfully.",
      });
      await refresh();
    } catch (e) {
      toast({
        title: "Restore failed",
        description: e instanceof Error ? e.message : "Failed",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
      if (restoreRef.current) restoreRef.current.value = "";
    }
  };

  const saveConfig = async () => {
    setBusy("save");
    try {
      const body: Record<string, unknown> = {
        backupSchedule: cfg.backupSchedule ?? "off",
        backupHour: cfg.backupHour ?? 2,
        backupRetention: cfg.backupRetention ?? 30,
        backupVpsHost: cfg.backupVpsHost ?? null,
        backupVpsPort: cfg.backupVpsPort ?? 22,
        backupVpsUser: cfg.backupVpsUser ?? null,
        backupVpsPath: cfg.backupVpsPath ?? null,
        backupDriveFolderId: cfg.backupDriveFolderId ?? null,
      };
      if (vpsPassword) body["backupVpsPassword"] = vpsPassword;
      if (vpsPrivateKey) body["backupVpsPrivateKey"] = vpsPrivateKey;
      if (driveToken) body["backupDriveAccessToken"] = driveToken;
      await apiJson("/backup/config", {
        method: "PUT",
        body: JSON.stringify(body),
      });
      toast({ title: "Settings saved" });
      setVpsPassword("");
      setVpsPrivateKey("");
      setDriveToken("");
      await refresh();
    } catch (e) {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : "Failed",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  const testVps = async () => {
    setBusy("test-vps");
    try {
      await apiJson("/backup/test-vps", { method: "POST" });
      toast({ title: "VPS connection OK" });
    } catch (e) {
      toast({
        title: "VPS test failed",
        description: e instanceof Error ? e.message : "Failed",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  const testDrive = async () => {
    setBusy("test-drive");
    try {
      const r = await apiJson<{ account?: string }>("/backup/test-drive", {
        method: "POST",
      });
      toast({
        title: "Drive OK",
        description: r.account ? `Logged in as ${r.account}` : undefined,
      });
    } catch (e) {
      toast({
        title: "Drive test failed",
        description: e instanceof Error ? e.message : "Failed",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  if (loading)
    return (
      <div className="text-center py-12 text-muted-foreground">
        Loading backup settings...
      </div>
    );

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <DatabaseBackup className="w-5 h-5" /> Backup &amp; Restore
        </h1>
        <p className="text-sm text-muted-foreground">
          Database ka backup banaain, download karein, ya restore karein. Drive aur
          VPS pe auto-upload bhi.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <HardDrive className="w-4 h-4" /> Manual Backup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={runBackup}
              disabled={busy === "backup"}
              data-testid="button-backup-now"
            >
              {busy === "backup" ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <DatabaseBackup className="w-4 h-4 mr-2" />
              )}
              Backup Now
            </Button>
            <Button
              variant="outline"
              onClick={() => restoreRef.current?.click()}
              disabled={busy === "restore"}
              data-testid="button-restore"
            >
              {busy === "restore" ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Restore from .sql
            </Button>
            <input
              ref={restoreRef}
              type="file"
              accept=".sql"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void restore(f);
              }}
            />
          </div>
          {list?.lastRunAt && (
            <p className="text-xs text-muted-foreground">
              Last run: {new Date(list.lastRunAt).toLocaleString()} —{" "}
              <span className="font-mono">{list.lastStatus ?? "—"}</span>
            </p>
          )}
          <Separator />
          <div>
            <Label className="text-xs uppercase text-muted-foreground">
              Available Backups ({list?.backups.length ?? 0})
            </Label>
            {list?.backups.length === 0 ? (
              <p className="text-sm text-muted-foreground py-3">
                No backups yet. Click &quot;Backup Now&quot;.
              </p>
            ) : (
              <div className="border rounded-md mt-2 divide-y">
                {list?.backups.map((b) => (
                  <div
                    key={b.filename}
                    className="flex items-center justify-between p-2 text-sm"
                  >
                    <div>
                      <div className="font-mono">{b.filename}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(b.createdAt).toLocaleString()} •{" "}
                        {formatSize(b.size)}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => downloadBackup(b.filename)}
                        data-testid={`button-download-${b.filename}`}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy === b.filename}
                        onClick={() => deleteBackup(b.filename)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Schedule &amp; Retention</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label>Schedule</Label>
            <select
              className="border rounded-md p-2 w-full bg-background"
              value={cfg.backupSchedule ?? "off"}
              onChange={(e) =>
                setCfg((p) => ({ ...p, backupSchedule: e.target.value }))
              }
            >
              <option value="off">Off (manual only)</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          <div>
            <Label>Hour (0-23)</Label>
            <Input
              type="number"
              min={0}
              max={23}
              value={cfg.backupHour ?? 2}
              onChange={(e) =>
                setCfg((p) => ({ ...p, backupHour: Number(e.target.value) }))
              }
            />
          </div>
          <div>
            <Label>Keep last N backups</Label>
            <Input
              type="number"
              min={1}
              max={365}
              value={cfg.backupRetention ?? 30}
              onChange={(e) =>
                setCfg((p) => ({
                  ...p,
                  backupRetention: Number(e.target.value),
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Server className="w-4 h-4" /> VPS (SFTP) Upload
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Host</Label>
            <Input
              value={cfg.backupVpsHost ?? ""}
              onChange={(e) =>
                setCfg((p) => ({ ...p, backupVpsHost: e.target.value || null }))
              }
              placeholder="vps.example.com"
            />
          </div>
          <div>
            <Label>Port</Label>
            <Input
              type="number"
              value={cfg.backupVpsPort ?? 22}
              onChange={(e) =>
                setCfg((p) => ({ ...p, backupVpsPort: Number(e.target.value) }))
              }
            />
          </div>
          <div>
            <Label>User</Label>
            <Input
              value={cfg.backupVpsUser ?? ""}
              onChange={(e) =>
                setCfg((p) => ({ ...p, backupVpsUser: e.target.value || null }))
              }
              placeholder="root"
            />
          </div>
          <div>
            <Label>Remote path</Label>
            <Input
              value={cfg.backupVpsPath ?? ""}
              onChange={(e) =>
                setCfg((p) => ({ ...p, backupVpsPath: e.target.value || null }))
              }
              placeholder="/var/backups/pharmacare"
            />
          </div>
          <div className="md:col-span-2">
            <Label>
              Password{" "}
              {cfg.backupVpsPasswordSet && (
                <span className="text-xs text-muted-foreground">(saved — leave blank to keep)</span>
              )}
            </Label>
            <Input
              type="password"
              value={vpsPassword}
              onChange={(e) => setVpsPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div className="md:col-span-2">
            <Label>
              SSH Private Key (optional, instead of password){" "}
              {cfg.backupVpsPrivateKeySet && (
                <span className="text-xs text-muted-foreground">(saved)</span>
              )}
            </Label>
            <Textarea
              rows={4}
              value={vpsPrivateKey}
              onChange={(e) => setVpsPrivateKey(e.target.value)}
              placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
              className="font-mono text-xs"
            />
          </div>
          <div className="md:col-span-2">
            <Button
              variant="outline"
              size="sm"
              onClick={testVps}
              disabled={busy === "test-vps"}
            >
              {busy === "test-vps" && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Test VPS Connection
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Cloud className="w-4 h-4" /> Google Drive Upload
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Drive Folder ID (optional)</Label>
            <Input
              value={cfg.backupDriveFolderId ?? ""}
              onChange={(e) =>
                setCfg((p) => ({
                  ...p,
                  backupDriveFolderId: e.target.value || null,
                }))
              }
              placeholder="1A2B3C..."
            />
          </div>
          <div>
            <Label>
              OAuth Access Token{" "}
              {cfg.backupDriveAccessTokenSet && (
                <span className="text-xs text-muted-foreground">(saved)</span>
              )}
            </Label>
            <Input
              type="password"
              value={driveToken}
              onChange={(e) => setDriveToken(e.target.value)}
              placeholder="ya29.a0..."
            />
          </div>
          <div className="md:col-span-2">
            <p className="text-xs text-muted-foreground">
              Get a token from{" "}
              <a
                className="underline"
                href="https://developers.google.com/oauthplayground/"
                target="_blank"
                rel="noreferrer"
              >
                OAuth Playground
              </a>{" "}
              with scope{" "}
              <code>https://www.googleapis.com/auth/drive.file</code>.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={testDrive}
              disabled={busy === "test-drive"}
              className="mt-2"
            >
              {busy === "test-drive" && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Test Drive Token
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={saveConfig} disabled={busy === "save"}>
          {busy === "save" ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Backup Settings
        </Button>
      </div>
    </div>
  );
}
