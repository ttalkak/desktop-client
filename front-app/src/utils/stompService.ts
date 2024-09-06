import { Client, Message } from "@stomp/stompjs";
import { useAppStore, useDockerStore } from "../stores/appStatusStore";

const sessionData = JSON.parse(sessionStorage.getItem("userSettings") || "{}");

const setWebsocketStatus = useAppStore.getState().setWebsocketStatus;

const userId = sessionData.userId;

// STOMP 클라이언트 설정
export const client = new Client({
  brokerURL: "wss://ttalkak.com/ws",
  connectHeaders: {
    "X-USER-ID": userId, // userId가 없을 경우 빈 문자열로 대체
  },
  // debug: (str) => {
  //   console.log(new Date(), str);
  // },
});

// WebSocket 연결 및 초기 설정
client.onConnect = (frame) => {
  console.log("Connected: " + frame);
  setWebsocketStatus("connected");
  sendComputeConnectMessage();

  client.subscribe("/user/queue/reply", (message: Message) => {
    const response = JSON.parse(message.body);
    console.log("Received response from backend:", response);

    if (response.success) {
      subscribeToDockerEvents();
      subscribeToDockerCommands();
    } else {
      console.error("Error in backend response:", response.error);
    }
  });
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
  const createComputeRequest = {
    userId: sessionData.userId || 0, // userId가 없을 경우 0으로 대체
    computeType: platform,
    maxMemory: 1024,
  };
  client.publish({
    destination: "/pub/compute/connect",
    body: JSON.stringify(createComputeRequest),
  });
  console.log("Compute connect message sent:", createComputeRequest);
};

const subscribeToDockerEvents = () => {
  client.subscribe("/topic/docker/updates", (message: Message) => {
    const dockerData = JSON.parse(message.body);
    console.log("Received Docker data:", dockerData);
    useDockerStore.getState().setDockerImages(dockerData.images);
    useDockerStore.getState().setDockerContainers(dockerData.containers);
  });

  client.subscribe("/topic/docker/events", (message: Message) => {
    const dockerEvent = JSON.parse(message.body);
    console.log("Received Docker event:", dockerEvent);
  });
};

const subscribeToDockerCommands = () => {
  client.subscribe("/pub/compute/command", handleDockerCommand);
};

const handleDockerCommand = async (message: Message) => {
  const { command, params } = JSON.parse(message.body);
  console.log("Received Docker command:", command, "with params:", params);

  switch (command) {
    case "DEPLOY":
      await handleDeployCommand(params);
      break;
    case "CONTAINER_ACTION":
      await handleContainerCommand(params);
      break;
    case "IMAGE_ACTION":
      await handleImageCommand(params);
      break;
    case "SHUTDOWN":
      await handleShutdownCommand();
      break;
    default:
      console.error("Unknown command:", command);
  }
};

const handleDeployCommand = async ({
  imageName,
  tag,
  containerName,
  port,
  dockerRootDirectory,
  sourceCodeLink,
}: DeployCommandDto) => {
  try {
    const setServiceStatus = useAppStore.getState().setServiceStatus;
    setServiceStatus("loading");

    const downloadResult = await window.electronAPI.downloadAndUnzip(
      sourceCodeLink
    );
    if (!downloadResult.success) {
      throw new Error(
        `Failed to download and unzip the repository: ${sourceCodeLink}`
      );
    }

    const extractedPath = downloadResult.extractDir;
    if (!extractedPath) {
      throw new Error(`downloaded.. not found in ${extractedPath}`);
    }
    const fullDockerfilePath = window.electronAPI.joinPath(
      extractedPath,
      dockerRootDirectory
    );

    const dockerfilePath = await window.electronAPI.findDockerfile(
      fullDockerfilePath
    );
    if (!dockerfilePath) {
      throw new Error(`Dockerfile not found in ${fullDockerfilePath}`);
    }

    const buildResult = await window.electronAPI.buildDockerImage(
      dockerfilePath,
      imageName,
      tag
    );

    // buildResult.image가 undefined일 가능성을 처리
    if (!buildResult.status || !buildResult.image) {
      throw new Error(`Failed to build Docker image: ${imageName}`);
    }

    const containerOptions = await window.electronAPI.createContainerOptions(
      buildResult.image.RepoTags[0], // 이미지 ID 사용
      containerName,
      port
    );
    const startResult = await window.electronAPI.createAndStartContainer(
      containerOptions
    );
    if (!startResult.success) {
      throw new Error(`Failed to start Docker container: ${containerName}`);
    }

    setServiceStatus("running");
  } catch (error) {
    console.error("Error in handleDeployCommand:", error);
    useAppStore.getState().setServiceStatus("stopped");
  }
};

const handleContainerCommand = async ({
  action,
  containerId,
}: {
  action: string;
  containerId: string;
}) => {
  switch (action) {
    case "START":
      await window.electronAPI.startContainer(containerId);
      break;
    case "STOP":
      await window.electronAPI.stopContainer(containerId);
      break;
    case "REMOVE":
      await window.electronAPI.removeContainer(containerId);
      useDockerStore.getState().removeDockerContainer(containerId);
      break;
    default:
      console.error("Unknown container action:", action);
  }
};

const handleImageCommand = async ({
  action,
  imageId,
}: {
  action: "REMOVE"; // 필요한 다른 액션이 있다면 추가
  imageId: string;
}) => {
  switch (action) {
    case "REMOVE":
      await window.electronAPI.removeImage(imageId);
      useDockerStore.getState().removeDockerImage(imageId);
      break;
    default:
      console.error("Unknown image action:", action);
  }
};

const handleShutdownCommand = async () => {
  try {
    const setServiceStatus = useAppStore.getState().setServiceStatus;
    setServiceStatus("stopped");

    const containers = await window.electronAPI.getDockerContainers();
    for (const container of containers) {
      if (container.State.Running) {
        await window.electronAPI.stopContainer(container.Id);
      }
      await window.electronAPI.removeContainer(container.Id);
    }

    const images = await window.electronAPI.getDockerImages();
    for (const image of images) {
      await window.electronAPI.removeImage(image.Id);
    }

    setServiceStatus("stopped");
    useDockerStore.getState().clearDockerContainers();
    useDockerStore.getState().clearDockerImages();

    console.log("All Docker services have been shut down");
  } catch (error) {
    console.error("Error during shutdown:", error);
    useAppStore.getState().setServiceStatus("stopped");
  }
};
