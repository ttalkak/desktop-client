import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

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
  dockerImages: DockerImage[];
  dockerContainers: DockerContainer[];
  setDockerImages: (images: DockerImage[]) => void;
  addDockerImage: (newImage: DockerImage) => void;
  updateDockerImage: (updatedImage: DockerImage) => void;
  removeDockerImage: (imageId: string) => void;
  clearDockerImages: () => void;
  setDockerContainers: (containers: DockerContainer[]) => void;
  addDockerContainer: (newContainer: DockerContainer) => void;
  updateDockerContainer: (updatedContainer: DockerContainer) => void;
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
        set((state) => {
          // Check if the image already exists
          const existingImageIndex = state.dockerImages.findIndex(
            (image) => image.Id === newImage.Id
          );
          if (existingImageIndex !== -1) {
            // Update existing image
            const updatedImages = [...state.dockerImages];
            updatedImages[existingImageIndex] = newImage;
            return { dockerImages: updatedImages };
          } else {
            // Add new image
            return { dockerImages: [...state.dockerImages, newImage] };
          }
        }),
      updateDockerImage: (updatedImage) =>
        set((state) => ({
          dockerImages: state.dockerImages.map((image) =>
            image.Id === updatedImage.Id ? updatedImage : image
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
        set((state) => {
          const existingContainerIndex = state.dockerContainers.findIndex(
            (container) => container.Id === newContainer.Id
          );

          if (existingContainerIndex !== -1) {
            // Update existing container
            const updatedContainers = [...state.dockerContainers];
            updatedContainers[existingContainerIndex] = newContainer;
            return { dockerContainers: updatedContainers };
          } else {
            // Add new container
            return {
              dockerContainers: [...state.dockerContainers, newContainer],
            };
          }
        }),
      updateDockerContainer: (updatedContainer) => {
        set((state) => {
          const newContainers = state.dockerContainers.map((container) =>
            container.Id === updatedContainer.Id ? updatedContainer : container
          );
          console.log("컨테이너 업데이트 실행", newContainers);
          return { dockerContainers: newContainers };
        });
      },

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
            // Update existing CPU usage
            const updatedUsages = [...state.containerCpuUsages];
            updatedUsages[existingUsageIndex].cpuUsagePercent = cpuUsagePercent;
            return { containerCpuUsages: updatedUsages };
          } else {
            // Add new CPU usage
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
