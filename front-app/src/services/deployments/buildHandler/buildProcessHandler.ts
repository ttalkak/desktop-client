import { handleBuildImage } from "./buildImageHandler.ts";
import { sendInstanceUpdate } from "../../websocket/sendUpdateUtils.ts";
import { createAndStartContainer } from "./buildImageHandler.ts";
import { DeployImageInfo, useImageStore } from "../../../stores/imageStore.tsx";
import {
  DeployContainerInfo,
  useContainerStore,
} from "../../../stores/containerStore.tsx";

export const PGROK_URL = "pgrok.ttalkak.com:2222";

// 공통 빌드 및 배포 처리 함수
export async function buildAndDeploy(
  deployCreate: DeploymentCreateEvent,
  contextPath: string,
  dockerfilePath: string | null
) {
  const { senderId, instance } = deployCreate;
  // 1. Docker 이미지 빌드
  const { createImageEntry, updateImageInfo } = useImageStore.getState();
  const id = createImageEntry(instance.serviceType, instance.deploymentId);

  const imageName = instance.dockerImageName || instance.subdomainName;
  const tagName = instance.dockerImageTag || "latest";

  if (dockerfilePath && imageName) {
    const { success, image } = await handleBuildImage(
      contextPath,
      dockerfilePath,
      imageName,
      tagName
    );
    if (success && image) {
      const newImage: Omit<DeployImageInfo, "id"> = {
        imageId: image.Id,
        serviceType: instance.serviceType,
        deployId: instance.deploymentId,
        RepoTags: image.RepoTags,
        Created: image.Created,
        Size: image.Size,
        Containers: image.Containers,
      };

      // 이미지 빌드시 리스트에 추가
      updateImageInfo(id, newImage);
    } else {
      // 이미지 생성 실패시 생성 실패 알림
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

// 배포 완료 및 상태 업데이트
async function completeDeployment(
  deployCreate: DeploymentCreateEvent,
  image: DockerImage
) {
  // 헬스 체크 명령어 설정
  let healthCheckCommand: string[] = [];
  const { senderId, instance } = deployCreate;
  const { updateContainerInfo } = useContainerStore.getState();
  const id = `${instance.serviceType}-${instance.deploymentId}`;

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
    const newContainer: Omit<DeployContainerInfo, "id"> = {
      senderId: senderId,
      deployId: instance.deploymentId,
      serviceType: instance.serviceType,
      containerName: instance.containerName,
      imageTag: image.RepoTags ? image.RepoTags[0] : undefined,
      status: "RUNNING",
      containerId: container.Id,
      ports: [
        {
          internal: instance.inboundPort,
          external: instance.outboundPort,
        },
      ],
      subdomainName: instance.subdomainName,
    };

    //Store 저장 및 성공 상태 반환
    updateContainerInfo(id, newContainer);
    //
    sendInstanceUpdate(
      instance.serviceType,
      instance.deploymentId,
      senderId,
      "PENDING",
      instance.outboundPort,
      "PENDING"
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
