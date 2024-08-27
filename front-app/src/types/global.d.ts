export {};

declare global {
  interface Window {
    electronAPI: {
      getInboundRules: () => Promise<string>;
      togglePort: (name: string, newEnabled: string) => Promise<void>;
    };
  }
}
