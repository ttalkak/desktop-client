import { useAuthStore } from "../../stores/authStore";
import { sendInstanceUpdate } from "../websocket/sendUpdateUtils";
import { useAppStore } from "../../stores/appStatusStore";
import { useContainerStore } from "../../stores/containerStore";
import { useImageStore } from "../../stores/imageStore";

export async function terminateAndRemoveContainersAndImages() {
  const { containers, removeAllContainers, updateContainerInfo } =
    useContainerStore.getState();
  const { images, removeAllImages, removeImage } = useImageStore.getState();
  const userId = useAuthStore.getState().userSettings?.userId;
  const { setServiceStatus } = useAppStore.getState();
  // userId가 없으면 함수 종료
  if (!userId) {
    return;
  }

  // 1. 모든 컨테이너 종료 및 삭제
  const containerPromises = containers.map(async (container) => {
    const port =
      container.ports && container.ports.length > 0
        ? container.ports[0].external
        : 0;

    if (!container) {
      return;
    }
    if (container.deployId && container.containerId) {
      const id = container.id;
      try {
        // serviceType과 senderId가 undefined일 경우 빈 문자열로 처리
        const serviceType = container.serviceType; // Fallback to empty string
        const senderId = container.senderId; // Fallback to empty string

        // 상태 업데이트 메시지 전송
        sendInstanceUpdate(
          serviceType, // 확실하게 string
          container.deployId,
          senderId, // 확실하게 string
          "WAITING",
          port,
          "cloud manipulate"
        );
        // 컨테이너 삭제
        await window.electronAPI.removeContainer(container.containerId);
        sendInstanceUpdate(
          container.serviceType,
          container.deployId,
          senderId,
          "WAITING",
          port,
          "cloud manipulate"
        );
        updateContainerInfo(id, { status: "DELETE" });
        console.log(`컨테이너 ${container.containerId} 강제 종료 및 삭제 완료`);
      } catch (error) {
        console.error(
          `컨테이너 ${container.containerId} 삭제 중 오류 발생:`,
          error
        );
      }
    } else {
      console.warn(
        `컨테이너 또는 deploymentId가 누락되었습니다: ${container.containerId}`
      );
    }
  });

  // 모든 컨테이너 삭제 대기
  await Promise.all(containerPromises);
  removeAllContainers();

  // 2. 모든 이미지 삭제
  const imagePromises = images.map(async (image) => {
    const id = image.id;
    try {
      const { success } = await window.electronAPI.removeImage(image.imageId);
      if (success) {
        console.log(`이미지 ${image.imageId} 성공적으로 삭제됨.`);
        removeImage(id);
      }
    } catch (error) {
      console.error(`이미지 ${image.imageId} 삭제 중 오류 발생:`, error);
    }
  });

  // 모든 이미지 삭제 대기
  await Promise.all(imagePromises);
  removeAllImages();
  // 서비스 상태 'stopped'로 설정
  setServiceStatus("stopped");
  console.log("모든 컨테이너 및 이미지가 성공적으로 삭제되었습니다.");
}
