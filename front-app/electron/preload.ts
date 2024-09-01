import { ipcRenderer, contextBridge } from "electron";

console.log("Preload script loaded");

contextBridge.exposeInMainWorld("electronAPI", {

  // ------------------------------ 도커 실행 -------------------------------
  checkDockerStatus: async () => { //상태확인
    try {
      const status = await ipcRenderer.invoke("check-docker-status");
      return status;
    } catch (error) {
      console.error("Error checking Docker status:", error);
      throw error;
    }
  },
  getDockerExecutablePath: () => {   //도커 실행파일 경로
    return ipcRenderer.invoke("get-docker-path");
  },
  openDockerDesktop: (dockerPath: string | null) => {   // 도커 데스크탑 시작
    ipcRenderer.invoke("open-docker-desktop", dockerPath);
  },

  // -----------------------도커 이벤트 감지 ---------------------------------
  sendDockerEventRequest: () => ipcRenderer.send("get-docker-event"),
  onDockerEventResponse: (callback: (data: DockerEvent) => void) => {
    return ipcRenderer.on(
      "docker-event-response",
      (_event, data: DockerEvent) => callback(data)
    );
  },
  onDockerEventError: (callback: ErrorCallback) =>
    ipcRenderer.on("docker-event-error", (_event, error) => callback(error)),
  onDockerEventEnd: () => ipcRenderer.invoke("docker-event-end"),
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners("docker-event-response");
    ipcRenderer.removeAllListeners("docker-event-error");
    ipcRenderer.removeAllListeners("docker-event-end");
  },

  

  //--------------------컨테이너, 이미지 로드-----------------------
  getDockerImages: () => {
    // console.log("fetching..img preload");
    return ipcRenderer.invoke("get-docker-images");
  },
  fetchDockerContainers: () => {
    // console.log("fetchingDocker.. preload");
    return ipcRenderer.invoke("fetch-docker-containers");
  },


  //---------------------- 도커 로그 -----------------------
  startLogStream: (containerId: string) => {
    ipcRenderer.send("start-container-log-stream", containerId);
  },
  onLogStream: (callback: LogCallback) => {
    ipcRenderer.on("container-logs-stream", (_event, log) => callback(log));
  },
  onLogError: (callback: ErrorCallback) => {
    ipcRenderer.on("container-logs-error", (_event, error) => callback(error));
  },
  onLogEnd: (callback: EndCallback) => {
    ipcRenderer.on("container-logs-end", () => callback());
  },
  stopLogStream: (containerId: string) => {
    ipcRenderer.send("stop-container-log-stream", containerId);
  },
  

  //--------------------- CPU 사용률 --------------------------
  startContainerStatsStream: (containerId: string) => ipcRenderer.send('start-container-stats-stream', containerId),
  onCpuUsageData: (callback: (cpuUsage: number) => void) => ipcRenderer.on('cpu-usage-data', (_event, cpuUsage) => callback(cpuUsage)),
  onCpuUsageError: (callback: (error: string) => void) => ipcRenderer.on('cpu-usage-error', (_event, error) => callback(error)),
  onCpuUsageEnd: (callback: () => void) => ipcRenderer.on('cpu-usage-end', () => callback()),

  //-------------------- 컨테이너 생성 및 실행 -----------------
  createAndStartContainer: () =>
    ipcRenderer.invoke("create-and-start-container"),


  //---------------------- 창 조절 관련 ------------------------
  minimizeWindow: () => {
    ipcRenderer.send("minimize-window");
  },
  maximizeWindow: () => {
    ipcRenderer.send("maximize-window");
  },
  closeWindow: () => {
    ipcRenderer.send("close-window");
  },

  //---------------------- 포트 인바운드 관련 -------------------
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
