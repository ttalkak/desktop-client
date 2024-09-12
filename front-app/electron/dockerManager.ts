import { ipcMain } from "electron";
import { exec } from "child_process";
import { promisify } from "util";
import Docker from "dockerode";
import path from "node:path";
import * as fs from "fs";
import { Readable } from "stream";

const execAsync = promisify(exec);

// Dockerode 인스턴스 생성
export const docker = new Docker();

// 로그 스트림 객체
export const logStreams: Record<string, Readable> = {};

//------------------- 도커 상태 체크 -----------------------------
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
  ipcMain.on("get-docker-event", (event) => {
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
            const filteredActions = [
              "exec_start",
              "exec_create",
              "exec_die",
              "attach",
              // "health_status",
              "network_connect",
              "network_disconnect",
              "volume_create",
              "volume_remove",
              "image_pull",
              "image_push",
              "checkpoint_create",
              "checkpoint_delete",
              "container_kill",
            ];
            // 이벤트 필터링: heartbeat 또는 불필요한 이벤트 필터링
            if (
              (dockerEvent.Type === "container" ||
                dockerEvent.Type === "image") &&
              dockerEvent.Action !== "heartbeat" &&
              !filteredActions.includes(dockerEvent.Action)
            ) {
              event.reply("docker-event-response", dockerEvent);
            }
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

//------------------- 개별 컨테이너 stats cpu, 디스크 리딩 포함

//1회성 요청, 하나의 컨테이너 stats 가져옴

export async function getContainerMemoryUsage(
  containerId: string
): Promise<number> {
  const container = docker.getContainer(containerId);

  try {
    // Docker 컨테이너의 stats를 1회성으로 수신
    const stats = await container.stats({ stream: false });

    // 메모리 사용량 추출 (stats.memory_stats.usage가 메모리 사용량을 나타냄)
    const memoryUsage = stats.memory_stats.usage;

    return memoryUsage;
  } catch (error) {
    console.error("Error fetching memory usage:", error);
    throw error;
  }
}

//메모리 사용량
export function handleGetContainerMemoryUsage() {
  ipcMain.handle(
    "get-container-memory-usage",
    async (_event, containerId: string) => {
      try {
        // getContainerMemoryUsage 함수 호출하여 메모리 사용량 가져옴
        const memoryUsage = await getContainerMemoryUsage(containerId);
        return { success: true, memoryUsage };
      } catch (error) {
        console.error("Failed to get memory usage:", error);
        return { success: false, error: error };
      }
    }
  );
}

//주기적으로 컨테이너 정보가져오는 함수
const statsIntervals = new Map<string, NodeJS.Timeout>();

export function handleGetContainerStatsPeriodic() {
  ipcMain.handle(
    "start-container-stats",
    async (event, containerId: string) => {
      console.log(`Starting stats monitoring for container ${containerId}`);

      // 이미 모니터링 중이라면 기존 인터벌 제거
      if (statsIntervals.has(containerId)) {
        clearInterval(statsIntervals.get(containerId));
      }

      const intervalId = setInterval(async () => {
        try {
          const container = docker.getContainer(containerId);
          const stats = await new Promise((resolve, reject) => {
            container.stats({ stream: false }, (err, stats) => {
              if (err) reject(err);
              else
                resolve({
                  cpu_usage: stats?.cpu_stats.cpu_usage.total_usage,
                  memory_usage: stats?.memory_stats.usage,
                  container_id: containerId,
                  blkio_read:
                    stats?.blkio_stats?.io_service_bytes_recursive?.find(
                      (io) => io.op === "Read" // 바이트 수
                    )?.value ?? 0,
                  blkio_write:
                    stats?.blkio_stats?.io_service_bytes_recursive?.find(
                      (io) => io.op === "Write" // 바이트 수
                    )?.value ?? 0,
                });
            });
          });

          console.log(`Fetched stats for container ${containerId}:`, stats);
          event.sender.send("container-stats-update", stats);
        } catch (error) {
          console.error(
            `Error fetching stats for container ${containerId}:`,
            error
          );
          event.sender.send("container-stats-error", {
            containerId,
            error: error,
          });
        }
      }, 60000);

      statsIntervals.set(containerId, intervalId);
      return {
        success: true,
        message: `Started monitoring container ${containerId}`,
      };
    }
  );

  ipcMain.handle("stop-container-stats", (_event, containerId: string) => {
    if (statsIntervals.has(containerId)) {
      clearInterval(statsIntervals.get(containerId));
      statsIntervals.delete(containerId);
      return {
        success: true,
        message: `Stopped monitoring container ${containerId}`,
      };
    } else {
      return {
        success: false,
        message: `Container ${containerId} is not being monitored`,
      };
    }
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
  ipcMain.handle("get-all-docker-images", async () => {
    try {
      const images = await docker.listImages({ all: true });
      return images;
    } catch (err) {
      console.error("Failed to fetch Docker images:", err);
      throw err;
    }
  });
};

//컨테이너리스트[실제 실행중인 전체목록]
export const handleFetchDockerContainerList = (all: boolean = false): void => {
  ipcMain.handle("get-all-docker-containers", async () => {
    try {
      const containers = await docker.listContainers({ all, size: true });
      return containers;
    } catch (err) {
      console.error("Failed to fetch Docker containers:", err);
      throw err;
    }
  });
};

// Docker 컨테이너 로그 스트리밍
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

//도커파일 찾기
export function findDockerfile(directory: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const files = fs.readdirSync(directory);

    // 파일들 먼저 탐색 (루트 디렉토리에서 Dockerfile을 먼저 찾음)
    for (const file of files) {
      const fullPath = path.join(directory, file);
      const stat = fs.statSync(fullPath);

      if (!stat.isDirectory() && file === "Dockerfile") {
        console.log(`Dockerfile found at: ${fullPath}`);
        resolve(fullPath);
        return;
      }
    }

    // 디렉토리 탐색 (루트에서 찾지 못했을 경우에만 하위 디렉토리를 탐색)
    for (const file of files) {
      const fullPath = path.join(directory, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        findDockerfile(fullPath).then(resolve).catch(reject);
        return;
      }
    }

    // Dockerfile을 찾지 못한 경우
    console.log(`No Dockerfile found in directory: ${directory}`);
    reject(new Error("Dockerfile not found in the specified directory."));
  });
}

export function handleFindDockerFile() {
  ipcMain.handle("find-dockerfile", async (_, directory: string) => {
    try {
      const dockerfilePath = await findDockerfile(directory);
      return { success: true, dockerfilePath };
    } catch (error) {
      console.error("Error finding Dockerfile:", error);
      return { success: false, message: (error as Error).message };
    }
  });
}

export async function buildDockerImage(
  contextPath: string,
  dockerfilePath: string,
  imageName: string,
  tag: string
): Promise<{
  status: "success" | "exists" | "failed";
  image?: DockerImage;
}> {
  const fullTag = `${imageName}:${tag}`;

  // 이미지 목록을 가져옵니다.
  const dockerImages = await docker.listImages();
  const imageInDocker = dockerImages.find((img) =>
    img.RepoTags?.includes(fullTag)
  );

  // 이미지가 이미 존재하는 경우
  if (imageInDocker) {
    console.log(`Image ${fullTag} already exists. Deleting and rebuilding...`);

    // 이미지 삭제
    const removeResult = await removeImage(fullTag);
    if (!removeResult.success) {
      return { status: "failed" };
    }

    // 삭제 후 다시 빌드
    console.log(`Rebuilding Docker image ${fullTag}`);
  }

  const dockerfileRelativePath = path.basename(dockerfilePath);

  // 이미지 빌드를 시작합니다.
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

  // 빌드 결과를 처리합니다.
  return new Promise<{
    status: "success" | "exists" | "failed";
    image?: DockerImage;
  }>((resolve, reject) => {
    stream.on("end", async () => {
      console.log(`Docker image ${fullTag} built successfully`);

      try {
        const builtImage = await docker.getImage(fullTag).inspect();
        resolve({ status: "success", image: builtImage });
      } catch (error) {
        console.error("Error inspecting built image:", error);
        reject({ status: "failed" });
      }
    });

    stream.on("error", (err: Error) => {
      console.error("Error building Docker image:", err);
      reject({ status: "failed" });
    });
  });
}

// 파일 경로 기반으로 이미지 빌드
export async function processAndBuildImage(
  contextPath: string,
  dockerfilePath: string,
  imageName: string,
  tag: string
): Promise<{
  status: "success" | "exists" | "failed";
  image?: DockerImage;
}> {
  if (dockerfilePath) {
    console.log(`Dockerfile found at: ${dockerfilePath}`);
    try {
      const buildStatus = await buildDockerImage(
        contextPath,
        dockerfilePath,
        imageName,
        tag
      );
      console.log(`Docker image build status: ${buildStatus.status}`);
      return buildStatus; // ImageInspectInfo 타입의 이미지 정보 반환
    } catch (error) {
      console.error("Failed to build Docker image:", error);
      return { status: "failed" };
    }
  } else {
    console.error("Dockerfile not found.");
    return { status: "failed" };
  }
}

// 이미지 삭제 함수
export const removeImage = async (
  imageId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const image = docker.getImage(imageId);

    // 먼저 이미지가 사용 중인지 확인
    const containers = await docker.listContainers({ all: true });
    const usingContainers = containers.filter(
      (container) => container.Image === imageId
    );

    if (usingContainers.length > 0) {
      console.log(`Image ${imageId} is used by the following containers:`);
      usingContainers.forEach((container) => {
        console.log(`Stopping and removing container ${container.Id}`);
      });

      // 사용 중인 컨테이너 중지 및 삭제
      for (const container of usingContainers) {
        const cont = docker.getContainer(container.Id);
        await cont.stop();
        await cont.remove();
        console.log(`Container ${container.Id} removed successfully`);
      }
    }

    // 강제 삭제를 시도합니다.
    await image.remove({ force: true });
    console.log(`Image ${imageId} removed successfully`);
    return { success: true };
  } catch (error) {
    console.error(`Error removing image ${imageId}:`, error);
    return { success: false, error: (error as Error).message };
  }
};

// 이미지 IPC 핸들러
export function handleBuildDockerImage() {
  ipcMain.handle(
    "build-docker-image",
    async (
      _event,
      contextPath: string,
      dockerfilePath: string,
      imageName: string = "my-docker-image",
      tag: string = "latest"
    ) => {
      console.log(
        `Received request to build Docker image from path: ${contextPath}`
      );
      try {
        // 이미지 빌드 및 결과 반환
        const buildResult = await processAndBuildImage(
          contextPath,
          dockerfilePath,
          imageName,
          tag
        );
        console.log(buildResult.status);
        return { success: true, image: buildResult.image };
      } catch (error) {
        console.error("Error processing Docker image:", error);
        // 실패 시 오류 메시지 반환
        return { success: false, message: (error as Error).message };
      }
    }
  );

  ipcMain.handle("remove-image", async (_event, imageId: string) => {
    return removeImage(imageId);
  });
}

//--------Docker 컨테이너 생성/실행/정지/삭제

// Docker 컨테이너 옵션 설정 함수
export const createContainerOptions = (
  name: string,
  containerName: string,
  inboundPort: number = 80,
  outboundPort: number = 8080
): ContainerCreateOptions => {
  return {
    Image: name,
    name: containerName,
    ExposedPorts: inboundPort
      ? {
          [`${inboundPort}/tcp`]: {},
        }
      : {},
    HostConfig: {
      PortBindings:
        inboundPort && outboundPort
          ? {
              [`${inboundPort}/tcp`]: [{ HostPort: outboundPort + "" }],
            }
          : {},
    },
    Healthcheck: {
      Test: ["CMD-SHELL", "curl -f http://localhost/ || exit 1"],
      Interval: 30000000000, // 30초 (나노초 단위)
      Timeout: 10000000000, // 10초 (나노초 단위)
      Retries: 3, // 실패 시 재시도 횟수
      StartPeriod: 5000000000, // 컨테이너 시작 후 처음 HealthCheck를 수행하기 전 대기 시간 (5초)
    },
  };
};

export const createContainer = async (
  options: ContainerCreateOptions
): Promise<{ success: boolean; containerId?: string; error?: string }> => {
  try {
    // 동일한 이름의 컨테이너가 이미 있는지 확인
    const existingContainers = await docker.listContainers({ all: true });
    const existingContainer = existingContainers.find((container) =>
      container.Names.includes(`/${options.name}`)
    );

    if (existingContainer) {
      console.log(
        `Container with name ${options.name} already exists with ID ${existingContainer.Id}.`
      );
      return {
        success: true,
        containerId: existingContainer.Id,
        error: "Container with this name already exists",
      };
    }

    // 새로운 컨테이너 생성
    const container = await docker.createContainer(options);
    console.log(`Container ${container.id} created successfully`);
    return { success: true, containerId: container.id };
  } catch (error) {
    console.error("Error creating container:", error);
    return { success: false, error: (error as Error).message };
  }
};

export const startContainer = async (
  containerId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const container = docker.getContainer(containerId);
    const containerInfo = await container.inspect();

    // 컨테이너가 존재하고 실행 중이 아닌 경우에만 시작
    if (containerInfo.State && containerInfo.State.Status !== "running") {
      await container.start();
      console.log(`Container ${containerId} started successfully`);
      return { success: true };
    } else if (containerInfo.State.Status === "running") {
      console.log(`Container ${containerId} is already running`);
      return { success: true };
    } else {
      console.error(
        `Container ${containerId} is not in a state that can be started`
      );
      return { success: false, error: "Container is not in a startable state" };
    }
  } catch (error) {
    console.error(`Error starting container ${containerId}:`, error);
    return { success: false, error: (error as Error).message };
  }
};

