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
