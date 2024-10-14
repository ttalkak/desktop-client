import { useAppStore } from "../stores/appStatusStore";
import { checkDockerStatus } from "./deployments/dockerUtils";

import { startDocker } from "./deployments/dockerUtils";
import { registerDockerEventHandlers } from "./deployments/dockerEventListner";
import { connectWebSocket } from "./stompService";
import { startContainerStatsMonitoring } from "./monitoring/healthCheckPingUtils";
import { useCpuStore } from "../stores/cpuStore";
import { useAuthStore } from "../stores/authStore";

export const startService = async () => {
  const setServiceStatus = useAppStore.getState().setServiceStatus;
  const setDockerStatus = useAppStore.getState().setDockerStatus;
  const setOsType = useCpuStore.getState().setOsType;

  const { userSettings } = useAuthStore.getState();
  const address = userSettings?.address || "";

  if (address.trim() === "") {
    window.electronAPI.showMessageBox("지갑 정보를 확인하세요")
    // alert("지갑 정보를 확인하세요");
    return;
  }

  try {
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

    startContainerStatsMonitoring();
  } catch (err) {
    console.error("!ServiceUtil: Error in service handler:", err);
    window.electronAPI.showMessageBox("서비스를 시작하는 중 문제가 발생했습니다.")
    // alert("서비스를 시작하는 중 문제가 발생했습니다.");
    setServiceStatus("stopped");
  }
};
