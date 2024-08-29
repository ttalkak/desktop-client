import { ipcRenderer, contextBridge } from "electron";

type LogCallback = (log: string) => void;
type ErrorCallback = (error: string) => void;
type EndCallback = () => void;

console.log("Preload script loaded");

contextBridge.exposeInMainWorld("electronAPI", {
  getDockerImages: () => {
    console.log("fetching..img preload");
    return ipcRenderer.invoke("get-docker-images");
  },
  fetchDockerContainers: () => {
    console.log("fetchingDocker.. preload");
    return ipcRenderer.invoke("fetch-docker-containers");
  },
  getDockerExecutablePath: () => {
    return ipcRenderer.invoke("get-docker-path");
  }, // 올바른 함수 노출
  openDockerDesktop: (dockerPath: string | null) =>
    ipcRenderer.invoke("open-docker-desktop", dockerPath),
  createAndStartContainer: () =>
    ipcRenderer.invoke("create-and-start-container"),

  //도커 이벤트 감지// handle = invoke 사용한 비동기 처리
  getDockerEvent: async () => {
    try {
      const data = await ipcRenderer.invoke("get-docker-event"); // 비동기적으로 요청
      console.log("Received Docker event data:", data);
      return data;
    } catch (error) {
      console.error("Error receiving Docker event:", error);
      throw error;
    }
  },

  //로그가져오기
  startLogStream: (containerId: string) =>
    ipcRenderer.send("start-container-log-stream", containerId), // 로그 스트림 시작
  onLogStream: (callback: LogCallback) =>
    ipcRenderer.on("container-logs-stream", (_event, log) => callback(log)), // 로그 데이터 수신
  onLogError: (callback: ErrorCallback) =>
    ipcRenderer.on("container-logs-error", (_event, error) => callback(error)), // 오류 수신
  onLogEnd: (callback: EndCallback) =>
    ipcRenderer.on("container-logs-end", () => callback()), // 로그 스트림 종료 수신

  minimizeWindow: () => {
    ipcRenderer.send("minimize-window");
  },
  maximizeWindow: () => {
    ipcRenderer.send("maximize-window");
  },
  closeWindow: () => {
    ipcRenderer.send("close-window");
  },
  getInboundRules: () => {
    console.log("3. getInboundRules called");
    return ipcRenderer.invoke("get-inbound-rules");
    8;
  },
  togglePort: (name: string, newEnabled: string) => {
    console.log(`Toggling port ${name} to ${newEnabled}`);
    return ipcRenderer.invoke("toggle-port", name, newEnabled);
  },
});

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args;
    return ipcRenderer.on(channel, (event, ...args) =>
      listener(event, ...args)
    );
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args;
    return ipcRenderer.off(channel, ...omit);
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args;
    return ipcRenderer.send(channel, ...omit);
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args;
    return ipcRenderer.invoke(channel, ...omit);
  },
  // You can expose other APTs you need here.
  // ...
});
