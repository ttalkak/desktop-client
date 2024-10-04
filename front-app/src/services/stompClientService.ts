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
import { handleDatabaseBuild } from "./deployments/buildHandler/buildDatabaseHandler";

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

    // compute-create 구독/Frontend & Backend 배포
    client.subscribe(
      `/sub/compute-create/${userId}`,
      async (message: Message) => {
        const compute = JSON.parse(message.body);
        console.log("생성요청 도착", compute);
        await handleDockerBuild(compute);
      }
    );

    //database-create 구독 / database 배포
    client.subscribe(
      `/sub/database-create/${userId}`,
      async (message: Message) => {
        const dbCreate = JSON.parse(message.body);
        console.log(`db ${dbCreate} 생성요청 도착`, dbCreate);
        await handleDatabaseBuild(dbCreate);
      }
    );

    // compute-update 구독 / command 처리
    client.subscribe(
      `/sub/compute-update/${userId}`,
      async (message: Message) => {
        try {
          const { serviceType, deploymentId, command } = JSON.parse(
            message.body
          );
          handleContainerCommand(serviceType, deploymentId, command); // 컨테이너 명령 처리
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
      alert("연결이 해제 되었습니다. 재시도 해주세요");
      console.log("Websocket Disconnected....");
      setWebsocketStatus("disconnected");
      stopContainerStatsMonitoring();
      stopSendingCurrentState();
    };
  };
}
