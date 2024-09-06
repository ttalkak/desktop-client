import { useDockerStore } from "../stores/appStatusStore";

export const registerDockerEventHandlers = (): (() => void) => {
  const setDockerImages = useDockerStore.getState().setDockerImages;
  const addDockerContainer = useDockerStore.getState().addDockerContainer;
  const removeDockerContainer = useDockerStore.getState().removeDockerContainer;
  const updateDockerContainer = useDockerStore.getState().updateDockerContainer;
  const removeDockerImage = useDockerStore.getState().removeDockerImage;
  const updateDockerImage = useDockerStore.getState().updateDockerImage;

  const handleContainerEvent = (event: DockerEvent) => {
    switch (event.Action) {
      case "create":
        window.electronAPI.getDockerContainers().then((containers) => {
          const container = containers.find((c) => c.Id === event.Actor.ID);
          if (container) {
            addDockerContainer(container);
          } else {
            console.error(`Container with ID ${event.Actor.ID} not found.`);
          }
        });
        break;
      case "start":
        window.electronAPI.getDockerContainers().then((containers) => {
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
        window.electronAPI.getDockerContainers().then((containers) => {
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

  const handleImageEvent = (event: DockerEvent) => {
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

  window.electronAPI.onDockerEventResponse((event: DockerEvent) => {
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
