declare global {
    interface Window {
      electron: {
        getDockerImages: () => Promise<string[]>;
        fetchDockerContainers: () => Promise<string[]>;
      };
    }
  }
  
  export {};
  