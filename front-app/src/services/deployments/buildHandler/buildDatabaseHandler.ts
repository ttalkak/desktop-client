import { sendInstanceUpdate } from "../../../services/websocket/sendUpdateUtils";
import { PGROK_URL } from "../pgrokHandler";
import { useContainerStore } from "../../../stores/containerStore";
import { useImageStore } from "../../../stores/imageStore";
import { DeployImageInfo } from "../../../stores/imageStore";
import { DeployContainerInfo } from "../../../stores/containerStore";
import { DeployStatus } from "../../../types/deploy";

export async function handleDatabaseBuild(dbCreate: DatabaseCreateEvent) {
  const { senderId, instance } = dbCreate;
  const { getContainerById, removeContainer } = useContainerStore.getState();
  const id = `${instance.serviceType}-${instance.databaseId}`;
  const dbImageName = `${instance.dockerImageName}:${
    instance.dockerImageTag || "latest"
  }`;

  try {
    // 1. 기존 컨테이너가 있는지 확인하고 삭제 처리
    const existingContainer = getContainerById(id);

    if (existingContainer) {
      const existingContainerId = existingContainer.containerId;
      if (existingContainerId) {
        try {
          await stopAndRemoveExistingContainer(existingContainerId);
          removeContainer(existingContainerId);
          console.log(`기존 컨테이너 삭제 완료, ID: ${existingContainerId}`);
        } catch (error) {
          console.error(`기존 배포 삭제 중 오류 발생: ${error}`);
          throw error;
        }
        return existingContainerId;
      }
    }

    // 2. 새로운 Docker 컨테이너 생성 및 실행
    const { success, image, container, error } =
      await window.electronAPI.pullAndStartDatabaseContainer(
        instance.dockerImageName,
        dbImageName,
        instance.containerName,
        instance.inboundPort,
        instance.outboundPort,
        instance.envs
      );

    if (success && container?.Id) {
      handleSuccessfulContainerStart(instance, image, container, senderId, id);
    } else if (error) {
      console.log(error);
    }
  } catch (error) {
    console.error("Error during database build process:", error);
  }
}

// 기존 컨테이너 중지 및 삭제 처리 함수
async function stopAndRemoveExistingContainer(containerId: string) {
  await window.electronAPI.stopContainerStats([containerId]);
  await window.electronAPI.stopContainer(containerId);
  await window.electronAPI.removeContainer(containerId);
}

// 새로운 컨테이너 시작 성공 시 처리 함수
async function handleSuccessfulContainerStart(
  instance: DatabaseCommand,
  image: DockerImage,
  container: DockerContainer,
  senderId: string,
  id: string
) {
  const { updateImageInfo } = useImageStore.getState();
  const { updateContainerInfo } = useContainerStore.getState();
  // 이미지 정보를 업데이트
  const newImage: Omit<DeployImageInfo, "id"> = {
    imageId: image.Id,
    serviceType: instance.serviceType,
    deployId: instance.databaseId,
    RepoTags: image.RepoTags,
    Created: image.Created,
    Size: image.Size,
    Containers: image.Containers,
    status: DeployStatus.RUNNING,
  };
  //container 정보 업데이트
  const newContainer: Omit<DeployContainerInfo, "id"> = {
    senderId: senderId,
    deployId: instance.databaseId,
    serviceType: instance.serviceType,
    containerName: `${instance.dockerImageName}:${instance.dockerImageTag}`,
    imageTag: image.RepoTags ? image.RepoTags[0] : undefined,
    status: DeployStatus.RUNNING,
    containerId: container.Id,
    ports: [
      {
        internal: instance.inboundPort,
        external: instance.outboundPort,
      },
    ],
    created: container.Created,
  };
  updateImageInfo(id, newImage);
  // 상태 업데이트
  sendInstanceUpdate(
    instance.serviceType,
    instance.databaseId,
    senderId,
    "PENDING",
    instance.outboundPort,
    "PENDING"
  );

  // pgrok 실행 및 결과 처리
  const result = await window.electronAPI.runPgrok(
    PGROK_URL,
    `localhost:${instance.outboundPort}`,
    instance.subdomainKey,
    instance.databaseId
  );

  switch (result) {
    case "FAILED":
      sendInstanceUpdate(
        instance.serviceType,
        instance.databaseId,
        senderId,
        "ERROR",
        instance.outboundPort,
        "FAILED"
      );
      break;
    case "SUCCESS":
      sendInstanceUpdate(
        instance.serviceType,
        instance.databaseId,
        senderId,
        "RUNNING",
        instance.outboundPort,
        "RUNNING"
      );

      //pgrok 생성 되고 나서
      updateContainerInfo(id, newContainer);
      window.electronAPI.startLogStream(container.Id);
      break;
    default:
      break;
  }
}
