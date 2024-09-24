import { disconnectWebSocket } from "../utils/stompService";
import { useDockerStore, useAppStore } from "../stores/appStatusStore";
import { terminateAndRemoveContainersAndImages } from "./deploymentRemoveUtils";
import {
  stopSendingCurrentState,
  stopContainerStatsMonitoring,
} from "../utils/stompService";

// 전체 종료 함수
export const stopAllTasks = (): Promise<void> => {
  const clearImages = useDockerStore.getState().clearDockerImages;
  const clearContainer = useDockerStore.getState().clearDockerContainers;
  const setServiceStatus = useAppStore.getState().setServiceStatus;

  return new Promise<void>((resolve, reject) => {
    try {
      console.log("Starting task termination...");

      stopSendingCurrentState();
      stopContainerStatsMonitoring();
      console.log(
        "Stopped sending current state and container stats monitoring."
      );

      // 컨테이너와 이미지 정지, 제거
      terminateAndRemoveContainersAndImages();
      console.log("Containers and images removed.");

      // 웹소켓으로 보내는 내용 정지

      // 서비스 상태창 정리
      setServiceStatus("stopped");
      console.log("Service status set to stopped.");

      // 최종 websocket 종료
      disconnectWebSocket();
      console.log("WebSocket disconnected.");

      window.electronAPI.removeAllDockerEventListeners();

      // store 초기화
      clearImages();
      clearContainer();
      console.log("Cleared Docker containers and images from store.");

      setTimeout(() => {
        console.log("Task termination completed.");
        resolve(); // 성공 시 void 반환
      }, 1000);
    } catch (error) {
      if (error instanceof Error) {
        console.error("Failed to stop tasks: " + error.message);
        reject(new Error("Failed to stop tasks: " + error.message));
      } else {
        console.error("Unknown error occurred during task termination.");
        reject(new Error("Unknown error occurred during task termination."));
      }
    }
  });
};

// 메인 프로세스 종료 이벤트 인식 후 전체 task 종료
window.ipcRenderer.on("terminate", async () => {
  console.log("Received 'terminate' event from main process.");
  try {
    await stopAllTasks();
    window.ipcRenderer.send("terminated"); // 종료 완료 후 terminated main으로 전송
    console.log("Termination completed. Sent 'terminated' to main process.");
  } catch (err) {
    console.error("Error during termination:", err);
    window.ipcRenderer.send(
      "terminate-error",
      err instanceof Error ? err.message : "Unknown error"
    );
  }
});
