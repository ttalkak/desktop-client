import create from "zustand";

interface AppState {
  dockerStatus: "running" | "not running" | "unknown";
  websocketStatus: "connected" | "connecting" | "disconnected";
  serviceStatus: "running" | "loading" | "stopped";
  dockerImages: DockerImage[];
  dockerContainers: DockerContainer[];
  setDockerStatus: (status: "running" | "not running" | "unknown") => void;
  setWebsocketStatus: (
    status: "connected" | "connecting" | "disconnected"
  ) => void;
  setServiceStatus: (status: "running" | "loading" | "stopped") => void;
  setDockerImages: (images: DockerImage[]) => void;
  setDockerContainers: (containers: DockerContainer[]) => void;
}

export const useAppStore = create<AppState>((set) => ({
  dockerStatus: "unknown",
  websocketStatus: "disconnected",
  serviceStatus: "stopped",
  dockerImages: [],
  dockerContainers: [],
  setDockerStatus: (status) => set({ dockerStatus: status }),
  setWebsocketStatus: (status) => set({ websocketStatus: status }),
  setServiceStatus: (status) => set({ serviceStatus: status }),
  setDockerImages: (images) => set({ dockerImages: images }),
  setDockerContainers: (containers) => set({ dockerContainers: containers }),
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
