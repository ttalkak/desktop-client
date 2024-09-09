import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ImageInspectInfo, ContainerInspectInfo } from "dockerode";

// App State
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
      name: "appStatusStorage",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);

// Docker State
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
      name: "dockerStore",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);

// CPU State
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
      setContainerCpuUsages: (cpuUsages: CpuUsageData[]) =>
        set({ containerCpuUsages: cpuUsages }),
      updateContainerCpuUsage: (containerId: string, cpuUsagePercent: number) =>
        set((state) => {
          const existingUsageIndex = state.containerCpuUsages.findIndex(
            (container) => container.containerId === containerId
          );
          if (existingUsageIndex >= 0) {
            const updatedUsages = [...state.containerCpuUsages];
            updatedUsages[existingUsageIndex].cpuUsagePercent = cpuUsagePercent;
            return { containerCpuUsages: updatedUsages };
          } else {
            return {
              containerCpuUsages: [
                ...state.containerCpuUsages,
                { containerId, cpuUsagePercent },
              ],
            };
          }
        }),
      removeContainerCpuUsage: (containerId: string) =>
        set((state) => ({
          containerCpuUsages: state.containerCpuUsages.filter(
            (container) => container.containerId !== containerId
          ),
        })),
    }),
    {
      name: "cpuUsageStorage",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
