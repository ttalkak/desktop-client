import { disconnectWebSocket } from "../services/stompService";
import { useDockerStore, useAppStore } from "../stores/appStatusStore";
import { terminateAndRemoveContainersAndImages } from "./deployments/terminateAllDeployments";
import {
  stopSendingCurrentState,
  stopContainerStatsMonitoring,
  stopPeriodicContainerCheck,
} from "./monitoring/healthCheckPingUtils";
import { useDeploymentStore } from "../stores/deploymentStore";
import { useDeploymentDetailsStore } from "../stores/deploymentDetailsStore";

// 전체 종료 함수
export const stopAllTasks = async (): Promise<void> => {
  const clearImages = useDockerStore.getState().clearDockerImages;
  const clearContainer = useDockerStore.getState().clearDockerContainers;
  const setServiceStatus = useAppStore.getState().setServiceStatus;
  const clearDeployments = useDeploymentStore.getState().clearAllDeployments;
  const clearAllDeploymentDetails =
    useDeploymentDetailsStore.getState().clearAllDeploymentDetails;

  try {
    console.log("1. Starting task termination...");

    // 1. 모니터링 중지
    stopPeriodicContainerCheck();
    console.log("2. Stopped periodic container check.");
    stopSendingCurrentState();
    console.log("3. Stopped sending current state.");

    stopContainerStatsMonitoring();
    console.log("4. Stopped container stats monitoring.");

    // 2. 컨테이너와 이미지 정지 및 제거
    await terminateAndRemoveContainersAndImages(); // 비동기 작업을 기다림
    console.log("5. Containers and images removed.");

    // 3. 서비스 상태 업데이트
    setServiceStatus("stopped");
    console.log("6. Service status set to stopped.");

    // // 4. WebSocket 종료
    disconnectWebSocket();
    console.log("7. WebSocket disconnected.");

    // 5. Docker 이벤트 리스너 제거
    window.electronAPI.removeAllDockerEventListeners();
    console.log("8. Removed all Docker event listeners.");

    // 6. store 초기화
    clearDeployments();
    clearAllDeploymentDetails();
    clearImages();
    clearContainer();
    console.log("9. Cleared Docker images and containers from store.");

    console.log("10. Task termination completed.");
  } catch (error) {
    console.error("Failed to stop tasks:", error);
    throw new Error(
      "Failed to stop tasks: " +
        (error instanceof Error ? error.message : "Unknown error")
    );
  }
};

// 메인 프로세스 종료 이벤트 인식 후 전체 task 종료
window.ipcRenderer.on("terminate", async () => {
  console.log("Received 'terminate' event from main process.");
  try {
    await stopAllTasks();
    // disconnectWebSocket();
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
