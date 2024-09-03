import { ipcMain, BrowserWindow, IpcMainEvent } from "electron";
import { exec } from "child_process";
import { promisify } from "util";
import Docker from "dockerode";
import { EventEmitter } from "events";
import path from "node:path";
import * as fs from "fs";
import { Readable } from "stream";
import { getAllDockerImages, setDockerImage } from "./store/storeManager";

const execAsync = promisify(exec);

// Dockerode 인스턴스 생성
export const docker = new Docker();

// 로그 스트림 객체
export const logStreams: Record<string, Readable> = {};

//------------------- 도커 상태 체크 -----------------------------
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
    return await checkDockerStatus();
  });
};

//------------------- Docker Desktop 경로 ------------------------
export const getDockerPath = (): void => {
  ipcMain.handle("get-docker-path", async () => {
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
  });
};

//------------------- Docker Desktop 실행 ------------------------
export const handleStartDocker = (): void => {
  ipcMain.handle("open-docker-desktop", async (_event, dockerPath) => {
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

//------------------- 도커 이벤트 스트림 --------------------------
export const handleGetDockerEvent = (): void => {
  ipcMain.on("get-docker-event", (event: IpcMainEvent) => {
    docker.getEvents({}, (err, stream) => {
      if (err) {
        console.error("Error connecting to Docker events:", err);
        event.reply("docker-event-error", err.message);
        return;
      }

      if (stream) {
        stream.on("data", (chunk: Buffer) => {
          try {
            const dockerEvent = JSON.parse(chunk.toString());
            event.reply("docker-event-response", dockerEvent);
          } catch (parseError) {
            console.error("Error parsing Docker event:", parseError);
            event.reply("docker-event-error", parseError);
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
    });
  });
};

//------------------- CPU 사용률 스트림 --------------------------
export function getContainerStatsStream(containerId: string): EventEmitter {
  const container = docker.getContainer(containerId);
  const statsEmitter = new EventEmitter();

  container.stats({ stream: true }, (err, stream) => {
    if (err) {
      console.error("Error fetching stats:", err);
      statsEmitter.emit("error", { containerId, error: err });
      return;
    }

    stream?.on("data", (data: Buffer) => {
      try {
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
      } catch (error) {
        console.error("Error parsing stats data:", error);
        statsEmitter.emit("error", { containerId, error });
      }
    });

    stream?.on("error", (err: Error) => {
      console.error("Stream error:", err);
      statsEmitter.emit("error", { containerId, error: err });
    });

    stream?.on("end", () => {
      statsEmitter.emit("end", { containerId });
    });
  });

  return statsEmitter;
}

export function monitorAllContainersCpuUsage(mainWindow: BrowserWindow): void {
  docker.listContainers((err, containers) => {
    if (err) {
      console.error("Error listing containers:", err);
      return;
    }

    if (!containers || containers.length === 0) {
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
          const averageCpuUsage = totalCpuUsage / containerCount;

          mainWindow.webContents.send("cpu-usage-percent", {
            containerId,
            cpuUsagePercent,
          });

          mainWindow.webContents.send("average-cpu-usage", {
            averageCpuUsage,
          });
        }
      );

      statsEmitter.on("error", ({ containerId, error }) => {
        console.error(`Error in container ${containerId}:`, error);
      });

      statsEmitter.on("end", ({ containerId }) => {
        console.log(`Monitoring ended for container ${containerId}`);
        containerCount--;
        totalCpuUsage -= 0; // 종료된 컨테이너의 CPU 사용률을 총합에서 제거
      });
    });
  });
}

//----------Docker 이미지 및 컨테이너 Fetch

//단일이미지[이미지 파일있음]
export const handleFetchDockerImages = (): void => {
  ipcMain.handle("fetch-docker-image", async (_event, imageId: string) => {
    try {
      const image = await docker.getImage(imageId).inspect();
      return image;
    } catch (err) {
      console.error(`Failed to fetch Docker image ${imageId}:`, err);
      throw err;
    }
  });
};

//단일 컨테이너[컨테이너 파일 있음]
export const handleFetchDockerContainer = (): void => {
  ipcMain.handle(
    "fetch-docker-container",
    async (_event, containerId: string) => {
      try {
        const container = await docker.getContainer(containerId).inspect();
        return container;
      } catch (err) {
        console.error(`Failed to fetch Docker container ${containerId}:`, err);
        throw err;
      }
    }
  );
};

//이미지리스트[실제 실행중인 전체목록]
export const handleFetchDockerImageList = (): void => {
  ipcMain.handle("get-docker-images", async () => {
    try {
      const images = await getAllDockerImages();
      return images;
    } catch (err) {
      console.error("Failed to fetch Docker images:", err);
      throw err;
    }
  });
};
//컨테이너리스트[실제 실행중인 전체목록]
export const handleFetchDockerContainerList = (): void => {
  ipcMain.handle("fetch-docker-containers", async () => {
    try {
      const containers = await docker.listContainers();
      return containers;
    } catch (err) {
      console.error("Failed to fetch Docker containers:", err);
      throw err;
    }
  });
};

//------------------- Docker 컨테이너 로그 스트리밍 --------------------------
export const handleFetchContainerLogs = (): void => {
  ipcMain.on(
    "start-container-log-stream",
    async (event, containerId: string) => {
      try {
        const container = docker.getContainer(containerId);
        const logStream = (await container.logs({
          follow: true,
          stdout: true,
          stderr: true,
          since: 0,
          timestamps: true,
        })) as Readable;

        logStreams[containerId] = logStream;

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

ipcMain.on("stop-container-log-stream", (event, containerId: string) => {
  const logStream = logStreams[containerId];
  if (logStream) {
    logStream.destroy();
    delete logStreams[containerId];
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

//------------------- Docker 이미지 생성
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

export async function buildDockerImage(
  dockerfilePath: string,
  imageName: string = "my-docker-image",
  tag: string = "latest"
): Promise<string> {
  const fullTag = `${imageName}:${tag}`;

  const storedImages = getAllDockerImages();
  const imageInStore = storedImages.find((img) =>
    img.RepoTags?.includes(fullTag)
  );

  const dockerImages = await docker.listImages();
  const imageInDocker = dockerImages.find((img) =>
    img.RepoTags?.includes(fullTag)
  );

  if (imageInStore && imageInDocker) {
    console.log(`Image ${fullTag} already exists. Skipping build.`);
    return "exists";
  }

  const contextPath = path.dirname(dockerfilePath);
  const dockerfileRelativePath = path.basename(dockerfilePath);

  const stream = await new Promise<NodeJS.ReadableStream>((resolve, reject) => {
    docker.buildImage(
      { context: contextPath, src: [dockerfileRelativePath] },
      { t: fullTag },
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

  stream.pipe(process.stdout, { end: true });

  return new Promise<string>((resolve, reject) => {
    stream.on("end", async () => {
      console.log(`Docker image ${fullTag} built successfully`);

      try {
        const builtImage = await docker.getImage(fullTag).inspect();
        setDockerImage(builtImage);
        resolve(builtImage.Id);
      } catch (error) {
        console.error("Error inspecting built image:", error);
        resolve("built");
      }
    });

    stream.on("error", (err: Error) => {
      console.error("Error building Docker image:", err);
      reject("failed");
    });
  });
}

export async function processAndBuildImage(
  contextPath: string,
  imageName: string,
  tag: string
) {
  const dockerfilePath = findDockerfile(contextPath);

  if (dockerfilePath) {
    console.log(`Dockerfile found at: ${dockerfilePath}`);
    try {
      const buildStatus = await buildDockerImage(
        dockerfilePath,
        imageName,
        tag
      );
      console.log(`Docker image build status: ${buildStatus}`);
    } catch (error) {
      console.error("Failed to build Docker image:", error);
    }
  } else {
    console.error("Dockerfile not found.");
  }
}

export function handleBuildDockerImage() {
  ipcMain.handle(
    "build-docker-image",
    async (
      _event,
      contextPath: string,
      imageName: string = "my-docker-image",
      tag: string = "latest"
    ) => {
      console.log(
        `Received request to build Docker image from path: ${contextPath}`
      );
      try {
        await processAndBuildImage(contextPath, imageName, tag);
        return { status: "success" };
      } catch (error) {
        console.error("Error processing Docker image:", error);
        return { status: "error", message: (error as Error).message };
      }
    }
  );
}

//--------Docker 컨테이너 생성 및 실행
export const createAndStartContainer = async (
  options: Docker.ContainerCreateOptions
): Promise<void> => {
  try {
    // 동일한 이름의 컨테이너가 있는지 확인
    const existingContainers = await docker.listContainers({ all: true });
    const existingContainer = existingContainers.find((container) =>
      container.Names.includes(`/${options.name}`)
    );

    if (existingContainer) {
      console.log(
        `Container with the name "${options.name}" already exists. Skipping creation.`
      );
      return;
    }

    // 컨테이너 생성
    const container = await docker.createContainer(options);
    await container.start();
    console.log(
      `Container ${options.name || container.id} started successfully`
    );
  } catch (err) {
    console.error("Error creating or starting container:", err);
  }
};

// 컨테이너 정지 함수
export const stopContainer = async (containerId: string): Promise<void> => {
  try {
    const container = docker.getContainer(containerId);
    await container.stop();
    console.log(`Container ${containerId} stopped successfully`);
  } catch (err) {
    console.error(`Error stopping container ${containerId}:`, err);
  }
};

// 컨테이너 삭제 함수
export const removeContainer = async (
  containerId: string,
  options?: ContainerRemoveOptions
): Promise<void> => {
  try {
    const container = docker.getContainer(containerId);
    await container.remove(options);
    console.log(`Container ${containerId} removed successfully`);
  } catch (err) {
    console.error(`Error removing container ${containerId}:`, err);
  }
};

export function registerContainerIpcHandlers() {
  ipcMain.handle(
    "create-and-start-container",
    async (_event, options: ContainerCreateOptions) => {
      try {
        await createAndStartContainer(options);
        return { success: true };
      } catch (err) {
        console.error("Error creating or starting container:", err);
        return { success: false, error: (err as Error).message };
      }
    }
  );

  ipcMain.handle("stop-container", async (_event, containerId: string) => {
    try {
      await stopContainer(containerId);
      return { success: true };
    } catch (err) {
      console.error(`Error stopping container ${containerId}:`, err);
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(
    "remove-container",
    async (_event, containerId: string, options?: ContainerRemoveOptions) => {
      try {
        await removeContainer(containerId, options);
        return { success: true };
      } catch (err) {
        console.error(`Error removing container ${containerId}:`, err);
        return { success: false, error: (err as Error).message };
      }
    }
  );
}
