import { useAppStore } from "../stores/appStatusStore";
import { checkDockerStatus } from "./deployments/dockerUtils";

import { startDocker } from "./deployments/dockerUtils";
import { registerDockerEventHandlers } from "./deployments/dockerEventListner";
import { connectWebSocket } from "./stompService";
//위치 고민해보기
import { startContainerStatsMonitoring } from "./monitoring/healthCheckPingUtils";
import { useCpuStore } from "../stores/cpuStore";
import { axiosInstance } from "../axios/constants";
import { useAuthStore } from "../stores/authStore";

export const startService = async () => {
  const setServiceStatus = useAppStore.getState().setServiceStatus;
  const setDockerStatus = useAppStore.getState().setDockerStatus;
  const setOsType = useCpuStore.getState().setOsType;
  const trueUserId = await useAuthStore.getState().userSettings?.userId;

  if (!trueUserId) {
    console.error("유효한 사용자 ID가 없습니다.");
    return;
  }

  try {
    const response = await axiosInstance.get("/payment/signature");
    console.log("test", response);

    const { userId, address, hasKey } = response.data;

    if (!hasKey || !address || userId === trueUserId) {
      alert("MetaMask 지갑 정보를 확인하세요");
      return;
    }

    const OsType = await window.electronAPI.getOsType();
    setOsType(OsType);
    console.log("1. ServiceUtil: Starting service");
    setServiceStatus("loading");

    const dockerStatus = await checkDockerStatus();
    console.log("2. ServiceUtil: Docker status:", dockerStatus);

    if (dockerStatus !== "running") {
      console.log("3. ServiceUtil: Starting Docker");
      await startDocker();
      setDockerStatus("running");
    }

    console.log("4. ServiceUtil: Docker is running");

    registerDockerEventHandlers();
    window.electronAPI.sendDockerEventRequest();
    console.log("5. ServiceUtil: Docker event listener started");

    await connectWebSocket();
    console.log("6. ServiceUtil: WebSocket connected");

    setServiceStatus("running");
    startContainerStatsMonitoring();
  } catch (err) {
    console.error("!ServiceUtil: Error in service handler:", err);
    alert("서비스를 시작하는 중 문제가 발생했습니다.");
    setServiceStatus("stopped");
  }
};
