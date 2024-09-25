import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// DeploymentDetails 인터페이스 (상태 관리할 상세 정보)
interface DeploymentDetails {
  url?: string;
  domain?: string;
  repoUrl?: string;
  details: DeploymentCommand;
}

// Zustand 스토어 인터페이스
interface DeploymentDetailsState {
  deploymentDetails: {
    [deploymentId: number]: DeploymentDetails;
  };
  setDeploymentDetails: (
    deploymentId: number,
    details: DeploymentCommand,
    url?: string,
    domain?: string,
    repoUrl?: string
  ) => void;
  setUrl: (deploymentId: number, url: string) => void;
  setDomain: (deploymentId: number, domain: string) => void;
  setRepoUrl: (deploymentId: number, repoUrl: string) => void;
  getDeploymentDetails: (deploymentId: number) => DeploymentDetails | undefined;
  removeDeploymentDetails: (deploymentId: number) => void;
  clearAllDeploymentDetails: () => void;
}

// Zustand 스토어 생성
export const useDeploymentDetailsStore = create<DeploymentDetailsState>()(
  persist(
    (set, get) => ({
      deploymentDetails: {},

      // deployment 세부사항과 URL, Domain, Repo URL 설정
      setDeploymentDetails: (deploymentId, details, url, domain, repoUrl) =>
        set((state) => ({
          deploymentDetails: {
            ...state.deploymentDetails,
            [deploymentId]: {
              url,
              domain,
              repoUrl,
              details,
            },
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

      // deployment 세부사항 가져오기
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
