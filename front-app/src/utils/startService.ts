import { useAppStore } from "../stores/appStatusStore";
import { connectWebSocket } from "./stompService";

export const startService = async () => {
  const setServiceStatus = useAppStore.getState().setServiceStatus;
  const setDockerStatus = useAppStore.getState().setDockerStatus;
  const setDockerImages = useAppStore.getState().setDockerImages;
  const setDockerContainers = useAppStore.getState().setDockerContainers;

  try {
    console.log("1. Starting service");
    setServiceStatus("loading");

    // 1. Docker 상태 확인 및 실행
    const dockerStatus = await checkDockerStatus();
    console.log("2. Docker status:", dockerStatus);
    if (dockerStatus !== "running") {
      console.log("3. Starting Docker");
      await startDocker();
    }

    setDockerStatus("running");
    console.log("4. Docker is running");

    // 2. WebSocket 연결
    connectWebSocket();
    console.log("5. WebSocket connected");

    const dummyDockerData = await fetchDummyDockerData();
    console.log("6. Fetched dummy data:", dummyDockerData);

    // 3. 더미 데이터 기반으로 ZIP 파일 다운로드 및 해제, 이미지 빌드, 컨테이너 빌드
    const repoUrls = dummyDockerData.images.map((image) => image.repoUrl);
    console.log("7. Repo URLs:", repoUrls);

    const projectSourceDirectory =
      await window.electronAPI.getProjectSourceDirectory();
    console.log("8. Project source directory:", projectSourceDirectory);

    const downloadPromises = repoUrls.map(async (repoUrl) => {
      const downloadPath = window.electronAPI.joinPath(projectSourceDirectory);
      const extractDir = downloadPath;
      console.log("9. Downloading and extracting:", repoUrl, "to", extractDir);

      await window.electronAPI.downloadAndUnzip(repoUrl);
      console.log(`10. Download and unzip successful for ${repoUrl}`);
      return { repoUrl, extractDir };
    });

    const downloadResults = await Promise.all(downloadPromises);
    console.log("11. All downloads and unzips completed");

    const buildPromises = downloadResults.map(async ({ extractDir }) => {
      console.log("12. Building image from:", extractDir);
      return await handleBuildImage(extractDir);
    });
    const buildResults = await Promise.all(buildPromises);
    console.log("13. Build results:", buildResults);

    // 모든 Docker 이미지 가져오기
    const allDockerImages = await window.electronAPI.getDockerImages();
    console.log("14. All Docker images:", allDockerImages);

    if (allDockerImages.length > 0) {
      console.log("15. Creating and starting containers for all images");
      const updatedContainers = await createAndStartContainers(allDockerImages);

      // 4. 이미지 및 컨테이너 정보 zustand에 반영
      setDockerImages(allDockerImages);
      setDockerContainers(updatedContainers);
      console.log("16. Docker images and containers set in store");

      setServiceStatus("running");
      console.log("17. Service status set to running");
    } else {
      console.log("18. No Docker images found");
      setServiceStatus("stopped");
    }
  } catch (err) {
    console.error("19. Error in service handler:", err);
    setServiceStatus("stopped");
  }
};

// Docker 상태 확인 함수
const checkDockerStatus = async (): Promise<
  "running" | "not running" | "unknown"
> => {
  try {
    const status = await window.electronAPI.checkDockerStatus();
    console.log("20. Docker status check result:", status);
    return status;
  } catch (error) {
    console.error("21. Error checking Docker status:", error);
    return "unknown";
  }
};

