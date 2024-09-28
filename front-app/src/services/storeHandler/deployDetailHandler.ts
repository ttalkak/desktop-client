import { useDeploymentDetailsStore } from "src/stores/deploymentDetailsStore";
//deployments에 세부정보 저장

export const dockerStateManager = {
  updateContainerDetails: (
    deploymentId: number,
    details: DeploymentCommand,
    url: string
  ) => {
    const { setDeploymentDetails } = useDeploymentDetailsStore.getState();
    setDeploymentDetails(deploymentId, details, url);
    console.log(`Store: ContainerID ${details} details updated.`);
  },
};
