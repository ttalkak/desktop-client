import { Message } from "@stomp/stompjs";
import { useAppStore, useDockerStore } from "../stores/appStatusStore";
import { useDeploymentStore } from "../stores/deploymentStore";
import { useDeploymentDetailsStore } from "../stores/deploymentDetailsStore";
import {
  createAndStartContainer,
  handleBuildImage,
} from "../utils/dockerUtils";
import {
  client,
  initializeStompClient,
  waitForSessionData,
} from "../utils/stompClientUtils";
import { sendPaymentInfo } from "../utils/paymentUtils";
import { sendInstanceUpdate } from "../utils/sendUpdateUtils";
import { handleContainerCommand } from "../utils/containerCommandHandler";
import {
  startContainerStatsMonitoring,
  startSendingCurrentState,
  stopContainerStatsMonitoring,
  stopSendingCurrentState,
} from "../utils/healthCheckPingUtils";
import { globalStats } from "../utils/healthCheckPingUtils";
import {
  getRunningContainers,
  getTotalMemoryUsage,
} from "../utils/healthCheckPingUtils";

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

// Zustand를 통해 관리하는 상태 가져오기
const setWebsocketStatus = useAppStore.getState().setWebsocketStatus;
const addDockerImage = useDockerStore.getState().addDockerImage;
const setServiceStatus = useAppStore.getState().setServiceStatus;
const setRepository = useDeploymentDetailsStore.getState().setRepoUrl;
const setDeploymentDetails =
  useDeploymentDetailsStore.getState().setDeploymentDetails;

// STOMP 클라이언트 실행 내역
function setupClientHandlers(userId: string): void {
  client.onConnect = (frame) => {
    console.log("Connected: " + frame);

    setWebsocketStatus("connected");
    // 1. pub/compute/connect 웹소켓 최초 연결시 전송=>userId로 변경하기
    sendComputeConnectMessage(userId);
    // 2. 결제 정보 전송 시작=>userId로 변경하기
    sendPaymentInfo(userId);

    setServiceStatus("running");
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
            const { success, dockerfilePath, contextPath, message } =
              await window.electronAPI.downloadAndUnzip(
                compute.sourceCodeLink,
                compute.dockerRootDirectory,
                compute.script
              );

            if (!success) {
              console.log(`도커파일 찾기 실패시`, message);
              // 도커 파일 에러
              sendInstanceUpdate(
                userId,
                compute.deploymentId,
                "DOCKER_FILE_ERROR",
                compute.outboundPort,
                ""
              );
            }
            if (success) {
              const { image, success } = await handleBuildImage(
                contextPath,
                dockerfilePath,
                compute.subdomainName
              );
              if (!success) {
                // 도커 파일 에러
                sendInstanceUpdate(
                  userId,
                  compute.deploymentId,
                  "DOCKER_FILE_ERROR",
                  compute.outboundPort,
                  ""
                );
              }
              if (image) {
                //성공한 경우
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
                  compute.outboundPort,
                  ""
                );
                //deployment와 containerId 저장
                useDeploymentStore
                  .getState()
                  .addDeployment(compute.deploymentId, containerId);

                //deploymentId 기준 깃허브 링크 저장
                setRepository(compute.deploymentId, compute.sourceCodeLink);
                setDeploymentDetails(compute.deploymentId, compute);
                //컨테이너 stats 감지 시작
                window.electronAPI.startContainerStats([containerId]);
                //로그 모니터링 시작
                startContainerStatsMonitoring();
                window.electronAPI.startLogStream(
                  containerId,
                  compute.deploymentId
                );

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
                      handleContainerCommand(deploymentId, command, userId);
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
              }
            }
          }
        });
      }
    );
  };

  startSendingCurrentState(userId); //현재 배포 상태 PING 시작

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

//2. PING : "/pub/compute/ping"  현재 상태를 WebSocket을 통해 주기적으로 전송
export const sendCurrentState = async (userId: string) => {
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
