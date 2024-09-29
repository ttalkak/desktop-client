import { useAuthStore } from "../../stores/authStore";
import { client } from "./stompClientUtils";

export function sendInstanceUpdate(
  deploymentId: number,
  status: string,
  port?: number,
  details?: string
) {
  const message = {
    status: status.toUpperCase(),
    port: port,
    message: details || "",
  };

  const userId = useAuthStore.getState().userSettings?.userId;

  const headers = {
    "X-USER-ID": userId || "0",
  };

  client?.publish({
    destination: `/pub/compute/${deploymentId}/status`,
    headers: headers,
    body: JSON.stringify(message),
  });

  console.log(`Message sent for deploymentId ${deploymentId}:`, message);
}
