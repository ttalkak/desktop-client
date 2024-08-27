export {};

declare global {
    interface Window {
      electronAPI: {
        minimizeWindow: () => void;
        maximizeWindow: () => void;
        closeWindow: () => void;
        getDockerImages: () => Promise<string[]>;
        fetchDockerContainers: () => Promise<string[]>;
      };
    }
  }
  

  