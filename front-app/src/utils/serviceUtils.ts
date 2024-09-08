// src/utils/serviceUtils.ts
import { useAppStore } from "../stores/appStatusStore";
// import { useDockerStore } from "../stores/appStatusStore";
import {
  checkDockerStatus,
  startDocker,
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
    console.log("1. ServiceUtil: Starting service");
    setServiceStatus("loading");

    // 1. Docker 상태 확인 및 실행
    const dockerStatus = await checkDockerStatus();
    console.log("2. ServiceUtil: Docker status:", dockerStatus);
    if (dockerStatus !== "running") {
      console.log("3. ServiceUtil: Starting Docker");
      await startDocker();
    }

    setDockerStatus("running");
    console.log("4. ServiceUtil: Docker is running");

    // 2. WebSocket 연결
    connectWebSocket();
    console.log("5. ServiceUtil: WebSocket connected");

    // const dummyDockerData = [
    //   {
    //     hasDockerImage: false,
    //     containerName: "FRONTEND-1",
    //     inboundPort: 80, // number 타입으로 설정
    //     outboundPort: 8080, // number 타입으로 설정
    //     subdomainName: "sunsuking",
    //     subdomainKey: "sadfasdf",
    //     sourceCodeLink:
    //       "https://github.com/sunsuking/kokoa-clone-2020/archive/refs/heads/main.zip",
    //     dockerRootDirectory: "./",
    //   },
    // ];
    // console.log("6. Fetched dummy data:", dummyDockerData);

    // // 3. 더미 데이터 기반으로 ZIP 파일 다운로드 및 해제, Dockerfile 경로 추출
    // const downloadPromises = dummyDockerData.map(async (command) => {
    //   const { success, dockerfilePath, message, contextPath } =
    //     await window.electronAPI.downloadAndUnzip(command.sourceCodeLink);
    //   if (success && dockerfilePath) {
    //     console.log(
    //       `10. Download and unzip successful for ${command.sourceCodeLink} ${dockerfilePath}`
    //     );
    //     console.log(`Dockerfile path: ${dockerfilePath}`);
    //     const buildResult = await handleBuildImage(contextPath, dockerfilePath);
    //     console.log(`15. Build result for ${contextPath}`);

    //     return { command, dockerfilePath, contextPath };
    //   } else {
    //     throw new Error(`Failed to download or find Dockerfile: ${message}`);
    //   }
    // });

    // const downloadResults = await Promise.all(downloadPromises);
    // console.log("12. All downloads and unzips completed");
    // console.log(
    //   "13. Dockerfile paths used:",
    //   downloadResults.map((res) => res.dockerfilePath)
    // );

    // // 모든 Docker 이미지 가져오기
    // const allDockerImages = await window.electronAPI.getDockerImages();
    // console.log("14. All Docker images:", allDockerImages);

    // if (allDockerImages.length > 0) {
    //   console.log("15. Creating and starting containers for all images");
    //   const updatedContainers = await createAndStartContainers([
    //     {
    //       RepoTags: ["frontend-1:latest"],
    //     } as DockerImage,
    //   ]);

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
    console.error("!ServiceUtil: Error in service handler:", err);
    setServiceStatus("stopped");
  }
};
