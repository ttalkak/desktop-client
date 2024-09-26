import { exec } from "child_process";
import { promisify } from "util";
import Docker from "dockerode";
import path from "node:path";
import * as fs from "fs";

const execAsync = promisify(exec);

export const docker = new Docker();

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

export async function getDockerPath(): Promise<string> {
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
}

export function findDockerfile(directory: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const absoluteDirectory = path.resolve(directory);
    console.log(`탐색 중인 절대 경로: ${absoluteDirectory}`);

    const files = fs.readdirSync(absoluteDirectory);

    for (const file of files) {
      const fullPath = path.join(absoluteDirectory, file);
      const stat = fs.statSync(fullPath);
      console.log(`도커파일 탐색중.. 전달받은 rootDirectory 기준 ${fullPath}`);

      if (!stat.isDirectory() && file === "Dockerfile") {
        console.log(`Dockerfile found at: ${fullPath}`);
        resolve(fullPath);
        return;
      }
    }

    for (const file of files) {
      const fullPath = path.join(absoluteDirectory, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        findDockerfile(fullPath).then(resolve).catch(reject);
        return;
      }
    }

    console.log(`No Dockerfile found in directory: ${absoluteDirectory}`);
    reject(new Error("Dockerfile not found in the specified directory."));
  });
}
