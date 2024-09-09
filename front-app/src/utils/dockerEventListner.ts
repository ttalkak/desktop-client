import { useDockerStore } from "../stores/appStatusStore";

//도커 상태 관리 위한 함수
export const registerDockerEventHandlers = (): (() => void) => {
  window.electronAPI.sendDockerEventRequest();

  console.log("registerDockerEventHandlers 호출됨");
  // 추가
  // const addDockerImage = useDockerStore.getState().addDockerImage;
  // const addDockerContainer = useDockerStore.getState().addDockerContainer;
  //삭제
  const removeDockerImage = useDockerStore.getState().removeDockerImage;
  const removeDockerContainer = useDockerStore.getState().removeDockerContainer;
  //업데이트
  const updateDockerImage = useDockerStore.getState().updateDockerImage;
  const updateDockerContainer = useDockerStore.getState().updateDockerContainer;

  // 이미지 pull, 불러오기, 빌드, 제거, 태그,
  const handleImageEvent = (event: DockerEvent) => {
    console.log("이벤트 :", event.Action);
    switch (event.Action) {
      case "pull":
      case "import":
        break;
      // case "build":
      //   window.electronAPI.getDockerImages().then((images) => {
      //     // 빌드된 이미지를 식별할 수 있는 방법을 사용해야 합니다.
      //     const builtImage = images.find((img) => img.Id === event.Actor.ID);
      //     if (builtImage) {
      //       addDockerImage(builtImage);
      //     } else {
      //       console.error(`Built image with ID ${event.Actor.ID} not found.`);
      //     }
      //   });
      // break;
      case "remove":
        removeDockerImage(event.Actor.ID);
        break;
      case "tag":
        window.electronAPI.getDockerImages().then((images) => {
          const updatedImage = images.find((img) => img.Id === event.Actor.ID);
          if (updatedImage) {
            updateDockerImage(updatedImage);
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
  //컨테이너 생성, 시작, 정지, 죽음..? , 재시작, 삭제
  const handleContainerEvent = (event: DockerEvent) => {
    switch (event.Action) {
      // case "create":
      //   window.electronAPI.getDockerContainers(true).then((containers) => {
      //     const container = containers.find((c) => c.Id === event.Actor.ID);
      //     if (container) {
      //       addDockerContainer(container);
      //     } else {
      //       console.error(`Container with ID ${event.Actor.ID} not found.`);
      //     }
      //   });
      //   break;
      case "start":
        console.log("컨테이너 시작함");
        window.electronAPI.getDockerContainers(true).then((containers) => {
          const container = containers.find((c) => c.Id === event.Actor.ID);
          if (container) {
            updateDockerContainer(container);
          } else {
            console.error(
              `Container with ID ${event.Actor.ID} not found during start.`
            );
          }
        });
        break;
      case "stop":
        window.electronAPI.getDockerContainers(true).then((containers) => {
          const container = containers.find((c) => c.Id === event.Actor.ID);
          if (container) {
            updateDockerContainer({
              ...container,
              State: { ...container.State, Status: "stopped" },
            });
          } else {
            console.error(
              `Container with ID ${event.Actor.ID} not found during stop.`
            );
          }
        });
        break;

      case "die":
        window.electronAPI.getDockerContainers(true).then((containers) => {
          const container = containers.find((c) => c.Id === event.Actor.ID);
          if (container) {
            updateDockerContainer({
              ...container,
              State: { ...container.State, Status: "dead" },
            });
          } else {
            console.error(
              `Container with ID ${event.Actor.ID} not found during die.`
            );
          }
        });
        break;
      case "restart":
        window.electronAPI.getDockerContainers(true).then((containers) => {
          const updatedContainer = containers.find(
            (c) => c.Id === event.Actor.ID
          );
          if (updatedContainer) {
            updateDockerContainer(updatedContainer);
          } else {
            console.error(`Container with ID ${event.Actor.ID} not found.`);
          }
        });
        break;
      case "destroy":
        removeDockerContainer(event.Actor.ID);
        break;
      default:
        console.log(`Unhandled container action: ${event.Action}`);
    }
  };

  // Docker 이벤트 감지 시작
  window.electronAPI.onDockerEventResponse((event: DockerEvent) => {
    console.log(event, "Docker Event 감지");
    switch (event.Type) {
      case "container":
        console.log(event, "컨테이너 이벤트 감지");
        handleContainerEvent(event);
        break;
      case "image":
        console.log(event, "이미지 이벤트 감지");
        handleImageEvent(event);
        break;
      default:
        console.log(`Unhandled Docker event type: ${event.Type}`);
    }
  });

  // 에러 및 종료 처리
  window.electronAPI.onDockerEventError((error) => {
    console.error("Docker Event Error:", error);
  });

  // 이벤트 핸들러 제거 함수 반환
  return () => {
    window.electronAPI.removeAllDockerEventListeners();
  };
};
