import { useAppStore } from "../stores/appStatusStore";
import { checkDockerStatus } from "./deployments/dockerUtils";
import { startDocker } from "./deployments/dockerUtils";
import { registerDockerEventHandlers } from "./deployments/dockerEventListner";
import { connectWebSocket } from "./stompService";
//위치 고민해보기
import { startContainerStatsMonitoring } from "./monitoring/healthCheckPingUtils";

export const startService = async () => {
  const setServiceStatus = useAppStore.getState().setServiceStatus;
  const setDockerStatus = useAppStore.getState().setDockerStatus;

  try {
    console.log("1. ServiceUtil: Starting service");
    setServiceStatus("loading");

    // Docker 상태 확인 및 실행
    const dockerStatus = await checkDockerStatus();
    console.log("2. ServiceUtil: Docker status:", dockerStatus);

    if (dockerStatus !== "running") {
      console.log("3. ServiceUtil: Starting Docker");
      await startDocker();
    }

    setDockerStatus("running");
    console.log("4. ServiceUtil: Docker is running");

    // Docker 이벤트 핸들러 등록
    registerDockerEventHandlers();
    window.electronAPI.sendDockerEventRequest();
    console.log("5. ServiceUtil: Docker event listener started");

    // WebSocket 연결
    await connectWebSocket();
    console.log("6. ServiceUtil: WebSocket connected");

    setServiceStatus("running");
    startContainerStatsMonitoring();
  } catch (err) {
    console.error("!ServiceUtil: Error in service handler:", err);
    setServiceStatus("stopped");
  }
};
