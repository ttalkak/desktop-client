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
export const createAndStartContainers = async (
  dockerImages: DockerImage[],
  inboundPort: number,
  outboundPort: number
): Promise<DockerContainer[]> => {
  try {
    console.log("Starting createAndStartContainers function");

    let [dockerContainers, existingImages] = await Promise.all([
      window.electronAPI.getDockerContainers(false),
      window.electronAPI.getDockerImages(),
    ]);

    console.log("Retrieved docker containers and images");

    for (const image of dockerImages) {
      const repoTag = image.RepoTags?.[0];
      if (!repoTag) {
        console.error("Error: No RepoTag found for image:", image);
        continue;
      }

      if (!existingImages.some((img) => img.RepoTags?.includes(repoTag))) {
        console.log("Image does not exist, skipping:", repoTag);
        continue;
      }

      const existingContainer = dockerContainers.find(
        (container) => container.Image === repoTag
      );

      if (existingContainer) {
        if (existingContainer.Status !== "running") {
          console.log("Starting existing container:", existingContainer.Id);
          try {
            await window.electronAPI.startContainer(existingContainer.Id);
            console.log("Successfully started existing container");
            const updatedContainer =
              await window.electronAPI.fetchDockerContainer(
                existingContainer.Id
              );
            dockerContainers = dockerContainers.map((c) =>
              c.Id === updatedContainer.Id ? updatedContainer : c
            );
          } catch (startError) {
            console.error("Error starting existing container:", startError);
          }
        } else {
          console.log("Container is already running:", existingContainer.Id);
        }
      } else {
        console.log("No existing container found for image:", repoTag);
        const containerName = `${repoTag.replace(/[:/]/g, "-")}-container`;
        try {
          const containerOptions =
            await window.electronAPI.createContainerOptions(
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
            const newContainer = await window.electronAPI.fetchDockerContainer(
              result.containerId
            );
            dockerContainers.push(newContainer);
          } else {
            console.error("Failed to start container:", result.error);
          }
        } catch (containerError) {
          console.error("Error in container creation process:", containerError);
        }
      }
    }

    return dockerContainers;
  } catch (error) {
    console.error("Error in createAndStartContainers:", error);
    return [];
  }
};
