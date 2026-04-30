# PharmaCare Desktop (Windows .exe)

PharmaCare desktop installer — Candela-style. Runs **fully offline** with a local PostgreSQL database, supports **multi-PC LAN** (1 server PC + up to N clients), and integrates with the Backup & Restore screen for Drive/VPS uploads.

## How it works

1. The `.exe` installer puts PharmaCare on the user's Windows PC with a desktop shortcut.
2. On launch, an embedded Node.js process boots the Express API (the same code as the web app).
3. The API connects to a local PostgreSQL on `127.0.0.1:5432`.
4. The Electron window loads the React SPA from disk (no internet required).
5. Other PCs in the LAN install the same `.exe`, but at first launch enter the **Server PC's IP** (e.g. `192.168.1.10`) so they connect to its API instead of running their own.

## Build (locally on Windows)

```bash
git clone https://github.com/shanio786/pharmacy.git
cd pharmacy
pnpm install
pnpm --filter @workspace/pharmacy run build
pnpm --filter @workspace/api-server run build
cd desktop
npm install
npm run build:installer
```

The installer appears in `desktop/release/PharmaCare-Setup-<version>.exe`.

## Build (automatic via GitHub Actions)

Every push to `main` triggers `.github/workflows/build-desktop.yml` which builds the Windows installer and uploads it as a workflow artifact. To create a public download, push a tag starting with `v` (e.g. `v1.0.0`) and the workflow will publish a GitHub Release with the `.exe` attached.

## Pre-requisites on the Server PC

1. **PostgreSQL 15+** installed locally (use the official installer or Postgres Portable).
2. Create a database `pharmacare` and user `postgres` with password `postgres` (or set `DATABASE_URL` env var to your own).
3. First run will create the schema automatically and seed the medicines list.

## LAN client setup

On each client PC:

1. Install the same `.exe`.
2. Edit the desktop shortcut → set `Target` to:
   ```
   "C:\Program Files\PharmaCare\PharmaCare.exe" --server-url=http://192.168.1.10:8080
   ```
   (replace IP with your server PC's LAN IP)
3. Done. Same UI, same data, real-time sync.

## Backup

Use the in-app **Settings → Backup & Restore** screen:

- **Backup Now** → creates a `.sql` snapshot, downloadable to your PC.
- Configure **VPS (SFTP)** credentials → every backup auto-uploads to your VPS.
- Configure **Google Drive** OAuth token → every backup auto-uploads to Drive.
- **Restore** → upload any `.sql` and restore in seconds.
- **Schedule** → daily at 2:00 AM (configurable) keeps last 30 backups.
