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

// 공통 처리 함수: 배포 완료 및 상태 업데이트
async function completeDeployment(
  compute: DeploymentCommand,
  image: DockerImage
) {
  // 헬스 체크 명령어 설정
  let healthCheckCommand: string[] = [];

  //빌드 타입에 따른 healthCheck로직 확인
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

  //container Start
  const { success, container } = await createAndStartContainer(
    image,
    compute.inboundPort,
    compute.outboundPort,
    compute.envs,
    healthCheckCommand
  );

  if (!success) {
    console.warn(`container 시작 실패`);
    return;
  }

  if (container) {
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

    //deployment에 저장
    useDeploymentStore.getState().addContainer(container.Id, deployment);
    useDockerStore.getState().addDockerContainer(container);
    window.electronAPI.startContainerStats([container.Id]);
    window.electronAPI.startLogStream(container.Id);
    await startPgrok(compute);
  }
}

// 공통 빌드 및 배포 처리 함수
export async function buildAndDeploy(
  compute: DeploymentCommand,
  contextPath: string,
  dockerfilePath: string | null
) {
  // 1. Docker 이미지 빌드
  const { addDockerImage } = useDockerStore.getState();

  const imageName = compute.dockerImageName
    ? compute.dockerImageName
    : compute.subdomainName;

  const tagName = compute.dockerImageTag ? compute.dockerImageTag : "latest";

  if (dockerfilePath && imageName) {
    const { image } = await handleBuildImage(
      contextPath,
      dockerfilePath,
      imageName,
      tagName
    );

    // 이미지 빌드시 리스트에 추가
    if (image) {
      addDockerImage(image);
    }

    // 이미지 생성 실패시 생성 실패 알림
    if (!image) {
      sendInstanceUpdate(
        compute.serviceType,
        compute.deploymentId,
        "ERROR",
        compute.outboundPort,
        "이미지 생성에 실패했습니다. dockerfile을 확인하세요."
      );
      return;
    }
    // 도커 이미지 추가 및 컨테이너 생성 및 시작
    await completeDeployment(compute, image);
  }
}
