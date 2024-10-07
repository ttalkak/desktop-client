import { prepareDeploymentContext } from "./deploymentUtils.ts";
import { buildAndDeploy } from "./buildProcessHandler.ts";
import { useContainerStore } from "../../../stores/containerStore.tsx";
import { useImageStore } from "../../../stores/imageStore.tsx";

export async function handleDockerBuild(deployCreate: DeploymentCreateEvent) {
  const { instance } = deployCreate;
  const containerStore = useContainerStore.getState();
  const imageStore = useImageStore.getState();
  const id = `${instance.serviceType}-${instance.deploymentId}`;

  try {
    // 컨테이너 스토어에서 기존 컨테이너를 가져옴
    const existingContainer = containerStore.getContainerById(id);

    if (existingContainer) {
      const existingContainerId = existingContainer.containerId;

      if (existingContainerId) {
        try {
          // 컨테이너 통계 중지/중지/삭제/스토어에서 삭제
          await window.electronAPI.stopContainerStats([existingContainerId]);
          await window.electronAPI.stopContainer(existingContainerId);
          await window.electronAPI.removeContainer(existingContainerId);
          containerStore.removeContainer(existingContainerId);

          console.log(`기존 컨테이너 삭제 완료, ID: ${existingContainerId}`);

          // 연관된 이미지 삭제
          const existingImage = imageStore.getImageById(existingContainerId);
          if (existingImage && existingImage.imageId) {
            await window.electronAPI.removeImage(existingImage.imageId);
            imageStore.removeImage(existingContainerId);
            console.log(`기존 이미지 삭제 완료, ID: ${existingImage.imageId}`);
          }
        } catch (error) {
          console.error(`기존 배포 삭제 중 오류 발생: ${error}`);
        }
      }
    }

    // 기존 컨테이너가 없을 경우에만 새로운 컨테이너를 빌드 및 배포
    const { contextPath, dockerfilePath } = await prepareDeploymentContext(
      deployCreate
    );

    if (!contextPath) {
      console.error("컨텍스트 경로가 유효하지 않습니다.");
      return; // 컨텍스트 경로가 없을 경우 함수 종료
    }

    // 새로운 컨테이너를 빌드하고 배포
    await buildAndDeploy(deployCreate, contextPath, dockerfilePath);
  } catch (error) {
    console.error("Docker 빌드 및 설정 중 오류 발생:", error);
  }
}
