import { useDockerStore } from "../../../stores/dockerStore.tsx";
import { useDeploymentStore } from "../../../stores/deploymentStore.tsx";
import { useDeploymentDetailsStore } from "../../../stores/deploymentDetailsStore.tsx";
import { handleBuildImage } from "./buildImageHandler.ts";
import { sendInstanceUpdate } from "../../websocket/sendUpdateUtils.ts";
import { startContainerStatsMonitoring } from "../../monitoring/healthCheckPingUtils.ts";
import { startPgrok } from "../pgrokHandler.ts";
import { createAndStartContainer } from "./buildImageHandler.ts";

// 상수 정의
const DEFAULT_INBOUND_PORT = 80;
const DEFAULT_OUTBOUND_PORT = 8080;

// 공통 빌드 및 배포 처리 함수
export async function buildAndDeploy(
  compute: DeploymentCommand,
  contextPath: string,
  dockerfilePath: string | null
) {
  // Docker 이미지 빌드
  if (dockerfilePath) {
    sendInstanceUpdate(
      compute.deploymentId,
      "PENDING",
      compute.outboundPort,
      "이미지 생성 시작.."
    );

    const imageName = compute.dockerImageName
      ? compute.dockerImageName
      : compute.subdomainName;

    const tagName = compute.dockerImageTag ? compute.dockerImageTag : "latest";

    const { success, image } = await handleBuildImage(
      contextPath,
      dockerfilePath,
      imageName,
      tagName
    );

    if (!image) {
      sendInstanceUpdate(
        compute.deploymentId,
        "ERROR",
        compute.outboundPort,
        "이미지 생성에 실패했습니다..dockerfile을 확인하세요"
      );
      return;
    }

    if (success) {
      sendInstanceUpdate(
        compute.deploymentId,
        "PENDING",
        compute.outboundPort,
        "이미지 생성 성공"
      );
    }
    // 도커 이미지 추가 및 컨테이너 생성 및 시작
    await completeDeployment(compute, image);
  }
}

// 공통 처리 함수: 배포 완료 및 상태 업데이트
async function completeDeployment(
  compute: DeploymentCommand,
  image: DockerImage
) {
  useDockerStore.getState().addDockerImage(image);

  //여기서 dockerstore에 저장됨
  const containerId = await createAndStartContainer(
    image,
    compute.inboundPort || DEFAULT_INBOUND_PORT,
    compute.outboundPort || DEFAULT_OUTBOUND_PORT
  );

  if (!containerId) {
    sendInstanceUpdate(
      compute.deploymentId,
      "ERROR",
      compute.outboundPort,
      "dockerfile"
    );
    return;
  }

  sendInstanceUpdate(
    compute.deploymentId,
    "RUNNING",
    compute.outboundPort,
    "container 실행"
  );

  useDeploymentStore
    .getState()
    .addDeployment(compute.deploymentId, containerId);
  useDeploymentDetailsStore
    .getState()
    .setRepoUrl(compute.deploymentId, compute.sourceCodeLink);
  useDeploymentDetailsStore
    .getState()
    .setDeploymentDetails(compute.deploymentId, compute);

  window.electronAPI.startContainerStats([containerId]);
  window.electronAPI.startLogStream(containerId);
  startContainerStatsMonitoring();
  await startPgrok(compute);
}
