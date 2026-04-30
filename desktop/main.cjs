// PharmaCare desktop entry — spawns the Express API server in-process
// (using bundled local PostgreSQL via DATABASE_URL) and loads the SPA.
const { app, BrowserWindow, Menu, dialog, shell } = require("electron");
const path = require("node:path");
const { spawn } = require("node:child_process");
const log = require("electron-log");

log.transports.file.level = "info";
log.info("PharmaCare desktop starting...");

const isDev = !app.isPackaged;
const RES = isDev
  ? path.join(__dirname, "..")
  : process.resourcesPath;

const API_PORT = process.env.PORT || "8080";
process.env.PORT = API_PORT;
process.env.NODE_ENV = "production";

// Local DB URL — install Postgres on the PC (or use bundled portable Postgres).
// User can override via env or via Settings > Backup screen.
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    "postgres://postgres:postgres@127.0.0.1:5432/pharmacare";
}

let serverProc = null;
let mainWindow = null;

function startServer() {
  const apiEntry = isDev
    ? path.join(RES, "artifacts", "api-server", "dist", "index.mjs")
    : path.join(RES, "api", "index.mjs");

  log.info("Starting API:", apiEntry);
  serverProc = spawn(process.execPath, [apiEntry], {
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  serverProc.stdout.on("data", (d) => log.info("[api]", d.toString().trim()));
  serverProc.stderr.on("data", (d) => log.warn("[api]", d.toString().trim()));
  serverProc.on("exit", (code) => {
    log.warn("API exited", code);
    if (mainWindow && !mainWindow.isDestroyed()) {
      dialog.showErrorBox(
        "PharmaCare API Stopped",
        `The local API server exited (code ${code}). Please restart the app.`,
      );
    }
  });
}

async function waitForServer(timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(`http://127.0.0.1:${API_PORT}/api/health`);
      if (r.ok) return true;
    } catch {
      /* not ready */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 820,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    title: "PharmaCare",
    backgroundColor: "#0f172a",
    icon: path.join(__dirname, "build", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const webIndex = isDev
    ? `http://127.0.0.1:${API_PORT}/`
    : path.join(RES, "web", "index.html");

  if (isDev) mainWindow.loadURL(webIndex);
  else mainWindow.loadFile(webIndex);

  mainWindow.once("ready-to-show", () => mainWindow.show());

  // External links open in user's browser, not inside the app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

function buildMenu() {
  const template = [
    {
      label: "File",
      submenu: [
        {
          label: "Reload",
          accelerator: "CmdOrCtrl+R",
          click: () => mainWindow?.reload(),
        },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "togglefullscreen" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { role: "resetZoom" },
        { type: "separator" },
        { role: "toggleDevTools" },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "About PharmaCare",
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "PharmaCare",
              message: `PharmaCare Desktop v${app.getVersion()}`,
              detail:
                "Pharmacy management system for Pakistani pharmacies.\n\nLAN multi-PC, offline-first, with backup to Drive/VPS.",
            });
          },
        },
        {
          label: "Open Logs Folder",
          click: () => shell.showItemInFolder(log.transports.file.getFile().path),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(async () => {
  startServer();
  buildMenu();
  const ok = await waitForServer();
  if (!ok) {
    dialog.showErrorBox(
      "PharmaCare cannot start",
      "Local API server did not start within 30 seconds.\n\n" +
        "Common causes:\n" +
        "• Local PostgreSQL is not running\n" +
        "• DATABASE_URL is wrong (check shortcut properties)\n" +
        "• Port " +
        API_PORT +
        " is in use\n\nCheck logs: Help → Open Logs Folder",
    );
  }
  createWindow();
});

app.on("window-all-closed", () => {
  if (serverProc) {
    try {
      serverProc.kill();
    } catch {
      /* ignore */
    }
  }
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (serverProc) {
    try {
      serverProc.kill();
    } catch {
      /* ignore */
    }
  }
});
