import { app, BrowserWindow, Menu, Tray, shell, ipcMain } from "electron";
// import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import Docker from 'dockerode';


// const require = createRequire(import.meta.url);
// const __dirname = path.dirname(fileURLToPath(import.meta.url));
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, "..");

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

let win: BrowserWindow | null = null;
let tray: Tray | null = null;


// 1. docker 설치 여부확인 - 명령어로 
// 2. docker 설치 안내 => 웹
// 3. docker 설치되었다는 가정하에 os 버전 확인 => os 버전에 따라 electrone과 docker 연결=> 직접 연결이 필요한가? api 사용하면 가져올수 있지 않은가?
const docker = new Docker({ socketPath: '/var/run/docker.sock' })


// 새로운 electrone 창 오픈
function createWindow() {
  win = new BrowserWindow({
      icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      // preload: path.join(__dirname, "preload.mjs"),
      preload: path.join(__dirname, "dist", "preload.js"),
      contextIsolation: true,
      nodeIntegration: true, 
    },
    autoHideMenuBar: true,
  });


    win.webContents.openDevTools()
  // Load the appropriate URL or file
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }

  


  // Handle the window closing event (minimize to tray instead of closing)
  win.on("close", (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      win?.hide();
    }
  });

  // Handle external URLs opening in the default web browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

// Create the system tray icon and menu
function createTray() {
  tray = new Tray(path.join(process.env.VITE_PUBLIC, "tray.png")); // Path to the tray icon image

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
        app.isQuiting = true;
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




// Handle request for Docker images
ipcMain.handle('get-docker-images', async () => {
  try {
    const images = await docker.listImages();
    return images;
  } catch (error) {
    console.error('Failed to fetch Docker images:', error);
    throw error;
  }
});

// Handle request for Docker containers
// ipcMain.handle('get-docker-containers', async () => {
//   try {
//     const containers = await docker.listContainers({ all: true });
//     return containers;
//   } catch (error) {
//     console.error('Failed to fetch Docker containers:', error);
//     throw error;
//   }
// });





app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});