// 컨테이너 정지
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

//Container Ipc Handler
export function registerContainerIpcHandlers() {
  ipcMain.handle(
    "create-container-options",
    async (
      _event,
      repoTag: string,
      containerName: string,
      inboundPort?: number,
      outboundPort?: number
    ) => {
      try {
        return createContainerOptions(
          repoTag,
          containerName,
          inboundPort,
          outboundPort
        );
      } catch (error) {
        console.error(`Error creating container options:`, error);
        throw error;
      }
    }
  );

  ipcMain.handle(
    "create-container",
    async (_event, options: ContainerCreateOptions) => {
      return createContainer(options);
    }
  );

  ipcMain.handle("start-container", async (_event, containerId: string) => {
    return startContainer(containerId);
  });

  //생성 및 시작
  ipcMain.handle(
    "create-and-start-container",
    async (_event, containerOptions: ContainerCreateOptions) => {
      try {
        // 컨테이너 생성
        const result = await createContainer(containerOptions);

        if (result.success && result.containerId) {
          // 컨테이너 실행
          const startResult = await startContainer(result.containerId);
          if (startResult.success) {
            return { success: true, containerId: result.containerId };
          } else {
            throw new Error(startResult.error);
          }
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error("Error during container creation and start:", error);
        return { success: false, error: (error as Error).message };
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
