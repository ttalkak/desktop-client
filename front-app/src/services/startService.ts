import { useAppStore } from "../stores/appStatusStore";
import { checkDockerStatus, startDocker } from "../utils/dockerUtils";
import { connectWebSocket } from "./stompService";
import { registerDockerEventHandlers } from "./../utils/dockerEventListner";
export const startService = async () => {
  const setServiceStatus = useAppStore.getState().setServiceStatus;
  const setDockerStatus = useAppStore.getState().setDockerStatus;

  try {
    console.log("1. ServiceUtil: Starting service");
    setServiceStatus("loading");

    // 1. Docker 상태 확인 및 실행
    const dockerStatus = await checkDockerStatus();
    console.log("2. ServiceUtil: Docker status:", dockerStatus);
    if (dockerStatus !== "running") {
      console.log("3. ServiceUtil: Starting Docker");
      await startDocker();
    }

    //도커 시작
    setDockerStatus("running");
    console.log("4. ServiceUtil: Docker is running");

    // // Docker 이벤트 핸들러 등록
    registerDockerEventHandlers();
    //도커 이벤트 감지 시작
    window.electronAPI.sendDockerEventRequest();
    console.log("5. ServiceUtil: Docker event listener start");

    // 3. WebSocket 연결
    await connectWebSocket();
    console.log("6. ServiceUtil: WebSocket connected");
  } catch (err) {
    console.error("!ServiceUtil: Error in service handler:", err);
    setServiceStatus("stopped");
  }
};
