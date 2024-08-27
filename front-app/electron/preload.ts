import { ipcRenderer, contextBridge } from 'electron'

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

console.log('Preload script loaded');

contextBridge.exposeInMainWorld('electronAPI', {
  getDockerImages: async (): Promise<DockerImage[]> => ipcRenderer.invoke('get-docker-images'),
  getDockerContainers: async (): Promise<DockerContainer[]> => ipcRenderer.invoke('get-docker-containers'),
  
  //도커 API 접근하는 
  getContainers: async ():Promise<DockerContainer[]> => {
    try {
      const containers = await ipcRenderer.invoke('fetch-docker-containers');
      return containers;
    } catch (error) {
      console.error('Error fetching Docker containers:', error);
      throw error;
    }
  },
});
