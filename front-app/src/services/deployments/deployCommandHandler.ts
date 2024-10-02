import useDeploymentStore from "../../stores/deploymentStore";
import { sendInstanceUpdate } from "../websocket/sendUpdateUtils";
import { dockerStateManager } from "../storeHandler/dockerStateHandler";

export async function handleContainerCommand(
  deploymentId: number,
  command: string
) {
  console.log(`Received command: ${command} for deploymentId: ${deploymentId}`);

  const containerId = useDeploymentStore
    .getState()
    .getContainerIdByDeploymentIdWithoutDockerImage(deploymentId);

  if (containerId === null) {
    console.error(`No container found for deploymentId: ${deploymentId}`);
    return;
  }

  const deployment = useDeploymentStore.getState().containers[containerId];

  if (!containerId) {
    console.error(`No container found for deploymentId: ${deploymentId}`);
    return;
  }

  if (!deployment) {
    console.error(
      `No deployment details found for deploymentId: ${deploymentId}`
    );
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
          await window.electronAPI.stopPgrok(deploymentId);
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
          window.electronAPI.stopPgrok(deploymentId);
          sendInstanceUpdate(
            deploymentId,
            "DELETED",
            deployment.outboundPort,
            `successfully deleted`
          );
          dockerStateManager.removeContainer(containerId);
          useDeploymentStore.getState().removeContainer(containerId);
        } else {
          console.error(`${deploymentId} delete failed`);
        }
      }
      break;

    case "REBUILD":
      break;

    default:
      console.warn(`Unknown command: ${command}`);
  }
}
