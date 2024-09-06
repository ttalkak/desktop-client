import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ImageInspectInfo, ContainerInspectInfo } from "dockerode";

// 앱 상태 관련 인터페이스 정의
interface AppState {
  dockerStatus: "running" | "not running" | "unknown";
  websocketStatus: "connected" | "connecting" | "disconnected";
  serviceStatus: "running" | "loading" | "stopped";
  setDockerStatus: (status: "running" | "not running" | "unknown") => void;
  setWebsocketStatus: (
    status: "connected" | "connecting" | "disconnected"
  ) => void;
  setServiceStatus: (status: "running" | "loading" | "stopped") => void;
}

// 앱 상태를 관리하는 store
export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      dockerStatus: "unknown",
      websocketStatus: "disconnected",
      serviceStatus: "stopped",
      setDockerStatus: (status) => set({ dockerStatus: status }),
      setWebsocketStatus: (status) => set({ websocketStatus: status }),
      setServiceStatus: (status) => set({ serviceStatus: status }),
    }),
    {
      name: "app-status-storage",
      getStorage: () => sessionStorage,
    }
  )
);

// Docker 관련 상태를 관리하는 인터페이스
interface DockerState {
  dockerImages: ImageInspectInfo[];
  dockerContainers: ContainerInspectInfo[];
  setDockerImages: (images: ImageInspectInfo[]) => void;
  addDockerImage: (newImage: ImageInspectInfo) => void;
  updateDockerImage: (updatedImage: ImageInspectInfo) => void;
  removeDockerImage: (imageId: string) => void;
  clearDockerImages: () => void;

  setDockerContainers: (containers: ContainerInspectInfo[]) => void;
  addDockerContainer: (newContainer: ContainerInspectInfo) => void;
  updateDockerContainer: (updatedContainer: ContainerInspectInfo) => void;
  removeDockerContainer: (containerId: string) => void;
  clearDockerContainers: () => void;
}

// Docker 상태를 관리하는 store
export const useDockerStore = create<DockerState>()(
  persist(
    (set) => ({
      dockerImages: [],
      dockerContainers: [],

      setDockerImages: (images) => set({ dockerImages: images }),

      addDockerImage: (newImage) =>
        set((state) => ({
          dockerImages: [...state.dockerImages, newImage],
        })),

      updateDockerImage: (updatedImage) =>
        set((state) => ({
          dockerImages: state.dockerImages.map((img) =>
            img.Id === updatedImage.Id ? { ...img, ...updatedImage } : img
          ),
        })),

      removeDockerImage: (imageId) =>
        set((state) => ({
          dockerImages: state.dockerImages.filter(
            (image) => image.Id !== imageId
          ),
        })),

      clearDockerImages: () => set({ dockerImages: [] }),

      setDockerContainers: (containers) =>
        set({ dockerContainers: containers }),

      addDockerContainer: (newContainer) =>
        set((state) => ({
          dockerContainers: [...state.dockerContainers, newContainer],
        })),

      updateDockerContainer: (updatedContainer) =>
        set((state) => ({
          dockerContainers: state.dockerContainers.map((container) =>
            container.Id === updatedContainer.Id
              ? { ...container, ...updatedContainer }
              : container
          ),
        })),

      removeDockerContainer: (containerId) =>
        set((state) => ({
          dockerContainers: state.dockerContainers.filter(
            (container) => container.Id !== containerId
          ),
        })),

      clearDockerContainers: () => set({ dockerContainers: [] }),
    }),
    {
      name: "docker-store",
      getStorage: () => sessionStorage,
    }
  )
);

//--------------------------------------- CPU 사용 정보

type CpuState = {
  containerCpuUsages: CpuUsageData[];
  setContainerCpuUsages: (cpuUsages: CpuUsageData[]) => void;
  updateContainerCpuUsage: (
    containerId: string,
    cpuUsagePercent: number
  ) => void;
  removeContainerCpuUsage: (containerId: string) => void;
};

export const useCpuStore = create<CpuState>()(
  persist(
    (set) => ({
      containerCpuUsages: [],

      // 전체 CPU 사용량 정보를 설정
      setContainerCpuUsages: (cpuUsages: CpuUsageData[]) =>
        set({ containerCpuUsages: cpuUsages }),

      // 특정 컨테이너의 CPU 사용량을 업데이트
      updateContainerCpuUsage: (containerId: string, cpuUsagePercent: number) =>
        set((state) => {
          const existingUsageIndex = state.containerCpuUsages.findIndex(
            (container) => container.containerId === containerId
          );

          if (existingUsageIndex >= 0) {
            // 기존 컨테이너의 CPU 사용량 업데이트
            const updatedUsages = [...state.containerCpuUsages];
            updatedUsages[existingUsageIndex].cpuUsagePercent = cpuUsagePercent;
            return { containerCpuUsages: updatedUsages };
          } else {
            // 새로운 컨테이너의 CPU 사용량 추가
            return {
              containerCpuUsages: [
                ...state.containerCpuUsages,
                { containerId, cpuUsagePercent },
              ],
            };
          }
        }),

      // 특정 컨테이너의 CPU 사용량 정보를 제거
      removeContainerCpuUsage: (containerId: string) =>
        set((state) => ({
          containerCpuUsages: state.containerCpuUsages.filter(
            (container) => container.containerId !== containerId
          ),
        })),
    }),
    {
      name: "cpu-usage-storage",
      getStorage: () => sessionStorage,
    }
  )
);
