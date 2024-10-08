import { execFile, exec } from "child_process";
import path from "node:path";
import * as fs from "fs";
import iconv from "iconv-lite";
import { ipcMain, BrowserWindow } from "electron";
import { getTtalkakDirectory, downloadFile } from "../utils";
import { ChildProcess } from "child_process";

let win: BrowserWindow | null = null;

export function setMainWindow(mainWindow: BrowserWindow) {
  win = mainWindow;
}

const pgrokProcesses: { [key: string]: ChildProcess } = {};

// pgrok 실행 함수
async function runPgrok(
  remoteAddr: string,
  forwardAddr: string,
  token: string,
  deploymentId: number,
  domain?: string
): Promise<void> {
  const ttalkakDirectory = getTtalkakDirectory();
  const pgrokExePath = path.join(ttalkakDirectory, "pgrok.exe");

  if (!fs.existsSync(pgrokExePath)) {
    throw new Error("pgrok.exe not found. Please download it first.");
  }
  const cleanedForwardAddr = forwardAddr.replace(/^http:\/\/|https:\/\//, "");
  let command = `pgrok.exe http --remote-addr ${remoteAddr} --forward-addr ${forwardAddr} --token ${token} --deployment-id ${deploymentId} --domain ${domain}.ttalkak.com`;

  if (domain) {
    command = `pgrok.exe http --remote-addr ${remoteAddr} --forward-addr ${forwardAddr} --token ${token} --deployment-id ${deploymentId} --domain ${domain}`;
  } else {
    command = `pgrok.exe tcp --remote-addr ${remoteAddr} --forward-addr ${cleanedForwardAddr} --token ${token}`;
  }

  console.log(command);

  // 명령 프롬프트를 사용하여 pgrok 실행
  const child = execFile(
    "cmd.exe",
    ["/c", command],
    { cwd: path.dirname(pgrokExePath) } // 명령어 실행 경로 설정
  );

  pgrokProcesses[deploymentId] = child;

  // 로그 스트림 수신
  child.stdout?.on("data", (data) => {
    data.toString();

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

//pgrok 종료 함수-개별
function stopPgrok(deploymentId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const processToStop = pgrokProcesses[deploymentId];
    if (processToStop) {
      processToStop.kill(); // 프로세스 종료 시도
      win?.webContents.send(
        "pgrok-log",
        `pgrok process with deploymentId ${deploymentId} killed`
      );

      // 프로세스 종료 이벤트 처리
      processToStop.on("close", (code) => {
        delete pgrokProcesses[deploymentId]; // 종료된 프로세스 삭제
        if (code === 0) {
          resolve(); // 정상 종료 시 resolve
        } else {
          reject(new Error(`Process exited with code ${code}`)); // 비정상 종료 시 reject
        }
      });
    } else {
      win?.webContents.send(
        "pgrok-log",
        `No pgrok process running with deploymentId ${deploymentId}`
      );
      reject(
        new Error(`No pgrok process running with deploymentId ${deploymentId}`)
      );
    }
  });
}

//pgrok 전체 종료 함수
export function stopAllPgrokProcesses(): Promise<void> {
  return new Promise((resolve, reject) => {
    const processIds = Object.keys(pgrokProcesses);

    if (processIds.length === 0) {
      win?.webContents.send("pgrok-log", "No running pgrok processes to stop");
      resolve(); // 실행 중인 프로세스가 없을 때 즉시 resolve
      return;
    }

    let completedProcesses = 0;
    let hasError = false;

    processIds.forEach((deploymentId) => {
      const processToStop = pgrokProcesses[deploymentId];

      if (processToStop) {
        processToStop.kill(); // 각 프로세스를 종료
        win?.webContents.send(
          "pgrok-log",
          `pgrok process with deploymentId ${deploymentId} killed`
        );

        // 프로세스 종료 이벤트 처리
        processToStop.on("close", (code) => {
          delete pgrokProcesses[deploymentId]; // 종료된 프로세스 삭제
          if (code !== 0) {
            hasError = true;
            win?.webContents.send(
              "pgrok-log",
              `pgrok process with deploymentId ${deploymentId} exited with code ${code}`
            );
          }

          completedProcesses++;
          if (completedProcesses === processIds.length) {
            if (hasError) {
              reject(new Error("Some pgrok processes failed to stop"));
            } else {
              win?.webContents.send(
                "pgrok-log",
                "All pgrok processes stopped successfully"
              );
              resolve(); // 모든 프로세스가 정상적으로 종료된 경우 resolve
            }
          }
        });
      }
    });
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
      deploymentId: number,
      domain: string
    ) => {
      try {
        await runPgrok(remoteAddr, forwardAddr, token, deploymentId, domain);
        return "SUCCESS";
      } catch (error) {
        return "FAILED";
      }
    }
  );
  //개별 pgrok 종료함수
  ipcMain.handle("stop-pgrok", async (_, deploymentId: number) => {
    try {
      await stopPgrok(deploymentId);
      return "pgrok stopped successfully";
    } catch (error) {
      return `pgrok failed to stop : ${error}`;
    }
  });

  //전체 pgrok 종료함수
  ipcMain.handle("stop-all-pgrok", async () => {
    try {
      await stopAllPgrokProcesses();
      return "All pgrok processes stopped successfully";
    } catch (error) {
      return `Failed to stop all pgrok processes: ${error}`;
    }
  });
}
