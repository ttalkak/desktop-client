import { useDeploymentDetailsStore } from "../../stores/deploymentDetailsStore";
import { useDeploymentStore } from "../../stores/deploymentStore";
import { sendInstanceUpdate } from "../websocket/sendUpdateUtils";
import { handleDockerBuild } from "./dockerBuildHandler";
import { dockerStateManager } from "../storeHandler/dockerStateHandler";

export async function handleContainerCommand(
  deploymentId: number,
  command: string
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
      ?.details;

  if (!compute) {
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
        const { success } = await window.electronAPI.stopContainer(containerId);
        if (success) {
          await dockerStateManager.updateContainerState(containerId, "stopped");
          await window.electronAPI.stopContainerStats([containerId]);
          await window.electronAPI.stopPgrok(deploymentId);
        } else {
          await dockerStateManager.updateContainerState(containerId, "error");
        }
      }
      break;

    case "RESTART":
      {
        console.log(`Restarting container: ${containerId}`);
        await window.electronAPI.stopContainer(containerId);
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
          sendInstanceUpdate(
            deploymentId,
            "DELETED",
            compute.outboundPort,
            `successfully deleted`
          );
          dockerStateManager.removeContainer(containerId);
          useDeploymentStore.getState().removeDeployment(deploymentId);
        } else {
          console.error(`${deploymentId} delete failed`);
        }
      }
      break;

    case "REBUILD":
      {
        console.log(`Rebuilding container for deploymentId: ${deploymentId}`);

        // Stop and remove existing container
        await window.electronAPI.stopContainerStats([containerId]);
        await window.electronAPI.stopLogStream(containerId);
        await window.electronAPI.stopPgrok(deploymentId);
        await window.electronAPI.stopContainer(containerId);
        dockerStateManager.removeContainer(containerId);
        await window.electronAPI.removeContainer(containerId);

        // Rebuild
        await handleDockerBuild(compute);
      }
      break;

    default:
      console.warn(`Unknown command: ${command}`);
  }
}
