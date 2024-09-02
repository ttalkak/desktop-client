import { ipcMain } from "electron";
import { exec } from "child_process";
import { promisify } from "util";
import Docker from "dockerode";
import { EventEmitter } from "events";
import path from "node:path";
import * as fs from "fs";
import { IpcMainEvent } from "electron";
import { Readable } from "stream";
import { BrowserWindow } from "electron";

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

//--------------------- 도커 이벤트 스트림 구독(로컬 도커 이벤트 감지)
export const handleGetDockerEvent = (): void => {
  ipcMain.on("get-docker-event", (event: IpcMainEvent) => {
    docker.getEvents(
      {},
      (err: Error | null, stream: NodeJS.ReadableStream | undefined) => {
        if (err) {
          console.error("Error connecting to Docker events:", err);
          event.reply("docker-event-error", err.message);
          return;
        }

        if (stream) {
          // Process the stream data
          stream.on("data", (chunk: Buffer) => {
            try {
              const dockerEvent = JSON.parse(chunk.toString());
              // Send the event to the renderer process
              event.reply("docker-event-response", dockerEvent);
            } catch (parseError) {
              console.error("Error parsing Docker event:", parseError);
              event.reply("docker-event-error", (parseError as Error).message);
            }
          });

          stream.on("error", (error: Error) => {
            console.error("Stream Error:", error);
            event.reply("docker-event-error", error.message);
          });

          stream.on("end", () => {
            console.log("Docker events stream ended");
            event.reply("docker-event-end");
          });
        } else {
          event.reply("docker-event-error", "No stream returned");
        }
      }
    );
  });
};

//---------------------cpu 가용률 스트림[개별] ----------------------
export function getContainerStatsStream(containerId: string): EventEmitter {
  const container = docker.getContainer(containerId);
  const statsEmitter = new EventEmitter();

  container.stats(
    { stream: true },
    (err: Error | null, stream: NodeJS.ReadableStream | undefined) => {
      if (err) {
        console.error("Error fetching stats:", err);
        statsEmitter.emit("error", { containerId, error: err });
        return;
      }

      stream?.on("data", (data: Buffer) => {
        const stats = JSON.parse(data.toString());
        const cpuDelta =
          stats.cpu_stats.cpu_usage.total_usage -
          stats.precpu_stats.cpu_usage.total_usage;
        const systemDelta =
          stats.cpu_stats.system_cpu_usage -
          stats.precpu_stats.system_cpu_usage;
        const numberOfCpus = stats.cpu_stats.online_cpus;

        const cpuUsagePercent = (cpuDelta / systemDelta) * numberOfCpus * 100;
        statsEmitter.emit("data", { containerId, cpuUsagePercent });
      });

      stream?.on("error", (err: Error) => {
        console.error("Stream error:", err);
        statsEmitter.emit("error", { containerId, error: err });
      });

      stream?.on("end", () => {
        statsEmitter.emit("end", { containerId });
      });
    }
  );

  return statsEmitter;
}

export function monitorAllContainersCpuUsage(mainWindow: BrowserWindow): void {
  docker.listContainers(
    async (
      err: Error | null,
      containers: Docker.ContainerInfo[] | undefined
    ) => {
      if (err) {
        console.error("Error listing containers:", err);
        return;
      }

      if (!containers) {
        console.error("No containers found.");
        return;
      }

      let totalCpuUsage = 0;
      let containerCount = containers.length;

      containers.forEach((container) => {
        const statsEmitter = getContainerStatsStream(container.Id);

        statsEmitter.on(
          "data",
          ({ containerId, cpuUsagePercent }: CpuUsageData) => {
            totalCpuUsage += cpuUsagePercent;

            // 전체 평균 CPU 사용률 계산
            const averageCpuUsage = totalCpuUsage / containerCount;

            // 개별 CPU 사용률 전송
            mainWindow.webContents.send("cpu-usage-percent", {
              containerId,
              cpuUsagePercent,
            });

            // 전체 평균 CPU 사용률 전송
            mainWindow.webContents.send("average-cpu-usage", {
              averageCpuUsage,
            });
          }
        );
        statsEmitter.on(
          "error",
          ({ containerId, error }: { containerId: string; error: Error }) => {
            console.error(`Error in container ${containerId}:`, error);
          }
        );

        statsEmitter.on("end", ({ containerId }: { containerId: string }) => {
          console.log(`Monitoring ended for container ${containerId}`);
          containerCount--;
          totalCpuUsage -= 0; // 종료된 컨테이너의 CPU 사용률을 총합에서 제거
        });
      });
    }
  );
}

