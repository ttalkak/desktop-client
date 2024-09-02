import { app, BrowserWindow, Menu, Tray, shell, ipcMain } from "electron";
import { fileURLToPath } from "node:url";
import { promisify } from 'util';
import path from "node:path";
import { exec } from "child_process"; // exec 추가
import iconv from "iconv-lite"; // iconv-lite 추가
import { githubDownLoadAndUnzip } from "./githubManager";


import {
  handlecheckDockerStatus, 
  handleGetDockerEvent, 
  checkDockerStatus, 
  handleStartDocker,
  handleFetchDockerImages,
  handleFetchDockerContainers,
  handleFetchContainerLogs,
  // getContainerStatsStream,
} from "./dockerManager";

 
const execAsync = promisify(exec);



const __dirname = path.dirname(fileURLToPath(import.meta.url));
// const pipelineAsync = promisify(pipeline);import { githubDownLoadAndUnzip } from './githubManager';




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

  if (status !== 'running') {
    console.log('Docker is not running. Starting Docker...');
    try {
      // const dockerPath = await execAsync("where docker"); // Docker 경로 가져오기
      // const resolvedPath = dockerPath.stdout.trim().split("\n")[0] || 'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe';
      const resolvedPath = 'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe';

      // Docker Desktop 실행
      await execAsync(`"${resolvedPath}"`);
      console.log('Docker started successfully.');
    } catch (error) {
      console.error('Failed to start Docker:', error);
      throw new Error('Docker failed to start');
    }
  } else {
    console.log('Docker is already running.');
  }
}




//DockerManager IPC handler 등록
function registerIpcHandlers() {
  //zip다운 및 upzip
  githubDownLoadAndUnzip();
  handlecheckDockerStatus();//도커현재상태 확인 => 실행안되고 있으면, 
  handleStartDocker(); //도커실행시키기
  handleGetDockerEvent();//도커 이벤트 감지[시작, 중지 포함]
  handleFetchDockerImages();//이미지 목록 가져오기
  handleFetchDockerContainers();//컨테이너 목록 가져오기
  handleFetchContainerLogs();//실행중인 컨테이너 로그 가져오기
  // getContainerStatsStream()//cpu사용률 가져오기


  //웹소켓으로 로그, CPU 가용률, 실행중인 컨테이너 상태 전달
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
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }

  // IPC 핸들러 설정: inbound-rule
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


// // 다운로드 함수 
// async function downloadFile(url: string, dest: string) {
//   const response = await axios({
//       url,
//       method: 'GET',
//       responseType: 'stream',
//   });

//   const writer = fs.createWriteStream(dest);

//   response.data.pipe(writer);

//   return new Promise((resolve, reject) => {
//       writer.on('finish', resolve);
//       writer.on('error', reject);
//   });
// }

// // ZIP 파일 압축 해제 함수
// async function unzipFile(zipFilePath: string, destDir: string) {
//   const zip = new StreamZipAsync({ file: zipFilePath });

//   if (!fs.existsSync(destDir)) {
//       fs.mkdirSync(destDir, { recursive: true });
//   }
//   const entries = await zip.entries();
//   for (const entry of Object.values(entries)) {
//       const filePath = path.join(destDir, entry.name);

//       if (entry.isDirectory) {
//           if (!fs.existsSync(filePath)) {
//               fs.mkdirSync(filePath, { recursive: true });
//           }
//       } else {
//           const readStream = await zip.stream(entry.name);
//           const writeStream = fs.createWriteStream(filePath);
//           readStream.pipe(writeStream);
//       }
//   }

//   await zip.close();
//   console.log('Unzip completed!');
// }


 // GitHub 레포지토리 ZIP 파일 다운로드 기능 IPC 핸들러 
//  ipcMain.handle(
//   "download-github-repo",
//   async (_, repoUrl: string, downloadPath: string) => {
//     try {
//       const zipUrl = `${repoUrl}/archive/refs/heads/main.zip`; // main 브랜치 기준으로 다운로드
//       const downloadFilePath = path.join(
//         downloadPath,
//         `${path.basename(repoUrl)}.zip`
//       );

//       await downloadFile(zipUrl, downloadFilePath);

//       return { success: true, filePath: downloadFilePath };
//     } catch (error) {
//       console.error("Error downloading repository:", error);
//       return { success: false, message: error };
//     }
//   }
// );


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

  //CustomBar IPC 핸들러
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

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.


//실행 어떻게 시킬지 고려해보기, 어느시점에 시작하는게 맞는가?
app.whenReady()
  .then(startDockerIfNotRunning) // Docker 상태 확인 및 필요시 실행
  .then(registerIpcHandlers)     // IPC 핸들러 등록
  .then(handleGetDockerEvent)    // Docker 이벤트 감지 핸들러 실행
  .then(createWindow)            // 윈도우 생성
  .then(createTray)              // 트레이 생성
  .catch(error => {
    console.error('Failed to start application:', error);
  })

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
