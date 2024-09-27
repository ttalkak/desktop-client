import { client } from "../utils/websocket/stompClientUtils";

// 결제 정보를 전송하는 함수
export function sendPaymentInfo(userId: string) {
  const paymentData = {
    userId: userId,
    amount: 1000, // 예시 금액
    currency: "USD",
    status: "PAID",
  };

  if (client && client.connected) {
    client.publish({
      destination: "/pub/compute/payment", // 서버에서 구독하는 경로
      body: JSON.stringify(paymentData),
      headers: { priority: "9" },
    });
    console.log("결제 정보를 전송했습니다:", paymentData);
  } else {
    console.error("STOMP 클라이언트가 연결되지 않았습니다.");
  }
}
