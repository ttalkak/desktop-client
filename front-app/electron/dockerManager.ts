import { ipcMain } from "electron";
import { exec } from "child_process";
import { promisify } from "util";
import Docker from "dockerode";
import { EventEmitter } from "events";
import path from "node:path";
import * as fs from "fs";

const execAsync = promisify(exec);

// Dockerode 인스턴스 생성
// export const docker = new Dockerode({ host: "127.0.0.1", port: 2375 }); 원격 도커 연결용
// 로컬 도커 연결용
export const docker = new Docker();

//로그 스트림 객체
export const logStreams: { [key: string]: any } = {};

//----------------------------------도커 실행관련------------------------------------
// Docker running 상태 체크 반환
export async function checkDockerStatus(): Promise<string> {
  try {
    await execAsync("docker info");
    return "running";
  } catch {
    return "not running";
  }
}
export const handlecheckDockerStatus = (): void => {
  ipcMain.handle("check-docker-status", async () => {
    try {
      const status = await checkDockerStatus(); // Docker 상태 체크 후 결과를 기다림
      return status; // Docker 실행 여부를 'running' 또는 'unknown'으로 반환
    } catch (error) {
      console.error("Error while checking Docker status:", error);
      return "unknown"; // 오류 발생 시 'unknown' 반환
    }
  });
};

// Docker Desktop 경로 가져오는 함수 및 IPC 핸들러
export const getDockerPath = (): void => {
  ipcMain.handle("get-docker-path", async () => {
    return new Promise((resolve, reject) => {
      const command = "where docker"; // Docker 경로를 찾는 명령

      exec(command, (error, _stdout, stderr) => {
        if (error) {
          console.error(`Error getting Docker path: ${error.message}`);
          reject(`Error getting Docker path: ${error.message}`);
          return;
        }
        if (stderr && stderr.toLowerCase().includes("not found")) {
          console.error(`Docker not found: ${stderr}`);
          reject(`Docker not found: ${stderr}`);
          return;
        }

        // 경로가 여러 줄로 나올 수 있으므로, 첫 번째 경로를 사용
        // const dockerPath = stdout.trim().split("\n")[0] || 'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe';
        const dockerPath =
          "C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe";

        if (!dockerPath) {
          console.error("Docker path not found.");
          reject("Docker path not found.");
          return;
        }

        console.log(`Docker path found: ${dockerPath}`);
        resolve(dockerPath); // Docker 경로 반환
      });
    });
  });
};

