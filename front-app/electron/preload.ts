import { ipcRenderer, contextBridge } from "electron";







console.log("Preload script loaded");

contextBridge.exposeInMainWorld("electronAPI", {
  //도커 실행여부 check
  checkDockerStatus: async () => {
    try {
      const status = await ipcRenderer.invoke('check-docker-status'); 
      return status;
    } catch (error) {
      console.error('Error checking Docker status:', error);
      throw error;
    }
  },

  //도커 info 확인 => 필요시 추가 작성


  //이미지 로드
  getDockerImages: () => {
    console.log("fetching..img preload");
    return ipcRenderer.invoke("get-docker-images");
  },

  //컨테이너 로드
  fetchDockerContainers: () => {
    console.log("fetchingDocker.. preload");
    return ipcRenderer.invoke("fetch-docker-containers");
  },

  //도커 실행파일 경로가져오기
  getDockerExecutablePath: () => {
    return ipcRenderer.invoke("get-docker-path");
  }, 
  
  // 도커 데스크탑 실행
  openDockerDesktop: (dockerPath: string | null) => {
    ipcRenderer.invoke("open-docker-desktop", dockerPath)},

  
  //컨테이너 생성 및 실행 
  createAndStartContainer: () =>
    ipcRenderer.invoke("create-and-start-container"),

  //도커 이벤트 감지// handle = invoke 사용한 비동기 처리
  // getDockerEvent: async () => {
  //   try {
  //     const data = await ipcRenderer.invoke("get-docker-event"); // 비동기적으로 요청
  //     console.log("Received Docker event data:", data);
  //     return data;
  //   } catch (error) {
  //     console.error("Error receiving Docker event:", error);
  //     throw error;
  //   }
  // },

  // 도커 이벤트 감지
  //이벤트 감지 시작해주세요 요청
  sendDockerEventRequest: () => ipcRenderer.send('get-docker-event'),
  //이벤트 받아옴
  onDockerEventResponse:  (callback: (data: DockerEvent) => void) => {return ipcRenderer.on('docker-event-response',  (_event, data: DockerEvent) => callback(data))},
  onDockerEventError: (callback: ErrorCallback) => ipcRenderer.on('docker-event-error', (_event, error) => callback(error)),
  onDockerEventEnd: () => ipcRenderer.invoke('docker-event-end'),
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners('docker-event-response');
    ipcRenderer.removeAllListeners('docker-event-error');
    ipcRenderer.removeAllListeners('docker-event-end');
  },

  //로그가져오기[실시간 처리 위해 추후 invoke 변경 예정]
  startLogStream: (containerId: string) =>
    ipcRenderer.send("start-container-log-stream", containerId), // 로그 스트림 시작
  onLogStream: (callback: LogCallback) =>
    ipcRenderer.on("container-logs-stream", (_event, log) => callback(log)), // 로그 데이터 수신
  onLogError: (callback: ErrorCallback) =>
    ipcRenderer.on("container-logs-error", (_event, error) => callback(error)), // 오류 수신
  onLogEnd: (callback: EndCallback) =>
    ipcRenderer.on("container-logs-end", () => callback()), // 로그 스트림 종료 수신

  //창 조절 관련 
  minimizeWindow: () => {
    ipcRenderer.send("minimize-window");
  },
  maximizeWindow: () => {
    ipcRenderer.send("maximize-window");
  },
  closeWindow: () => {
    ipcRenderer.send("close-window");
  },

  //포트 인바운드 관련
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
