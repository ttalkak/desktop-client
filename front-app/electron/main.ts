import { app, BrowserWindow, ipcMain } from "electron";
// import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { exec } from "child_process"; // exec 추가
import iconv from "iconv-lite"; // iconv-lite 추가

// const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, "..");

export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

let win: BrowserWindow | null;

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
    },
    autoHideMenuBar: true,
  });

  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}

// IPC 핸들러 설정
ipcMain.handle("get-inbound-rules", async () => {
  return new Promise<string>((resolve, reject) => {
    exec(
      "netsh advfirewall firewall show rule name=all",
      { encoding: "binary" }, // 인코딩을 'binary'로 설정
      (error, stdout, stderr) => {
        if (error) {
          console.error("Error executing command:", error.message);
          reject(`Error: ${error.message}`);
        } else if (stderr) {
          console.error("Stderr:", stderr);
          reject(`Stderr: ${stderr}`);
        } else {
          // CP949 인코딩을 UTF-8로 변환
          const decodedOutput = iconv.decode(
            Buffer.from(stdout, "binary"),
            "cp949"
          );
          resolve(decodedOutput);
        }
      }
    );
  });
});

ipcMain.handle("toggle-port", async (_, name: string, newEnabled: string) => {
  return new Promise<string>((resolve, reject) => {
    exec(
      `netsh advfirewall firewall set rule name="${name}" new enable=${newEnabled}`,
      (error, stdout, _) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout);
        }
      }
    );
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
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

app.whenReady().then(createWindow);
