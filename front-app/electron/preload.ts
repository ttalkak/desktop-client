import { ipcRenderer, contextBridge } from 'electron'

console.log('Preload script loaded');

contextBridge.exposeInMainWorld('electronAPI', {
  getDockerImages: () => {
    console.log("fetching..img preload");
    return ipcRenderer.invoke('get-docker-images');
  },
  fetchDockerContainers: () => {
    console.log('fetchingDocker.. preload');
    return ipcRenderer.invoke('fetch-docker-containers');
  },
  getDockerExecutablePath: () => ipcRenderer.invoke('get-docker-path'), // 올바른 함수 노출
  openDockerDesktop: (dockerPath: string | null) => ipcRenderer.invoke('open-docker-desktop', dockerPath),
  createAndStartContainer: () => ipcRenderer.invoke('create-and-start-container'),
  minimizeWindow: () => {
    ipcRenderer.send('minimize-window');
  },
  maximizeWindow: () => {
    ipcRenderer.send('maximize-window');
  },
  closeWindow: () => {
    ipcRenderer.send('close-window');
  },
  getInboundRules: () => {
    console.log("3. getInboundRules called");
    return ipcRenderer.invoke("get-inbound-rules");8
  },
  togglePort: (name: string, newEnabled: string) => {
    console.log(`Toggling port ${name} to ${newEnabled}`);
    return ipcRenderer.invoke("toggle-port", name, newEnabled);
  },


});


// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },
  // You can expose other APTs you need here.
  // ...
})
