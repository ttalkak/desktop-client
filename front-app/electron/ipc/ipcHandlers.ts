import { ipcMain } from "electron";
import { exec } from "child_process";
import {
  checkDockerStatus,
  getDockerPath,
  findDockerfile,
  docker,
} from "../managers/dockerUtils";
import { buildDockerImage, removeImage } from "../managers/dockerImageManager";
import {
  createContainerOptions,
  createContainer,
  startContainer,
  stopContainer,
  removeContainer,
} from "../managers/dockerContainerManager";
import Docker from "dockerode";

export function registerIpcHandlers() {
  ipcMain.handle("check-docker-status", checkDockerStatus);

  ipcMain.handle("get-docker-path", getDockerPath);

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

  ipcMain.handle("fetch-docker-image", async (_event, imageId: string) => {
    try {
      return await docker.getImage(imageId).inspect();
    } catch (err) {
      console.error(`Failed to fetch Docker image ${imageId}:`, err);
      throw err;
    }
  });

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

  ipcMain.handle("get-all-docker-images", async () => {
    try {
      return await docker.listImages({ all: true });
    } catch (err) {
      console.error("Failed to fetch Docker images:", err);
      throw err;
    }
  });

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

  ipcMain.handle("find-dockerfile", async (_event, directory: string) => {
    try {
      const dockerfilePath = await findDockerfile(directory);
      return { success: true, dockerfilePath };
    } catch (error) {
      console.error("Error finding Dockerfile:", error);
      return { success: false, message: (error as Error).message };
    }
  });

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

  ipcMain.handle("remove-image", async (_event, imageId: string) => {
    return removeImage(imageId);
  });

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
    async (_event, options: Docker.ContainerCreateOptions) => {
      return createContainer(options);
    }
  );

  ipcMain.handle("start-container", async (_event, containerId: string) => {
    return startContainer(containerId);
  });

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
}
