// utils/dockerUtils.ts
import { useAppStore } from "../stores/appStatusStore";
import { connectWebSocket } from "./stompService";

export const startService = async () => {
  const setServiceStatus = useAppStore.getState().setServiceStatus;
  const setDockerStatus = useAppStore.getState().setDockerStatus;
  const setDockerImages = useAppStore.getState().setDockerImages;
  // const setDockerContainers = useAppStore.getState().setDockerContainers;

  try {
    // 서비스 상태를 "loading"으로 설정
    setServiceStatus("loading");

    // 1. Docker 상태 확인 및 실행
    const dockerStatus = await checkDockerStatus();
    if (dockerStatus !== "running") {
      await startDocker();
    }

    setDockerStatus("running");

    // 2. WebSocket 연결 (더미 데이터로 대체)
    connectWebSocket();
    const dummyDockerData = await fetchDummyDockerData();

    // 3. 더미 데이터 기반으로 ZIP 파일 다운로드 및 해제, 이미지 빌드, 컨테이너 빌드
    const repoUrls = dummyDockerData.images.map((image) => image.repoUrl);
    const projectSourceDirectory =
      await window.electronAPI.getProjectSourceDirectory();

    const downloadPromises = repoUrls.map(async (repoUrl) => {
      const downloadPath = window.electronAPI.joinPath(projectSourceDirectory);
      const extractDir = downloadPath;

      await window.electronAPI.downloadAndUnzip(
        repoUrl,
        downloadPath,
        extractDir
      );
      console.log(`Download and unzip successful for ${repoUrl}`);
      return { repoUrl, extractDir };
    });

    const downloadResults = await Promise.all(downloadPromises);
    console.log("All downloads and unzips completed");

    const buildPromises = downloadResults.map(async ({ extractDir }) => {
      return await handleBuildImage(extractDir);
    });

    const buildResults = await Promise.all(buildPromises);
    console.log(buildResults);

    const successfulBuilds = buildResults
      .filter((result) => result.success && result.image !== undefined)
      .map((result) => result.image as DockerImage);

    if (successfulBuilds.length > 0) {
      console.log(`Creating and starting containers for successful builds`);
      await createAndStartContainers(successfulBuilds);

      // 4. 이미지 및 컨테이너 정보 zustand에 반영
      setDockerImages(successfulBuilds);
      // setDockerContainers(s b)

      setServiceStatus("running");
    } else {
      console.log("No successful builds to create containers for");
      setServiceStatus("stopped");
    }
  } catch (err) {
    console.error("Error in service handler:", err);
    setServiceStatus("stopped");
  }
};

// Docker 상태 확인 함수
const checkDockerStatus = async (): Promise<
  "running" | "not running" | "unknown"
> => {
  try {
    const status = await window.electronAPI.checkDockerStatus();
    return status;
  } catch (error) {
    console.error("Error checking Docker status:", error);
    return "unknown";
  }
};

// Docker 실행 함수
const startDocker = async () => {
  try {
    const resolvedPath =
      "C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe";
    await window.electronAPI.openDockerDesktop(resolvedPath);
    await window.electronAPI.openDockerDesktop(resolvedPath);
    await waitForDockerToStart();
  } catch (error) {
    console.error("Error starting Docker:", error);
    throw error;
  }
};

// Docker가 "running" 상태가 될 때까지 기다리는 함수
const waitForDockerToStart = async (
  maxRetries = 10,
  interval = 3000
): Promise<void> => {
  let retries = 0;
  while (retries < maxRetries) {
    const status = await checkDockerStatus();
    if (status === "running") {
      return;
    }
    retries += 1;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error("Docker failed to start within the expected time.");
};

// 더미 데이터 가져오기 함수
const fetchDummyDockerData = async () => {
  return {
    images: [
      {
        name: "my-docker-image",
        tag: "latest",
        repoUrl: "https://github.com/sunsuking/kokoa-clone-2020",
      },
    ],
    containers: [
      { name: "my-docker-image-container", ports: { "80/tcp": "8080" } },
    ],
  };
};

// Docker 이미지 빌드 핸들러 함수
const handleBuildImage = async (
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
    console.log(`Docker build status: ${result.status}`);
    if (result.message) {
      console.log(`Docker build message: ${result.message}`);
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

// Docker 이미지 및 컨테이너 생성 및 시작 함수
const createAndStartContainers = async (dockerImages: DockerImage[]) => {
  try {
    const dockerContainers = await window.storeAPI.getAllDockerContainers();

    for (const image of dockerImages) {
      const existingContainer = dockerContainers.find(
        (container) => container.Image === image.RepoTags?.[0]
      );

      if (!existingContainer) {
        const repoTag = image.RepoTags?.[0] || ""; // "my-image:latest" 형태
        const containerOptions =
          await window.electronAPI.createContainerOptions(
            repoTag,
            `${repoTag.replace(/[:/]/g, "-")}-container`,
            { "80/tcp": "8080" }
          );

        const result = await window.electronAPI.createAndStartContainer(
          containerOptions
        );

        if (!result.success) {
          console.error(`Failed to start container: ${result.error}`);
        }
      }
    }
  } catch (error) {
    console.error("Error creating and starting containers:", error);
  }
};
