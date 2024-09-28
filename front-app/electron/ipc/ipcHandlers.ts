import { ipcMain } from "electron";
import { exec } from "child_process";
import {
  checkDockerStatus,
  getDockerPath,
  findDockerfile,
  docker,
} from "../managers/dockerUtils";
import {
  pullDockerImage,
  buildDockerImage,
  removeImage,
} from "../managers/dockerImageManager";
import {
  createContainerOptions,
  createContainer,
  startContainer,
  stopContainer,
  removeContainer,
} from "../managers/dockerContainerManager";
import Docker from "dockerode";
import {
  getDatabaseImageName,
  pullDatabaseImage,
} from "../managers/dockerDBManager";

// IPC 핸들러들을 등록하는 함수
export function registerIpcHandlers() {
  // Docker 상태를 체크하는 핸들러
  ipcMain.handle("check-docker-status", checkDockerStatus);

  // Docker 실행 파일 경로를 가져오는 핸들러
  ipcMain.handle("get-docker-path", getDockerPath);

  // Docker Desktop을 실행하는 핸들러
  ipcMain.handle("open-docker-desktop", async (_event, dockerPath: string) => {
    if (!dockerPath) {
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

  // Docker 이미지를 조회하는 핸들러
  ipcMain.handle("fetch-docker-image", async (_event, imageId: string) => {
    try {
      return await docker.getImage(imageId).inspect();
    } catch (err) {
      console.error(`Failed to fetch Docker image ${imageId}:`, err);
      throw err;
    }
  });

  // Docker 컨테이너 정보를 조회하는 핸들러
  ipcMain.handle(
    "fetch-docker-container",
    async (_event, containerId: string) => {
      try {
        return await docker.getContainer(containerId).inspect();
      } catch (err) {
        console.error(`Failed to fetch Docker container ${containerId}:`, err);
        throw err;
      }
    }
  );

  // 모든 Docker 이미지를 가져오는 핸들러
  ipcMain.handle("get-all-docker-images", async () => {
    try {
      return await docker.listImages({ all: true });
    } catch (err) {
      console.error("Failed to fetch Docker images:", err);
      throw err;
    }
  });

  // 모든 Docker 컨테이너를 가져오는 핸들러 (옵션: 실행 중인 컨테이너만 or 모두)
  ipcMain.handle(
    "get-all-docker-containers",
    async (_event, all: boolean = false) => {
      try {
        return await docker.listContainers({ all, size: true });
      } catch (err) {
        console.error("Failed to fetch Docker containers:", err);
        throw err;
      }
    }
  );

  // 지정된 경로에서 Dockerfile을 찾는 핸들러
  ipcMain.handle("find-dockerfile", async (_event, directory: string) => {
    try {
      const dockerfilePath = await findDockerfile(directory);
      return { success: true, dockerfilePath };
    } catch (error) {
      console.error("Error finding Dockerfile:", error);
      return { success: false, message: (error as Error).message };
    }
  });

  // Docker 이미지를 빌드하는 핸들러
  ipcMain.handle(
    "build-docker-image",
    async (
      _event,
      contextPath: string,
      dockerfilePath: string,
      imageName: string = "myimage",
      tag: string = "latest"
    ) => {
      try {
        const buildResult = await buildDockerImage(
          contextPath,
          dockerfilePath,
          imageName.toLowerCase(),
          tag.toLowerCase()
        );
        console.log(buildResult.status);
        return { success: true, image: buildResult.image };
      } catch (error) {
        console.error("Error processing Docker image:", error);
        return { success: false, message: (error as Error).message };
      }
    }
  );

  // Docker 이미지를 삭제하는 핸들러
  ipcMain.handle("remove-image", async (_event, imageId: string) => {
    return removeImage(imageId);
  });

  // 컨테이너 생성 옵션을 생성하는 핸들러
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

  // Docker 컨테이너를 생성하는 핸들러
  ipcMain.handle(
    "create-container",
    async (_event, options: Docker.ContainerCreateOptions) => {
      return createContainer(options);
    }
  );

  // Docker 컨테이너를 시작하는 핸들러
  ipcMain.handle("start-container", async (_event, containerId: string) => {
    return startContainer(containerId);
  });

  // Docker 컨테이너를 생성하고 시작하는 핸들러
  ipcMain.handle(
    "create-and-start-container",
    async (_event, containerOptions: Docker.ContainerCreateOptions) => {
      try {
        const result = await createContainer(containerOptions);

        if (result.success && result.containerId) {
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

  // Docker 컨테이너를 중지하는 핸들러
  ipcMain.handle("stop-container", async (_event, containerId: string) => {
    try {
      await stopContainer(containerId);
      return { success: true };
    } catch (err) {
      console.error(`Error stopping container ${containerId}:`, err);
      return { success: false, error: (err as Error).message };
    }
  });

  // Docker 컨테이너를 제거하는 핸들러
  ipcMain.handle(
    "remove-container",
    async (
      _event,
      containerId: string,
      options?: Docker.ContainerRemoveOptions
    ) => {
      try {
        await removeContainer(containerId, options);
        return { success: true };
      } catch (err) {
        console.error(`Error removing container ${containerId}:`, err);
        return { success: false, error: (err as Error).message };
      }
    }
  );

  // DB 타입에 따른 Docker 이미지 이름을 가져오는 핸들러
  ipcMain.handle("get-database-image-name", (_event, databaseType: string) => {
    return getDatabaseImageName(databaseType);
  });

  // Docker 이미지를 pull하는 핸들러
  ipcMain.handle("pull-docker-image", async (_event, imageName: string) => {
    try {
      await pullDockerImage(imageName);
      return { success: true };
    } catch (error) {
      console.error(`Failed to pull Docker image ${imageName}:`, error);
      return { success: false, error: (error as Error).message };
    }
  });

  // DB Docker 이미지를 pull 받는 핸들러
  ipcMain.handle(
    "pull-database-image",
    async (_event, databaseType: string) => {
      return await pullDatabaseImage(databaseType);
    }
  );
}
