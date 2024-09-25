import { useDockerStore } from "../stores/appStatusStore";
import { sendCurrentState } from "../services/stompService";

// 컨테이너 상태와 관련된 인터페이스 정의
interface ContainerStats {
  cpu_usage: number;
  memory_usage: number;
  running_time: number;
  container_id: string;
  blkio_read: number;
  blkio_write: number;
}

// 컨테이너 상태 오류와 관련된 인터페이스 정의
interface ContainerStatsError {
  containerId: string;
  error: string;
}

// 전역 상태 저장소 추가 Ping 전송
export const globalStats = new Map<string, ContainerStats>();
let containerCheckInterval: NodeJS.Timeout | null = null; // 컨테이너 체크 주기를 위한 변수
let intervalId: NodeJS.Timeout | null = null; // 상태 전송 주기를 관리하는 변수

// 실행 중인 컨테이너 목록을 가져오는 함수
export const getRunningContainers = async () => {
  try {
    const allContainers = await window.electronAPI.getDockerContainers(true);
    const dockerStore = useDockerStore.getState();
    const storeContainerIds = new Set(
      dockerStore.dockerContainers.map((container) => container.Id)
    );
    const runningContainers = allContainers.filter((container) =>
      storeContainerIds.has(container.Id)
    );
    return runningContainers;
  } catch (error) {
    console.error("Error fetching running containers:", error);
    throw error;
  }
};

// 모든 실행 중인 컨테이너의 메모리 사용량을 합산하는 함수
export async function getTotalMemoryUsage(
  runningContainers: DockerContainer[]
): Promise<number> {
  try {
    const memoryUsages = await Promise.all(
      runningContainers.map((container) =>
        window.electronAPI.getContainerMemoryUsage(container.Id)
      )
    );
    const totalMemoryUsage = memoryUsages.reduce((acc, usage) => {
      if (usage.success && usage.memoryUsage !== undefined) {
        return acc + usage.memoryUsage;
      } else {
        console.warn(`Failed to retrieve memory usage for container`);
        return acc;
      }
    }, 0);
    return totalMemoryUsage;
  } catch (error) {
    console.error("Error calculating total memory usage:", error);
    throw error;
  }
}

// 주기적으로 현재 상태를 전송하기 시작하는 함수
export const startSendingCurrentState = (userId: string) => {
  console.log("Starting to send current state periodically...");
  sendCurrentState(userId);
  intervalId = setInterval(() => {
    console.log("Sending current state...");
    sendCurrentState(userId);
  }, 60000); // 60초마다 전송
};

// 주기적으로 현재 상태 전송을 중지하는 함수
export const stopSendingCurrentState = () => {
  if (intervalId) {
    clearInterval(intervalId);
    console.log("Stopped sending current state.");
    intervalId = null;
  }
};

// 컨테이너 상태 모니터링을 시작하는 함수
export function startContainerStatsMonitoring() {
  window.electronAPI.onContainerStatsUpdate(handleContainerStats);
  window.electronAPI.onContainerStatsError(handleContainerStatsError);
  startPeriodicContainerCheck();
}

// 컨테이너 상태 모니터링을 중지하는 함수
export function stopContainerStatsMonitoring() {
  stopPeriodicContainerCheck();
  window.electronAPI.removeContainerStatsListeners();
  useDockerStore.getState().dockerContainers.forEach((container) => {
    window.electronAPI
      .stopContainerStats([container.Id])
      .then((result) => console.log(result.message))
      .catch((error) =>
        console.error("Failed to stop container stats:", error)
      );
  });
}

// 주기적으로 컨테이너 상태를 체크하는 함수 시작
export function startPeriodicContainerCheck() {
  checkAndUpdateContainerMonitoring();
  containerCheckInterval = setInterval(
    checkAndUpdateContainerMonitoring,
    60000
  );
}

// 주기적으로 컨테이너 상태 체크를 중지하는 함수
export function stopPeriodicContainerCheck() {
  if (containerCheckInterval) {
    clearInterval(containerCheckInterval);
    containerCheckInterval = null;
  }
}

// 컨테이너 모니터링을 업데이트하는 함수
export async function checkAndUpdateContainerMonitoring() {
  const dockerStore = useDockerStore.getState();
  const currentContainers = new Set(
    dockerStore.dockerContainers.map((c) => c.Id)
  );

  // 실제 실행 중인 모든 컨테이너 가져오기
  const allRunningContainers = await window.electronAPI.getDockerContainers(
    true
  );
  const allRunningContainerIds = new Set(allRunningContainers.map((c) => c.Id));

  // 현재 Store에 있는 컨테이너 중에서 실행 중인 컨테이너만 필터링
  const monitoredRunningContainers = allRunningContainers.filter((container) =>
    currentContainers.has(container.Id)
  );

  // 새로운 컨테이너 모니터링 시작
  monitoredRunningContainers.forEach((container) => {
    if (!currentContainers.has(container.Id)) {
      window.electronAPI
        .startContainerStats([container.Id])
        .then((result) => console.log(result.message))
        .catch((error) =>
          console.error("Failed to start container stats:", error)
        );
    }
  });

  // 현재 Store에 있는 컨테이너 중 더 이상 실행 중이지 않은 컨테이너 모니터링 중지
  dockerStore.dockerContainers.forEach((container) => {
    if (!allRunningContainerIds.has(container.Id)) {
      window.electronAPI
        .stopContainerStats([container.Id])
        .then((result) => console.log(result.message))
        .catch((error) =>
          console.error("Failed to stop container stats:", error)
        );
    }
  });
}

// 컨테이너 상태 업데이트를 처리하는 함수
export function handleContainerStats(stats: ContainerStats) {
  globalStats.set(stats.container_id, stats);
}

// 컨테이너 상태 오류를 처리하는 함수
export function handleContainerStatsError(error: ContainerStatsError) {
  console.error("Container stats error:", error);
}
