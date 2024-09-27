import { useDockerStore } from "../stores/appStatusStore";
import { useAuthStore } from "../stores/authStore";
import { useDeploymentDetailsStore } from "../stores/deploymentDetailsStore";
import { useDeploymentStore } from "../stores/deploymentStore";

//이벤트 감지시점에 session store를 add, remover, update 합니다.

const addDockerImage = useDockerStore.getState().addDockerImage;
const addDockerContainer = useDockerStore.getState().addDockerContainer;
const removeDockerImage = useDockerStore.getState().removeDockerImage;
const removeDockerContainer = useDockerStore.getState().removeDockerContainer;
const updateDockerImage = useDockerStore.getState().updateDockerImage;
const updateDockerContainer = useDockerStore.getState().updateDockerContainer;

export const registerDockerEventHandlers = () => {
  const userId = useAuthStore.getState().userSettings?.userId; // userSettings에서 userId 가져옴
  const getDeploymentByContainer =
    useDeploymentStore.getState().getDeploymentByContainer; // deploymentId 가져옴
  const getDeploymentDetails =
    useDeploymentDetailsStore.getState().getDeploymentDetails;

  if (!userId) {
    throw new Error("User ID not found. Please ensure user is logged in.");
  }

  const handleImageEvent = (event: DockerEvent) => {
    console.log("image :", event.Action);
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
              console.log(`Store : ImageID ${builtImage.Id} updated.`);
            } else {
              addDockerImage(builtImage);
              console.log(`Store : ImageID ${builtImage.Id} added.`);
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
          } else {
            console.error(
              `Container with ID ${event.Actor.ID} not found during start.`
            );
          }
        });
        break;

      case "stop":
        console.log("eventListner : container stopped.. ");
        try {
          const containers = await window.electronAPI.getDockerContainers(
            false
          );
          const container = containers.find((c) => c.Id === event.Actor.ID);

          // 이벤트 값과 실제 상태간 시간 차이를 고려한 interval 작성
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

            //store 상태 업데이트
            if (inspectedContainer?.State.Running === false) {
              const updatedContainer = {
                ...container,
                State: "stopped",
              };

              updateDockerContainer(updatedContainer);
              console.log(
                `store : ContainerID ${updatedContainer.Id} state forcibly updated to 'stopped'.`
              );
            } else {
              console.warn(
                `Container with ID ${container.Id} is still running after multiple checks.`
              );
            }
          } else {
            console.error(
              `store : Container ID ${event.Actor.ID} not found during stop.`
            );
          }
        } catch (error) {
          console.error(`Error handling stop event: ${error}`);
        }
        break;

      case "destroy":
        console.log("컨테이너 삭제됨");

        // window.electronAPI.stopPgrok(deploymentId);
        window.electronAPI
          .stopContainerStats([event.Actor.ID])
          .then(() => {
            removeDockerContainer(event.Actor.ID);
          })
          .catch((error) => {
            console.error(
              `Failed to stop stats Container ${event.Actor.ID}:`,
              error
            );
            removeDockerContainer(event.Actor.ID);
          });

          
        break;

      default:
        console.log(`Unhandled container action: ${event.Action}`);
    }
  };

  //Container, Image dockerEvent
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

  //이벤트 감지 에러시 => 중앙에 아직 별도로 없음
  window.electronAPI.onDockerEventError((error) => {
    console.error("Docker Event Error:", error);
  });
};
