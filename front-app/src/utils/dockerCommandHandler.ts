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
      {
        const { success } = await window.electronAPI.startContainer(
          containerId
        );
        if (success) {
          window.electronAPI.startContainerStats([containerId]);
          sendInstanceUpdate(
            userId,
            deploymentId,
            "RUNNING",
            compute.details.outboundPort
          );
        } else {
          sendInstanceUpdate(
            userId,
            deploymentId,
            "ALLOCATE_ERROR",
            compute.details.outboundPort
          );
        }
      }
      break;
    case "RESTART":
      {
        const { success } = await window.electronAPI.startContainer(
          containerId
        );
        if (success) {
          sendInstanceUpdate(
            userId,
            deploymentId,
            "RUNNING",
            compute.details.outboundPort
          );
        } else {
          sendInstanceUpdate(
            userId,
            deploymentId,
            "ALLOCATE_ERROR",
            compute.details.outboundPort
          );
        }
      }

      break;

    case "DELETE":
      {
        const { success } = await window.electronAPI.removeContainer(
          containerId
        );
        if (success) {
          sendInstanceUpdate(
            userId,
            deploymentId,
            "DELETED",
            compute.details.outboundPort
          );
        } else {
          sendInstanceUpdate(
            userId,
            deploymentId,
            "ALLOCATE_ERROR",
            compute.details.outboundPort
          );
        }
      }
      break;
    case "STOP": {
      await window.electronAPI.startContainerStats([containerId]);
      const { success } = await window.electronAPI.stopContainer(containerId);
      if (success) {
        sendInstanceUpdate(
          userId,
          deploymentId,
          "STOPPED",
          compute.details.outboundPort
        );
      } else {
        sendInstanceUpdate(
          userId,
          deploymentId,
          "ALLOCATE_ERROR",
          compute.details.outboundPort
        );
      }
      await window.electronAPI.stopPgrok(deploymentId); // 정지 시 pgrok 로그도 정지
      break;
    }

    case "REBUILD":
      // 컨테이너 정지 및 삭제
      await window.electronAPI.stopContainerStats([containerId]);
      await window.electronAPI.stopLogStream(containerId);
      await window.electronAPI.stopPgrok(deploymentId);
      await window.electronAPI.stopContainer(containerId);
      await window.electronAPI.removeContainer(containerId);

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
              window.electronAPI.startLogStream(containerId);
              window.electronAPI // pgrok 시작
                .runPgrok(
                  "pgrok.ttalkak.com:2222",
                  `http://localhost:${compute.details?.outboundPort}`, //바꿀예정
                  compute.details.subdomainKey,
                  compute.details.deploymentId,
                  compute.details.subdomainName
                )
                .then((message) => {
                  console.log(`pgrok started: ${message}`);
                })
                .catch((error) => {
                  alert(`Failed to start pgrok: ${error}`);
                });
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
