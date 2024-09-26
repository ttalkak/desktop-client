import { useAuthStore } from "../stores/authStore";
import { useDockerStore } from "../stores/appStatusStore";
import { sendInstanceUpdate } from "./sendUpdateUtils";
import { useDeploymentStore } from "../stores/deploymentStore";
import { useDeploymentDetailsStore } from "../stores/deploymentDetailsStore";

export async function terminateAndRemoveContainersAndImages() {
  const containers = useDockerStore.getState().dockerContainers;
  const images = useDockerStore.getState().dockerImages;
  const userId = useAuthStore.getState().userSettings?.userId;

  if (!userId) {
    return;
  }
  // 1. 모든 컨테이너 종료 및 삭제
  const containerPromises = containers.map(async (container) => {
    // 컨테이너 종료 및 삭제
    const deploymentId = useDeploymentStore
      .getState()
      .getDeploymentByContainer(container.Id);
    const port =
      useDeploymentDetailsStore.getState().deploymentDetails[deploymentId]
        .details.outboundPort;
    if (container) {
      try {
        sendInstanceUpdate(userId, deploymentId, "CLOUD_MANIPULATE", port);
        await window.electronAPI.removeContainer(container.Id);
        console.log(`${container.Id} forcerDelected`);
      } catch (error) {
        sendInstanceUpdate(userId, deploymentId, "ALLOCATE_ERROR", port);
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
      await window.electronAPI.removeImage(image.Id);
      console.log(`Image ${image.Id} removed successfully.`);
    } catch (error) {
      console.error(`Error removing image ${image.Id}:`, error);
    }
  });

  // 모든 이미지 삭제가 완료될 때까지 대기
  await Promise.all(imagePromises);

  console.log("All containers and images have been successfully removed.");
}
