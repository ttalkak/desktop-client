import { Client, Message } from "@stomp/stompjs";
import { useAppStore, useDockerStore } from "../stores/appStatusStore";
import { createAndStartContainer, handleBuildImage } from "./dockerUtils";
import { registerDockerEventHandlers } from "./dockerEventListner";
import { useDeploymentStore } from "../stores/deploymentStore";

// 세션 데이터와 관련된 인터페이스 정의
interface SessionData {
  userId: number;
  maxCompute: number;
  availablePortStart: number;
  availablePortEnd: number;
}

interface Deployment {
  deploymentId: number;
  status: string;
  useMemory: number;
  useCPU: number;
  runningTime: number;
  diskRead: number;
  diskWrite: number;
}
// Compute 연결 요청 관련 인터페이스 정의
interface ComputeConnectRequest {
  userId: string;
  computerType: string;
  usedCompute: number;
  usedMemory: number;
  usedCPU: number;
  deployments: Deployment[]; // 배열로 수정
}

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

export let client: Client; // STOMP 클라이언트를 저장하는 변수

// Zustand를 통해 관리하는 상태 가져오기
const setWebsocketStatus = useAppStore.getState().setWebsocketStatus;
const addDockerImage = useDockerStore.getState().addDockerImage;
const addDockerContainer = useDockerStore.getState().addDockerContainer;

let containerCheckInterval: NodeJS.Timeout | null = null; // 컨테이너 체크 주기를 위한 변수

// 전역 상태 저장소 추가
const globalStats = new Map<string, ContainerStats>();

// 세션 데이터를 세션 스토리지에서 가져오는 함수
function getSessionData(): SessionData | null {
  const data = sessionStorage.getItem("userSettings");
  if (!data) return null;
  try {
    return JSON.parse(data) as SessionData;
  } catch {
    return null;
  }
}

// STOMP 클라이언트를 생성하는 함수
function createStompClient(userId: string): Client {
  console.log("세션 userID", userId);
  return new Client({
    brokerURL: "wss://ttalkak.com/ws", // WebSocket URL
    connectHeaders: {
      "X-USER-ID": "2", //수정하기
    },
  });
}

// 세션 데이터가 로드될 때까지 기다리는 함수
async function waitForSessionData(
  maxAttempts: number = 10,
  interval: number = 1000
): Promise<SessionData> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const sessionData = getSessionData();
    if (sessionData && sessionData.userId) {
      return sessionData;
    }
    await new Promise((resolve) => setTimeout(resolve, interval)); // 대기
  }
  throw new Error("Failed to get session data after maximum attempts");
}

// STOMP 클라이언트를 초기화하는 함수
export async function initializeStompClient(): Promise<Client> {
  try {
    const sessionData = await waitForSessionData();
    if (!client) {
      client = createStompClient(sessionData.userId.toString());
      setupClientHandlers(sessionData.userId.toString());
    }
    return client;
  } catch (error) {
    console.error("Failed to initialize STOMP client:", error);
    throw error;
  }
}

// STOMP 클라이언트에 이벤트 핸들러를 설정하는 함수-----------------------------
function setupClientHandlers(userId: string): void {
  if (!client) return;

  client.onConnect = (frame) => {
    console.log("Connected: " + frame);
    setWebsocketStatus("connected");
    // 1. pub/compute/connect 웹소켓최초 연결시 메시지 전송
    sendComputeConnectMessage("2");

    startSendingCurrentState(); // 현재 상태 전송 시작
    //sub/compute-create/{userId} 컴퓨트 서버 구독 시작
    client.subscribe(`/sub/compute-create/2`, async (message: Message) => {
      const computes = JSON.parse(message.body);
      console.log(computes);
      computes.forEach(async (compute: DeploymentCommand) => {
        registerDockerEventHandlers(client, "2", compute.deploymentId); // Docker 이벤트 핸들러
        if (compute.hasDockerImage) {
          // Docker 이미지가 이미 있을 경우 => 추가 작업 필요
        } else {
          const { success, dockerfilePath, contextPath } =
            await window.electronAPI.downloadAndUnzip(
              compute.sourceCodeLink,
              compute.dockerRootDirectory
            );
          if (success) {
            const { image } = await handleBuildImage(
              contextPath,
              dockerfilePath.toLowerCase(),
              compute.subdomainName
            );
            console.log(`도커 파일 위치임 ${dockerfilePath}`);
            if (!image) {
              console.log(`이미지 생성 실패`);
              // sendDeploymentStatus("image_creation_failed", compute);
            } else {
              addDockerImage(image);
              // sendDeploymentStatus("image_created", compute, {
              //   imageId: image.Id,
              // });
              const containerId = await createAndStartContainer(
                image,
                80,
                8080
                // compute.inboundPort ?? 80,
                // compute.outboundPort ?? 8080
              );
              window.electronAPI.startContainerStats([containerId]);
              // sendDeploymentStatus("container_created", compute, {
              //   containerId: containerId,
              // });
              // Use the deployment store to add the container to the deployment
              useDeploymentStore
                .getState()
                .addDeployment(compute.deploymentId, containerId);

              startContainerStatsMonitoring();

              // sub/compute-update/{userId} 업데이트요청 구독
              client?.subscribe(`/sub/compute-update/2`, async (message) => {
                try {
                  // 수신한 메시지 처리 로직 작성
                  const { deploymentId, command } = JSON.parse(message.body);
                  console.log("Received updateCommand:", {
                    deploymentId,
                    command,
                  });

                  // handleContainerCommand 함수를 호출하여 명령을 처리
                  handleContainerCommand(deploymentId, command);
                } catch (error) {
                  console.error(
                    "Error processing compute update message:",
                    error
                  );
                }
              });
              // pgrok 시작
              console.log(compute);
              window.electronAPI
                .runPgrok(
                  "pgrok.ttalkak.com:2222",
                  `http://localhost:8080`, //나중에 바꿀거임
                  compute.subdomainKey,
                  compute.deploymentId,
                  compute.subdomainName
                )
                .then((message) => {
                  console.log(`pgrok started: ${message}`);
                  // sendDeploymentStatus("pgrok_started", compute, {
                  //   pgrokMessage: message,
                  // });
                })
                .catch((error) => {
                  alert(`Failed to start pgrok: ${error}`);
                  // sendDeploymentStatus("pgrok_failed", compute, {
                  //   error: error.toString(),
                  // });
                });
            }
          }
        }
      });
    });
  };

  client.onStompError = (frame) => {
    console.error("Broker reported error: " + frame.headers["message"]);
    console.error("Additional details: " + frame.body);
    setWebsocketStatus("disconnected");
  };

  client.onDisconnect = () => {
    console.log("Disconnected");
    stopContainerStatsMonitoring(); // 연결 해제 시 컨테이너 모니터링 중지
  };
}

