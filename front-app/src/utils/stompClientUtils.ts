import { Client } from "@stomp/stompjs";

export let client: Client;
interface SessionData {
  userId: number;
  maxCompute: number;
  availablePortStart: number;
  availablePortEnd: number;
}

export function getSessionData(): SessionData | null {
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
  return new Client({
    brokerURL: "wss://api.ttalkak.com/ws",
    connectHeaders: {
      "X-USER-ID": userId,
    },
    heartbeatIncoming: 0,
    heartbeatOutgoing: 0,
  });
}

// STOMP 클라이언트를 초기화하는 함수
export async function initializeStompClient(): Promise<Client> {
  try {
    const sessionData = await waitForSessionData();
    if (!client) {
      client = createStompClient(sessionData.userId.toString());
    }
    return client;
  } catch (error) {
    console.error("Failed to initialize STOMP client:", error);
    throw error;
  }
}
