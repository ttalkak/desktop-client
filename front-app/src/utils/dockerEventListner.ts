import { useDockerStore } from "../stores/appStatusStore";
import { Client } from "@stomp/stompjs";

export const registerDockerEventHandlers = (
  client: Client,
  userId: string,
  deploymentId: number
): (() => void) => {
  window.electronAPI.sendDockerEventRequest();

  console.log("registerDockerEventHandlers 호출됨");

  const removeDockerImage = useDockerStore.getState().removeDockerImage;
  const removeDockerContainer = useDockerStore.getState().removeDockerContainer;
  const updateDockerImage = useDockerStore.getState().updateDockerImage;
  const updateDockerContainer = useDockerStore.getState().updateDockerContainer;

  function sendInstanceUpdate(
    deploymentId: number,
    status: string,
    details?: string
  ) {
    const message = {
      status: status,
      message: details || "",
    };

    const headers = {
      // "X-USER-ID": userId,
      "X-USER-ID": "2",
    };

    client?.publish({
      destination: `/pub/compute/${deploymentId}/status`,
      headers: headers,
      body: JSON.stringify(message),
    });

    console.log(`Message sent for deploymentId ${deploymentId}:`, message);
  }

  const handleImageEvent = (event: DockerEvent) => {
    console.log("이미지 이벤트 :", event.Action);
    switch (event.Action) {
      case "pull":
        // sendInstanceUpdate(deploymentId, "PENDING");
        break;
      case "import":
        // sendInstanceUpdate(deploymentId, "PENDING");
        break;
      case "build":
        window.electronAPI.getDockerImages().then((images) => {
          const builtImage = images.find((img) => img.Id === event.Actor.ID);
          if (builtImage) {
            sendInstanceUpdate(
              deploymentId,
              "PENDING",
              "Image build completed"
            );
          } else {
            console.error(`Built image with ID ${event.Actor.ID} not found.`);
            sendInstanceUpdate(deploymentId, "PENDING", "Image build failed");
          }
        });
        break;
      case "delete":
        removeDockerImage(event.Actor.ID);
        sendInstanceUpdate(deploymentId, "DELETED");
        break;
      case "tag":
        window.electronAPI.getDockerImages().then((images) => {
          const updatedImage = images.find((img) => img.Id === event.Actor.ID);
          if (updatedImage) {
            updateDockerImage(updatedImage);
            sendInstanceUpdate(deploymentId, "PENDING");
          } else {
            console.error(
              `Image with ID ${event.Actor.ID} not found during tagging.`
            );
            sendInstanceUpdate(deploymentId, "PENDING", "Image tagging failed");
          }
        });
        break;
      default:
        console.log(`Unhandled image action: ${event.Action}`);
        sendInstanceUpdate(
          deploymentId,
          "PENDING",
          `Unhandled image action: ${event.Action}`
        );
    }
  };

  const handleContainerEvent = (event: DockerEvent) => {
    switch (event.Action) {
      case "create":
        console.log("컨테이너 생성됨");
        sendInstanceUpdate(deploymentId, "PENDING");
        break;
      case "start":
        console.log("컨테이너 시작함");
        window.electronAPI.getDockerContainers(true).then((containers) => {
          const container = containers.find((c) => c.Id === event.Actor.ID);
          if (container) {
            updateDockerContainer(container);
            sendInstanceUpdate(deploymentId, "RUNNING");
          } else {
            console.error(
              `Container with ID ${event.Actor.ID} not found during start.`
            );
            sendInstanceUpdate(
              deploymentId,
              "PENDING",
              "Container start failed"
            );
          }
        });
        break;

      case "restart":
        console.log("컨테이너 재시작");
        window.electronAPI.getDockerContainers(true).then((containers) => {
          const container = containers.find((c) => c.Id === event.Actor.ID);
          if (container) {
            updateDockerContainer(container);
            sendInstanceUpdate(deploymentId, "RUNNING");
          } else {
            console.error(
              `Container with ID ${event.Actor.ID} not found during restart.`
            );
            sendInstanceUpdate(
              deploymentId,
              "PENDING",
              "Container restart failed"
            );
          }
        });
        break;
      case "kill":
        console.log("컨테이너 강제 종료됨");
        window.electronAPI.getDockerContainers(true).then((containers) => {
          const container = containers.find((c) => c.Id === event.Actor.ID);
          if (container) {
            updateDockerContainer(container);
            sendInstanceUpdate(deploymentId, "STOPPED");
          } else {
            console.error(
              `Container with ID ${event.Actor.ID} not found during kill.`
            );
            sendInstanceUpdate(
              deploymentId,
              "PENDING",
              "Container kill failed"
            );
          }
        });
        break;
      case "die":
        console.log("컨테이너 die");
        window.electronAPI.getDockerContainers(true).then((containers) => {
          const container = containers.find((c) => c.Id === event.Actor.ID);
          if (container) {
            updateDockerContainer(container);
            sendInstanceUpdate(deploymentId, "STOPPED");
          } else {
            console.error(`Container with ID ${event.Actor.ID} not found.`);
            sendInstanceUpdate(
              deploymentId,
              "PENDING",
              "Container die event failed"
            );
          }
        });
        break;
      case "stop":
        console.log("컨테이너 정지함");
        window.electronAPI.getDockerContainers(true).then((containers) => {
          const container = containers.find((c) => c.Id === event.Actor.ID);
          if (container) {
            updateDockerContainer(container);
            sendInstanceUpdate(deploymentId, "STOPPED");
          } else {
            console.error(
              `Container with ID ${event.Actor.ID} not found during stop.`
            );
            sendInstanceUpdate(
              deploymentId,
              "PENDING",
              "Container stop failed"
            );
          }
        });
        break;
      case "destroy":
        console.log("컨테이너 삭제됨");
        removeDockerContainer(event.Actor.ID);
        sendInstanceUpdate(deploymentId, "DELETED");
        break;
      default:
        console.log(`Unhandled container action: ${event.Action}`);
    }
  };

  window.electronAPI.onDockerEventResponse((event: DockerEvent) => {
    switch (event.Type) {
      case "container":
        console.log("컨테이너 이벤트 감지");
        handleContainerEvent(event);
        break;
      case "image":
        console.log("이미지 이벤트 감지");
        handleImageEvent(event);
        break;
      default:
        console.log(`Unhandled Docker event type: ${event.Type}`);
    }
  });

  window.electronAPI.onDockerEventError((error) => {
    console.error("Docker Event Error:", error);
    sendInstanceUpdate(deploymentId, "ERROR", `Docker Event Error: ${error}`);
  });

  return () => {
    window.electronAPI.removeAllDockerEventListeners();
  };
};
