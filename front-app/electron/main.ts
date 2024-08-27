import { app, BrowserWindow, Menu, Tray, shell, ipcMain } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { exec } from "child_process";
import { promisify } from "util";

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

const execAsync = promisify(exec);


// 새로운 Electron 창 오픈
async function createWindow() {
  win = new BrowserWindow({
    frame:false,
    titleBarStyle: 'hidden',
    width: 1000,
    height: 800,
    // titleBarOverlay: {
    //   color: '#2f3241',
    //   symbolColor: '#74b1be',
    //   height: 60,
    // }, 
  
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: true,
    },
    autoHideMenuBar: true,
  });

  win.webContents.openDevTools();

  if (VITE_DEV_SERVER_URL) {
    await win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    await win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }

  //IPC 핸들러 설정 - Docker관련
  ipcMain.handle('get-docker-images', async () => {
    try {
      const { stdout } = await execAsync('docker images --format "{{.Repository}}:{{.Tag}} {{.ID}} {{.Size}}"');
      return stdout.split('\n').filter(line => line !== '');
    } catch (error) {
      console.error('Failed to fetch Docker images:', error);
      throw error;
    }
  });

  ipcMain.handle('fetch-docker-containers', async () => {
    try {
      const { stdout } = await execAsync('docker ps --format "{{.ID}} {{.Image}} {{.Status}} {{.Ports}}"');
      return stdout.split('\n').filter(line => line !== '');
    } catch (error) {
      console.error('Failed to fetch Docker containers:', error);
      throw error;
    }
  });

  



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


    //CustomBar 관련 
    ipcMain.on('minimize-window', () => {
      win?.minimize();
    });
  
    ipcMain.on('maximize-window', () => {
      if (win?.isMaximized()) {
        win.unmaximize();
      } else {
        win?.maximize();
      }
    });
  
    ipcMain.on('close-window', () => {
      win?.close();
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

app.on("ready", async () => {
  await createWindow();
  createTray();
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
