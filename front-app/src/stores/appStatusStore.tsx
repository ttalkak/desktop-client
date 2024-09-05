import create from "zustand";
import type { ImageInspectInfo, ContainerInspectInfo } from "dockerode";

// Docker 관련 상태를 관리하는 store
interface AppState {
  dockerStatus: "running" | "not running" | "unknown";
  websocketStatus: "connected" | "connecting" | "disconnected";
  serviceStatus: "running" | "loading" | "stopped";
  dockerImages: ImageInspectInfo[]; // DockerImage 대신 ImageInspectInfo 사용
  dockerContainers: ContainerInspectInfo[]; // DockerContainer 대신 ContainerInspectInfo 사용
  setDockerStatus: (status: "running" | "not running" | "unknown") => void;
  setWebsocketStatus: (
    status: "connected" | "connecting" | "disconnected"
  ) => void;
  setServiceStatus: (status: "running" | "loading" | "stopped") => void;
  setDockerImages: (images: ImageInspectInfo[]) => void;
  updateDockerImage: (updatedImage: ImageInspectInfo) => void;
  removeDockerImage: (imageId: string) => void;
  setDockerContainers: (containers: ContainerInspectInfo[]) => void;
  updateDockerContainer: (updatedContainer: ContainerInspectInfo) => void;
  removeDockerContainer: (containerId: string) => void;
  clearDockerImages: () => void;
  clearDockerContainers: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  dockerStatus: "unknown",
  websocketStatus: "disconnected",
  serviceStatus: "stopped",
  dockerImages: [],
  dockerContainers: [],

  setDockerStatus: (status) => set({ dockerStatus: status }),
  setWebsocketStatus: (status) => set({ websocketStatus: status }),
  setServiceStatus: (status) => set({ serviceStatus: status }),

  setDockerImages: (images) => {
    sessionStorage.setItem("images", JSON.stringify(images));
    set({ dockerImages: images });
  },

  updateDockerImage: (updatedImage) => {
    const currentImages = get().dockerImages;
    const updatedImages = currentImages.map((img) =>
      img.Id === updatedImage.Id ? { ...img, ...updatedImage } : img
    );
    sessionStorage.setItem("images", JSON.stringify(updatedImages));
    set({ dockerImages: updatedImages });
  },

  setDockerContainers: (containers) => {
    sessionStorage.setItem("containers", JSON.stringify(containers));
    set({ dockerContainers: containers });
  },

  updateDockerContainer: (updatedContainer) => {
    const currentContainers = get().dockerContainers;
    const updatedContainers = currentContainers.map((container) =>
      container.Id === updatedContainer.Id
        ? { ...container, ...updatedContainer }
        : container
    );
    sessionStorage.setItem("containers", JSON.stringify(updatedContainers));
    set({ dockerContainers: updatedContainers });
  },

  removeDockerImage: (imageId) => {
    const currentImages = get().dockerImages;
    const updatedImages = currentImages.filter((image) => image.Id !== imageId);
    sessionStorage.setItem("images", JSON.stringify(updatedImages));
    set({ dockerImages: updatedImages });
  },

  removeDockerContainer: (containerId) => {
    const currentContainers = get().dockerContainers;
    const updatedContainers = currentContainers.filter(
      (container) => container.Id !== containerId
    );
    sessionStorage.setItem("containers", JSON.stringify(updatedContainers));
    set({ dockerContainers: updatedContainers });
  },

  clearDockerImages: () => {
    sessionStorage.removeItem("images");
    set({ dockerImages: [] });
  },

  clearDockerContainers: () => {
    sessionStorage.removeItem("containers");
    set({ dockerContainers: [] });
  },
}));

interface CpuState {
  containerCpuUsage: { containerId: string; cpuUsage: number }[];
  updateContainerCpuUsage: (containerId: string, cpuUsage: number) => void;
  removeContainerCpuUsage: (containerId: string) => void;
}

export const useCpuStore = create<CpuState>((set) => ({
  containerCpuUsage: [],

  // 컨테이너 CPU 사용량 업데이트 또는 추가
  updateContainerCpuUsage: (containerId, cpuUsage) =>
    set((state) => {
      const existingContainer = state.containerCpuUsage.find(
        (container) => container.containerId === containerId
      );

      if (existingContainer) {
        // 기존 컨테이너 CPU 사용량 업데이트
        return {
          containerCpuUsage: state.containerCpuUsage.map((container) =>
            container.containerId === containerId
              ? { ...container, cpuUsage }
              : container
          ),
        };
      } else {
        // 새 컨테이너 CPU 사용량 추가
        return {
          containerCpuUsage: [
            ...state.containerCpuUsage,
            { containerId, cpuUsage },
          ],
        };
      }
    }),

  // 컨테이너 CPU 사용량 삭제
  removeContainerCpuUsage: (containerId) =>
    set((state) => ({
      containerCpuUsage: state.containerCpuUsage.filter(
        (container) => container.containerId !== containerId
      ),
    })),
}));
