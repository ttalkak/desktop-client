import { useAppStore } from "src/stores/appStatusStore";
import { useAuthStore } from "src/stores/authStore";
import { client } from "./stompClientUtils";
let reconnectTimeout: NodeJS.Timeout | null = null;
const reconnectInterval = 5000; // 5초 후 재연결 시도
let maxReconnectAttempts = 10; // 최대 재연결 시도 횟수
let reconnectAttempts = 0;

export function attemptReconnect() {
  const setWebsocketStatus = useAppStore.getState().setWebsocketStatus;
  const isLoggedIn = useAuthStore.getState().accessToken;

  if (reconnectAttempts < maxReconnectAttempts && isLoggedIn) {
    reconnectAttempts++;
    console.log(`Reconnection attempt #${reconnectAttempts}...`);

    reconnectTimeout = setTimeout(() => {
      // 재연결 시도
      client.activate(); // STOMP.js 클라이언트 활성화
    }, reconnectInterval);
  } else {
    console.log("Max reconnection attempts reached or user logged out.");
    setWebsocketStatus("disconnected");
  }
}
