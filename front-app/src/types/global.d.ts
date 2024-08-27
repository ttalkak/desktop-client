export {};

declare global {
    interface Window {
      electronAPI: {
        minimizeWindow: () => void;
        maximizeWindow: () => void;
        closeWindow: () => void;
        getDockerImages: () => Promise<string[]>;
        fetchDockerContainers: () => Promise<string[]>;
        getInboundRules: () => Promise<string>;
        togglePort: (name: string, newEnabled: string) => Promise<void>;
      };
    }
  }
  
