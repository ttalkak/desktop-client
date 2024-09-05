import create from "zustand";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearTokens: () => void;
}

interface PortStore {
  portSet: Set<number>;
  setPortSet: (ports: Set<number>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: sessionStorage.getItem("accessToken"),
  refreshToken: sessionStorage.getItem("refreshToken"),

  setTokens: (accessToken, refreshToken) => {
    sessionStorage.setItem("accessToken", accessToken);
    sessionStorage.setItem("refreshToken", refreshToken);
    set({ accessToken, refreshToken });
  },

  clearTokens: () => {
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("refreshToken");
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
