import { Client, Message } from "@stomp/stompjs";
import { useAppStore } from "../stores/appStatusStore";
import { createAndStartContainers, handleBuildImage } from "./dockerUtils";
import { useDockerStore } from "../stores/appStatusStore";

const sessionData = JSON.parse(sessionStorage.getItem("userSettings") || "{}");
const setWebsocketStatus = useAppStore.getState().setWebsocketStatus;
//상태 셋팅 => 최초로그인시 셋팅 예정
// const setDockerImages = useDockerStore.getState().setDockerImages;
// const setDockerContainers = useDockerStore.getState().setDockerContainers;

const addDockerImage = useDockerStore.getState().addDockerImage;
const addDockerContainer = useDockerStore.getState().addDockerContainer;

// const userId = sessionData.userId;
const userId = 2;

// STOMP 클라이언트 설정
export const client = new Client({
  brokerURL: "wss://ttalkak.com/ws",
  connectHeaders: {
    "X-USER-ID": userId.toString(),
  },
  // debug: (str) => {
  //   console.log(new Date(), str);
  // },
});

// WebSocket 연결 및 초기 설정
client.onConnect = (frame) => {
  console.log("Connected: " + frame);
  setWebsocketStatus("connected");
  //연결이후 메세지 보냄
  sendComputeConnectMessage();

  client.subscribe(
    `/sub/compute-create/${userId}`,
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

      // if (response.success) {
      //   subscribeToDockerEvents();
      //   subscribeToDockerCommands();
      // } else {
      //   console.error("Error in backend response:", response.error);
      // }
    }
  );
};

client.onStompError = (frame) => {
  console.error("Broker reported error: " + frame.headers["message"]);
  console.error("Additional details: " + frame.body);
  setWebsocketStatus("disconnected");
};

export const connectWebSocket = () => {
  client.activate();
  console.log("웹소켓 연결 시도 중");
  setWebsocketStatus("connecting");
};

export const disconnectWebSocket = () => {
  client.deactivate();
  console.log("웹소켓 연결 종료");
  setWebsocketStatus("disconnected");
};

const sendComputeConnectMessage = async () => {
  const platform = await window.electronAPI.getOsType();
  const usedCompute = await window.electronAPI.getDockerContainers(true); // 전체 컨테이너 목록 가져옴
  const usedCPU = await window.electronAPI.getCpuUsage();
  const images = await window.electronAPI.getDockerImages();
  const totalSize = images.reduce((acc, image) => acc + (image.Size || 0), 0); //실행중인 이미지 용량
  const deployCompute = await window.electronAPI.getDockerContainers(false); // 실행 중인 컨테이너만 가져옴
  console.log(deployCompute);

  // 현재 사용량 보내기
  const createComputeRequest = {
    userId: sessionData.userId || 0,
    computerType: platform,
    usedCompute: usedCompute.length || 0,
    usedMemory: totalSize || 0,
    usedCPU: usedCPU || 0,
    deployments: deployCompute.length || [],
  };

  client.publish({
    destination: "/pub/compute/connect",
    body: JSON.stringify(createComputeRequest),
  });
  console.log("Compute connect message sent:", createComputeRequest);
};

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
