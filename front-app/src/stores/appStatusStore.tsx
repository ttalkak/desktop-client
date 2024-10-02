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
      name: "appStatus",
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
      name: "cpuUsage",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
