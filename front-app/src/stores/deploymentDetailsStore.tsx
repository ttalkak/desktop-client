import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface DeploymentDetailsState {
  deploymentDetails: {
    [deploymentId: number]: { url?: string; domain?: string };
  };
  setDeploymentDetails: (
    deploymentId: number,
    url?: string,
    domain?: string
  ) => void;
  getDeploymentDetails: (
    deploymentId: number
  ) => { url?: string; domain?: string } | undefined;
  removeDeploymentDetails: (deploymentId: number) => void;
  clearAllDeploymentDetails: () => void;
}

export const useDeploymentDetailsStore = create<DeploymentDetailsState>()(
  persist(
    (set, get) => ({
      deploymentDetails: {},
      setDeploymentDetails: (deploymentId, url, domain) =>
        set((state) => ({
          deploymentDetails: {
            ...state.deploymentDetails,
            [deploymentId]: { url, domain },
          },
        })),
      getDeploymentDetails: (deploymentId) =>
        get().deploymentDetails[deploymentId],
      removeDeploymentDetails: (deploymentId) =>
        set((state) => {
          const { [deploymentId]: _, ...rest } = state.deploymentDetails;
          return { deploymentDetails: rest };
        }),
      clearAllDeploymentDetails: () =>
        set(() => ({
          deploymentDetails: {},
        })),
    }),
    {
      name: "deploymentDetailsStore",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
