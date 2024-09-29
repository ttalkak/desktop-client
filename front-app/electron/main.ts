import {
  app,
  BrowserWindow,
  Menu,
  Tray,
  shell,
  ipcMain,
  powerSaveBlocker,
} from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import * as os from "os";
import { registerIpcHandlers as registerDockerIpcHandlers } from "./dockerManager";
import {
  setMainWindow,
  registerPgrokIpcHandlers,
  stopAllPgrokProcesses,
} from "./managers/pgrokManager";
import {
  handleGetDockerEvent,
  handleGetContainerMemoryUsage,
  handleGetContainerStatsPeriodic,
} from "./managers/dockerEventManager";
import { handleFetchContainerLogs } from "./managers/dockerLogsManager";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, "..");

export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

let win: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuiting = false;

function registerIpcHandlers() {
  registerDockerIpcHandlers();
  registerPgrokIpcHandlers();
  handleGetDockerEvent();
  handleGetContainerMemoryUsage();
  handleGetContainerStatsPeriodic();
  handleFetchContainerLogs();

  ipcMain.handle("get-cpu-usage", async () => {
    try {
      const cpuUsage = calculateCpuUsage();
      return cpuUsage;
    } catch (error) {
      console.error("Failed to get CPU usage:", error);
      throw error;
    }
  });

  ipcMain.handle("get-os-type", async () => {
    const platform = os.platform();
    switch (platform) {
      case "win32":
        return "WINDOWS";
      case "darwin":
        return "MACOS";
      case "linux":
        return "LINUX";
      default:
        return "Unknown";
    }
  });
}

function calculateCpuUsage() {
  const cpus = os.cpus();
  let user = 0,
    nice = 0,
    sys = 0,
    idle = 0,
    irq = 0,
    total = 0;

  for (const cpu of cpus) {
    user += cpu.times.user;
    nice += cpu.times.nice;
    sys += cpu.times.sys;
    idle += cpu.times.idle;
    irq += cpu.times.irq;
  }

  total = user + nice + sys + idle + irq;
  const cpuUsage = ((total - idle) / total) * 100;

  return parseFloat(cpuUsage.toFixed(2));
}

async function createWindow() {
  win = new BrowserWindow({
    frame: false,
    titleBarStyle: "hidden",
    minWidth: 1024,
    minHeight: 400,
    height: 650,
    icon: path.join(process.env.VITE_PUBLIC, "favicon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      backgroundThrottling: false,
    },
    autoHideMenuBar: true,
  });

  if (VITE_DEV_SERVER_URL) {
    await win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }

  setMainWindow(win);

  win.on("close", (event) => {
    if (!isQuiting) {
      event.preventDefault();
      win?.hide();
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // CustomBar IPC handlers
  ipcMain.on("minimize-window", () => win?.minimize());
  ipcMain.on("maximize-window", () =>
    win?.isMaximized() ? win.unmaximize() : win?.maximize()
  );
  ipcMain.on("close-window", () => win?.close());
}

function startPowerSaveBlocker() {
  const id = powerSaveBlocker.start("prevent-app-suspension");
  console.log(`PowerSaveBlocker started with id: ${id}`);
}

function createTray() {
  tray = new Tray(path.join(process.env.VITE_PUBLIC, "favicon.png"));

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show App",
      click: () => win?.show(),
    },
    {
      label: "Quit",
      click: () => {
        isQuiting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip("My Electron App");
  tray.setContextMenu(contextMenu);
  tray.on("click", () => win?.show());
}

let isQuitting = false;

app.on("before-quit", async (event) => {
  if (isQuitting) return;

  isQuitting = true;
  event.preventDefault();

  win?.webContents.send("terminate");

  ipcMain.once("terminated", async () => {
    try {
      await stopAllPgrokProcesses();
      app.quit();
    } catch (error) {
      console.error("Failed to stop pgrok:", error);
      app.quit();
    }
  });

  ipcMain.once("terminate-error", (_event, errorMessage) => {
    console.error("Renderer failed:", errorMessage);
    app.quit();
  });
});

app
  .whenReady()
  .then(registerIpcHandlers)
  .then(createWindow)
  .then(createTray)
  .then(startPowerSaveBlocker)
  .catch((error) => {
    console.error("Failed to start application:", error);
  });

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createWindow();
  }
});
