import { ipcRenderer, contextBridge } from "electron";
import path from "path";

console.log("Preload script loaded");

contextBridge.exposeInMainWorld("electronAPI", {
  //-------------OS 종류 확인
  getOsType: async (): Promise<string> => {
    return ipcRenderer.invoke("get-os-type");
  },

  // ------------------------------ 도커 실행 -----------------------------
  checkDockerStatus: async () => {
    try {
      const status = await ipcRenderer.invoke("check-docker-status");
      return status;
    } catch (error) {
      console.error("Error checking Docker status:", error);
      throw error;
    }
  },
  getDockerExecutablePath: () => {
    return ipcRenderer.invoke("get-docker-path");
  },
  openDockerDesktop: (dockerPath: string | null) => {
    ipcRenderer.invoke("open-docker-desktop", dockerPath);
  },

  //컨테이너, 이미지 로드
  fetchDockerImage: (imageId: string) =>
    ipcRenderer.invoke("fetch-docker-image", imageId),
  fetchDockerContainer: (containerId: string) =>
    ipcRenderer.invoke("fetch-docker-container", containerId),
  getDockerImages: () => ipcRenderer.invoke("get-all-docker-images"),
  getDockerContainers: (all: boolean) =>
    ipcRenderer.invoke("get-all-docker-containers", all),

  //도커 이벤트 감지
  sendDockerEventRequest: () => ipcRenderer.send("get-docker-event"),

  onDockerEventResponse: (callback: (event: DockerEvent) => void) =>
    ipcRenderer.on("docker-event-response", (_event, dockerEvent) =>
      callback(dockerEvent)
    ),

  onDockerEventError: (callback: (error: string) => void) =>
    ipcRenderer.on("docker-event-error", (_event, error) => callback(error)),

  onDockerEventEnd: (callback: () => void) => {
    ipcRenderer.on("docker-event-end", () => callback());
  },

  removeAllDockerEventListeners: () => {
    ipcRenderer.removeAllListeners("docker-event-response");
    ipcRenderer.removeAllListeners("docker-event-error");
    ipcRenderer.removeAllListeners("docker-event-end");
  },

  //----------------- zip 다운 하고 바로 unzip
  getProjectSourceDirectory: (): Promise<string> =>
    ipcRenderer.invoke("get-project-source-directory"),
  downloadAndUnzip: async (
    repoUrl: string,
    branch: string,
    dockerRootDirectory: string
  ): Promise<{
    success: boolean;
    message?: string;
    dockerfilePath?: string;
    contextPath: string;
  }> => {
    return await ipcRenderer.invoke(
      "download-and-unzip",
      repoUrl,
      branch,
      dockerRootDirectory
    );
  },

  joinPath: (...paths: string[]): string => path.join(...paths),
  //--------------unzip한 파일 이미지 빌드

  //도커파일 경로찾기
  findDockerfile: (directory: string) =>
    ipcRenderer.invoke("find-dockerfile", directory),

  buildDockerImage: (
    dockerfilePath: string,
    contextPath: string,
    imageName: string = "my-docker-image",
    tag: string = "latest"
  ): Promise<{
    success: boolean;
    image?: DockerImage;
    message?: string;
  }> =>
    ipcRenderer.invoke(
      "build-docker-image",
      dockerfilePath,
      contextPath,
      imageName,
      tag
    ),

  //-------------------- 컨테이너 생성 및 실행

  createContainerOptions: (
    imageId: DockerImage,
    containerName: string,
    inboundPort: number,
    outboundPort: number
  ) =>
    ipcRenderer.invoke(
      "create-container-options",
      imageId,
      containerName,
      inboundPort,
      outboundPort
    ),

  createContainer: (options: ContainerCreateOptions) =>
    ipcRenderer.invoke("create-container", options),

  createAndStartContainer: (options: ContainerCreateOptions) =>
    ipcRenderer.invoke("create-and-start-container", options),

  startContainer: (containerId: string) =>
    ipcRenderer.invoke("start-container", containerId),

  removeImage: (imageId: string) => ipcRenderer.invoke("remove-image", imageId),

  //--------------------- CPU 사용률
  onCpuUsagePercent: (
    callback: (
      event: Electron.IpcRendererEvent,
      data: { containerId: string; cpuUsagePercent: number }
    ) => void
  ) => {
    ipcRenderer.on("cpu-usage-percent", callback);
  },

  onAverageCpuUsage: (
    callback: (
      event: Electron.IpcRendererEvent,
      data: { averageCpuUsage: number }
    ) => void
  ) => {
    ipcRenderer.on("average-cpu-usage", callback);
  },
  // 전체 컨테이너들의 사용량

  //데스크탑 cpu 사용량
  getCpuUsage: async () => {
    try {
      const cpuUsage = await ipcRenderer.invoke("get-cpu-usage");
      return cpuUsage;
    } catch (error) {
      console.error("Error getting CPU usage:", error);
      throw error;
    }
  },
  //컨테이너별 사용량 전체 스트림 연결 함수
  monitorCpuUsage: () => ipcRenderer.invoke("monitor-cpu-usage"),

  removeAllCpuListeners: () => {
    ipcRenderer.removeAllListeners("average-cpu-usage");
    ipcRenderer.removeAllListeners("get-cpu-usage");
  },
  //---------------------- 도커 로그
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

  clearLogListeners: () => {
    ipcRenderer.removeAllListeners("container-logs-stream");
    ipcRenderer.removeAllListeners("container-logs-error");
    ipcRenderer.removeAllListeners("container-logs-end");
  },
  //---------------------- 창 조절 관련 -----------------------
  minimizeWindow: () => {
    ipcRenderer.send("minimize-window");
  },
  maximizeWindow: () => {
    ipcRenderer.send("maximize-window");
  },
  closeWindow: () => {
    ipcRenderer.send("close-window");
  },

  //---------------------- 포트 인바운드 관련 ----------------------
  getInboundRules: () => {
    console.log("3. getInboundRules called");
    return ipcRenderer.invoke("get-inbound-rules");
  },
  togglePort: (name: string, newEnabled: string) => {
    console.log(`Toggling port ${name} to ${newEnabled}`);
    return ipcRenderer.invoke("toggle-port", name, newEnabled);
  },

  // pgrok 다운로드
  downloadPgrok: () => {
    return ipcRenderer.invoke("download-pgrok");
  },

  runPgrok: (remoteAddr: string, forwardAddr: string, token: string) => {
    return ipcRenderer.invoke("run-pgrok", remoteAddr, forwardAddr, token);
  },

  onPgrokLog: (callback: (log: string) => void) => {
    ipcRenderer.on("pgrok-log", (_event, log) => callback(log));
  },
});

//electron store용 API
contextBridge.exposeInMainWorld("storeAPI", {
  initializeStore: (): Promise<void> => ipcRenderer.invoke("initialize-store"),

  getDockerImage: (imageId: string): Promise<DockerImage | undefined> =>
    ipcRenderer.invoke("get-docker-image", imageId),

  getAllDockerImages: (): Promise<DockerImage[]> =>
    ipcRenderer.invoke("get-all-docker-images"),

  setDockerImage: (image: DockerImage): Promise<void> =>
    ipcRenderer.invoke("set-docker-image", image),

  removeDockerImage: (imageId: string): Promise<void> =>
    ipcRenderer.invoke("remove-docker-image", imageId),

  getDockerContainer: (
    containerId: string
  ): Promise<DockerContainer | undefined> =>
    ipcRenderer.invoke("get-docker-container", containerId),

  getAllDockerContainers: (): Promise<DockerContainer[]> =>
    ipcRenderer.invoke("get-all-docker-containers"),

  setDockerContainer: (container: DockerContainer): Promise<void> =>
    ipcRenderer.invoke("set-docker-container", container),

  removeDockerContainer: (containerId: string): Promise<void> =>
    ipcRenderer.invoke("remove-docker-container", containerId),
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
