import { useDockerStore } from "../stores/appStatusStore";
import { Client } from "@stomp/stompjs";

export const registerDockerEventHandlers = (
  client: Client,
  userId: string,
  deploymentId: number
): (() => void) => {
  window.electronAPI.sendDockerEventRequest();

  console.log("registerDockerEventHandlers 호출됨");

  const addDockerImage = useDockerStore.getState().addDockerImage;
  const addDockerContainer = useDockerStore.getState().addDockerContainer;
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
            const existingImage = useDockerStore
              .getState()
              .dockerImages.find((img) => img.Id === builtImage.Id);

            if (existingImage) {
              // 이미지가 이미 존재하면 업데이트
              useDockerStore.getState().updateDockerImage(builtImage);
              console.log(`Image with ID ${builtImage.Id} updated.`);
            } else {
              // 이미지가 존재하지 않으면 추가
              useDockerStore.getState().addDockerImage(builtImage);
              console.log(`Image with ID ${builtImage.Id} added.`);
            }
          } else {
            console.error(`Built image with ID ${event.Actor.ID} not found.`);
          }
        });
        break;
      case "delete":
        removeDockerImage(event.Actor.ID);

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
          }
        });
        break;
      default:
        console.log(`Unhandled image action: ${event.Action}`);
    }
  };

  const handleContainerEvent = async (event: DockerEvent) => {
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
            const existingContainer = useDockerStore
              .getState()
              .dockerContainers.find((c) => c.Id === container.Id);

            if (existingContainer) {
              // 컨테이너가 이미 존재하면 업데이트
              useDockerStore.getState().updateDockerContainer(container);
              console.log(`Container with ID ${container.Id} updated.`);
            } else {
              // 컨테이너가 존재하지 않으면 추가
              useDockerStore.getState().addDockerContainer(container);
              console.log(`Container with ID ${container.Id} added.`);
            }

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
        console.log("컨테이너 재시작함");
        window.electronAPI.getDockerContainers(true).then((containers) => {
          const container = containers.find((c) => c.Id === event.Actor.ID);
          if (container) {
            const existingContainer = useDockerStore
              .getState()
              .dockerContainers.find((c) => c.Id === container.Id);

            if (existingContainer) {
              // 컨테이너가 이미 존재하면 업데이트
              useDockerStore.getState().updateDockerContainer(container);
              //stats 출력 다시 시작
              window.electronAPI.startContainerStats(container.Id);
              console.log(`Container with ID ${container.Id} updated.`);
            } else {
              // 컨테이너가 존재하지 않으면 추가
              useDockerStore.getState().addDockerContainer(container);
              console.log(`Container with ID ${container.Id} added.`);
            }

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
        try {
          const container = await window.electronAPI.fetchDockerContainer(
            event.Actor.ID
          );
          if (container) {
            updateDockerContainer(container);
            sendInstanceUpdate(deploymentId, "STOPPED");
            console.log("컨테이너 상태가 STOPPED로 업데이트되었습니다.");
          } else {
            console.error(`Container with ID ${event.Actor.ID} not found.`);
            sendInstanceUpdate(deploymentId, "PENDING", "Container not found");
          }
        } catch (error) {
          console.error("Error fetching Docker container:", error);
          sendInstanceUpdate(deploymentId, "PENDING", "Container kill failed");
        }
        break;

      case "die":
        console.log("컨테이너 die");
        window.electronAPI.getDockerContainers(false).then((containers) => {
          const container = containers.find((c) => c.Id === event.Actor.ID);
          console.log("Container from getDockerContainers:", container);
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
        window.electronAPI.getDockerContainers(false).then((containers) => {
          const container = containers.find((c) => c.Id === event.Actor.ID);
          console.log("Container from getDockerContainers:", container);
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
        console.log(`컨테이너 이벤트:${event.Action}`);
        handleContainerEvent(event);
        break;
      case "image":
        console.log(`이미지 이벤트:${event.Action}`);
        handleImageEvent(event);
        break;
      default:
        console.log(`알수 없는 이벤트 ${event.Type} , ${event.Action}`);
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
