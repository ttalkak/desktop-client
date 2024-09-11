// src/utils/serviceUtils.ts
import { useAppStore } from "../stores/appStatusStore";
import { checkDockerStatus, startDocker } from "./dockerUtils";
import { connectWebSocket } from "./stompService";
// import { registerDockerEventHandlers } from "./dockerEventListner";

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

    setDockerStatus("running");
    console.log("4. ServiceUtil: Docker is running");

    // 2. dockerEvent 감지 시작
    // Docker 이벤트 핸들러 등록
    // registerDockerEventHandlers();

    // 3. WebSocket 연결
    connectWebSocket();
    console.log("5. ServiceUtil: WebSocket connected");
  } catch (err) {
    console.error("!ServiceUtil: Error in service handler:", err);
    setServiceStatus("stopped");
  }

  setServiceStatus("running");
};
