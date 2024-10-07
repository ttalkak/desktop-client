import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface CpuUsageData {
  containerId: string;
  cpuUsagePercent: number;
}

interface CpuState {
  osType: OsType;
  containerCpuUsages: CpuUsageData[];
  setOsType: (osType: OsType) => void;
  setContainerCpuUsages: (cpuUsages: CpuUsageData[]) => void;
  updateContainerCpuUsage: (
    containerId: string,
    cpuUsagePercent: number
  ) => void;
  removeContainerCpuUsage: (containerId: string) => void;
}

const initialState: Pick<CpuState, "osType" | "containerCpuUsages"> = {
  osType: "WINDOWS",
  containerCpuUsages: [],
};

export const useCpuStore = create<CpuState>()(
  persist(
    (set) => ({
      ...initialState,
      setOsType: (osType: OsType) => set({ osType }),
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
