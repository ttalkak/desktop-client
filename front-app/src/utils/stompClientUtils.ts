import { Client } from "@stomp/stompjs";

interface SessionData {
  userId: number;
  maxCompute: number;
  availablePortStart: number;
  availablePortEnd: number;
}

export let client: Client; // STOMP 클라이언트를 저장하는 변수

function getSessionData(): SessionData | null {
  const data = sessionStorage.getItem("userSettings");
  if (!data) return null;
  try {
    return JSON.parse(data) as SessionData;
  } catch {
    return null;
  }
}

export async function waitForSessionData(
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

export function createStompClient(userId: string): Client {
  console.log("세션 userID", userId);
  return new Client({
    brokerURL: "ws://j11c108.p.ssafy.io:8000/ws", // WebSocket URL
    // brokerURL: "wss://ttalkak.com/ws", // WebSocket URL (주석 처리된 대체 URL)
    connectHeaders: {
      // "X-USER-ID": userId,
      "X-USER-ID": "2",
    },
    heartbeatIncoming: 30000,
    heartbeatOutgoing: 30000,
  });
}

// STOMP 클라이언트를 초기화하는 함수
export async function initializeStompClient(): Promise<Client> {
  try {
    const sessionData = await waitForSessionData();
    if (!client) {
      console.log(sessionData);
      // client = createStompClient(sessionData.userId.toString());  //: 빌드 위한 주석처리 추후 userId 반영되면 해제
      client = createStompClient("2");
      // setupClientHandlers(sessionData.userId.toString()); //: 빌드 위한 주석처리 추후 userId 반영되면 해제
    }
    return client;
  } catch (error) {
    console.error("Failed to initialize STOMP client:", error);
    throw error;
  }
}
