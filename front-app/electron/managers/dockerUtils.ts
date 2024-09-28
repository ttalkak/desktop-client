import { exec } from "child_process";
import { promisify } from "util";
import Docker from "dockerode";

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
