import { useDeploymentDetailsStore } from "../../stores/deploymentDetailsStore";
import { useDeploymentStore } from "../../stores/deploymentStore";
import { sendInstanceUpdate } from "../websocket/sendUpdateUtils";
import { handleDockerBuild } from "./dockerBuildHandler";

export async function handleContainerCommand(
  deploymentId: number,
  command: string,
  userId: string
) {
  console.log(`Received command: ${command} for deploymentId: ${deploymentId}`);

  const containerId = useDeploymentStore
    .getState()
    .getContainerByDeployment(deploymentId);

  if (!containerId) {
    console.error(`No container found for deploymentId: ${deploymentId}`);
    return;
  }

  const compute =
    useDeploymentDetailsStore.getState().deploymentDetails[deploymentId]
      .details;

  if (!compute) {
    console.error(
      `No deployment details found for deploymentId: ${deploymentId}`
    );
    return;
  }

  console.log(`Deployment details fetched for deploymentId: ${deploymentId}`);

  switch (command) {
    case "START":
      {
        console.log(`Starting container: ${containerId}`);
        const { success } = await window.electronAPI.startContainer(
          containerId
        );
        if (success) {
          console.log(`Container started: ${containerId}`);
          window.electronAPI.startContainerStats([containerId]);
          sendInstanceUpdate(
            userId,
            deploymentId,
            "RUNNING",
            compute.outboundPort,
            "deploy started"
          );
        } else {
          console.error(`Failed to start container: ${containerId}`);
          sendInstanceUpdate(
            userId,
            deploymentId,
            "ERROR",
            compute.outboundPort,
            "deploy start failed"
          );
        }
      }
      break;

    case "RESTART":
      {
        console.log(`Restarting container: ${containerId}`);
        const { success } = await window.electronAPI.startContainer(
          containerId
        );
        if (success) {
          console.log(`Container restarted: ${containerId}`);
          sendInstanceUpdate(
            userId,
            deploymentId,
            "RUNNING",
            compute.outboundPort,
            "deploy restarted"
          );
        } else {
          console.error(`Failed to restart container: ${containerId}`);
          sendInstanceUpdate(
            userId,
            deploymentId,
            "ERROR",
            compute.outboundPort,
            "deploy restart failed"
          );
        }
      }
      break;

    case "DELETE":
      {
        console.log(`Deleting container: ${containerId}`);
        const { success } = await window.electronAPI.removeContainer(
          containerId
        );
        if (success) {
          console.log(`Container deleted: ${containerId}`);
          sendInstanceUpdate(
            userId,
            deploymentId,
            "DELETED",
            compute.outboundPort,
            "deploy deleted success"
          );
        } else {
          console.error(`Failed to delete container: ${containerId}`);
          sendInstanceUpdate(
            userId,
            deploymentId,
            "ERROR",
            compute.outboundPort,
            "deleted failed"
          );
        }
      }
      break;

    case "STOP":
      {
        console.log(`Stopping container stats for containerId: ${containerId}`);
        await window.electronAPI.startContainerStats([containerId]);

        console.log(`Stopping container: ${containerId}`);
        const { success } = await window.electronAPI.stopContainer(containerId);
        if (success) {
          console.log(`Container stopped: ${containerId}`);
          sendInstanceUpdate(
            userId,
            deploymentId,
            "STOPPED",
            compute.outboundPort,
            "deploy stopped success"
          );
        } else {
          console.error(`Failed to stop container: ${containerId}`);
          sendInstanceUpdate(
            userId,
            deploymentId,
            "ERROR",
            compute.outboundPort,
            "deploy stopped failed"
          );
        }

        console.log(`Stopping pgrok for deploymentId: ${deploymentId}`);
        await window.electronAPI.stopPgrok(deploymentId);
      }
      break;

    case "REBUILD":
      {
        console.log(`Rebuilding container for deploymentId: ${deploymentId}`);

        // deploymentId로 details 가져오기
        const details = useDeploymentDetailsStore
          .getState()
          .getDeploymentDetails(deploymentId);

        if (!details) {
          console.error(
            `No deployment details found for deploymentId: ${deploymentId}`
          );
          return;
        }

        // 기존 컨테이너 상태 및 로그 스트림 중지
        await window.electronAPI.stopContainerStats([containerId]);
        await window.electronAPI.stopLogStream(containerId);
        await window.electronAPI.stopPgrok(deploymentId);
        await window.electronAPI.stopContainer(containerId);
        await window.electronAPI.removeContainer(containerId);

        sendInstanceUpdate(
          userId,
          deploymentId,
          "STOPPED",
          compute?.outboundPort,
          "rebuild will start"
        );

        // handleDockerBuild 함수를 호출하여 이미지 빌드 및 컨테이너 생성
        await handleDockerBuild(compute, userId);
      }
      break;

    default:
      console.warn(`Unknown command: ${command}`);
  }
}
