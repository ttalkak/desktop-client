import { Message } from "@stomp/stompjs";
import { handleContainerCommand } from "./deployments/deployCommandHandler";
import { sendPaymentInfo } from "./paymentService";
import {
  startSendingCurrentState,
  stopContainerStatsMonitoring,
  stopSendingCurrentState,
} from "./monitoring/healthCheckPingUtils";
import { client } from "./websocket/stompClientUtils";
import { sendComputeConnectMessage } from "./websocket/sendComputeConnect";
import { useAppStore } from "../stores/appStatusStore";
import { handleDockerBuild } from "./deployments/buildHandler/buildDeployHandler";

const setWebsocketStatus = useAppStore.getState().setWebsocketStatus;
const setServiceStatus = useAppStore.getState().setServiceStatus;

export function setupClientHandlers(userId: string): void {
  client.onConnect = (frame) => {
    console.log("Connected: " + frame);
    setWebsocketStatus("connected");

    // WebSocket 연결 시, 컴퓨트 연결 메시지 및 결제 정보 전송
    sendComputeConnectMessage(userId);
    sendPaymentInfo(userId);
    startSendingCurrentState(userId); // 배포 상태 PING 전송 시작
    setServiceStatus("running");

    // compute-create 구독
    client.subscribe(
      `/sub/compute-create/${userId}`,
      async (message: Message) => {
        const computes = JSON.parse(message.body);

        for (const compute of computes) {
          console.log(
            `Processing compute-create: ${JSON.stringify(compute, null, 2)}`
          );

          // `handleDockerBuild` 내부에서 FRONTEND와 BACKEND 처리
          await handleDockerBuild(compute);
        }
      }
    );

    // compute-update 구독
    client.subscribe(
      `/sub/compute-update/${userId}`,
      async (message: Message) => {
        try {
          const { deploymentId, command } = JSON.parse(message.body);
          handleContainerCommand(deploymentId, command); // 컨테이너 명령 처리
        } catch (error) {
          console.error("Error processing compute update message:", error);
        }
      }
    );

    // WebSocket 오류 처리
    client.onStompError = (frame) => {
      console.error("Broker reported error: " + frame.headers["message"]);
      console.error("Additional details: " + frame.body);
      setWebsocketStatus("disconnected");
    };

    // WebSocket 연결 해제 처리
    client.onDisconnect = () => {
      console.log("Disconnected");
      setWebsocketStatus("disconnected");
      stopContainerStatsMonitoring();
      stopSendingCurrentState();
    };
  };
}
