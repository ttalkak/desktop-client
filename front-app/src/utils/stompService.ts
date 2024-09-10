import { Client, Message } from "@stomp/stompjs";
import { useAppStore } from "../stores/appStatusStore";
import { createAndStartContainers, handleBuildImage } from "./dockerUtils";
import { useDockerStore } from "../stores/appStatusStore";

interface SessionData {
  userId: number;
  maxCompute: number;
  availablePortStart: number;
  availablePortEnd: number;
}

interface ComputeConnectRequest {
  userId: string;
  computerType: string;
  usedCompute: number;
  usedMemory: number;
  usedCPU: number;
  deployments: number;
}

let client: Client | null = null;

const setWebsocketStatus = useAppStore.getState().setWebsocketStatus;
const addDockerImage = useDockerStore.getState().addDockerImage;
const addDockerContainer = useDockerStore.getState().addDockerContainer;

function getSessionData(): SessionData | null {
  const data = sessionStorage.getItem("userSettings");
  if (!data) return null;
  try {
    return JSON.parse(data) as SessionData;
  } catch {
    return null;
  }
}

function createStompClient(userId: string): Client {
  console.log("세션 userID", userId);
  return new Client({
    brokerURL: "wss://ttalkak.com/ws",
    connectHeaders: {
      // "X-USER-ID": userId,
      "X-USER-ID": "2",
    },
    // debug: (str) => {
    //   console.log(new Date(), str);
    // },
  });
}

async function waitForSessionData(
  maxAttempts: number = 10,
  interval: number = 1000
): Promise<SessionData> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const sessionData = getSessionData();
    if (sessionData && sessionData.userId) {
      return sessionData;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error("Failed to get session data after maximum attempts");
}

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

