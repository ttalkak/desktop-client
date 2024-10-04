import useDeploymentStore from "../../stores/deploymentStore";
import { sendInstanceUpdate } from "../websocket/sendUpdateUtils";
import { dockerStateManager } from "../storeHandler/dockerStateHandler";

export async function handleContainerCommand(
  serviceType: string,
  Id: number,
  command: string
) {
  switch (serviceType) {
    case "FRONTEND":
    case "BACKEND": {
      break;
    }

    case "DATABASE": {
      break;
    }
    default: {
      // 다른 경우 처리
      console.log("Unknown service type");
      break;
    }
  }

  const containerId = useDeploymentStore
    .getState()
    .getContainersByDeployment(Id);

  if (containerId === null) {
    console.error(`No container found for deploymentId: ${Id}`);

    return;
  }

  const deployment = useDeploymentStore.getState().containers[containerId];

  if (!containerId) {
    console.error(`No container found for deploymentId: ${Id}`);
    return;
  }

  if (!deployment) {
    console.error(`No deployment details found for deploymentId: ${Id}`);
    return;
  }

  switch (command) {
    case "START":
      {
        console.log(`Starting container: ${containerId}`);
        const { success } = await window.electronAPI.startContainer(
          containerId
        );
        if (success) {
          await dockerStateManager.updateContainerState(containerId, "running");
          window.electronAPI.startContainerStats([containerId]);
        } else {
          await dockerStateManager.updateContainerState(containerId, "error");
        }
      }
      break;

    case "STOP":
      {
        console.log(`Stopping container: ${containerId}`);
        await dockerStateManager.updateContainerState(containerId, "stopped");
        await window.electronAPI.stopContainerStats([containerId]);
        const { success } = await window.electronAPI.stopContainer(containerId);
        if (success) {
          await window.electronAPI.stopPgrok(Id);
        } else {
          await dockerStateManager.updateContainerState(containerId, "error");
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
          await dockerStateManager.updateContainerState(containerId, "running");
          window.electronAPI.startContainerStats([containerId]);
        } else {
          await dockerStateManager.updateContainerState(containerId, "error");
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
          window.electronAPI.stopContainerStats([containerId]);
          window.electronAPI.stopPgrok(Id);
          sendInstanceUpdate(
            deployment.serviceType,
            Id,
            "DELETED",
            deployment.outboundPort,
            `successfully deleted`
          );
          dockerStateManager.removeContainer(containerId);
          useDeploymentStore.getState().removeContainer(containerId);
        }
      }
      break;

    default:
      console.warn(`Unknown command: ${command}`);
  }
}
