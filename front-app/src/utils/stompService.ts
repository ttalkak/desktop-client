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

export let client: Client | null = null;

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
                sendDeploymentStatus("image_creation_failed", compute); //이미지생성실패 웹소켓
              } else {
                addDockerImage(image);
                sendDeploymentStatus("image_created", compute, {
                  //이미지 생성 성공 소켓
                  imageId: image.Id,
                });
                const containers = await createAndStartContainers(
                  [image],
                  inboundPort,
                  outboundPort
                );
                // 배열값
                containers.forEach((container) => {
                  addDockerContainer(container);
                  // 컨테이너가 성공적으로 생성 및 실행된 이후 stats를 주기적으로 가져오기 시작
                  window.electronAPI.startContainerStats(container.Id);
                  sendDeploymentStatus("container_created", compute, {
                    containerId: container.Id,
                  }); //생성 성공 ping
                });

                startSendingCurrentState(); //1분 주기로 컨테이너,이미지, cpu 사용률, 현재 실행중인 컨테이너 보내줌

                window.electronAPI
                  .runPgrok(
                    "34.47.108.121:2222",
                    `http://localhost:${8080}`,
                    compute.subdomainKey
                  )
                  .then((message) => {
                    console.log(`pgrok started: ${message}`);
                    sendDeploymentStatus("pgrok_started", compute, {
                      pgrokMessage: message,
                    });
                  })
                  .catch((error) => {
                    alert(`Failed to start pgrok: ${error}`);
                    sendDeploymentStatus("pgrok_failed", compute, {
                      error: error.toString(),
                    });
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

//웹소켓 오픈시 처음에 보내는 코드
const sendComputeConnectMessage = async (userId: string): Promise<void> => {
  try {
    const platform = await window.electronAPI.getOsType();
    const usedCompute = await getRunningContainers(); //할당받은 컨테이너 중 실제 돌아가는 컨테이너
    // const usedCompute = await window.electronAPI.getDockerContainers(true);
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
};

//빌드 상태 전달 컨테이너별
const sendDeploymentStatus = (
  status: string,
  compute: DeploymentCommand,
  details?: any
): void => {
  client?.publish({
    destination: "/pub/compute/deployment-status", //변경예정
    body: JSON.stringify({
      status,
      compute,
      details,
      timestamp: new Date().toISOString(),
    }),
  });
};

//나에게 할당 된 컨테이너중 실제로 작동중인 컨테이너 목록
const getRunningContainers = async () => {
  try {
    const allContainers = await window.electronAPI.getDockerContainers(true);
    const dockerStore = useDockerStore.getState();

    // dockerStore에 있는 컨테이너 ID 목록
    const storeContainerIds = new Set(
      dockerStore.dockerContainers.map((container) => container.Id)
    );

    // allContainers에서 dockerStore에 있는 ID와 일치하고 실행 중인 컨테이너만 필터링
    const runningContainers = allContainers.filter((container) =>
      storeContainerIds.has(container.Id)
    );

    return runningContainers;
  } catch (error) {
    console.error("Error fetching running containers:", error);
    throw error;
  }
};

// 현재 상태를 가져와서 전송하는 함수
const sendCurrentState = async () => {
  try {
    const { dockerImages, dockerContainers } = useDockerStore.getState();
    const usedCPU = await window.electronAPI.getCpuUsage();
    const runningContainers = await getRunningContainers();
    const currentState = {
      containerCount: dockerContainers.length,
      imageCount: dockerImages.length,
      cpuUsage: usedCPU,
      runningContainers: runningContainers.map((container) => ({
        Id: container.Id,
      })),
      runningContainersCount: runningContainers.length,
    };

    client?.publish({
      destination: "/pub/compute/state",
      body: JSON.stringify(currentState),
    });
    console.log("Current state sent:", currentState);
  } catch (error) {
    console.error("Error sending current state:", error);
  }
};
// 1분마다 현재상태를 전송하는 함수
const startSendingCurrentState = () => {
  console.log("Starting to send current state periodically...");
  sendCurrentState(); // 즉시 호출
  setInterval(() => {
    console.log("Sending current state...");
    sendCurrentState();
  }, 60000); // 1분 (60,000ms)마다 호출
};

export function getStompClient(): Client | null {
  return client;
}
