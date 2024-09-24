import { useDockerStore } from "../stores/appStatusStore";

export async function terminateAndRemoveContainersAndImages() {
  const containers = useDockerStore.getState().dockerContainers;
  const images = useDockerStore.getState().dockerImages;

  // 1. 모든 컨테이너 종료 및 삭제
  const containerPromises = containers.map(async (container) => {
    try {
      await window.electronAPI.removeContainer(container.Id);
      console.log(`Container ${container.Id} removed successfully.`);
    } catch (error) {
      console.error(`Error removing container ${container.Id}:`, error);
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