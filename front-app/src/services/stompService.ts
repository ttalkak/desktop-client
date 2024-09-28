import { useAppStore } from "../stores/appStatusStore";
import { client } from "./websocket/stompClientUtils";
import { waitForSessionData } from "./websocket/stompClientUtils";
import { initializeStompClient } from "./websocket/stompClientUtils";
import { setupClientHandlers } from "./stompClientService";

const setWebsocketStatus = useAppStore.getState().setWebsocketStatus;

// WebSocket 연결 함수
export const connectWebSocket = async (): Promise<void> => {
  try {
    const sessionData = await waitForSessionData(); // 세션 데이터에서 userId 가져옴
    const userId = sessionData.userId.toString(); // userId 변환

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
