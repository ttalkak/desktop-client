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
import { handleBuildImage } from "./deployments/dockerUtils";

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
          console.log(
            `compute-create started.. ${JSON.stringify(compute, null, 2)}`
          );

          if (compute.serviceType == "FRONTEND") {
            await handleDockerBuild(compute);
          }

          if (compute.serviceType == "BACKEND") {
            if (compute.databases && compute.databases.length > 0) {
              // databases가 존재할 때 DB 이미지 풀링
              for (const db of compute.databases) {
                console.log(`Pulling database image for ${db.databaseType}`);
                await window.electronAPI.pullDatabaseImage(db.databaseType);
              }
            }

            // DB 이미지 풀 이후 또는 databases가 없을 때 Docker 빌드 실행
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
