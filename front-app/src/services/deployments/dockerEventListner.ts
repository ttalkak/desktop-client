import { useAuthStore } from "../../stores/authStore";
import { useDeploymentDetailsStore } from "../../stores/deploymentDetailsStore";
import { useDeploymentStore } from "../../stores/deploymentStore";
import { dockerStateManager } from "../storehandler/dockerStateHandler";

interface DockerEvent {
  Type: string;
  Action: string;
  Actor: {
    ID: string;
    Attributes: {
      [key: string]: string;
    };
  };
  time: number;
  timeNano: number;
}

export const registerDockerEventHandlers = () => {
  const userId = useAuthStore.getState().userSettings?.userId;
  const getDeploymentByContainer =
    useDeploymentStore.getState().getDeploymentByContainer;
  const getDeploymentDetails =
    useDeploymentDetailsStore.getState().getDeploymentDetails;

  if (!userId) {
    throw new Error("User ID not found. Please ensure user is logged in.");
  }

  const handleImageEvent = async (event: DockerEvent) => {
    console.log(`Image event: ${event.Action} for image ${event.Actor.ID}`);

    switch (event.Action) {
      case "build":
      case "tag":
      case "untag":
        try {
          const images = await window.electronAPI.getDockerImages();
          const updatedImage = images.find((img) => img.Id === event.Actor.ID);
          if (updatedImage) {
            dockerStateManager.updateImageState(updatedImage.Id, {
              RepoTags: updatedImage.RepoTags,
            });
          } else {
            console.error(
              `Image with ID ${event.Actor.ID} not found after ${event.Action} event.`
            );
          }
        } catch (error) {
          console.error(
            `Error handling ${event.Action} event for image ${event.Actor.ID}:`,
            error
          );
        }
        break;
      case "delete":
        dockerStateManager.removeImage(event.Actor.ID);
        break;
      default:
        console.log(`Unhandled image action: ${event.Action}`);
    }
  };

  const handleContainerEvent = async (event: DockerEvent) => {
    console.log(
      `Container event: ${event.Action} for container ${event.Actor.ID}`
    );

    const deploymentId = getDeploymentByContainer(event.Actor.ID);
    if (!deploymentId) {
      console.error(`No deployment found for container ID: ${event.Actor.ID}`);
      return;
    }

    const deploymentDetails = getDeploymentDetails(deploymentId);
    if (!deploymentDetails) {
      console.error(`No details found for deployment ID: ${deploymentId}`);
      return;
    }

    try {
      switch (event.Action) {
        case "create":
          dockerStateManager.updateContainerState(event.Actor.ID, "created");
          break;
        case "start":
          await dockerStateManager.updateContainerState(
            event.Actor.ID,
            "running"
          );

          window.electronAPI.startContainerStats([event.Actor.ID]);
          break;
        case "stop":
          await dockerStateManager.updateContainerState(
            event.Actor.ID,
            "stopped"
          );

          window.electronAPI.stopContainerStats([event.Actor.ID]);
          window.electronAPI.stopPgrok(deploymentId);
          break;
        case "die":
          await dockerStateManager.updateContainerState(
            event.Actor.ID,
            "stopped"
          );
          window.electronAPI.stopContainerStats([event.Actor.ID]);
          break;

        case "destroy":
          await dockerStateManager.updateContainerState(
            event.Actor.ID,
            "deleted"
          );
          window.electronAPI.stopContainerStats([event.Actor.ID]);
          window.electronAPI.stopPgrok(deploymentId);
          break;
        case "pause":
          await dockerStateManager.updateContainerState(
            event.Actor.ID,
            "paused"
          );
          break;
        case "unpause":
          await dockerStateManager.updateContainerState(
            event.Actor.ID,
            "running"
          );
          break;
        default:
          console.log(`Unhandled container action: ${event.Action}`);
      }
    } catch (error) {
      console.error(
        `Error handling ${event.Action} event for container ${event.Actor.ID}:`,
        error
      );
    }
  };

  const handleDockerEvent = (event: DockerEvent) => {
    switch (event.Type) {
      case "container":
        handleContainerEvent(event);
        break;
      case "image":
        handleImageEvent(event);
        break;
      default:
        console.log(`Unknown event type: ${event.Type}`);
    }
  };

  // Register the event handlers with the electron API
  window.electronAPI.onDockerEventResponse(handleDockerEvent);

  window.electronAPI.onDockerEventError((error) => {
    console.error("Docker Event Error:", error);
    // You might want to update some global error state here
  });
};

export default registerDockerEventHandlers;
