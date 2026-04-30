// Minimal preload — exposes a tiny safe surface for the renderer.
const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("pharmacare", {
  isDesktop: true,
  platform: process.platform,
});
