import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface Deployment {
  deploymentId: number;
  serviceType: string;
  hasDockerFile?: boolean;
  hasDockerImage?: boolean;
  containerName?: string;
  inboundPort: number;
  outboundPort: number;
  subdomainName: string;
  // subdomainKey: string;
  sourceCodeLink: string;
  dockerRootDirectory: string;
  dockerFileScript: string;
  envs?: EnvironmentVariable[];
  dockerImageName: string | null;
  dockerImageTag: string | null;
}

export interface DeploymentStore {
  containers: Record<string, Deployment>;
  addContainer: (containerId: string, deployment: Deployment) => void;
  removeContainer: (containerId: string) => void;
  clearAllContainers: () => void;
  getContainersByDeployment: (deploymentId: number) => string[];
  getContainerIdByDeploymentIdWithoutDockerImage: (
    deploymentId: number
  ) => string | null;
}

export const useDeploymentStore = create<DeploymentStore>()(
  persist(
    (set, get) => ({
      containers: {},

      addContainer: (containerId: string, newDeployment: Deployment) => {
        set((state) => ({
          containers: {
            ...state.containers,
            [containerId]: newDeployment,
          },
        }));
      },

      removeContainer: (containerId: string) => {
        set((state) => {
          const { [containerId]: _, ...remainingContainers } = state.containers;
          return { containers: remainingContainers };
        });
      },

      clearAllContainers: () => {
        set({ containers: {} });
      },

      getContainersByDeployment: (deploymentId: number) => {
        const state = get();
        return Object.entries(state.containers)
          .filter(([_, deployment]) => deployment.deploymentId === deploymentId)
          .map(([containerId, _]) => containerId);
      },

      getContainerIdByDeploymentIdWithoutDockerImage: (
        deploymentId: number
      ) => {
        const state = get();
        const entry = Object.entries(state.containers).find(
          ([_, deployment]) =>
            deployment.deploymentId === deploymentId &&
            (deployment.dockerImageName === null ||
              deployment.dockerImageName === undefined ||
              deployment.dockerImageName === "")
        );
        return entry ? entry[0] : null;
      },
    }),
    {
      name: "deployments",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);

export default useDeploymentStore;
