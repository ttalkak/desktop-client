import { Client } from "@stomp/stompjs";
import { useAppStore } from "../stores/appStatusStore";
import { Message } from "stompjs";

const sessionData = JSON.parse(sessionStorage.getItem("userSettings") || "{}");
const setWebsocketStatus = useAppStore.getState().setWebsocketStatus;

// STOMP 클라이언트 설정
const client = new Client({
  brokerURL: "wss://ttalkak.com/ws",
  connectHeaders: {
    "X-USER-ID": sessionData.userId,
  },
  debug: (str) => {
    console.log(new Date(), str);
  },
});

//연결 성공
client.onConnect = (frame) => {
  console.log("Connected: " + frame);
  // WebSocket 연결 상태를 "connected"로 업데이트
  sendComputeConnectMessage(); // 연결 성공 후 메시지 전송
  setWebsocketStatus("connected");

  // 메시지 전송 후 백엔드 응답을 대기
  client.subscribe("/user/queue/reply", (message: Message) => {
    const response = JSON.parse(message.body);
    console.log("Received response from backend:", response);

    if (response.success) {
      // 백엔드에서 성공적인 응답이 오면 구독 설정
      subscribeToDockerEvents();
    } else {
      console.error("Error in backend response:", response.error);
    }
  });
};

//연결 실패 에러
client.onStompError = (frame) => {
  console.error("Broker reported error: " + frame.headers["message"]);
  console.error("Additional details: " + frame.body);
  // WebSocket 연결 상태를 "disconnected"로 업데이트
  const setWebsocketStatus = useAppStore.getState().setWebsocketStatus;
  setWebsocketStatus("disconnected");
};

// STOMP.js 연결 시도
export const connectWebSocket = () => {
  client.activate();
  console.log("웹소켓 연결 시도 중");
  setWebsocketStatus("connecting");
};

//STOMP.js 연결 종료
export const disconnectWebSocket = () => {
  client.deactivate();
  console.log("웹소켓 연결 종료");
  setWebsocketStatus("disconnected");
};

// /pub/compute/connect 최초 연결시 메시지 전송
const sendComputeConnectMessage = async () => {
  const sessionData = JSON.parse(
    sessionStorage.getItem("userSettings") || "{}"
  );
  const platform = await window.electronAPI.getOsType();
  const createComputeRequest = {
    userId: sessionData.userId,
    computeType: platform,
    maxMemory: 1024, // 임시로 설정한 값 (필요에 따라 수정 가능)
  };

  client.publish({
    destination: "/pub/compute/connect",
    body: JSON.stringify(createComputeRequest),
  });

  console.log("Compute connect message sent:", createComputeRequest);
};

// 구독 설정 함수=> 도커와 관련된 정보 수신
const subscribeToDockerEvents = () => {
  // Docker 이미지, 컨테이너 정보 수신 경로 구독
  client.subscribe("/topic/docker/updates", (message: Message) => {
    const dockerData = JSON.parse(message.body);
    console.log("Received Docker data:", dockerData);

    // Docker 이미지 및 컨테이너 정보를 상태에 저장
    const setDockerImages = useAppStore.getState().setDockerImages;
    const setDockerContainers = useAppStore.getState().setDockerContainers;

    setDockerImages(dockerData.images);
    setDockerContainers(dockerData.containers);
  });

  // 기타 Docker 이벤트 수신 경로 구독
  client.subscribe("/topic/docker/events", (message: Message) => {
    const dockerEvent = JSON.parse(message.body);
    console.log("Received Docker event:", dockerEvent);

    // 여기서 Docker 이벤트 처리 로직 추가 가능
  });
};