// Docker Desktop 실행
export const handleStartDocker = (): void => {
  ipcMain.handle("open-docker-desktop", async (_event, dockerPath) => {
    if (!dockerPath) {
      console.error("Docker executable path not provided.");
      return;
    }

    exec(`"${dockerPath}"`, (error, _stdout, stderr) => {
      if (error) {
        console.error(`Execution Error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`Error Output: ${stderr}`);
        return;
      }
      console.log("Docker Desktop launched successfully.", dockerPath);
    });
  });
};

//--------------------- 도커 이벤트 스트림 구독(로컬 도커 이벤트 감지)-------------------------
export const handleGetDockerEvent = (): void => {
  ipcMain.on("get-docker-event", (event) => {
    docker.getEvents((err, stream) => {
      if (err) {
        console.error("Error connecting to Docker events:", err);
        event.reply("docker-event-error", err.message);
        return;
      }

      stream?.on("data", (chunk) => {
        try {
          const dockerEvent = JSON.parse(chunk.toString());
          // console.log("Docker event received:", dockerEvent);

          // 렌더러 프로세스로 이벤트를 전송
          event.reply("docker-event-response", dockerEvent);
        } catch (parseError) {
          console.error("Error parsing Docker event:", parseError);
          event.reply("docker-event-error");
        }
      });

      stream?.on("error", (error) => {
        console.error("Stream Error:", error);
        event.reply("docker-event-error", error.message);
      });

      stream?.on("end", () => {
        console.log("Docker events stream ended");
        event.reply("docker-event-end");
      });
    });
  });
};

//----------------------------------- cpu 가용률 스트림 --------------------------------
export function getContainerStatsStream(containerId: string): EventEmitter {
  const container = docker.getContainer(containerId);
  const statsEmitter = new EventEmitter();

  container.stats({ stream: true }, (err, stream) => {
    if (err) {
      console.error("Error fetching stats:", err);
      statsEmitter.emit("error", err);
      return;
    }

    stream?.on("data", (data) => {
      const stats = JSON.parse(data.toString());
      const cpuDelta =
        stats.cpu_stats.cpu_usage.total_usage -
        stats.precpu_stats.cpu_usage.total_usage;
      const systemDelta =
        stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
      const numberOfCpus = stats.cpu_stats.online_cpus;

      const cpuUsagePercent = (cpuDelta / systemDelta) * numberOfCpus * 100;
      statsEmitter.emit("data", cpuUsagePercent);
    });

    stream?.on("error", (err) => {
      console.error("Stream error:", err);
      statsEmitter.emit("error", err);
    });

    stream?.on("end", () => {
      statsEmitter.emit("end");
    });
  });

  return statsEmitter;
}

export function calculateAverage(cpuUsages: number[]): number {
  const sum = cpuUsages.reduce((a, b) => a + b, 0);
  return sum / cpuUsages.length;
}

// 배치 처리 및 웹소켓 전송
// export function handleCpuUsageBatchAndWebSocket(containerId: string, batchSize: number, interval: number) {
//   const cpuUsages: number[] = [];
//   const statsStream = getContainerStatsStream(containerId);

//   statsStream.on('data', (cpuUsage) => {
//     cpuUsages.push(cpuUsage);

//     if (cpuUsages.length >= batchSize) {
//       const averageCpuUsage = calculateAverage(cpuUsages);
//       sendCpuUsageOverWebSocket(containerId, averageCpuUsage);
//       cpuUsages.length = 0; // 배치 처리 후 배열 초기화
//     }
//   });

//   statsStream.on('error', (err) => {
//     console.error('Error in CPU usage stream:', err);
//   });

//   statsStream.on('end', () => {
//     // 스트림이 종료되었을 때 남은 데이터를 처리
//     if (cpuUsages.length > 0) {
//       const averageCpuUsage = calculateAverage(cpuUsages);
//       sendCpuUsageOverWebSocket(containerId, averageCpuUsage);
//     }
//   });

// 정해진 간격(interval)마다 강제로 배치 처리
//   setInterval(() => {
//     if (cpuUsages.length > 0) {
//       const averageCpuUsage = calculateAverage(cpuUsages);
//       sendCpuUsageOverWebSocket(containerId, averageCpuUsage);
//       cpuUsages.length = 0;
//     }
//   }, interval);
// }

// function sendCpuUsageOverWebSocket(containerId: string, cpuUsage: number) {
//   const message = JSON.stringify({
//     containerId,
//     cpuUsage,
//     timestamp: new Date().toISOString(),
//   });

//   wss.clients.forEach(client => {
//     if (client.readyState === WebSocket.OPEN) {
//       client.send(message);
//     }
//   });
// }

//---------------------------- Docker 이미지, 컨테이너 Fetch -------------------------------
export const handleFetchDockerImages = (): void => {
  ipcMain.handle("get-docker-images", async () => {
    try {
      const images = await docker.listImages();
      return images;
    } catch (err) {
      // console.error("Error fetching Docker images:", err);
      return err;
    }
  });
};

export const handleFetchDockerContainers = (): void => {
  ipcMain.handle("fetch-docker-containers", async () => {
    try {
      const containers = await docker.listContainers();
      return containers;
    } catch (err) {
      return err;
    }
  });
};

// ----------------------- Docker 컨테이너 로그 -----------------------------------------
export const handleFetchContainerLogs = (): void => {
  ipcMain.on(
    "start-container-log-stream",
    async (event, containerId: string) => {
      try {
        const container = docker.getContainer(containerId);
        const logStream = await container.logs({
          follow: true, // 새로운 로그를 실시간으로 가져옵니다.
          stdout: true,
          stderr: true,
          since: 0, // 모든 로그를 가져옵니다.
          timestamps: true,
        });

        logStreams[containerId] = logStream; // 스트림을 저장합니다.

        logStream.on("data", (chunk) => {
          event.sender.send("container-logs-stream", chunk.toString());
        });

        logStream.on("error", (err) => {
          event.sender.send("container-logs-error", err.message);
        });

        logStream.on("end", () => {
          event.sender.send("container-logs-end");
        });
      } catch (err) {
        event.sender.send("container-logs-error" || "Unknown error");
      }
    }
  );

  ipcMain.on("stop-container-log-stream", (event, containerId: string) => {
    const logStream = logStreams[containerId];
    if (logStream) {
      logStream.destroy(); // 스트림을 종료합니다.
      delete logStreams[containerId]; // 스트림을 객체에서 삭제합니다.
      event.sender.send(
        "container-logs-end",
        `Log stream for container ${containerId} has been stopped.`
      );
    } else {
      event.sender.send(
        "container-logs-error",
        `No active log stream for container ${containerId}.`
      );
    }
  });
};

//----------------------------------------- Docker 이미지 생성 --------------------------

// unzip된 파일에서 도커파일 경로 탐색

export function findDockerfile(directory: string): string | null {
  const files = fs.readdirSync(directory);

  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      const result = findDockerfile(fullPath);
      if (result) {
        return result;
      }
    } else if (file === "Dockerfile") {
      return fullPath;
    }
  }

  return null;
}

//=> 해당 도커파일 경로를 기준으로 이미지 빌드
export async function buildDockerImage(
  _dockerfilePath: string,
  contextPath: string
) {
  const stream = await docker.buildImage(
    {
      context: contextPath,
      src: ["Dockerfile"],
    },
    { t: "my-new-docker-image" }
  );

  stream.pipe(process.stdout, { end: true });

  return new Promise((resolve, reject) => {
    stream.on("end", () => {
      console.log("Docker image built successfully");
      resolve("built");
    });

    stream.on("error", (err) => {
      console.error("Error building Docker image:", err);
      reject("failed");
    });
  });
}

export async function processAndBuildImage(contextPath: string) {
  const dockerfilePath = findDockerfile(contextPath);

  if (dockerfilePath) {
    console.log(`Dockerfile found at: ${dockerfilePath}`);
    try {
      const buildStatus = await buildDockerImage(dockerfilePath, contextPath);
      console.log(`Docker image build status: ${buildStatus}`);
    } catch (error) {
      console.error("Failed to build Docker image:", error);
    }
  } else {
    console.error("Dockerfile not found.");
  }
}

//
export function handleBuildDockerImage() {
  ipcMain.handle("build-docker-image", async (_event, contextPath: string) => {
    console.log(
      `Received request to build Docker image from path: ${contextPath}`
    );
    try {
      await processAndBuildImage(contextPath);
      return { status: "success" };
    } catch (error) {
      console.error("Error processing Docker image:", error);
      return { status: "error", message: error };
    }
  });
}

// function updateMetadata(dockerfilePath, status) {
//   // 예: JSON 파일 업데이트
//   console.log(
//     `Updating metadata for: ${dockerfilePath} with status: ${status}`
//   );
//   // 실제 업데이트 로직을 여기에 추가
// }

//----------------------------------------- Docker 컨테이너 생성 및 실행 --------------------------
//이미지 목록 전체 가져와서 실행시키는 기능으로 바꿔야함
export const createAndStartContainer = (): void => {
  const containerOptions = {
    Image: "nginx:latest",
    name: "my-nginx-container",
    ExposedPorts: {
      "80/tcp": {},
    },
    HostConfig: {
      PortBindings: {
        "80/tcp": [
          {
            HostPort: "8080",
          },
        ],
      },
    },
  };

  docker.createContainer(containerOptions, (err, container) => {
    if (err) {
      console.error("Error creating container:", err);
      return;
    }

    container?.start((err, _) => {
      if (err) {
        console.error("Error starting container:", err);
        return;
      }
      console.log("Container started successfully");
    });
  });
};

//컨테이너 정지

//
