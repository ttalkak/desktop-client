import { ipcMain, IpcMainEvent } from "electron";
import os from "os";
import { docker, getContainerStatsStream } from "./dockerManager";

interface HealthData {
  timestamp: number;
  systemCpu: number;
  dockerStatus: string;
  containers: {
    id: string;
    name: string;
    status: string;
    cpu: number;
    logs: string[];
  }[];
}

const HEALTH_CHECK_INTERVAL = 10000; // 10 seconds
const LOG_LINES_LIMIT = 50; // 각 컨테이너당 최대 로그 라인 수
const CPU_USAGE_BATCH_SIZE = 5; // CPU 사용량 평균을 계산할 샘플 수

let healthCheckInterval: NodeJS.Timeout | null = null;

function getSystemCpuUsage(): number {
  const cpus = os.cpus();
  const totalIdle = cpus.reduce((acc, cpu) => acc + cpu.times.idle, 0);
  const totalTick = cpus.reduce(
    (acc, cpu) =>
      acc + Object.values(cpu.times).reduce((sum, time) => sum + time, 0),
    0
  );
  return Math.round((100 - (100 * totalIdle) / totalTick) * 100) / 100; // 소수점 둘째자리까지 반올림
}

async function getContainerCpuUsage(containerId: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const statsStream = getContainerStatsStream(containerId);
    const cpuUsages: number[] = [];

    statsStream.on("data", (cpuUsage: number) => {
      cpuUsages.push(cpuUsage);
      if (cpuUsages.length >= CPU_USAGE_BATCH_SIZE) {
        const averageCpuUsage = calculateAverage(cpuUsages);
        statsStream.removeAllListeners();
        resolve(averageCpuUsage);
      }
    });

    statsStream.on("error", (err: Error) => {
      reject(err);
    });

    // Timeout to ensure we don't wait indefinitely
    setTimeout(() => {
      if (cpuUsages.length > 0) {
        const averageCpuUsage = calculateAverage(cpuUsages);
        resolve(averageCpuUsage);
      } else {
        reject(new Error("Timeout while fetching CPU usage"));
      }
    }, 5000); // 5 seconds timeout
  });
}

async function performHealthCheck(): Promise<HealthData> {
  const dockerStatus = await checkDockerStatus();
  const containers = await docker.listContainers();
  const containerData = await Promise.all(
    containers.map(async (container) => {
      const containerInstance = docker.getContainer(container.Id);
      const [logs, cpu] = await Promise.all([
        containerInstance.logs({
          tail: LOG_LINES_LIMIT,
          stdout: true,
          stderr: true,
        }),
        getContainerCpuUsage(container.Id),
      ]);
      return {
        id: container.Id,
        name: container.Names[0],
        status: container.State,
        cpu,
        logs: logs.toString().split("\n").slice(-LOG_LINES_LIMIT),
      };
    })
  );

  return {
    timestamp: Date.now(),
    systemCpu: getSystemCpuUsage(),
    dockerStatus,
    containers: containerData,
  };
}

async function checkDockerStatus(): Promise<string> {
  try {
    await docker.ping();
    return "running";
  } catch (error) {
    return "not running";
  }
}

export function initializeHealthCheck() {
  ipcMain.on("start-health-check", (event: IpcMainEvent) => {
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval);
    }

    healthCheckInterval = setInterval(async () => {
      try {
        const healthData = await performHealthCheck();
        event.sender.send("health-check-data", healthData);
      } catch (error) {
        console.error("Health check failed:", error);
        event.sender.send("health-check-error", (error as Error).message);
      }
    }, HEALTH_CHECK_INTERVAL);

    event.sender.send("health-check-started");
  });

  ipcMain.on("stop-health-check", (event: IpcMainEvent) => {
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval);
      healthCheckInterval = null;
      event.sender.send("health-check-stopped");
    }
  });

  ipcMain.on("get-single-health-check", async (event: IpcMainEvent) => {
    try {
      const healthData = await performHealthCheck();
      event.sender.send("single-health-check-data", healthData);
    } catch (error) {
      console.error("Single health check failed:", error);
      event.sender.send("health-check-error", (error as Error).message);
    }
  });
}
