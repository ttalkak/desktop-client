// 실행 함수 분리?
// src/utils/utils.ts
export const dockerCheckHandler = async (
  setDockerStatus: (status: "running" | "not running" | "unknown") => void
) => {
  try {
    const status = await window.electronAPI.checkDockerStatus();
    console.log("Docker Status:", status);
    setDockerStatus(status);
    return status;
  } catch (error) {
    console.error("Error while checking Docker status:", error);
    setDockerStatus("unknown");
  }
};

export const waitForDockerToStart = async (
  setDockerStatus: (status: "running" | "not running" | "unknown") => void,
  maxRetries = 10,
  interval = 3000
) => {
  let retries = 0;
  while (retries < maxRetries) {
    const status = await dockerCheckHandler(setDockerStatus);
    if (status === "running") {
      return true;
    }
    retries += 1;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  return false;
};

export const startDockerIfNotRunning = async (
  setDockerStatus: (status: "running" | "not running" | "unknown") => void
) => {
  const status = await window.electronAPI.checkDockerStatus();
  if (status !== "running") {
    console.log("Docker is not running. Starting Docker...");
    try {
      const resolvedPath =
        "C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe";
      await window.electronAPI.openDockerDesktop(resolvedPath);
      console.log("Docker started successfully.");

      const dockerStarted = await waitForDockerToStart(setDockerStatus);
      if (!dockerStarted) {
        throw new Error("Docker failed to start within the expected time.");
      }
    } catch (error) {
      console.error("Failed to start Docker:", error);
      throw new Error("Docker failed to start");
    }
  } else {
    console.log("Docker is already running.");
  }
};

export const handleBuildImage = async (
  contextPath: string,
  name: string = "my-docker-image",
  tag: string = "latest"
) => {
  try {
    const result = await window.electronAPI.buildDockerImage(
      contextPath,
      name,
      tag
    );
    console.log("Docker build status:", result.status);
    if (result.message) {
      console.log("Docker build message:", result.message);
    }

    return {
      success: result.status === "success" || result.status === "exists",
      image: { RepoTags: [`${name}:${tag}`] },
      message: result.message,
    };
  } catch (error) {
    console.error("Error building Docker image:", error);
    return { success: false, message: error };
  }
};

export const createAndStartContainers = async (
  dockerImages: { RepoTags: string[] }[],
  setServiceStatus: (status: "running" | "loading" | "stopped") => void
) => {
  try {
    const dockerContainers = await window.storeAPI.getAllDockerContainers();

    for (const image of dockerImages) {
      const existingContainer = dockerContainers.find(
        (container) => container.Image === image.RepoTags?.[0]
      );

      if (existingContainer) {
        console.log(
          `Container for image ${image.RepoTags?.[0]} already exists. Skipping creation.`
        );
        continue;
      }

      const repoTag = image.RepoTags?.[0] || ""; // "my-image:latest" 형태
      const containerOptions = await window.electronAPI.createContainerOptions(
        repoTag,
        `${repoTag.replace(/[:/]/g, "-")}-container`,
        { "80/tcp": "8080" }
      );

      const result = await window.electronAPI.createAndStartContainer(
        containerOptions
      );

      if (result.success) {
        console.log(
          `Container started successfully with ID: ${result.containerId}`
        );
      } else {
        console.error(`Failed to start container: ${result.error}`);
      }
    }
    setServiceStatus("running");
  } catch (error) {
    console.error("Error creating and starting containers:", error);
    setServiceStatus("stopped");
  }
};
