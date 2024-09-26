import { exec } from "child_process";
import { promisify } from "util";
import { ipcMain } from "electron";

const execAsync = promisify(exec);

// Docker 상태 체크 함수
export async function checkDockerStatus(): Promise<
  "running" | "not running" | "unknown"
> {
  try {
    await execAsync("docker info");
    return "running";
  } catch {
    return "not running";
  }
}

// Docker 상태 체크 핸들러
export const handlecheckDockerStatus = (): void => {
  ipcMain.handle("check-docker-status", async () => {
    return await checkDockerStatus();
  });
};

// Docker Desktop 경로 찾기
export const getDockerPath = async (): Promise<string> => {
  try {
    const command =
      process.platform === "win32" ? "where docker" : "which docker";
    const { stdout } = await execAsync(command);
    const dockerPath = stdout.trim().split("\n")[0];
    if (!dockerPath) throw new Error("Docker executable not found.");
    return dockerPath;
  } catch (error) {
    console.error("Error finding Docker path:", error);
    throw error;
  }
};

// Docker Desktop 실행 핸들러
export const handleStartDocker = (): void => {
  ipcMain.handle("open-docker-desktop", async (_event, dockerPath: string) => {
    if (!dockerPath) {
      console.error("Docker executable path not provided.");
      throw new Error("Docker executable path not provided.");
    }

    exec(`"${dockerPath}"`, (error) => {
      if (error) {
        console.error("Error launching Docker Desktop:", error);
        throw error;
      }
      console.log("Docker Desktop launched successfully.");
    });
  });
};
