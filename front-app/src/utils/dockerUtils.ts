import { useDockerStore } from "../stores/appStatusStore";

// 도커 상태 확인 함수
export const checkDockerStatus = async (): Promise<
  "running" | "not running" | "unknown"
> => {
  try {
    const status = await window.electronAPI.checkDockerStatus();
    console.log("Docker status check result:", status);
    return status;
  } catch (error) {
    console.error("Error checking Docker status:", error);
    return "unknown";
  }
};

// 도커 시작 함수 => 나중에 경로 바뀔 수도 있음
export const startDocker = async () => {
  try {
    const resolvedPath =
      "C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe";
    console.log("Starting Docker Desktop from:", resolvedPath);
    await window.electronAPI.openDockerDesktop(resolvedPath);
    await waitForDockerToStart();
    console.log("Docker started successfully");
  } catch (error) {
    console.error("Error starting Docker:", error);
    throw error;
  }
};

// 도커 시작을 기다리는 함수
export const waitForDockerToStart = async (
  maxRetries = 10,
  interval = 3000
): Promise<void> => {
  let retries = 0;
  while (retries < maxRetries) {
    console.log(`Waiting for Docker to start, attempt ${retries + 1}`);
    const status = await checkDockerStatus();
    if (status === "running") {
      console.log("Docker is now running");
      return;
    }
    retries += 1;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error("Docker failed to start within the expected time.");
};

// 이미지 빌드 함수
export const handleBuildImage = async (
  contextPath: string,
  dockerfilePath: string,
  name: string = "my-docker-image",
  tag: string = "latest"
) => {
  try {
    console.log(`Building Docker image: ${name}:${tag} from ${contextPath}`);
    const result = await window.electronAPI.buildDockerImage(
      contextPath,
      dockerfilePath,
      name,
      tag
    );
    console.log(`Docker build status: ${result.status}`);
    if (result.message) {
      console.log(`Docker build message: ${result.message}`);
    }
    return {
      success: result.status === "success" || result.status === "exists",
      image: result.image,
      message: result.message,
    };
  } catch (error) {
    console.error("Error building Docker image:", error);
    return { success: false, message: error };
  }
};

// 컨테이너 생성 및 시작
export const createAndStartContainer = async (
  dockerImage: DockerImage, // 하나의 이미지만 받음
  inboundPort: number,
  outboundPort: number
): Promise<string> => {
  try {
    console.log("Starting createAndStartContainer function");

    const existingImages = await window.electronAPI.getDockerImages();

    const repoTag = dockerImage.RepoTags?.[0];
    if (!repoTag) {
      throw new Error(`No RepoTag found for image: ${dockerImage}`);
    }

    if (!existingImages.some((img) => img.RepoTags?.includes(repoTag))) {
      throw new Error(`Image does not exist: ${repoTag}`);
    }

    console.log("Creating new container for image:", repoTag);
    const containerName = `${repoTag.replace(/[:/]/g, "-")}-container`;
    try {
      const containerOptions = await window.electronAPI.createContainerOptions(
        repoTag,
        containerName,
        inboundPort,
        outboundPort
      );
      console.log("Created container options:", containerOptions);

      const result = await window.electronAPI.createAndStartContainer(
        containerOptions
      );
      if (result.success) {
        console.log("Successfully created and started container");
        // 성공 시 containerId 기반으로 listContainers 사용
        const containers = await window.electronAPI.getDockerContainers(true);
        const createdContainer = containers.find(
          (c) => c.Id === result.containerId
        );

        if (createdContainer) {
          // Store에 저장
          useDockerStore.getState().addDockerContainer(createdContainer);
          console.log("Container stored in the state:", createdContainer);
        } else {
          console.error("Created container not found in the list.");
        }

        return result.containerId; // 성공 시 containerId 반환
      } else {
        throw new Error(`Failed to start container: ${result.error}`);
      }
    } catch (containerError) {
      throw new Error(`Error in container creation process: ${containerError}`);
    }
  } catch (error) {
    console.error("Error in createAndStartContainer:", error);
    throw error; // 에러 발생 시 Error 객체를 그대로 반환
  }
};
