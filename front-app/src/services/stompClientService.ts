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
import { handleDockerBuild } from "./deployments/dockerBuildHandler";

const setWebsocketStatus = useAppStore.getState().setWebsocketStatus;
const setServiceStatus = useAppStore.getState().setServiceStatus;

export function setupClientHandlers(userId: string): void {
  client.onConnect = (frame) => {
    console.log("Connected: " + frame);
    setWebsocketStatus("connected");

    sendComputeConnectMessage(userId); // WebSocket 연결 메시지 전송
    sendPaymentInfo(userId); // 결제 정보 전송
    startSendingCurrentState(userId); // 배포 상태 PING 전송 시작
    setServiceStatus("running");

    client.subscribe(
      `/sub/compute-create/${userId}`,
      async (message: Message) => {
        const computes = JSON.parse(message.body);

        computes.forEach(async (compute: DeploymentCommand) => {
          if (compute.envs) {
            const result = await window.electronAPI.pullDatabaseImage(
              compute.envs.dbInfo
            );
            if (result.success) {
              console.log("dbimage pulled");
            }
          }

          if (compute.hasDockerImage) {
            // Docker 이미지 존재 시 처리
          } else {
            console.log(
              `compute-create started.. ${JSON.stringify(compute, null, 2)}`
            );
            await handleDockerBuild(compute);
          }
        });
      }
    );

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

    client.onStompError = (frame) => {
      console.error("Broker reported error: " + frame.headers["message"]);
      console.error("Additional details: " + frame.body);
      setWebsocketStatus("disconnected");
    };

    client.onDisconnect = () => {
      console.log("Disconnected");
      setWebsocketStatus("disconnected");
      stopContainerStatsMonitoring();
      stopSendingCurrentState();
    };
  };
}
