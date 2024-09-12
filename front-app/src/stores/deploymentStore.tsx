import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface DeploymentState {
  deployments: { [deploymentId: number]: string }; // deploymentId를 키로 하고 containerId를 값으로 갖는 객체
  addDeployment: (deploymentId: number, containerId: string) => void;
  removeDeployment: (deploymentId: number) => void;
  getContainerByDeployment: (deploymentId: number) => string | undefined;
  clearAllDeployments: () => void;
}

export const useDeploymentStore = create<DeploymentState>()(
  persist(
    (set, get) => ({
      deployments: {},
      addDeployment: (deploymentId, containerId) =>
        set((state) => ({
          deployments: { ...state.deployments, [deploymentId]: containerId },
        })),
      removeDeployment: (deploymentId) =>
        set((state) => {
          const { [deploymentId]: _, ...rest } = state.deployments;
          return { deployments: rest };
        }),
      getContainerByDeployment: (deploymentId) =>
        get().deployments[deploymentId],
      clearAllDeployments: () =>
        set(() => ({
          deployments: {},
        })),
    }),
    {
      name: "deploymentStore",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
