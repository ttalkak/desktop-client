import { useDockerStore } from "../stores/appStatusStore";
import { sendInstanceUpdate } from "./sendUpdateUtils";

const addDockerImage = useDockerStore.getState().addDockerImage;
const addDockerContainer = useDockerStore.getState().addDockerContainer;
const removeDockerImage = useDockerStore.getState().removeDockerImage;
const removeDockerContainer = useDockerStore.getState().removeDockerContainer;
const updateDockerImage = useDockerStore.getState().updateDockerImage;
const updateDockerContainer = useDockerStore.getState().updateDockerContainer;

export const registerDockerEventHandlers = (
  userId: string,
  deploymentId: number
): (() => void) => {
  const handleImageEvent = (event: DockerEvent) => {
    console.log("이미지 이벤트 :", event.Action);
    switch (event.Action) {
      case "build":
        window.electronAPI.getDockerImages().then((images) => {
          const builtImage = images.find((img) => img.Id === event.Actor.ID);
          if (builtImage) {
            const existingImage = useDockerStore
              .getState()
              .dockerImages.find((img) => img.Id === builtImage.Id);

            if (existingImage) {
              updateDockerImage(builtImage);
              console.log(`Image with ID ${builtImage.Id} updated.`);
            } else {
              addDockerImage(builtImage);
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
      default:
        console.log(`Unhandled image action: ${event.Action}`);
    }
  };

  const handleContainerEvent = async (event: DockerEvent) => {
    switch (event.Action) {
      case "create":
        console.log("컨테이너 생성됨");
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
              updateDockerContainer(container);
              console.log(`Container with ID ${container.Id} updated.`);
            } else {
              addDockerContainer(container);
              console.log(`Container with ID ${container.Id} added.`);
            }

            window.electronAPI.startLogStream(container.Id, deploymentId); // 로그 스트림 시작+els 전송 시작
            sendInstanceUpdate(userId, deploymentId, "RUNNING");
          } else {
            console.error(
              `Container with ID ${event.Actor.ID} not found during start.`
            );
            sendInstanceUpdate(
              userId,
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
              updateDockerContainer(container);
              console.log(`Container with ID ${container.Id} updated.`);
            } else {
              addDockerContainer(container);
              console.log(`Container with ID ${container.Id} added.`);
            }

            window.electronAPI.startContainerStats([container.Id]);
            window.electronAPI.startLogStream(container.Id, deploymentId); // 로그 스트림 시작
            sendInstanceUpdate(userId, deploymentId, "RUNNING");
          } else {
            console.error(
              `Container with ID ${event.Actor.ID} not found during restart.`
            );
            sendInstanceUpdate(
              userId,
              deploymentId,
              "PENDING",
              "Container restart failed"
            );
          }
        });
        break;

      case "kill":
        console.log("kill, 강제종료");
        break;

      case "die":
        console.log("컨테이너 die");
        break;

      case "stop":
        console.log("컨테이너 정지함");
        try {
          const containers = await window.electronAPI.getDockerContainers(
            false
          );
          const container = containers.find((c) => c.Id === event.Actor.ID);

          console.log("Container from getDockerContainers:", container);

          if (container) {
            let inspectedContainer;
            let attempt = 0;
            const maxAttempts = 5;

            while (attempt < maxAttempts) {
              inspectedContainer =
                await window.electronAPI.fetchDockerContainer(container.Id);
              console.log(
                `Attempt ${attempt + 1}: Inspect result - Running: ${
                  inspectedContainer.State.Running
                }`
              );

              if (inspectedContainer.State.Running === false) {
                break;
              }

              attempt++;
              await new Promise((resolve) => setTimeout(resolve, 500));
            }

            if (inspectedContainer?.State.Running === false) {
              const updatedContainer = {
                ...container,
                State: "stopped",
              };

              updateDockerContainer(updatedContainer);
              window.electronAPI.stopLogStream(updatedContainer.Id); // 로그 스트림 중지
              sendInstanceUpdate(userId, deploymentId, "STOPPED");
              console.log("Container state forcibly updated to 'stopped'.");
            } else {
              console.warn(
                `Container with ID ${container.Id} is still running after multiple checks.`
              );
              sendInstanceUpdate(
                userId,
                deploymentId,
                "RUNNING",
                "Container was not stopped successfully."
              );
            }
          } else {
            console.error(
              `Container with ID ${event.Actor.ID} not found during stop.`
            );
            sendInstanceUpdate(
              userId,
              deploymentId,
              "PENDING",
              "Container stop failed"
            );
          }
        } catch (error) {
          console.error(`Error handling stop event: ${error}`);
          sendInstanceUpdate(
            userId,
            deploymentId,
            "PENDING",
            `Error handling stop event: ${error}`
          );
        }
        break;

      case "destroy":
        console.log("컨테이너 삭제됨");
        window.electronAPI
          .stopContainerStats([event.Actor.ID])
          .then((result) => {
            console.log(
              `Stats monitoring stopped for container ${event.Actor.ID}:`,
              result.message
            );
            removeDockerContainer(event.Actor.ID);
            sendInstanceUpdate(userId, deploymentId, "DELETED");
            window.electronAPI.stopLogStream(event.Actor.ID); // 로그 스트림 중지
          })
          .catch((error) => {
            console.error(
              `Failed to stop stats monitoring for container ${event.Actor.ID}:`,
              error
            );
            removeDockerContainer(event.Actor.ID);
            sendInstanceUpdate(userId, deploymentId, "DELETED");
          });
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
    sendInstanceUpdate(
      userId,
      deploymentId,
      "ERROR",
      `Docker Event Error: ${error}`
    );
  });

  return () => {
    window.electronAPI.removeAllDockerEventListeners();
  };
};
