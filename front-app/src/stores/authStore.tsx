import { create } from "zustand";

export interface SettingState {
  userId: string;
  maxCPU: number;
  maxMemory: number;
  maxCompute: number;
  availablePortStart: number;
  availablePortEnd: number;
  address: string | "";
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  userSettings: SettingState | null;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUserSettings: (settings: SettingState) => void;
  clearTokens: () => void;
}

interface PortStore {
  portSet: Set<number>;
  setPortSet: (ports: Set<number>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: sessionStorage.getItem("accessToken"),
  refreshToken: sessionStorage.getItem("refreshToken"),
  userSettings: JSON.parse(sessionStorage.getItem("userSettings") || "null"),

  setTokens: (accessToken, refreshToken) => {
    sessionStorage.setItem("accessToken", accessToken);
    sessionStorage.setItem("refreshToken", refreshToken);
    set({ accessToken, refreshToken });
  },

  setUserSettings: (settings) => {
    sessionStorage.setItem("userSettings", JSON.stringify(settings));
    set({ userSettings: settings });
  },

  clearTokens: () => {
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("refreshToken");
    sessionStorage.removeItem("userSettings");
    sessionStorage.removeItem("portSet");
    set({ accessToken: null, refreshToken: null });
  },
}));

export const usePortStore = create<PortStore>((set) => ({
  portSet: new Set(JSON.parse(sessionStorage.getItem("portSet") || "[]")),

  setPortSet: (ports: Set<number>) => {
    sessionStorage.setItem("portSet", JSON.stringify([...ports]));
    set({ portSet: ports });
  },
}));