// WebSocket 연결 함수
export const connectWebSocket = async (): Promise<void> => {
  try {
    await initializeStompClient();
    client?.activate();
    console.log("웹소켓 연결 시도 중");
    setWebsocketStatus("connecting");
  } catch (error) {
    console.error("Failed to connect WebSocket:", error);
    setWebsocketStatus("disconnected");
  }
};

// WebSocket 연결 해제 함수
export const disconnectWebSocket = (): void => {
  if (client) {
    client.deactivate();
    console.log("웹소켓 연결 종료");
    setWebsocketStatus("disconnected");
    stopContainerStatsMonitoring();
  }
};

//1. pub/compute/connect 웹소켓 최초 연결시
const sendComputeConnectMessage = async (userId: string): Promise<void> => {
  try {
    const platform = await window.electronAPI.getOsType();
    const usedCPU = await window.electronAPI.getCpuUsage();
    const images = await window.electronAPI.getDockerImages();
    const usedCompute = useDockerStore.getState().dockerContainers.length;
    const totalSize = images.reduce((acc, image) => acc + (image.Size || 0), 0);
    const runningContainers = await getRunningContainers();
    const containerMemoryUsage = await getTotalMemoryUsage(runningContainers);
    const totalUsedMemory = totalSize + containerMemoryUsage;
    const deployments: Deployment[] = [];
    for (const [containerId, stats] of globalStats.entries()) {
      const deploymentId = useDeploymentStore
        .getState()
        .getDeploymentByContainer(containerId);
      if (deploymentId !== undefined) {
        deployments.push({
          deploymentId: deploymentId,
          status: runningContainers.some((c) => c.Id === containerId)
            ? "RUNNING"
            : "STOPPED",
          useMemory: stats.memory_usage,
          useCPU: stats.cpu_usage,
          runningTime: stats.running_time,
          diskRead: stats.blkio_read,
          diskWrite: stats.blkio_write,
        });
      }
    }

    const createComputeRequest: ComputeConnectRequest = {
      userId: "2",
      computerType: platform,
      usedCompute: usedCompute || 0,
      usedMemory: totalUsedMemory || 0,
      usedCPU: usedCPU || 0,
      deployments: deployments, // 배열로 전달
    };

    client?.publish({
      destination: "/pub/compute/connect",
      body: JSON.stringify(createComputeRequest),
    });
    console.log("Compute connect message sent:", createComputeRequest);
  } catch (error) {
    console.error("Error sending compute connect message:", error);
  }
};

// 배포 상태 메시지를 전송하는 함수//수정예정=> 임의로 작성해둠
// const sendDeploymentStatus = (
//   status: string,
//   compute: DeploymentCommand,
//   details?: any
// ): void => {
//   client?.publish({
//     destination: "/pub/compute/deployment-status",
//     body: JSON.stringify({
//       status,
//       compute,
//       details,
//       timestamp: new Date().toISOString(),
//     }),
//   });
// };

