import { useDockerStore } from "../../../stores/dockerStore.tsx";
import { handleBuildImage } from "./buildImageHandler.ts";
import { sendInstanceUpdate } from "../../websocket/sendUpdateUtils.ts";
import { startPgrok } from "../pgrokHandler.ts";
import { createAndStartContainer } from "./buildImageHandler.ts";
import {
  useDeploymentStore,
  Deployment,
  DeploymentCreate,
} from "../../../stores/deploymentStore.tsx";

export const PGROK_URL = "pgrok.ttalkak.com:2222";

// 공통 빌드 및 배포 처리 함수
export async function buildAndDeploy(
  deployCreate: DeploymentCreate,
  contextPath: string,
  dockerfilePath: string | null
) {
  const { senderId, instance } = deployCreate;
  // 1. Docker 이미지 빌드
  const { addDockerImage } = useDockerStore.getState();

  const imageName = instance.dockerImageName
    ? instance.dockerImageName
    : instance.subdomainName;

  const tagName = instance.dockerImageTag ? instance.dockerImageTag : "latest";

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
        instance.serviceType,
        instance.deploymentId,
        senderId,
        "ERROR",
        instance.outboundPort,
        "DOCKER"
      );
      return;
    }
    // 도커 이미지 추가 및 컨테이너 생성 및 시작
    await completeDeployment(deployCreate, image);
  }
}

// 공통 처리 함수: 배포 완료 및 상태 업데이트
async function completeDeployment(
  deployCreate: DeploymentCreate,
  image: DockerImage
) {
  // 헬스 체크 명령어 설정
  let healthCheckCommand: string[] = [];

  const { senderId, instance } = deployCreate;

  //빌드 타입에 따른 healthCheck로직 확인
  if (instance.serviceType === "FRONTEND") {
    healthCheckCommand = [
      "CMD-SHELL",
      `curl -f http://localhost:${instance.outboundPort}/ || exit 1`,
    ];
  } else if (instance.serviceType === "BACKEND") {
    healthCheckCommand = [
      "CMD-SHELL",
      `curl -f http://localhost:${instance.outboundPort}/actuator/health || exit 1`,
    ];
  }

  //container Start
  const { success, container } = await createAndStartContainer(
    image,
    instance.inboundPort,
    instance.outboundPort,
    instance.envs,
    healthCheckCommand
  );

  console.log("container 빌드 여부 확인", success, container);
  if (!success) {
    console.warn(`container 시작 실패`);
    return;
  }

  if (container) {
    // Deployment 정보를 DeploymentStore에 추가
    const deployment: Deployment = {
      senderId: senderId,
      deploymentId: instance.deploymentId,
      serviceType: instance.serviceType,
      hasDockerFile: !!instance.hasDockerFile,
      hasDockerImage: instance.hasDockerImage,
      containerName: instance.containerName,
      inboundPort: instance.inboundPort,
      outboundPort: instance.outboundPort,
      subdomainName: instance.subdomainName,
      sourceCodeLink: instance.sourceCodeLink,
      dockerRootDirectory: instance.dockerRootDirectory,
      dockerFileScript: instance.dockerFileScript,
      envs: instance.envs,
      dockerImageName: instance.dockerImageName,
      dockerImageTag: instance.dockerImageTag,
    };

    //Store 저장 및 성공 상태 반환
    useDeploymentStore.getState().addContainer(container.Id, deployment);
    useDockerStore.getState().addDockerContainer(container);
    sendInstanceUpdate(
      instance.serviceType,
      instance.deploymentId,
      instance.senderId,
      "RUNNING",
      instance.outboundPort,
      "RUNNING"
    );
    window.electronAPI.startContainerStats([container.Id]);
    window.electronAPI.startLogStream(container.Id, instance.deploymentId);

    // await startPgrok(deployCreate);
    try {
      console.log("pgrok will..start..");
      const message = await window.electronAPI.runPgrok(
        PGROK_URL,
        `http://localhost:${instance.outboundPort}`,
        instance.subdomainKey,
        instance.deploymentId,
        instance.subdomainName
      );
      console.log(`pgrok started: ${message}`);

      sendInstanceUpdate(
        instance.serviceType,
        instance.deploymentId,
        senderId,
        "RUNNING",
        instance.outboundPort,
        `RUNNING`
      );
    } catch (error) {
      console.error(`Failed to start pgrok: ${error}`);
      sendInstanceUpdate(
        instance.serviceType,
        instance.deploymentId,
        senderId,
        "ERROR",
        instance.outboundPort,
        "DOMAIN"
      );
    }
  }
}
