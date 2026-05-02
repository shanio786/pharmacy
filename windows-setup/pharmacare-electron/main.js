const { app, BrowserWindow, shell, dialog } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const http = require("http");

let mainWindow;
let apiProcess;
let webProcess;

const API_PORT = 8080;
const WEB_PORT = 8081;

// Root of the pharmacy project (two levels up from this file)
const ROOT = path.join(__dirname, "..", "..");

const ENV = {
  ...process.env,
  PORT: String(API_PORT),
  NODE_ENV: "production",
  JWT_SECRET: "pharmacare_jwt_secret_pk_2026_stable",
  DATABASE_URL:
    process.env.DATABASE_URL ||
    "postgresql://pharmauser:pharma123@localhost:5432/pharmacare",
};

function waitForPort(port, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    function check() {
      const req = http.get(`http://localhost:${port}/`, () => resolve());
      req.on("error", () => {
        if (Date.now() - start > timeout) return reject(new Error(`Port ${port} timeout`));
        setTimeout(check, 500);
      });
      req.end();
    }
    check();
  });
}

function startAPIServer() {
  const entry = path.join(ROOT, "artifacts", "api-server", "dist", "index.mjs");
  apiProcess = spawn("node", ["--enable-source-maps", entry], {
    env: ENV,
    windowsHide: true,
    cwd: path.join(ROOT, "artifacts", "api-server"),
  });
  apiProcess.stderr.on("data", (d) => console.error("[API]", d.toString()));
  apiProcess.on("exit", (code) => console.log("[API] exited:", code));
}

function startWebServer() {
  // Serve the built frontend using a simple static file server via vite preview
  const vite = path.join(ROOT, "node_modules", ".bin", "vite");
  webProcess = spawn(
    vite,
    ["preview", "--port", String(WEB_PORT), "--host", "0.0.0.0", "--config", "vite.config.ts"],
    {
      env: { ...ENV, PORT: String(WEB_PORT), BASE_PATH: "/" },
      windowsHide: true,
      cwd: path.join(ROOT, "artifacts", "pharmacy"),
      shell: true,
    }
  );
  webProcess.stderr.on("data", (d) => console.error("[WEB]", d.toString()));
}

function createSplashWindow() {
  const splash = new BrowserWindow({
    width: 420,
    height: 280,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
  });
  splash.loadURL(`data:text/html,
    <html><body style="margin:0;background:#16a34a;display:flex;flex-direction:column;
      align-items:center;justify-content:center;height:100vh;font-family:Arial;color:white;border-radius:16px;">
      <div style="font-size:48px">💊</div>
      <h1 style="margin:8px 0">PharmaCare</h1>
      <p style="opacity:.8">Server shuru ho raha hai...</p>
      <div style="margin-top:20px;width:200px;height:4px;background:rgba(255,255,255,.3);border-radius:4px">
        <div id="bar" style="width:0%;height:4px;background:white;border-radius:4px;transition:width .5s"></div>
      </div>
      <script>let w=0;setInterval(()=>{w=Math.min(w+5,90);document.getElementById('bar').style.width=w+'%'},300)</script>
    </body></html>`);
  return splash;
}

async function createMainWindow() {
  const splash = createSplashWindow();

  startAPIServer();
  startWebServer();

  // Wait for both servers
  try {
    await Promise.all([
      waitForPort(API_PORT, 20000),
      waitForPort(WEB_PORT, 20000),
    ]);
  } catch (e) {
    dialog.showErrorBox(
      "Server Error",
      "Server shuru nahi hua.\nPostgreSQL chal raha hai?\n\nError: " + e.message
    );
    app.quit();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: "PharmaCare",
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  });

  mainWindow.loadURL(`http://localhost:${WEB_PORT}`);

  mainWindow.once("ready-to-show", () => {
    splash.destroy();
    mainWindow.show();
    mainWindow.maximize();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
    cleanup();
  });

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

function cleanup() {
  if (apiProcess) { apiProcess.kill(); apiProcess = null; }
  if (webProcess) { webProcess.kill(); webProcess = null; }
}

app.whenReady().then(createMainWindow);

app.on("window-all-closed", () => {
  cleanup();
  app.quit();
});

app.on("before-quit", cleanup);