// compute-update 관련 handleCommand 함수: 주어진 command와 deploymentId를 처리
function handleContainerCommand(deploymentId: number, command: string) {
  const containerId = useDeploymentStore
    .getState()
    .getContainerByDeployment(deploymentId);

  if (!containerId) {
    console.error(`No container found for deploymentId: ${deploymentId}`);
    return;
  }

  switch (command) {
    case "START":
      window.electronAPI.startContainer(containerId);
      break;
    case "RESTART":
      window.electronAPI.startContainer(containerId);
      break;
    case "DELETE":
      window.electronAPI.removeContainer(containerId);
      break;
    case "STOP":
      window.electronAPI.stopContainer(containerId);
      break;
    default:
      console.log(`Unknown command: ${command}`);
  }
}

// 실행 중인 컨테이너 목록을 가져오는 함수
const getRunningContainers = async () => {
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
async function getTotalMemoryUsage(
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

// PING : "/pub/compute/ping"  현재 상태를 WebSocket을 통해 전송
const sendCurrentState = async () => {
  try {
    const usedCPU = await window.electronAPI.getCpuUsage();
    const images = await window.electronAPI.getDockerImages();
    const totalSize = images.reduce((acc, image) => acc + (image.Size || 0), 0);
    const runningContainers = await getRunningContainers();
    const containerMemoryUsage = await getTotalMemoryUsage(runningContainers);
    const totalUsedMemory = totalSize + containerMemoryUsage;

    const deployments = [];
    for (const [containerId, stats] of globalStats.entries()) {
      const deploymentId = useDeploymentStore
        .getState()
        .getDeploymentByContainer(containerId);
      if (deploymentId !== undefined) {
        deployments.push({
          deploymentId: deploymentId,
          status: runningContainers.some((c) => c.Id === containerId)
            ? "RUNNING"
            : "STOPPED",
          useMemory: stats.memory_usage,
          useCPU: stats.cpu_usage,
          runningTime: stats.running_time,
          diskRead: stats.blkio_read,
          diskWrite: stats.blkio_write,
        });
      }
    }

    const currentState = {
      userId: "2",
      computerType: await window.electronAPI.getOsType(),
      usedCompute: runningContainers.length,
      usedMemory: totalUsedMemory,
      usedCPU: usedCPU,
      deployments: deployments,
    };

    client?.publish({
      destination: "/pub/compute/ping",
      body: JSON.stringify(currentState),
    });
    console.log("Current state sent:", currentState);
  } catch (error) {
    console.error("Error sending current state:", error);
  }
};

let intervalId: NodeJS.Timeout | null = null; // 상태 전송 주기를 관리하는 변수

// 주기적으로 현재 상태를 전송하기 시작하는 함수
const startSendingCurrentState = () => {
  console.log("Starting to send current state periodically...");
  sendCurrentState();
  intervalId = setInterval(() => {
    console.log("Sending current state...");
    sendCurrentState();
  }, 10000); // 60초마다 전송으로 수정하기 60000 현재 10초 간격으로 전송
};

// 주기적으로 현재 상태 전송을 중지하는 함수
export const stopSendingCurrentState = () => {
  if (intervalId) {
    clearInterval(intervalId);
    console.log("Stopped sending current state.");
    intervalId = null;
  }
};

// 주기적으로 컨테이너 상태를 체크하는 함수 시작
function startPeriodicContainerCheck() {
  checkAndUpdateContainerMonitoring();
  containerCheckInterval = setInterval(
    checkAndUpdateContainerMonitoring,
    60000
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
async function checkAndUpdateContainerMonitoring() {
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

// 컨테이너 상태 모니터링을 시작하는 함수
function startContainerStatsMonitoring() {
  window.electronAPI.onContainerStatsUpdate(handleContainerStats);
  window.electronAPI.onContainerStatsError(handleContainerStatsError);
  startPeriodicContainerCheck();
}

// 컨테이너 상태 모니터링을 중지하는 함수
function stopContainerStatsMonitoring() {
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

// 컨테이너 상태 업데이트를 처리하는 함수
function handleContainerStats(stats: ContainerStats) {
  globalStats.set(stats.container_id, stats);
  // sendStatsToWebSocket(stats);
}

// 컨테이너 상태 오류를 처리하는 함수
function handleContainerStatsError(error: ContainerStatsError) {
  console.error("Container stats error:", error);
}

// 컨테이너 상태를 WebSocket으로 전송하는 함수
// function sendStatsToWebSocket(stats: ContainerStats) {
//   if (client && client.connected) {
//     client.publish({
//       destination: `/pub/compute/${stats.container_id}/stats`,
//       headers: { "X-USER-ID": "2" },
//       body: JSON.stringify(stats),
//     });
//   }
// }

// STOMP 클라이언트를 반환하는 함수
export function getStompClient(): Client | null {
  return client;
}

// 클린업 함수: 컨테이너 모니터링과 상태 전송을 중지
export function cleanup() {
  stopContainerStatsMonitoring();
  stopSendingCurrentState();
}
