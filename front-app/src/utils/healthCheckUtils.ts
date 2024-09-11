import { useDockerStore } from "../stores/appStatusStore";
import { Client } from "@stomp/stompjs";

interface ContainerStats {
  cpu_usage: number;
  memory_usage: number;
  container_id: string;
  blkio_read: number;
  blkio_write: number;
}

interface ContainerStatsError {
  containerId: string;
  error: string;
}

let containerCheckInterval: NodeJS.Timeout | null = null;

// 컨테이너 상태 업데이트를 처리하는 함수
export function handleContainerStats(client: Client, stats: ContainerStats) {
  sendStatsToWebSocket(client, stats);
}

// 컨테이너 상태 오류를 처리하는 함수
export function handleContainerStatsError(error: ContainerStatsError) {
  console.error("Container stats error:", error);
}

// 컨테이너 상태를 WebSocket으로 전송하는 함수
export function sendStatsToWebSocket(client: Client, stats: ContainerStats) {
  if (client && client.connected) {
    client.publish({
      destination: `/pub/compute/${stats.container_id}/stats`,
      headers: { "X-USER-ID": "2" },
      body: JSON.stringify(stats),
    });
  }
}

// 컨테이너 상태 모니터링을 시작하는 함수
export function startContainerStatsMonitoring(client: Client) {
  window.electronAPI.onContainerStatsUpdate(handleContainerStats);
  window.electronAPI.onContainerStatsError(handleContainerStatsError);
  startPeriodicContainerCheck(client);
}

// 컨테이너 상태 모니터링을 중지하는 함수
export function stopContainerStatsMonitoring() {
  stopPeriodicContainerCheck();
  window.electronAPI.removeContainerStatsListeners();
  useDockerStore.getState().dockerContainers.forEach((container) => {
    window.electronAPI
      .stopContainerStats(container.Id)
      .then((result) => console.log(result.message))
      .catch((error) =>
        console.error("Failed to stop container stats:", error)
      );
  });
}

// 주기적으로 컨테이너 상태를 체크하는 함수 시작
function startPeriodicContainerCheck(client: Client) {
  checkAndUpdateContainerMonitoring(client);
  containerCheckInterval = setInterval(
    () => checkAndUpdateContainerMonitoring(client),
    30000
  );
}

// 주기적으로 컨테이너 상태 체크를 중지하는 함수
function stopPeriodicContainerCheck() {
  if (containerCheckInterval) {
    clearInterval(containerCheckInterval);
    containerCheckInterval = null;
  }
}

// 컨테이너 모니터링을 업데이트하는 함수
async function checkAndUpdateContainerMonitoring(client: Client) {
  const dockerStore = useDockerStore.getState();
  const currentContainers = new Set(
    dockerStore.dockerContainers.map((c) => c.Id)
  );

  const newContainers = await window.electronAPI.getDockerContainers(true);
  const newContainerIds = new Set(newContainers.map((c) => c.Id));

  newContainers.forEach((container) => {
    if (!currentContainers.has(container.Id)) {
      window.electronAPI
        .startContainerStats(container.Id)
        .then((result) => console.log(result.message))
        .catch((error) =>
          console.error("Failed to start container stats:", error)
        );
    }
  });

  currentContainers.forEach((containerId) => {
    if (!newContainerIds.has(containerId)) {
      window.electronAPI
        .stopContainerStats(containerId)
        .then((result) => console.log(result.message))
        .catch((error) =>
          console.error("Failed to stop container stats:", error)
        );
    }
  });

  dockerStore.setDockerContainers(newContainers);
}
