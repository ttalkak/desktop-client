import { app, BrowserWindow, Menu, Tray, shell, ipcMain } from "electron";
import { fileURLToPath } from "node:url";
import { promisify } from "util";
import path from "node:path";
import { exec, execFile } from "child_process";
import iconv from "iconv-lite";
import * as fs from "fs";
import { githubDownLoadAndUnzip } from "./githubManager";
import { getTtalkakDirectory, downloadFile, unzipFile } from "./utils";
import { registerStoreIpcHandlers } from "./store/storeManager";
import {
  handlecheckDockerStatus,
  getDockerPath,
  handleStartDocker,
  handleGetDockerEvent,
  handleFetchDockerImageList,
  handleFetchDockerImages,
  handleFetchDockerContainerList,
  handleFetchDockerContainer,
  handleFetchContainerLogs,
  handleBuildDockerImage,
  // createAndStartContainer,
  checkDockerStatus,
  monitorAllContainersCpuUsage,
  registerContainerIpcHandlers,
} from "./dockerManager";

const execAsync = promisify(exec);

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
let isQuiting = false; // 애플리케이션 종료 상태를 추적하는 변수

async function startDockerIfNotRunning(): Promise<void> {
  const status = await checkDockerStatus();

  if (status !== "running") {
    console.log("Docker is not running. Starting Docker...");
    try {
      const resolvedPath =
        "C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe";

      // Docker Desktop 실행
      await execAsync(`"${resolvedPath}"`);
      await checkDockerStatus();

      console.log("Docker started successfully.");
    } catch (error) {
      console.error("Failed to start Docker:", error);
      throw new Error("Docker failed to start");
    }
  } else {
    console.log("Docker is already running.");
  }
}

// pgrok 실행 함수
async function runPgrok(
  remoteAddr: string,
  forwardAddr: string,
  token: string
): Promise<void> {
  const ttalkakDirectory = getTtalkakDirectory();
  const pgrokExePath = path.join(ttalkakDirectory, "pgrok.exe");

  if (!fs.existsSync(pgrokExePath)) {
    throw new Error("pgrok.exe not found. Please download it first.");
  }

  const command = `pgrok.exe http --remote-addr ${remoteAddr} --forward-addr ${forwardAddr} --token ${token}`;

  // 명령 프롬프트를 사용하여 pgrok 실행
  const child = execFile(
    "cmd.exe",
    ["/c", command],
    { cwd: path.dirname(pgrokExePath) } // 명령어 실행 경로 설정
  );

  console.log("실행 명령어", command);

  // 로그 스트림 수신
  child.stdout?.on("data", (data) => {
    console.log(data.toString()); // 콘솔에 로그 출력
    win?.webContents.send("pgrok-log", data.toString()); // 렌더러 프로세스로 로그 전송
  });

  child.stderr?.on("data", (data) => {
    console.log(`${data.toString()}`);
    win?.webContents.send("pgrok-log", `${data.toString()}`); // 에러 로그 전송
  });

  child.on("close", (code) => {
    console.log(`Process exited with code ${code}`);
    win?.webContents.send("pgrok-log", `Process exited with code ${code}`); // 종료 로그 전송
  });
}

//DockerManager IPC handler 등록
function registerIpcHandlers() {
  handlecheckDockerStatus(); // Docker 상태 체크 핸들러 초기화
  getDockerPath(); // Docker 경로 핸들러 초기화
  handleStartDocker(); // Docker 데스크탑 시작 핸들러 초기화
  handleGetDockerEvent(); // Docker 이벤트 핸들러 초기화
  handleFetchDockerImageList(); // Docker 이미지 목록 핸들러 초기화
  handleFetchDockerImages(); // Docker 단일 이미지 핸들러 초기화
  handleFetchDockerContainerList(); // Docker 컨테이너 목록 핸들러 초기화
  handleFetchDockerContainer(); // Docker 단일 컨테이너 핸들러 초기화
  handleFetchContainerLogs(); // Docker 컨테이너 로그 핸들러 초기화
  handleBuildDockerImage(); // Docker 이미지 빌드 핸들러 초기화

  // 컨테이너 생성 및 실행 핸들러 (필요할 경우 호출)
  // createAndStartContainer();
  githubDownLoadAndUnzip();

  registerStoreIpcHandlers();
  //컨테이너 생성, 실행, 정지, 삭제
  registerContainerIpcHandlers();
}

// 새로운 Electron 창 오픈
async function createWindow() {
  win = new BrowserWindow({
    frame: false,
    titleBarStyle: "hidden",
    minWidth: 1024,
    minHeight: 400,
    height: 650,
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: true,
    },
    autoHideMenuBar: true,
  });

  if (VITE_DEV_SERVER_URL) {
    await win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }

  // 컨테이너 CPU 사용률 모니터링 시작
  if (win !== null) {
    monitorAllContainersCpuUsage(win);
  }

  // IPC 핸들러 설정: inbound-rule
  ipcMain.handle("get-inbound-rules", async () => {
    return new Promise<string>((resolve, reject) => {
      exec(
        "netsh advfirewall firewall show rule name=all",
        { encoding: "binary" },
        (error, stdout, stderr) => {
          if (error) {
            console.error("Error executing command:", error.message);
            reject(`Error: ${error.message}`);
          } else if (stderr) {
            console.error("Stderr:", stderr);
            reject(`Stderr: ${stderr}`);
          } else {
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

  // pgrok 파일 다운로드 및 압축 해제 IPC 핸들러
  ipcMain.handle("download-pgrok", async () => {
    try {
      const ttalkakDirectory = getTtalkakDirectory();

      // Ttalkak 폴더가 없으면 생성
      if (!fs.existsSync(ttalkakDirectory)) {
        fs.mkdirSync(ttalkakDirectory, { recursive: true });
      }

      const downloadPath = path.join(ttalkakDirectory, "pgrok.exe");

      // 이미 파일이 있는 경우
      if (fs.existsSync(downloadPath)) {
        return "File already exists";
      }

      await downloadFile(
        "https://d1do0lnmj06xbc.cloudfront.net/pgrok.exe",
        downloadPath
      );

      return "Download Completed";
    } catch (error) {
      return `Download failed: ${error}`;
    }
  });

  // pgrok 실행 IPC 핸들러
  ipcMain.handle(
    "run-pgrok",
    async (_, remoteAddr: string, forwardAddr: string, token: string) => {
      try {
        await runPgrok(remoteAddr, forwardAddr, token);
        return "pgrok started successfully";
      } catch (error) {
        return `pgrok failed to start: ${error}`;
      }
    }
  );

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

  // CustomBar IPC 핸들러
  ipcMain.on("minimize-window", () => {
    win?.minimize();
  });

  ipcMain.on("maximize-window", () => {
    if (win?.isMaximized()) {
      win.unmaximize();
    } else {
      win?.maximize();
    }
  });

  ipcMain.on("close-window", () => {
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

app
  .whenReady()
  .then(startDockerIfNotRunning) // Docker 상태 확인 및 필요시 실행
  .then(registerIpcHandlers) // IPC 핸들러 등록
  .then(handleGetDockerEvent) // Docker 이벤트 감지 핸들러 실행
  .then(createWindow) // 윈도우 생성
  .then(createTray) // 트레이 생성
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
