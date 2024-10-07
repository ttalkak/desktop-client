import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface DeploymentCreate {
  senderId: string;
  instance: DeploymentCommand;
}

export interface Deployment {
  deploymentId: number;
  serviceType: string;
  hasDockerFile?: boolean;
  hasDockerImage?: boolean;
  containerName?: string;
  inboundPort: number;
  outboundPort: number;
  subdomainName: string;
  sourceCodeLink: string;
  dockerRootDirectory: string;
  dockerFileScript: string;
  envs?: EnvironmentVariable[];
  dockerImageName: string | null;
  dockerImageTag: string | null;
}

export interface DeploymentStore {
  containers: Record<string, Deployment>;
  addContainer: (containerId: string | number, deployment: Deployment) => void;
  removeContainer: (containerId: string | number) => void;
  clearAllContainers: () => void;
  getContainerIdById: (deploymentId: string | number) => string | null;
}

export const useDeploymentStore = create<DeploymentStore>()(
  persist(
    (set, get) => ({
      containers: {},

      addContainer: (
        containerId: string | number,
        newDeployment: Deployment
      ) => {
        set((state) => ({
          containers: {
            ...state.containers,
            [containerId]: newDeployment,
          },
        }));
      },

      removeContainer: (containerId: string | number) => {
        set((state) => {
          const { [containerId]: _, ...remainingContainers } = state.containers;
          return { containers: remainingContainers };
        });
      },

      clearAllContainers: () => {
        set({ containers: {} });
      },

      getContainerIdById: (deploymentId: string | number) => {
        const state = get();
        const containerEntry = Object.entries(state.containers).find(
          ([_, deployment]) => deployment.deploymentId === deploymentId
        );

        return containerEntry ? containerEntry[0] : null; // containerId를 반환하거나 null 반환
      },
    }),
    {
      name: "deployments",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);

export default useDeploymentStore;
