import { Client, Message } from "@stomp/stompjs";
import { useAuthStore } from "./../stores/authStore";

const client = new Client({
  brokerURL: "wss://ttalkak.com/ws",
  connectHeaders: {
    "X-USER-ID": `${useAuthStore.getState().accessToken}`,
  },
  debug: (str) => {
    console.log(new Date(), str);
  },
});

client.onConnect = (frame) => {
  console.log("Connected: " + frame);
};

client.onStompError = (frame) => {
  console.error("Broker reported error: " + frame.headers["message"]);
  console.error("Additional details: " + frame.body);
};

// STOMP.js 연결 초기화
export const connectWebSocket = () => {
  client.activate();
};

const;
