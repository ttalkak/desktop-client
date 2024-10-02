import { Client } from "@stomp/stompjs";

export function createStompClient(userId: string): Client {
  return new Client({
    brokerURL: "wss://socket.ttalkak.com/ws",
    connectHeaders: {
      "X-USER-ID": userId,
    },
    heartbeatIncoming: 0,
    heartbeatOutgoing: 0,
  });
}
