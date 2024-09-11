import { execFile, exec } from "child_process";
import path from "node:path";
import * as fs from "fs";
import iconv from "iconv-lite";
import { ipcMain, BrowserWindow } from "electron";
import { getTtalkakDirectory, downloadFile } from "./utils";

let win: BrowserWindow | null = null;

export function setMainWindow(mainWindow: BrowserWindow) {
  win = mainWindow;
}

// pgrok 실행 함수
async function runPgrok(
  remoteAddr: string,
  forwardAddr: string,
  token: string,
  deploymentId: string,
  domain: string
): Promise<void> {
  const ttalkakDirectory = getTtalkakDirectory();
  const pgrokExePath = path.join(ttalkakDirectory, "pgrok.exe");

  if (!fs.existsSync(pgrokExePath)) {
    throw new Error("pgrok.exe not found. Please download it first.");
  }

  const command = `pgrok.exe http --remote-addr ${remoteAddr} --forward-addr ${forwardAddr} --token ${token} --deployment-id ${deploymentId} --domain ${domain}.ttalkak.com`;

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

// IPC 핸들러 등록 함수
export function registerPgrokIpcHandlers() {
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
        "https://d1do0lnmj06xbc.cloudfront.net/pgrok.exe", // 다운로드 경로 설정
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
    async (
      _,
      remoteAddr: string,
      forwardAddr: string,
      token: string,
      deploymentId: string,
      domain: string
    ) => {
      try {
        await runPgrok(remoteAddr, forwardAddr, token, deploymentId, domain);
        return "pgrok started successfully";
      } catch (error) {
        return `pgrok failed to start: ${error}`;
      }
    }
  );
}
