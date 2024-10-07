import useDeploymentStore from "../../stores/deploymentStore";
import { sendInstanceUpdate } from "../websocket/sendUpdateUtils";
import { dockerStateManager } from "../storeHandler/dockerStateHandler";
import { useDatabaseStore } from "../../stores/databaseStore";

export async function handleContainerCommand(
  serviceType: string,
  Id: number,
  command: string
) {
  let containerId: string | null = null;
  let store;

  // serviceType에 따라 적절한 store 선택 및 containerId 가져오기
  switch (serviceType) {
    case "FRONTEND":
    case "BACKEND":
      store = useDeploymentStore.getState();
      containerId = store.getContainerIdById(Id);

      break;
    case "DATABASE":
      store = useDatabaseStore.getState();
      containerId = store.getContainerIdById(Id);
      break;
    default:
      console.error(`Unknown service type: ${serviceType}`);
      return;
  }

  if (!containerId) {
    console.error(`No container found for ${serviceType} with Id: ${Id}`);
    return;
  }

  const deployment = useDeploymentStore.getState().containers[containerId];

  switch (command) {
    case "START":
      {
        console.log(`Starting container: ${containerId}`);
        const { success } = await window.electronAPI.restartContainer(
          containerId
        );
        if (success) {
          await dockerStateManager.updateContainerState(containerId, "running");
          window.electronAPI.startContainerStats([containerId]);
          sendInstanceUpdate(
            deployment.serviceType,
            Id,
            senderId,
            "RUNNING",
            deployment.outboundPort,
            "RUNNING"
          );
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
          sendInstanceUpdate(
            deployment.serviceType,
            Id,
            senderId,
            "STOPPED",
            deployment.outboundPort,
            `STOPPED`
          );
        } else {
          await dockerStateManager.updateContainerState(containerId, "error");
        }
      }
      break;

    case "RESTART":
      {
        console.log(`Restarting container: ${containerId}`);
        const { success } = await window.electronAPI.restartContainer(
          containerId
        );
        if (success) {
          await dockerStateManager.updateContainerState(containerId, "running");
          window.electronAPI.startContainerStats([containerId]);
          sendInstanceUpdate(
            deployment.serviceType,
            Id,
            senderId,
            "RUNNING",
            deployment.outboundPort,
            `RUNNING`
          );
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
            senderId,
            "DELETED",
            deployment.outboundPort,
            `DELETED`
          );
          dockerStateManager.removeContainer(containerId);
          store.removeContainer(containerId);
        }
      }
      break;

    default:
      console.warn(`Unknown command: ${command}`);
  }
}
