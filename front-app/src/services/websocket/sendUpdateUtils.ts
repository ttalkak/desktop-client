import { useAuthStore } from "../../stores/authStore";
import { client } from "./stompClientUtils";

//Deployment 상태 업데이트
export function sendInstanceUpdate(
  serviceType: string | undefined,
  id: number,
  senderId: number | undefined,
  status: string,
  port: number | 0,
  details?: string
) {
  const message = {
    serviceType: serviceType,
    status: status.toUpperCase(),
    senderId: senderId,
    port: port,
    message: details || "",
  };

  const userId = useAuthStore.getState().userSettings?.userId;

  const headers = {
    "X-USER-ID": userId || "0",
  };

  client?.publish({
    destination: `/pub/compute/${id}/status`,
    headers: headers,
    body: JSON.stringify(message),
  });

  console.log(`Message sent for deploymentId ${id}:`, message);
}