// Docker 실행 함수
const startDocker = async () => {
  try {
    const resolvedPath =
      "C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe";
    console.log("22. Starting Docker Desktop from:", resolvedPath);
    await window.electronAPI.openDockerDesktop(resolvedPath);
    await waitForDockerToStart();
    console.log("23. Docker started successfully");
  } catch (error) {
    console.error("24. Error starting Docker:", error);
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
    console.log(`25. Waiting for Docker to start, attempt ${retries + 1}`);
    const status = await checkDockerStatus();
    if (status === "running") {
      console.log("26. Docker is now running");
      return;
    }
    retries += 1;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error("27. Docker failed to start within the expected time.");
};

// 더미 데이터 가져오기 함수
const fetchDummyDockerData = async () => {
  console.log("28. Fetching dummy Docker data");
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
    console.log(
      `29. Building Docker image: ${name}:${tag} from ${contextPath}`
    );
    const result = await window.electronAPI.buildDockerImage(
      contextPath,
      name,
      tag
    );
    console.log(`30. Docker build status: ${result.status}`);
    if (result.message) {
      console.log(`31. Docker build message: ${result.message}`);
    }

    return {
      success: result.status === "success" || result.status === "exists",
      image: { RepoTags: [`${name}:${tag}`] },
      message: result.message,
    };
  } catch (error) {
    console.error("32. Error building Docker image:", error);
    return { success: false, message: error };
  }
};

// Docker 이미지 및 컨테이너 생성 및 시작 함수
const createAndStartContainers = async (
  dockerImages: DockerImage[]
): Promise<DockerContainer[]> => {
  try {
    console.log("33. Starting createAndStartContainers function");

    let dockerContainers = await window.storeAPI.getAllDockerContainers();
    console.log("34. Retrieved docker containers:", dockerContainers);

    const existingImages = await window.electronAPI.getDockerImages();
    console.log("35. Retrieved existing Docker images:", existingImages);

    for (const image of dockerImages) {
      console.log("36. Processing image:", image);

      const repoTag = image.RepoTags?.[0];
      if (!repoTag) {
        console.error("37. Error: No RepoTag found for image:", image);
        continue;
      }

      console.log("38. Using RepoTag:", repoTag);

      const imageExists = existingImages.some((img) =>
        img.RepoTags?.includes(repoTag)
      );
      if (!imageExists) {
        console.log("39. Image does not exist, skipping:", repoTag);
        continue;
      }

      let existingContainer = dockerContainers.find(
        (container) => container.Image === repoTag
      );

      if (!existingContainer) {
        console.log("40. No existing container found for image:", repoTag);

        const containerName = `${repoTag.replace(/[:/]/g, "-")}-container`;
        console.log("41. Generated container name:", containerName);

        try {
          const containerOptions =
            await window.electronAPI.createContainerOptions(
              repoTag,
              containerName,
              { "80/tcp": "8080" }
            );
          console.log("42. Created container options:", containerOptions);

          const result = await window.electronAPI.createAndStartContainer(
            containerOptions
          );
          console.log("43. Container creation result:", result);

          if (!result.success) {
            console.error("44. Failed to start container:", result.error);
          } else {
            console.log("45. Successfully created and started container");
            // 새로 생성된 컨테이너 정보 가져오기
            const newContainer = await window.electronAPI.fetchDockerContainer(
              result.containerId
            );
            dockerContainers.push(newContainer);
          }
        } catch (containerError) {
          console.error(
            "46. Error in container creation process:",
            containerError
          );
        }
      } else {
        console.log("47. Container already exists for image:", repoTag);
        if (!existingContainer.State.Running) {
          console.log("48. Starting existing container:", existingContainer.Id);
          try {
            await window.electronAPI.startContainer(existingContainer.Id);
            console.log("49. Successfully started existing container");
            // 컨테이너 상태 업데이트
            const updatedContainer =
              await window.electronAPI.fetchDockerContainer(
                existingContainer.Id
              );
            dockerContainers = dockerContainers.map((c) =>
              c.Id === updatedContainer.Id ? updatedContainer : c
            );
          } catch (startError) {
            console.error("50. Error starting existing container:", startError);
          }
        }
      }
    }

    return dockerContainers;
  } catch (error) {
    console.error("51. Error in createAndStartContainers:", error);
    return [];
  }
};
