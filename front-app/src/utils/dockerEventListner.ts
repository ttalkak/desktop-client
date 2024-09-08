import { useDockerStore } from "../stores/appStatusStore";

//도커 상태 관리 위한 함수
export const registerDockerEventHandlers = (): (() => void) => {
  const setDockerImages = useDockerStore.getState().setDockerImages;
  const addDockerContainer = useDockerStore.getState().addDockerContainer;
  const removeDockerContainer = useDockerStore.getState().removeDockerContainer;
  const updateDockerContainer = useDockerStore.getState().updateDockerContainer;
  const removeDockerImage = useDockerStore.getState().removeDockerImage;
  const updateDockerImage = useDockerStore.getState().updateDockerImage;

  console.log("도커 이벤트 감지 시작");

  // 이미지 pull, 불러오기, 빌드, 제거, 태그,
  const handleImageEvent = (event: DockerEvent) => {
    console.log("이벤트 :", event.Action);
    switch (event.Action) {
      case "pull":
      case "import":
      case "build":
        window.electronAPI.getDockerImages().then((images) => {
          setDockerImages(images);
        });
        break;
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
      case "create":
        window.electronAPI.getDockerContainers(true).then((containers) => {
          const container = containers.find((c) => c.Id === event.Actor.ID);
          if (container) {
            addDockerContainer(container);
          } else {
            console.error(`Container with ID ${event.Actor.ID} not found.`);
          }
        });
        break;
      case "start":
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
      case "die":
        removeDockerContainer(event.Actor.ID);
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

  window.electronAPI.onDockerEventResponse((event: DockerEvent) => {
    console.log(event, "dkkslkfjdlskjflks");
    switch (event.Type) {
      case "container":
        handleContainerEvent(event);
        break;
      case "image":
        handleImageEvent(event);
        break;
      default:
        console.log(`Unhandled Docker event type: ${event.Type}`);
    }
  });
  // 이벤트 핸들러 제거 함수 반환
  return () => {
    window.electronAPI.removeAllDockerEventListeners();
  };
};
