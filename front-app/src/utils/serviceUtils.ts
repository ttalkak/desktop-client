// src/utils/serviceUtils.ts
import { useAppStore } from "../stores/appStatusStore";
import {
  checkDockerStatus,
  startDocker,
  // fetchDummyDockerData,
  // handleBuildImage,
  // createAndStartContainers,
} from "./dockerUtils";
import { connectWebSocket } from "./stompService";

export const startService = async () => {
  const setServiceStatus = useAppStore.getState().setServiceStatus;
  const setDockerStatus = useAppStore.getState().setDockerStatus;
  // const setDockerImages = useDockerStore.getState().setDockerImages;
  // const setDockerContainers = useDockerStore.getState().setDockerContainers;

  try {
    console.log("1.ServiceUtil: Starting service");
    setServiceStatus("loading");

    // 1. Docker 상태 확인 및 실행
    const dockerStatus = await checkDockerStatus();
    console.log("2.ServiceUtil: Docker status:", dockerStatus);
    if (dockerStatus !== "running") {
      console.log("3.ServiceUtil:Starting Docker");
      await startDocker();
    }

    setDockerStatus("running");
    console.log("4.ServiceUtil: Docker is running");

    // 2. WebSocket 연결
    connectWebSocket();
    console.log("5.ServiceUtil: WebSocket connected");

    // const dummyDockerData = await fetchDummyDockerData();
    // console.log("6. Fetched dummy data:", dummyDockerData);

    // // 3. 더미 데이터 기반으로 ZIP 파일 다운로드 및 해제, 이미지 빌드, 컨테이너 빌드
    // const repoUrls = dummyDockerData.map((command) => command.sourceCodeLink);

    // const projectSourceDirectory =
    //   await window.electronAPI.getProjectSourceDirectory();
    // console.log("8. Project source directory:", projectSourceDirectory);

    // const downloadPromises = repoUrls.map(async (repoUrl) => {
    //   const downloadPath = window.electronAPI.joinPath(projectSourceDirectory);
    //   const extractDir = downloadPath;
    //   console.log("9. Downloading and extracting:", repoUrl, "to", extractDir);
    //   await window.electronAPI.downloadAndUnzip(repoUrl);
    //   console.log(`10. Download and unzip successful for ${repoUrl}`);
    //   return { repoUrl, extractDir };
    // });

    // const downloadResults = await Promise.all(downloadPromises);
    // console.log("11. All downloads and unzips completed");

    // const buildPromises = downloadResults.map(async ({ repoUrl }) => {
    //   console.log("12. Building image from:", repoUrl);
    //   return await handleBuildImage(repoUrl);
    // });
    // const buildResults = await Promise.all(buildPromises);
    // console.log("13. Build results:", buildResults);

    // // 모든 Docker 이미지 가져오기
    // const allDockerImages = await window.electronAPI.getDockerImages();
    // console.log("14. All Docker images:", allDockerImages);

    // if (allDockerImages.length > 0) {
    //   console.log("15. Creating and starting containers for all images");
    //   const updatedContainers = await createAndStartContainers(allDockerImages);

    //   // 4. 이미지 및 컨테이너 정보 zustand에 반영
    //   setDockerImages(allDockerImages);
    //   setDockerContainers(updatedContainers);
    //   console.log("16. Docker images and containers set in store");

    //   setServiceStatus("running");
    //   console.log("17. Service status set to running");
    // } else {
    //   console.log("18. No Docker images found");
    //   setServiceStatus("stopped");
    // }
  } catch (err) {
    console.error(".!ServiceUtil: Error in service handler:", err);
    setServiceStatus("stopped");
  }
};
