import { client } from "./stompClientUtils";

export function sendInstanceUpdate(
  userId: string,
  deploymentId: number,
  status: string,
  details?: string,
  port?: number
) {
  const message = {
    status: status,
    port: port,
    message: details || "",
  };

  const headers = {
    "X-USER-ID": userId,
  };

  client?.publish({
    destination: `/pub/compute/${deploymentId}/status`,
    headers: headers,
    body: JSON.stringify(message),
  });

  console.log(`Message sent for deploymentId ${deploymentId}:`, message);
}
