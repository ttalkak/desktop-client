import { useDockerStore } from "../stores/appStatusStore";
import { sendInstanceUpdate } from "./sendUpdateUtils";
import { useAuthStore } from "../stores/authStore";
import { useDeploymentDetailsStore } from "../stores/deploymentDetailsStore";
import { useDeploymentStore } from "../stores/deploymentStore";

const addDockerImage = useDockerStore.getState().addDockerImage;
const addDockerContainer = useDockerStore.getState().addDockerContainer;
const removeDockerImage = useDockerStore.getState().removeDockerImage;
const removeDockerContainer = useDockerStore.getState().removeDockerContainer;
const updateDockerImage = useDockerStore.getState().updateDockerImage;
const updateDockerContainer = useDockerStore.getState().updateDockerContainer;

export const registerDockerEventHandlers = () => {
  //도커 이벤트 감지 시작
  window.electronAPI.sendDockerEventRequest();

  const userId = useAuthStore.getState().userSettings?.userId; // userSettings에서 userId 가져옴
  const getDeploymentByContainer =
    useDeploymentStore.getState().getDeploymentByContainer; // deploymentId 가져옴
  const getDeploymentDetails =
    useDeploymentDetailsStore.getState().getDeploymentDetails;

  if (!userId) {
    throw new Error("User ID not found. Please ensure user is logged in.");
  }

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
    const deploymentId = getDeploymentByContainer(event.Actor.ID); // 컨테이너 ID로 deploymentId 조회
    if (!deploymentId) {
      console.error(
        `No deployment found for container ID: ${event.Actor.ID}, ${deploymentId}`
      );

      return;
    }

    const deploymentDetails = getDeploymentDetails(deploymentId);
    if (!deploymentDetails) {
      console.error(`No details found for deployment ID: ${deploymentId}`);
      return;
    }

    const port = deploymentDetails.details?.outboundPort;

    switch (event.Action) {
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

            window.electronAPI.startLogStream(container.Id); // 로그 스트림 시작+els 전송 시작
            sendInstanceUpdate(userId, deploymentId, "RUNNING", port);
          } else {
            console.error(
              `Container with ID ${event.Actor.ID} not found during start.`
            );
            sendInstanceUpdate(
              userId,
              deploymentId,
              "PENDING",
              port,
              "Container start failed"
            );
          }
        });
        break;

      case "stop":
        console.log("컨테이너 정지함");
        try {
          const containers = await window.electronAPI.getDockerContainers(
            false
          );
          const container = containers.find((c) => c.Id === event.Actor.ID);

          if (container) {
            let inspectedContainer;
            let attempt = 0;
            const maxAttempts = 5;

            while (attempt < maxAttempts) {
              inspectedContainer =
                await window.electronAPI.fetchDockerContainer(container.Id);

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
              sendInstanceUpdate(userId, deploymentId, "STOPPED", port);
              console.log("Container state forcibly updated to 'stopped'.");
            } else {
              console.warn(
                `Container with ID ${container.Id} is still running after multiple checks.`
              );
              sendInstanceUpdate(
                userId,
                deploymentId,
                "RUNNING",
                port,
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
              "STOPPED",
              port,
              "Container stop failed"
            );
          }
        } catch (error) {
          console.error(`Error handling stop event: ${error}`);
          sendInstanceUpdate(
            userId,
            deploymentId,
            "PENDING",
            port,
            `Error handling stop event: ${error}`
          );
        }
        break;

      case "destroy":
        console.log("컨테이너 삭제됨");
        //컨테이너 삭제시 pgrok 종료
        window.electronAPI.stopPgrok(deploymentId);
        window.electronAPI
          .stopContainerStats([event.Actor.ID])
          .then((_result) => {
            window.electronAPI.stopLogStream(event.Actor.ID); // 로그 스트림 중지
            // sendInstanceUpdate(userId, deploymentId, "STOPPED", port);
            sendInstanceUpdate(userId, deploymentId, "DELETED", port);
            removeDockerContainer(event.Actor.ID);
          })
          .catch((error) => {
            console.error(
              `Failed to stop stats monitoring for container ${event.Actor.ID}:`,
              error
            );
            sendInstanceUpdate(userId, deploymentId, "DELETED", port);
            removeDockerContainer(event.Actor.ID);
          });
        break;

      default:
        console.log(`Unhandled container action: ${event.Action}`);
    }
  };

  window.electronAPI.onDockerEventResponse((event: DockerEvent) => {
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
  });

  window.electronAPI.onDockerEventError((error) => {
    console.error("Docker Event Error:", error);
  });
};
