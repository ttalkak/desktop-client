import { useDeploymentDetailsStore } from "../stores/deploymentDetailsStore";
import { useDeploymentStore } from "../stores/deploymentStore";
import { handleBuildImage } from "./dockerUtils";
import { useDockerStore } from "../stores/appStatusStore";
import { sendInstanceUpdate } from "./sendUpdateUtils";
import { createAndStartContainer } from "./dockerUtils";

const addDockerImage = useDockerStore.getState().addDockerImage;

// compute-update 관련 handleCommand 함수: 주어진 command와 deploymentId를 처리
export async function handleContainerCommand(
  deploymentId: number,
  command: string,
  userId: string
) {
  const containerId = useDeploymentStore
    .getState()
    .getContainerByDeployment(deploymentId);

  if (!containerId) {
    console.error(`No container found for deploymentId: ${deploymentId}`);
    return;
  }

  // deployment 관련 세부 정보 가져오기
  const compute =
    useDeploymentDetailsStore.getState().deploymentDetails[deploymentId];
  const repoUrl = compute.details?.sourceCodeLink;
  const rootDirectory = compute.details?.dockerRootDirectory;

  if (!compute) {
    console.error(
      `No deployment details found for deploymentId: ${deploymentId}`
    );
    return;
  }

  switch (command) {
    case "START":
      window.electronAPI.startContainer(containerId);
      break;
    case "RESTART":
      window.electronAPI.startContainer(containerId);
      break;
    case "DELETE":
      window.electronAPI.removeContainer(containerId);
      break;
    case "STOP":
      window.electronAPI.stopContainer(containerId);
      window.electronAPI.stopPgrok(deploymentId); // 정지 시 pgrok 로그도 정지
      break;
    case "REBUILD":
      // 컨테이너 정지 및 삭제
      window.electronAPI.stopContainer(containerId);
      window.electronAPI.removeContainer(containerId);

      sendInstanceUpdate(
        userId,
        deploymentId,
        "STOPPED",
        compute.details?.outboundPort,
        "rebuild will start"
      );

      // deploymentId에 해당하는 repoUrl 가져오기
      if (repoUrl) {
        console.log(`Rebuilding container for repoUrl: ${repoUrl}`);
        // 필요한 작업 수행 (예: 이미지 빌드 등)
        const { success, dockerfilePath, contextPath } =
          await window.electronAPI.downloadAndUnzip(repoUrl, rootDirectory);

        if (success) {
          const { image } = await handleBuildImage(contextPath, dockerfilePath);
          console.log(`도커 파일 위치임 ${dockerfilePath}`);

          if (!image) {
            console.log(`이미지 생성 실패`);
          } else {
            addDockerImage(image);

            const containerId = await createAndStartContainer(
              image,
              compute.details?.inboundPort || 80,
              compute.details?.outboundPort || 8080
            );

            if (containerId) {
              sendInstanceUpdate(
                userId,
                deploymentId,
                "RUNNING",
                compute.details?.outboundPort,
                ""
              );
            }
          }
        } else {
          console.error(`Failed to download and unzip for repoUrl: ${repoUrl}`);
        }
      } else {
        console.error(`No repoUrl found for deploymentId: ${deploymentId}`);
      }
      break;
    default:
      console.log(`Unknown command: ${command}`);
  }
}
