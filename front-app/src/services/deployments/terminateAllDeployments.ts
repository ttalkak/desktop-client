import { useAuthStore } from "../../stores/authStore";
import { useDockerStore } from "../../stores/dockerStore";
import { sendInstanceUpdate } from "../websocket/sendUpdateUtils";
import useDeploymentStore from "../../stores/deploymentStore";
import { useAppStore } from "../../stores/appStatusStore";
import { dockerStateManager } from "../storeHandler/dockerStateHandler";

export async function terminateAndRemoveContainersAndImages() {
  const containers = useDockerStore.getState().dockerContainers;
  const images = useDockerStore.getState().dockerImages;
  const userId = useAuthStore.getState().userSettings?.userId;
  const { setServiceStatus } = useAppStore.getState();

  if (!userId) {
    return;
  }
  // 1. 모든 컨테이너 종료 및 삭제
  const containerPromises = containers.map(async (container) => {
    // 컨테이너 종료 및 삭제

    // 해당 container의 deployment 정보를 가져옵니다.
    const deployment = useDeploymentStore.getState().containers[container.Id];
    const deploymentId = deployment.deploymentId;
    const port = deployment.outboundPort;
    if (container && deploymentId) {
      try {
        sendInstanceUpdate(
          deployment.serviceType,
          deploymentId,
          "WAITING",
          port,
          "cloud manipulate"
        );
        await window.electronAPI.removeContainer(container.Id);
        console.log(`${container.Id} forcerDelected`);
      } catch (error) {
        deployment.serviceType,
          sendInstanceUpdate(
            deployment.serviceType,
            deploymentId,
            "ERROR",
            port,
            "allocate"
          );
        console.error(`Error removing container ${container.Id}:`, error);
      }
    } else {
      return;
    }
  });

  // 모든 컨테이너가 삭제될 때까지 대기
  await Promise.all(containerPromises);

  // 2. 모든 이미지 삭제
  const imagePromises = images.map(async (image) => {
    try {
      const { success } = await window.electronAPI.removeImage(image.Id);
      if (success) {
        console.log(`Image ${image.Id} removed successfully.`);
        dockerStateManager.removeImage(image.Id);
      }
    } catch (error) {
      console.error(`Error removing image ${image.Id}:`, error);
    }
  });

  // 모든 이미지 삭제가 완료될 때까지 대기
  await Promise.all(imagePromises);

  setServiceStatus("stopped");
  console.log("All containers and images have been successfully removed.");
}