export function calculateAverage(cpuUsages: number[]): number {
  const sum = cpuUsages.reduce((a, b) => a + b, 0);
  return sum / cpuUsages.length;
}
// 필요시 일회성 요청
// ipcMain.handle("fetch-container-cpu-usage", async (event, containerId) => {
//   try {
//     const statsStream = getContainerStatsStream(containerId);
//     return new Promise((resolve, reject) => {
//       statsStream.once("data", (cpuUsagePercent) => {
//         resolve(cpuUsagePercent);
//       });

//       statsStream.once("error", (err) => {
//         reject(err);
//       });
//     });
//   } catch (err) {
//     return err;
//   }
// });

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
    async (event: IpcMainEvent, containerId: string) => {
      try {
        const container = docker.getContainer(containerId);
        const logStream = (await container.logs({
          follow: true, // 새로운 로그를 실시간으로 가져옵니다.
          stdout: true,
          stderr: true,
          since: 0, // 모든 로그를 가져옵니다.
          timestamps: true,
        })) as Readable; // logStream을 Readable로 타입 캐스팅

        logStreams[containerId] = logStream; // 스트림을 저장합니다.

        logStream.on("data", (chunk: Buffer) => {
          event.sender.send("container-logs-stream", chunk.toString());
        });

        logStream.on("error", (err: Error) => {
          event.sender.send("container-logs-error", err.message);
        });

        logStream.on("end", () => {
          event.sender.send("container-logs-end");
        });
      } catch (err) {
        event.sender.send(
          "container-logs-error",
          (err as Error).message || "Unknown error"
        );
      }
    }
  );
};

//로그 스트림 원할때 중지
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

//----------------------------------------- Docker 이미지 생성

// Dockerfile을 탐색하는 함수
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

// Docker 이미지 빌드
export async function buildDockerImage(
  dockerfilePath: string
): Promise<string> {
  // Dockerfile이 위치한 디렉토리 경로를 컨텍스트로 설정
  const contextPath = path.dirname(dockerfilePath);
  const dockerfileRelativePath = path.basename(dockerfilePath);

  const stream = await new Promise<NodeJS.ReadableStream>((resolve, reject) => {
    docker.buildImage(
      {
        context: contextPath, // Dockerfile이 있는 디렉토리를 컨텍스트로 설정
        src: [dockerfileRelativePath], // Dockerfile의 상대 경로
      },
      { t: "my-new-docker-image" },
      (err, stream) => {
        if (err) {
          reject(err);
        } else if (stream) {
          resolve(stream);
        } else {
          reject(new Error("Stream is undefined"));
        }
      }
    );
  });

  // 빌드 로그를 표준 출력으로 스트리밍
  if (stream) {
    stream.pipe(process.stdout, { end: true });
  }

  // 빌드 완료를 기다림
  return new Promise<string>((resolve, reject) => {
    if (stream) {
      stream.on("end", () => {
        console.log("Docker image built successfully");
        resolve("built");
      });

      stream.on("error", (err: Error) => {
        console.error("Error building Docker image:", err);
        reject("failed");
      });
    } else {
      reject("Stream not available");
    }
  });
}

// Dockerfile을 찾고 이미지를 빌드하는 함수
export async function processAndBuildImage(contextPath: string) {
  const dockerfilePath = findDockerfile(contextPath);

  if (dockerfilePath) {
    console.log(`Dockerfile found at: ${dockerfilePath}`);
    try {
      const buildStatus = await buildDockerImage(dockerfilePath);
      console.log(`Docker image build status: ${buildStatus}`);
    } catch (error) {
      console.error("Failed to build Docker image:", error);
    }
  } else {
    console.error("Dockerfile not found.");
  }
}

// 도커 이미지 빌드를 위한 핸들러
export function handleBuildDockerImage() {}
ipcMain.handle("build-docker-image", async (_event, contextPath: string) => {
  console.log(
    `Received request to build Docker image from path: ${contextPath}`
  );
  try {
    await processAndBuildImage(contextPath);
    return { status: "success" };
  } catch (error) {
    console.error("Error processing Docker image:", error);
    return { status: "error", message: (error as Error).message };
  }
});

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

  docker.createContainer(containerOptions, (err: Error, container) => {
    if (err) {
      console.error("Error creating container:", err);
      return;
    }

    container?.start((err: Error, _) => {
      if (err) {
        console.error("Error starting container:", err);
        return;
      }
      console.log("Container started successfully");
    });
  });
};

//컨테이너 정지
