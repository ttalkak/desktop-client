export {};

declare global {
  interface Window {
    electronAPI: {
      getInboundRules: () => Promise<string>;
    };
  }
}
