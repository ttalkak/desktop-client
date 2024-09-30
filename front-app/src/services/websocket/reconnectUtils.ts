import { useAppStore } from "../../stores/appStatusStore";
import { useAuthStore } from "../../stores/authStore";
import { client } from "./stompClientUtils";

let reconnectTimeout: NodeJS.Timeout | null = null;
const reconnectInterval = 5000; // 5초 후 재연결 시도
const maxReconnectAttempts = 10; // 최대 재연결 시도 횟수
let reconnectAttempts = 0;

export function attemptReconnect() {
  const setWebsocketStatus = useAppStore.getState().setWebsocketStatus;
  const isLoggedIn = useAuthStore.getState().accessToken;

  if (reconnectAttempts < maxReconnectAttempts && isLoggedIn) {
    reconnectAttempts++;
    console.log(`Reconnection attempt #${reconnectAttempts}...`);

    // 이전 타임아웃이 설정되어 있다면 취소
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }

    reconnectTimeout = setTimeout(() => {
      // 재연결 시도
      client.activate(); // STOMP.js 클라이언트 활성화
    }, reconnectInterval);
  } else {
    console.log("Max reconnection attempts reached or user logged out.");
    setWebsocketStatus("disconnected");
  }
}
