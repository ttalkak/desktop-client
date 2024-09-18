import { ipcRenderer, contextBridge } from "electron";
import path from "path";

console.log("Preload script loaded");

contextBridge.exposeInMainWorld("electronAPI", {
  //-------------OS 종류 확인
  getOsType: async (): Promise<string> => {
    return ipcRenderer.invoke("get-os-type");
  },

  //----DB용 image 다운로드 및 빌드
  setupDatabase: async (dbInfo: any) => {
    return ipcRenderer.invoke("setup-database", dbInfo);
  },

  // ------------------------------ 도커 실행
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

  //컨테이너, 이미지 정보 로드
  fetchDockerImage: (imageId: string) =>
    ipcRenderer.invoke("fetch-docker-image", imageId),
  fetchDockerContainer: (containerId: string) =>
    ipcRenderer.invoke("fetch-docker-container", containerId),
  getDockerImages: () => ipcRenderer.invoke("get-all-docker-images"),
  getDockerContainers: (all: boolean) =>
    ipcRenderer.invoke("get-all-docker-containers", all),

  // Docker 이벤트 감지 및 렌더러 연결
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
    repositoryUrl: string,
    // branch: string,
    rootDirectory: string
  ): Promise<{
    success: boolean;
    message?: string;
    dockerfilePath?: string;
    contextPath: string;
  }> => {
    return await ipcRenderer.invoke(
      "download-and-unzip",
      repositoryUrl,
      // branch,
      rootDirectory
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

  removeContainer: (containerId: string, options?: ContainerRemoveOptions) =>
    ipcRenderer.invoke("remove-container", containerId, options),

  stopContainer: async (
    containerId: string
  ): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke("stop-container", containerId);
  },

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

  //컨테이너별 memory 가져오는 함수-웹소켓 healthcheck용
  async getContainerMemoryUsage(containerId: string) {
    return ipcRenderer.invoke("get-container-memory-usage", containerId);
  },

  //컨테이너 stats 전송함수
  startContainerStats: (containerId: string) =>
    ipcRenderer.invoke("start-container-stats", containerId),
  stopContainerStats: (containerId: string) =>
    ipcRenderer.invoke("stop-container-stats", containerId),
  onContainerStatsUpdate: (callback: (stats: any) => void) =>
    ipcRenderer.on("container-stats-update", (_event, stats) =>
      callback(stats)
    ),
  onContainerStatsError: (callback: (error: any) => void) =>
    ipcRenderer.on("container-stats-error", (_event, error) => callback(error)),
  removeContainerStatsListeners: () => {
    ipcRenderer.removeAllListeners("container-stats-update");
    ipcRenderer.removeAllListeners("container-stats-error");
  },

  //도커 로그렌더링
  startLogStream: (containerId: string) => {
    ipcRenderer.send("start-container-log-stream", containerId);
  },
  stopLogStream: (containerId: string) => {
    ipcRenderer.send("stop-container-log-stream", containerId);
  },
  onLogStream: (
    callback: (data: { containerId: string; log: string }) => void
  ) => {
    ipcRenderer.on("container-logs-stream", (_event, data) => {
      callback(data);
    });
  },
  onLogError: (
    callback: (data: { containerId: string; error: string }) => void
  ) => {
    ipcRenderer.on("container-logs-error", (_event, data) => {
      callback(data);
    });
  },
  onLogEnd: (callback: (data: { containerId: string }) => void) => {
    ipcRenderer.on("container-logs-end", (_event, data) => {
      callback(data);
    });
  },
  removeAllLogListeners: () => {
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

  //---------------------- 포트 인바운드 관련
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

  runPgrok: (
    remoteAddr: string,
    forwardAddr: string,
    token: string,
    deploymentId: number,
    subdomainName: string
  ) => {
    return ipcRenderer.invoke(
      "run-pgrok",
      remoteAddr,
      forwardAddr,
      token,
      deploymentId,
      subdomainName
    );
  },

  onPgrokLog: (callback: (log: string) => void) => {
    ipcRenderer.on("pgrok-log", (_event, log) => callback(log));
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