function setupClientHandlers(userId: string): void {
  if (!client) return;

  // WebSocket 연결 및 초기 설정
  client.onConnect = (frame) => {
    console.log("Connected: " + frame);
    setWebsocketStatus("connected");
    //연결이후 메세지 보냄
    sendComputeConnectMessage("2");

    client?.subscribe(
      // `/sub/compute-create/${userId}`,
      `/sub/compute-create/2`,
      async (message: Message) => {
        //도커 이벤트 핸들러 등록
        // registerDockerEventHandlers();
        const computes = JSON.parse(message.body);
        computes.forEach(async (compute: DeploymentCommand) => {
          if (compute.hasDockerImage) {
            //Docker 이미지가 이미 있을 경우=> 추가 작업필요
          } else {
            // 이미지가 없을 경우 빌드
            const inboundPort = 80;
            const outboundPort = 8080;
            const { success, dockerfilePath, contextPath } =
              await window.electronAPI.downloadAndUnzip(
                compute.sourceCodeLink,
                compute.branch,
                compute.dockerRootDirectory
              );
            if (success) {
              const { image } = await handleBuildImage(
                contextPath,
                dockerfilePath.toLowerCase()
              );
              console.log(`도커 파일 위치임 ${dockerfilePath}`);
              if (!image) {
                console.log(`이미지 생성 실패`);
              } else {
                addDockerImage(image);
                // createAndStartContainers([image], inboundPort, outboundPort);
                const containers = await createAndStartContainers(
                  [image],
                  inboundPort,
                  outboundPort
                );
                // 배열값
                containers.forEach((container) => {
                  addDockerContainer(container);
                });

                window.electronAPI
                  .runPgrok(
                    "34.47.108.121:2222",
                    `http://localhost:${8080}`,
                    compute.subdomainKey
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

  client.onStompError = (frame) => {
    console.error("Broker reported error: " + frame.headers["message"]);
    console.error("Additional details: " + frame.body);
    setWebsocketStatus("disconnected");
  };
}

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

export const disconnectWebSocket = (): void => {
  if (client) {
    client.deactivate();
    console.log("웹소켓 연결 종료");
    setWebsocketStatus("disconnected");
  }
};

const sendComputeConnectMessage = async (userId: string): Promise<void> => {
  try {
    const platform = await window.electronAPI.getOsType();
    const usedCompute = await window.electronAPI.getDockerContainers(true);
    const usedCPU = await window.electronAPI.getCpuUsage();
    const images = await window.electronAPI.getDockerImages();
    const totalSize = images.reduce((acc, image) => acc + (image.Size || 0), 0);
    const deployCompute = await window.electronAPI.getDockerContainers(false);

    const createComputeRequest: ComputeConnectRequest = {
      // userId: userId,
      userId: "2",
      computerType: platform,
      usedCompute: usedCompute.length || 0,
      usedMemory: totalSize || 0,
      usedCPU: usedCPU || 0,
      deployments: deployCompute.length || 0,
    };

    client?.publish({
      destination: "/pub/compute/connect",
      body: JSON.stringify(createComputeRequest),
    });
    console.log("Compute connect message sent:", createComputeRequest);
  } catch (error) {
    console.error("Error sending compute connect message:", error);
  }
  sendContainersHealthCheck();
};

export function getStompClient(): Client | null {
  return client;
}

export const sendDockerHealthCheck = () => {};

export const sendContainersHealthCheck = () => {
  console.log("stats 출력 테스트, 내용 확인 필요");

  const containerIds = [
    "176c669bb15ad24ff3cad031ae51dc6c38300011b3bccb6db4d4f05389cde024",
    // 추가적인 컨테이너 ID
  ];

  containerIds.forEach((containerId) => {
    window.electronAPI.monitorSingleContainer(containerId).then((stats) => {
      console.log(`Monitoring CPU usage for container ${containerId} started`);

      // 필요한 값 파싱
      const parsedStats = parseContainerStats(stats);
      console.log(parsedStats);

      // WebSocket을 통해 파싱된 컨테이너 상태 전송
      //   client?.publish({
      //     destination: "/pub/container/stats",
      //     body: JSON.stringify({
      //       containerId,
      //       ...parsedStats,
      //     }),
      //   });
      // })
      // .catch((error) => {
      //   console.error(`Error monitoring container ${containerId}:`, error);
      // });
    });
  });
};

// 필요한 값을 파싱하는 함수
function parseContainerStats(stats: ContainerStats) {
  // CPU 사용률 계산
  console.log(stats);
  const cpuDelta =
    stats.cpu_stats.cpu_usage.total_usage -
    stats.precpu_stats.cpu_usage.total_usage;
  const systemCpuDelta =
    stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
  const numberOfCpus = stats.cpu_stats.online_cpus;
  const cpuUsage = (cpuDelta / systemCpuDelta) * numberOfCpus * 100;

  // 디스크 I/O 읽기 및 쓰기
  const blkioStats = stats.blkio_stats.io_service_bytes_recursive;
  const diskRead = blkioStats
    .filter((io: any) => io.op === "Read")
    .reduce((acc: number, io: any) => acc + io.value, 0);
  const diskWrite = blkioStats
    .filter((io: any) => io.op === "Write")
    .reduce((acc: number, io: any) => acc + io.value, 0);

  // 컨테이너의 현재 상태
  const status = stats.state.Status;

  return {
    cpuUsage: cpuUsage.toFixed(2), // 소수점 2자리까지
    diskRead,
    diskWrite,
    status,
  };
}

// const subscribeToDockerEvents = () => {
//   client.subscribe("/topic/docker/updates", (message: Message) => {
//     const dockerData = JSON.parse(message.body);
//     console.log("Received Docker data:", dockerData);
//     useDockerStore.getState().setDockerImages(dockerData.images);
//     useDockerStore.getState().setDockerContainers(dockerData.containers);
//   });

//   client.subscribe("/topic/docker/events", (message: Message) => {
//     const dockerEvent = JSON.parse(message.body);
//     console.log("Received Docker event:", dockerEvent);
//   });
// };

// const subscribeToDockerCommands = () => {
//   client.subscribe("/pub/compute/command", handleDockerCommand);
// };

// const handleDockerCommand = async (message: Message) => {
//   const { command, params } = JSON.parse(message.body);
//   console.log("Received Docker command:", command, "with params:", params);

//   switch (command) {
//     case "DEPLOY":
//       await handleDeployCommand(params);
//       break;
//     case "CONTAINER_ACTION":
//       await handleContainerCommand(params);
//       break;
//     case "IMAGE_ACTION":
//       await handleImageCommand(params);
//       break;
//     case "SHUTDOWN":
//       await handleShutdownCommand();
//       break;
//     default:
//       console.error("Unknown command:", command);
//   }
// };

//deploycommand 조작
// const handleDeployCommand = async ({
//   hasDockerImage,
//   containerName,
//   inboundPort,
//   outboundPort,
//   sourceCodeLink,
//   dockerRootDirectory,
// }: DeploymentCommand) => {
//   try {
//     const setServiceStatus = useAppStore.getState().setServiceStatus;
//     setServiceStatus("loading");

//     const downloadResult = await window.electronAPI.downloadAndUnzip(
//       sourceCodeLink
//     );
//     if (!downloadResult.success) {
//       throw new Error(
//         `Failed to download and unzip the repository: ${sourceCodeLink}`
//       );
//     }

//     const extractedPath = downloadResult;
//     if (!extractedPath) {
//       throw new Error(`downloaded.. not found in ${extractedPath}`);
//     }
//     const fullDockerfilePath = window.electronAPI.joinPath(
//       extractedPath,
//       dockerRootDirectory
//     );

//     const dockerfilePath = await window.electronAPI.findDockerfile(
//       fullDockerfilePath
//     );
//     if (!dockerfilePath) {
//       throw new Error(`Dockerfile not found in ${fullDockerfilePath}`);
//     }

//     const buildResult = await window.electronAPI.buildDockerImage(
//       dockerfilePath
//     );

//     // buildResult.image가 undefined일 가능성을 처리
//     if (!buildResult.status || !buildResult.image) {
//       throw new Error(`Failed to build Docker image`);
//     }

//     const containerOptions = await window.electronAPI.createContainerOptions(
//       buildResult.image.RepoTags[0], // 이미지 ID 사용
//       containerName,
//       inboundPort,
//       outboundPort
//     );
//     const startResult = await window.electronAPI.createAndStartContainer(
//       containerOptions
//     );
//     if (!startResult.success) {
//       throw new Error(`Failed to start Docker container: ${containerName}`);
//     }

//     setServiceStatus("running");
//   } catch (error) {
//     console.error("Error in handleDeployCommand:", error);
//     useAppStore.getState().setServiceStatus("stopped");
//   }
// };

// const handleContainerCommand = async ({
//   action,
//   containerId,
// }: {
//   action: string;
//   containerId: string;
// }) => {
//   switch (action) {
//     case "START":
//       await window.electronAPI.startContainer(containerId);
//       break;
//     case "STOP":
//       await window.electronAPI.stopContainer(containerId);
//       break;
//     case "REMOVE":
//       await window.electronAPI.removeContainer(containerId);
//       useDockerStore.getState().removeDockerContainer(containerId);
//       break;
//     default:
//       console.error("Unknown container action:", action);
//   }
// };

// const handleImageCommand = async ({
//   action,
//   imageId,
// }: {
//   action: "REMOVE"; // 필요한 다른 액션이 있다면 추가
//   imageId: string;
// }) => {
//   switch (action) {
//     case "REMOVE":
//       await window.electronAPI.removeImage(imageId);
//       useDockerStore.getState().removeDockerImage(imageId);
//       break;
//     default:
//       console.error("Unknown image action:", action);
//   }
// };

// const handleShutdownCommand = async () => {
//   try {
//     const setServiceStatus = useAppStore.getState().setServiceStatus;
//     setServiceStatus("stopped");

//     const containers = await window.electronAPI.getDockerContainers(true);
//     for (const container of containers) {
//       if (container.State.Running) {
//         await window.electronAPI.stopContainer(container.Id);
//       }
//       await window.electronAPI.removeContainer(container.Id);
//     }

//     const images = await window.electronAPI.getDockerImages();
//     for (const image of images) {
//       await window.electronAPI.removeImage(image.Id);
//     }

//     setServiceStatus("stopped");
//     useDockerStore.getState().clearDockerContainers();
//     useDockerStore.getState().clearDockerImages();

//     console.log("All Docker services have been shut down");
//   } catch (error) {
//     console.error("Error during shutdown:", error);
//     useAppStore.getState().setServiceStatus("stopped");
//   }
// };
