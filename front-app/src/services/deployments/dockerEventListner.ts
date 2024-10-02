import { useAuthStore } from "../../stores/authStore";
import useDeploymentStore from "../../stores/deploymentStore";
import { dockerStateManager } from "../storeHandler/dockerStateHandler";
import { useAppStore } from "../../stores/appStatusStore";
import { terminateAndRemoveContainersAndImages } from "./terminateAllDeployments";

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
  const { setDockerStatus } = useAppStore.getState();

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
          return {
            error: true,
            message: `Failed to process image event: ${event.Action}`,
          };
        }
        break;
      case "delete":
        dockerStateManager.removeImage(event.Actor.ID);
        break;
      default:
        console.log(`Unhandled image action: ${event.Action}`);
        return { status: "unhandled", eventAction: event.Action };
    }

    return { status: "success", eventAction: event.Action };
  };

  const handleContainerEvent = async (event: DockerEvent) => {
    console.log(
      `Container event: ${event.Action} for container ${event.Actor.ID}`
    );

    const deployment = useDeploymentStore.getState().containers[event.Actor.ID];

    // deployment가 없으면 넘어감
    if (!deployment) {
      console.warn(
        `Deployment not found for container ID: ${event.Actor.ID}, skipping.`
      );
      return {
        status: "pending",
        message: "Deployment not found, skipping event.",
      };
    }

    const deploymentId = deployment.deploymentId;

    // deploymentId가 없으면 넘어감
    if (!deploymentId) {
      console.error(
        `No deployment ID found for container ID: ${event.Actor.ID}, skipping.`
      );
      return {
        status: "pending",
        message: "No deployment ID found, skipping event.",
      };
    }

    try {
      switch (event.Action) {
        case "create":
          dockerStateManager.updateContainerState(event.Actor.ID, "created");
          break;
        case "start":
          window.electronAPI.startContainerStats([event.Actor.ID]);
          await dockerStateManager.updateContainerState(
            event.Actor.ID,
            "running"
          );
          break;
        case "stop":
          await dockerStateManager.updateContainerState(
            event.Actor.ID,
            "stopped"
          );
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
          break;
        default:
          console.log(`Unhandled container action: ${event.Action}`);
          return { status: "unhandled", eventAction: event.Action };
      }
    } catch (error) {
      console.error(
        `Error handling ${event.Action} event for container ${event.Actor.ID}:`,
        error
      );
      return {
        error: true,
        message: `Failed to process container event: ${event.Action}`,
      };
    }

    return { status: "success", eventAction: event.Action };
  };

  const handleDockerEvent = (event: DockerEvent) => {
    switch (event.Type) {
      case "container":
        return handleContainerEvent(event);
      case "image":
        return handleImageEvent(event);
      default:
        console.log(`Unknown event type: ${event.Type}`);
        return { status: "unhandled", eventType: event.Type };
    }
  };

  // Register the event handlers with the electron API
  window.electronAPI.onDockerEventResponse(handleDockerEvent);

  window.electronAPI.onDockerEventError((error) => {
    console.error("Docker Event Error:", error);
    setDockerStatus("unknown");
    terminateAndRemoveContainersAndImages();
  });
};
