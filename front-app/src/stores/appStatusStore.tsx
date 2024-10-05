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
