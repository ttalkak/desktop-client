import create from "zustand";

interface dockerState {
  images: DockerImage[];
  containers: DockerContainer[];
}

export const useAuthStore = create<dockerState>((set) => ({}));
