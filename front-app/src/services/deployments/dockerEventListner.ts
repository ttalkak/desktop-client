import { useAuthStore } from "../../stores/authStore";
import { useAppStore } from "../../stores/appStatusStore";
import { useContainerStore } from "../../stores/containerStore";
import { DeployStatus } from "../../types/deploy";
export interface DockerEvent {
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
  const { setDockerStatus } = useAppStore.getState();
  const { getContainerByContainerId, updateContainerInfo, removeContainer } =
    useContainerStore.getState();
  const userId = useAuthStore.getState().userSettings?.userId;

  if (!userId) {
    console.error("User is not logged in.");
    return;
  }

  const handleDockerEvent = (event: DockerEvent) => {
    switch (event.Type) {
      case "container":
        return handleContainerEvent(event);
      case "image":
        console.log(`Image event detected: ${event.Action}`);
        return {
          status: "logged",
          eventType: event.Type,
          action: event.Action,
        };
      default:
        console.log(`Unknown event type: ${event.Type}`);
        return { status: "unhandled", eventType: event.Type };
    }
  };

  const handleContainerEvent = async (event: DockerEvent) => {
    const container = getContainerByContainerId(event.Actor.ID);
    if (!container) {
      console.warn(`Container not found for ID: ${event.Actor.ID}, skipping.`);
      return {
        status: "pending",
        message: "Container not found, skipping event.",
      };
    }
    const id = `${container?.serviceType}-${container?.deployId}`;

    try {
      switch (event.Action) {
        case "create":
          updateContainerInfo(container.id, { status: DeployStatus.WAITING });
          break;
        case "start":
          updateContainerInfo(container.id, { status: DeployStatus.RUNNING });
          break;
        case "stop":
        case "die":
          updateContainerInfo(container.id, { status: DeployStatus.STOPPED });
          if (event.Action === "die") {
            await window.electronAPI.stopContainerStats([event.Actor.ID]);
          }
          break;
        case "destroy":
          removeContainer(id);
          break;
        default:
          console.log(`Unhandled container action: ${event.Action}`);
          return { status: "unhandled", eventAction: event.Action };
      }

      return { status: "success", eventAction: event.Action };
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
  };

  // 이벤트 리스너 등록
  window.electronAPI.onDockerEventResponse(handleDockerEvent);

  // Error 감지
  window.electronAPI.onDockerEventError((error) => {
    console.error("Docker Event Error:", error);
    setDockerStatus("unknown");
  });
};
