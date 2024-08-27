import { app, BrowserWindow, Menu, Tray, shell, ipcMain } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { exec } from "child_process";

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
let isQuiting = false;  // 애플리케이션 종료 상태를 추적하는 변수

// 새로운 Electron 창 오픈
function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: true,
    },
    autoHideMenuBar: true,
  });

  win.webContents.openDevTools();

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }

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
}

// Create the system tray icon and menu
function createTray() {
  tray = new Tray(path.join(process.env.VITE_PUBLIC, "tray.png"));

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show App",
      click: () => {
        win?.show();
      },
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

  tray.on("click", () => {
    win?.show();
  });
}

app.on("ready", () => {
  createWindow();
  createTray();
});

// Handle Docker command execution
ipcMain.handle('get-docker-images', async () => {
  return new Promise<string[]>((resolve, reject) => {
    exec('docker images --format "{{.Repository}}:{{.Tag}} {{.ID}} {{.Size}}"', (error, stdout, stderr) => {
      if (error) {
        console.error('Failed to fetch Docker images:', error);
        reject(stderr);
      } else {
        resolve(stdout.split('\n').filter(line => line !== ''));
      }
    });
  });
});

ipcMain.handle('fetch-docker-containers', async () => {
  return new Promise<string[]>((resolve, reject) => {
    exec('docker ps --format "{{.ID}} {{.Image}} {{.Status}}"', (error, stdout, stderr) => {
      if (error) {
        console.error('Failed to fetch Docker containers:', error);
        reject(stderr);
      } else {
        resolve(stdout.split('\n').filter(line => line !== ''));
      }
    });
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
