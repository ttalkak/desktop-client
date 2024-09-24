import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface DeploymentDetailsState {
  deploymentDetails: {
    [deploymentId: number]: { url?: string; domain?: string; repoUrl?: string };
  };
  setDeploymentDetails: (
    deploymentId: number,
    url?: string,
    domain?: string,
    repoUrl?: string
  ) => void;
  setUrl: (deploymentId: number, url: string) => void;
  setDomain: (deploymentId: number, domain: string) => void;
  setRepoUrl: (deploymentId: number, repoUrl: string) => void;
  getDeploymentDetails: (
    deploymentId: number
  ) => { url?: string; domain?: string; repoUrl?: string } | undefined;
  removeDeploymentDetails: (deploymentId: number) => void;
  clearAllDeploymentDetails: () => void;
}

export const useDeploymentDetailsStore = create<DeploymentDetailsState>()(
  persist(
    (set, get) => ({
      deploymentDetails: {},

      // 기존 setDeploymentDetails (모든 값을 한 번에 설정)
      setDeploymentDetails: (deploymentId, url, domain, repoUrl) =>
        set((state) => ({
          deploymentDetails: {
            ...state.deploymentDetails,
            [deploymentId]: { url, domain, repoUrl },
          },
        })),

      // url만 설정
      setUrl: (deploymentId, url) =>
        set((state) => ({
          deploymentDetails: {
            ...state.deploymentDetails,
            [deploymentId]: {
              ...state.deploymentDetails[deploymentId],
              url,
            },
          },
        })),

      // domain만 설정
      setDomain: (deploymentId, domain) =>
        set((state) => ({
          deploymentDetails: {
            ...state.deploymentDetails,
            [deploymentId]: {
              ...state.deploymentDetails[deploymentId],
              domain,
            },
          },
        })),

      // repoUrl만 설정
      setRepoUrl: (deploymentId, repoUrl) =>
        set((state) => ({
          deploymentDetails: {
            ...state.deploymentDetails,
            [deploymentId]: {
              ...state.deploymentDetails[deploymentId],
              repoUrl,
            },
          },
        })),

      // 특정 deploymentId의 모든 값 가져오기
      getDeploymentDetails: (deploymentId) =>
        get().deploymentDetails[deploymentId],

      // 특정 deploymentId 삭제
      removeDeploymentDetails: (deploymentId) =>
        set((state) => {
          const { [deploymentId]: _, ...rest } = state.deploymentDetails;
          return { deploymentDetails: rest };
        }),

      // 모든 deploymentDetails 삭제
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
