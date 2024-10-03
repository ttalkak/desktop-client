import { useDockerStore } from "../../../stores/dockerStore.tsx";
import { handleBuildImage } from "./buildImageHandler.ts";
import { sendInstanceUpdate } from "../../websocket/sendUpdateUtils.ts";
import { startContainerStatsMonitoring } from "../../monitoring/healthCheckPingUtils.ts";
import { startPgrok } from "../pgrokHandler.ts";
import { createAndStartContainer } from "./buildImageHandler.ts";
import {
  useDeploymentStore,
  Deployment,
} from "../../../stores/deploymentStore.tsx";

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

  const imageName = compute.dockerImageName
    ? compute.dockerImageName
    : compute.subdomainName;

  const tagName = compute.dockerImageTag ? compute.dockerImageTag : "latest";

  if (dockerfilePath) {
    const { image } = await handleBuildImage(
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

  // 헬스 체크 명령어 설정
  let healthCheckCommand: string[] = [];

  if (compute.serviceType === "FRONTEND") {
    healthCheckCommand = [
      "CMD-SHELL",
      `curl -f http://localhost:${compute.outboundPort}/ || exit 1`,
    ];
  } else if (compute.serviceType === "BACKEND") {
    healthCheckCommand = [
      "CMD-SHELL",
      `curl -f http://localhost:${compute.outboundPort}/actuator/health || exit 1`,
    ];
  }

  // dockerstore에 이미지 저장됨
  const { success, containerId, error } = await createAndStartContainer(
    image,
    compute.inboundPort || DEFAULT_INBOUND_PORT,
    compute.outboundPort || DEFAULT_OUTBOUND_PORT,
    compute.envs,
    healthCheckCommand // 동적으로 설정된 헬스 체크 명령어 전달
  );

  if (!success) {
    sendInstanceUpdate(
      compute.deploymentId,
      "ERROR",
      compute.outboundPort,
      `${error}`
    );
    return;
  }

  if (containerId) {
    // Deployment 정보를 DeploymentStore에 추가
    const deployment: Deployment = {
      deploymentId: compute.deploymentId,
      serviceType: compute.serviceType,
      hasDockerFile: !!compute.hasDockerFile,
      hasDockerImage: compute.hasDockerImage,
      containerName: compute.containerName,
      inboundPort: compute.inboundPort,
      outboundPort: compute.outboundPort,
      subdomainName: compute.subdomainName,
      sourceCodeLink: compute.sourceCodeLink,
      dockerRootDirectory: compute.dockerRootDirectory,
      dockerFileScript: compute.dockerFileScript,
      envs: compute.envs,
      dockerImageName: compute.dockerImageName,
      dockerImageTag: compute.dockerImageTag,
    };

    useDeploymentStore.getState().addContainer(containerId, deployment);

    sendInstanceUpdate(
      compute.deploymentId,
      "RUNNING",
      compute.outboundPort,
      "container 실행"
    );

    window.electronAPI.startContainerStats([containerId]);
    window.electronAPI.startLogStream(containerId);
    startContainerStatsMonitoring();
    await startPgrok(compute);
  }
}
