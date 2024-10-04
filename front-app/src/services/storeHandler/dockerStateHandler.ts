import { useDockerStore } from "../../stores/dockerStore";
import useDeploymentStore from "../../stores/deploymentStore";
import { sendInstanceUpdate } from "../websocket/sendUpdateUtils";

export const dockerStateManager = {
  //dockerContainer 상태값 변화(running..stopped..)
  updateContainerState: async (containerId: string, newState: string) => {
    const { updateDockerContainer, dockerContainers } =
      useDockerStore.getState();

    // 해당 container의 deployment 정보를 가져옵니다.
    const deployment = useDeploymentStore.getState().containers[containerId];
    const deploymentId = deployment ? deployment.deploymentId : undefined;
    const compute = deployment;

    if (!deploymentId) {
      console.error(`No deployment found for container ID: ${containerId}`);
      return;
    }

    if (!compute) {
      console.error(`no deployment detail for ${deploymentId} `);
    }
    const container = dockerContainers.find((c) => c.Id === containerId);

    if (container) {
      updateDockerContainer(containerId, { State: newState });
      console.log(
        `Store: ContainerID ${containerId} state updated to '${newState}'.`
      );

      if (newState === "error") {
        sendInstanceUpdate(
          deployment.serviceType,
          deploymentId,
          "ERROR",
          compute?.outboundPort,
          `${newState} 전환 실패`
        );
      }
    } else {
      console.error(`Container with ID ${containerId} not found in store.`);
    }
  },

  removeContainer: (containerId: string) => {
    const { removeDockerContainer } = useDockerStore.getState();
    removeDockerContainer(containerId);
    console.log(`Store: ContainerID ${containerId} removed.`);
  },

  updateImageState: (imageId: string, updates: Partial<DockerImage>) => {
    const { updateDockerImage } = useDockerStore.getState();
    updateDockerImage(imageId, updates);
    console.log(`Store: ImageID ${imageId} updated.`);
  },

  removeImage: (imageId: string) => {
    const { removeDockerImage } = useDockerStore.getState();
    removeDockerImage(imageId);
    console.log(`Store: ImageID ${imageId} removed.`);
  },

  addContainer: (newContainer: DockerContainer) => {
    const { addDockerContainer } = useDockerStore.getState();
    addDockerContainer(newContainer);
    console.log(`Store: ContainerID ${newContainer.Id} added.`);
  },

  addImage: (newImage: DockerImage) => {
    const { addDockerImage } = useDockerStore.getState();
    addDockerImage(newImage);
    console.log(`Store: ImageID ${newImage.Id} added.`);
  },
};
