import { Message } from "@stomp/stompjs";
import { useAppStore, useDockerStore } from "../stores/appStatusStore";
import { createAndStartContainer, handleBuildImage } from "./dockerUtils";
import { registerDockerEventHandlers } from "./dockerEventListner";
import { useDeploymentStore } from "../stores/deploymentStore";
import {
  client,
  initializeStompClient,
  waitForSessionData,
} from "./stompClientUtils";
import { sendPaymentInfo } from "./paymentUtils";
import { sendInstanceUpdate } from "./sendUpdateUtils";

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

// Zustand를 통해 관리하는 상태 가져오기
const setWebsocketStatus = useAppStore.getState().setWebsocketStatus;
const addDockerImage = useDockerStore.getState().addDockerImage;

let containerCheckInterval: NodeJS.Timeout | null = null; // 컨테이너 체크 주기를 위한 변수

// 전역 상태 저장소 추가
const globalStats = new Map<string, ContainerStats>();

// STOMP 클라이언트 실행 내역
function setupClientHandlers(userId: string): void {
  client.onConnect = (frame) => {
    console.log("Connected: " + frame);

    setWebsocketStatus("connected");
    // 1. pub/compute/connect 웹소켓 최초 연결시 전송=>userId로 변경하기
    sendComputeConnectMessage(userId);
    // 2. 결제 정보 전송 시작=>userId로 변경하기
    sendPaymentInfo(userId);
    //도커 이벤트 감지 시작
    window.electronAPI.sendDockerEventRequest();

    //sub/compute-create/{userId} 컴퓨트 서버 구독 시작
    client.subscribe(
      `/sub/compute-create/${userId}`,
      async (message: Message) => {
        const computes = JSON.parse(message.body);
        console.log(computes);
        computes.forEach(async (compute: DeploymentCommand) => {
          //db있는 경우 먼저 설치 및 실행
          if (compute.databases && compute.databases.length > 0) {
            for (const dbInfo of compute.databases) {
              const dbSetupResult = await window.electronAPI.setupDatabase(
                dbInfo
              );

              if (dbSetupResult.success) {
                console.log(
                  `Database container started with ID: ${dbSetupResult.containerId}`
                );
              } else {
                console.error(
                  `Failed to setup database: ${dbSetupResult.message}`
                );
              }
            }
          }

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
              } else {
                addDockerImage(image);

                const containerId = await createAndStartContainer(
                  image,
                  compute.inboundPort || 80,
                  compute.outboundPort || 8080
                );
                sendInstanceUpdate(
                  userId,
                  compute.deploymentId,
                  "RUNNING",
                  "",
                  compute.outboundPort
                );
                //deployment와 containerId 저장
                useDeploymentStore
                  .getState()
                  .addDeployment(compute.deploymentId, containerId);
                //컨테이너 stats 감지 시작
                window.electronAPI.startContainerStats([containerId]);
                //
                startContainerStatsMonitoring();
                // Docker 이벤트 핸들러 등록
                registerDockerEventHandlers(userId, compute.deploymentId);
                // sub/compute-update/{userId} 업데이트요청 구독
                client?.subscribe(
                  `/sub/compute-update/${userId}`,
                  async (message) => {
                    // 수신한 메시지 처리 로직 작성
                    try {
                      const { deploymentId, command } = JSON.parse(
                        message.body
                      );
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
                  }
                );

                console.log(compute);

                window.electronAPI // pgrok 시작
                  .runPgrok(
                    "pgrok.ttalkak.com:2222",
                    `http://localhost:${compute.outboundPort}`, //바꿀예정
                    compute.subdomainKey,
                    compute.deploymentId,
                    compute.subdomainName
                  )
                  .then((message) => {
                    console.log(`pgrok started: ${message}`);
                  })
                  .catch((error) => {
                    alert(`Failed to start pgrok: ${error}`);
                  });

                startSendingCurrentState(userId); //현재 배포 상태 PING 시작
              }
            }
          }
        });
      }
    );
  };

  client.onStompError = (frame) => {
    console.error("Broker reported error: " + frame.headers["message"]);
    console.error("Additional details: " + frame.body);
    setWebsocketStatus("disconnected");
  };

  client.onDisconnect = () => {
    console.log("Disconnected");
    setWebsocketStatus("disconnected");
    stopContainerStatsMonitoring(); // 컨테이너 모니터링 해제
    stopSendingCurrentState(); //ping 전송 해제
  };
}

// WebSocket 연결 함수/클라이언트 초기화
export const connectWebSocket = async (): Promise<void> => {
  const sessionData = await waitForSessionData();
  const userId = sessionData.userId.toString();
  try {
    if (!client) {
      await initializeStompClient();
    }
    if (client && userId) {
      client.activate();
      console.log("웹소켓 연결 시도 중");
      setWebsocketStatus("connecting");
      setupClientHandlers(userId);
    } else {
      throw new Error("STOMP client initialization failed");
    }
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
    stopSendingCurrentState();
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
      userId: userId,
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
      window.electronAPI.stopPgrok(deploymentId); //정지시 pgrok 로그도 정지
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
const sendCurrentState = async (userId: string) => {
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
      userId: userId,
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
const startSendingCurrentState = (userId: string) => {
  console.log("Starting to send current state periodically...");
  sendCurrentState(userId);
  intervalId = setInterval(() => {
    console.log("Sending current state...");
    sendCurrentState(userId);
  }, 60000); // 60초마다 전송으로 수정하기 60000 현재 10초 간격으로 전송
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

// 컨테이너 상태 업데이트를 처리하는 함수
function handleContainerStats(stats: ContainerStats) {
  globalStats.set(stats.container_id, stats);
}

// 컨테이너 상태 오류를 처리하는 함수
function handleContainerStatsError(error: ContainerStatsError) {
  console.error("Container stats error:", error);
}

// 클린업 함수: 컨테이너 모니터링과 상태 전송을 중지
export function cleanup() {
  stopContainerStatsMonitoring();
  stopSendingCurrentState();
}
