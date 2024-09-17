import { useDockerStore } from "../stores/appStatusStore";
import { Client } from "@stomp/stompjs";

export const registerDockerEventHandlers = (
  client: Client,
  _userId: string = "2",
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
    _details?: string
  ) {
    const message = {
      status: status,
      // message: details || "",
      message: "",
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
              updateDockerContainer(container);
              console.log(`Container with ID ${container.Id} updated.`);
            } else {
              // 컨테이너가 존재하지 않으면 추가
              addDockerContainer(container);
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
              updateDockerContainer(container);
              //stats 출력 다시 시작
              window.electronAPI.startContainerStats([container.Id]);
              window.electronAPI.startLogStream(container.Id);
              console.log(`Container with ID ${container.Id} updated.`);
            } else {
              // 컨테이너가 존재하지 않으면 추가
              addDockerContainer(container);
              window.electronAPI.startLogStream(container.Id);
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
        console.log("kill, 강제종료");
        sendInstanceUpdate(
          deploymentId,
          "PENDING",
          "Container was forcefully stopped (killed)."
        );
        break;

      //컨테이너 정지
      case "stop":
        console.log("컨테이너 정지함");
        try {
          const containers = await window.electronAPI.getDockerContainers(
            false
          );
          let container = containers.find((c) => c.Id === event.Actor.ID);

          console.log("Container from getDockerContainers:", container);

          if (container) {
            let inspectedContainer;
            let attempt = 0;
            const maxAttempts = 5; // 최대 5번 반복 확인

            while (attempt < maxAttempts) {
              inspectedContainer =
                await window.electronAPI.fetchDockerContainer(container.Id);
              console.log(
                `Attempt ${attempt + 1}: Inspect result - Running: ${
                  inspectedContainer.State.Running
                }`
              );

              if (inspectedContainer.State.Running === false) {
                break; // 상태가 false로 변경된 경우 반복 중지
              }

              attempt++;
              await new Promise((resolve) => setTimeout(resolve, 500)); // 0.5초 대기 후 다시 확인
            }

            if (inspectedContainer?.State.Running === false) {
              // 강제로 State와 Status를 변경하고 새로운 객체로 생성
              const updatedContainer = {
                ...container,
                State: "stopped", // Running이 false이므로 상태를 "exited"로 설정
              };

              // 상태를 반영하여 업데이트
              updateDockerContainer(updatedContainer);
              window.electronAPI.stopLogStream(updatedContainer.Id);
              sendInstanceUpdate(deploymentId, "STOPPED");
              console.log("Container state forcibly updated to 'exited'.");
            } else {
              console.warn(
                `Container with ID ${container.Id} is still running after multiple checks.`
              );
              sendInstanceUpdate(
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
              deploymentId,
              "PENDING",
              "Container stop failed"
            );
          }
        } catch (error) {
          console.error(`Error handling stop event: ${error}`);
          sendInstanceUpdate(
            deploymentId,
            "PENDING",
            `Error handling stop event: ${error}`
          );
        }
        break;

      case "die":
        console.log("컨테이너 die");
        try {
          const containers = await window.electronAPI.getDockerContainers(
            false
          );
          const container = containers.find((c) => c.Id === event.Actor.ID);

          console.log("Container from getDockerContainers:", container);

          if (container) {
            sendInstanceUpdate(
              deploymentId,
              "STOPPED",
              "Container died successfully."
            );
          } else {
            console.error(`Container with ID ${event.Actor.ID} not found.`);
            sendInstanceUpdate(
              deploymentId,
              "STOPPED",
              "Container die event failed"
            );
          }
        } catch (error) {
          console.error(`Error handling die event: ${error}`);
          sendInstanceUpdate(
            deploymentId,
            "PENDING",
            `Error handling die event: ${error}`
          );
        }
        break;

      //컨테이너 삭제
      case "destroy":
        console.log("컨테이너 삭제됨");
        // Stats 모니터링 중지
        window.electronAPI
          .stopContainerStats([event.Actor.ID])
          .then((result) => {
            console.log(
              `Stats monitoring stopped for container ${event.Actor.ID}:`,
              result.message
            );
            // Stats 모니터링 중지 후 컨테이너 제거 및 상태 업데이트
            removeDockerContainer(event.Actor.ID);
            sendInstanceUpdate(deploymentId, "DELETED");
          })
          .catch((error) => {
            console.error(
              `Failed to stop stats monitoring for container ${event.Actor.ID}:`,
              error
            );
            // 에러가 발생하더라도 컨테이너 제거 및 상태 업데이트 진행
            removeDockerContainer(event.Actor.ID);
            sendInstanceUpdate(deploymentId, "DELETED");
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
    sendInstanceUpdate(deploymentId, "ERROR", `Docker Event Error: ${error}`);
  });

  return () => {
    window.electronAPI.removeAllDockerEventListeners();
  };
};
