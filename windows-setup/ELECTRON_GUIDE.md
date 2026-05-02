# PharmaCare — Windows Desktop App (.exe) Guide

## Electron kya hai?
Electron se app bilkul desktop app ki tarah kholti hai — koi browser nazar nahi aata.
Double-click karo, PharmaCare seedha khul jata hai apni window mein.

## Step 1 — Prerequisites
1. Node.js LTS: https://nodejs.org
2. pnpm: `npm install -g pnpm`
3. PostgreSQL 15: https://www.postgresql.org/download/windows/

## Step 2 — Electron app banana

Ek naya folder banao `pharmacare-desktop` aur neeche ka code daalo:

### package.json
```json
{
  "name": "pharmacare-desktop",
  "version": "1.0.0",
  "description": "PharmaCare Desktop App",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "dist": "electron-builder --win --x64"
  },
  "build": {
    "appId": "com.pharmacare.desktop",
    "productName": "PharmaCare",
    "win": {
      "target": "nsis",
      "icon": "icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    }
  },
  "devDependencies": {
    "electron": "^28.0.0",
    "electron-builder": "^24.0.0"
  }
}
```

### main.js
```javascript
const { app, BrowserWindow, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

let mainWindow;
let apiProcess;

function startAPIServer() {
  const serverPath = path.join(__dirname, '..', 'artifacts', 'api-server', 'dist', 'index.mjs');
  
  apiProcess = spawn('node', ['--enable-source-maps', serverPath], {
    env: {
      ...process.env,
      PORT: '8080',
      NODE_ENV: 'production',
      JWT_SECRET: 'pharmacare_jwt_secret_pk_2026_stable',
      DATABASE_URL: 'postgresql://pharmauser:pharma123@localhost:5432/pharmacare'
    },
    windowsHide: true
  });

  apiProcess.stderr.on('data', (data) => {
    console.error('API:', data.toString());
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: 'PharmaCare',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    autoHideMenuBar: true,  // Menu bar hide
    icon: path.join(__dirname, 'icon.ico')
  });

  // API server start karo, phir 3 second baad frontend load karo
  startAPIServer();
  
  setTimeout(() => {
    mainWindow.loadURL('http://localhost:8081');
  }, 3000);

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (apiProcess) apiProcess.kill();
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (apiProcess) apiProcess.kill();
  app.quit();
});
```

## Step 3 — Build karo
```bash
cd pharmacare-desktop
npm install
npm run dist
```

## Step 4 — Installer
`dist/PharmaCare Setup 1.0.0.exe` ban jayega.
Is par double-click karo — Windows mein install ho jayega.

## Network (LAN) ke saath Electron
Agar LAN bhi chahiye, toh Electron app server PC par chale, 
baaki PCs browser mein `http://SERVER_IP:8081` use karein.
