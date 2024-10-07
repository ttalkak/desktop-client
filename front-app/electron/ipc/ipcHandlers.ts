import { ipcMain } from "electron";
import { exec } from "child_process";
import {
  checkDockerStatus,
  getDockerPath,
  docker,
} from "../managers/dockerUtils";
import { findDockerfile } from "../managers/filemanager/dokerFileFinder";
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
  dockerFileMaker,
} from "../dockerManager";
import { restartContainer } from "../dockerManager";
import { pullAndStartDatabaseContainer } from "../managers/dockerDBManager";
import { envFileMaker } from "../managers/filemanager/envFileMaker";
import {
  downloadAndUnzip,
  getProjectSourceDirectory,
} from "../managers/filemanager/downloadManager";

// IPC 핸들러들을 등록하는 함수
export function registerIpcHandlers() {
  // Docker 상태를 체크하는 핸들러
  ipcMain.handle("check-docker-status", checkDockerStatus);

  // Docker 실행 파일 경로를 가져오는 핸들러
  ipcMain.handle("get-docker-path", getDockerPath);

  // Docker Desktop을 실행하는 핸들러
  ipcMain.handle("open-docker-desktop", async (_event, dockerPath: string) => {
    if (!dockerPath) {
      alert("dockerDesktop이 설치되었는지 확인해주세요");
    }

    exec(`"${dockerPath}"`, (error) => {
      if (error) {
        alert("dockerDesktop 실행을 확인하세요.");
      }
      console.log("Docker Desktop launched successfully.");
    });
  });

  //레포지토리 다운로드 및 압축 해제 처리
  ipcMain.handle(
    "download-and-unzip",
    async (_, repositoryUrl: string, rootDirectory: string) => {
      console.log("23. IPC: download-and-unzip called");
      return await downloadAndUnzip(repositoryUrl, rootDirectory); // Asynchronously handle download and unzip
    }
  );

  // IPC handler: Return the project source directory path
  ipcMain.handle("get-project-source-directory", async () => {
    console.log("22. IPC: get-project-source-directory called");
    return getProjectSourceDirectory();
  });

  // Docker 이미지를 조회하는 핸들러
  ipcMain.handle("fetch-docker-image", async (_event, imageId: string) => {
    try {
      return await docker.getImage(imageId).inspect();
    } catch (err) {
      console.error(`Failed to fetch Docker image ${imageId}:`, err);
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
      }
    }
  );

  // 모든 Docker 이미지를 가져오는 핸들러
  ipcMain.handle("get-all-docker-images", async () => {
    try {
      return await docker.listImages({ all: true });
    } catch (err) {
      console.error("Failed to fetch Docker images:", err);
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

  // Docker 이미지 빌드 핸들러
  ipcMain.handle(
    "build-docker-image",
    async (
      _,
      contextPath: string,
      dockerfilePath: string,
      imageName: string,
      tag: string
    ) => {
      try {
        const result = await buildDockerImage(
          contextPath,
          dockerfilePath,
          imageName,
          tag
        );
        return result; // 성공/실패에 맞는 결과 반환
      } catch (error) {
        console.error("Error building Docker image:", error);
        return { success: false, error: error }; // 오류가 발생하면 실패와 에러 메시지 반환
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
      inboundPort: number,
      outboundPort: number,
      envs: EnvVar[]
    ) => {
      try {
        return createContainerOptions(
          repoTag,
          containerName,
          inboundPort,
          outboundPort,
          envs
        );
      } catch (error) {
        console.error(`Error creating container options:`, error);
      }
    }
  );

  // Docker 컨테이너를 생성하는 핸들러
  ipcMain.handle("create-container", async (_event, options: string) => {
    return createContainer(options);
  });

  // Docker 컨테이너를 시작하는 핸들러
  ipcMain.handle(
    "start-container",
    async (_event, containerId: string, imageTag: string) => {
      return startContainer(containerId, imageTag);
    }
  );
  ipcMain.handle("restart-container", async (_event, containerId: string) => {
    return restartContainer(containerId);
  });

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
  ipcMain.handle("remove-container", async (_event, containerId: string) => {
    try {
      await removeContainer(containerId);
      return { success: true };
    } catch (err) {
      console.error(`Error removing container ${containerId}:`, err);
      return { success: false, error: (err as Error).message };
    }
  });

  // Docker 이미지를 pull하는 핸들러
  ipcMain.handle("pull-docker-image", async (_event, imageName: string) => {
    try {
      await pullDockerImage(imageName);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  //도커파일 생성 핸들러
  ipcMain.handle(
    "create-dockerfile",
    async (_event, dockerfilePath, dockerFileScript) => {
      try {
        const result = await dockerFileMaker(dockerfilePath, dockerFileScript);
        return result;
      } catch (error) {
        console.error("Error in create-dockerfile handler:", error);
        return { success: false, message: error };
      }
    }
  );

  // .env 파일 생성 핸들러
  ipcMain.handle("create-envfile", async (_event, envfilePath, envs) => {
    try {
      const result = await envFileMaker(envfilePath, envs);
      return result;
    } catch (error) {
      console.error("Error in create-envfile handler:", error);
      return { success: false, message: (error as Error).message };
    }
  });

  ipcMain.handle(
    "pullAndStartDatabaseContainer",
    async (
      _,
      databaseType: string,
      imageName: string,
      containerName: string,
      inboundPort: number,
      outboundPort: number,
      envs: Array<{ key: string; value: string }>
    ) => {
      return await pullAndStartDatabaseContainer(
        databaseType,
        imageName,
        containerName,
        inboundPort,
        outboundPort,
        envs
      );
    }
  );
}
