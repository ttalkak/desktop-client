import { ipcRenderer, contextBridge } from "electron";
import path from "path";
import { DockerEvent } from "src/services/deployments/dockerEventListner";

console.log("Preload script loaded");

contextBridge.exposeInMainWorld("electronAPI", {
  // OS & System Operations
  getOsType: async (): Promise<string> => ipcRenderer.invoke("get-os-type"),

  minimizeWindow: () => ipcRenderer.send("minimize-window"),
  maximizeWindow: () => ipcRenderer.send("maximize-window"),
  closeWindow: () => ipcRenderer.send("close-window"),

  // Docker Management
  checkDockerStatus: async () => ipcRenderer.invoke("check-docker-status"),
  getDockerExecutablePath: () => ipcRenderer.invoke("get-docker-path"),
  openDockerDesktop: (dockerPath: string | null) =>
    ipcRenderer.invoke("open-docker-desktop", dockerPath),

  //fetch docker image and container (include a list)
  fetchDockerImage: (imageId: string) =>
    ipcRenderer.invoke("fetch-docker-image", imageId),
  fetchDockerContainer: (containerId: string) =>
    ipcRenderer.invoke("fetch-docker-container", containerId),
  getDockerImages: () => ipcRenderer.invoke("get-all-docker-images"),
  getDockerContainers: (all: boolean) =>
    ipcRenderer.invoke("get-all-docker-containers", all),

  // Docker Events
  sendDockerEventRequest: () => ipcRenderer.send("get-docker-event"),
  onDockerEventResponse: (callback: (event: DockerEvent) => void) =>
    ipcRenderer.on("docker-event-response", (_event, dockerEvent) =>
      callback(dockerEvent)
    ),
  onDockerEventError: (callback: (error: string) => void) =>
    ipcRenderer.on("docker-event-error", (_event, error) => callback(error)),
  onDockerEventEnd: (callback: () => void) =>
    ipcRenderer.on("docker-event-end", () => callback()),
  removeAllDockerEventListeners: () => {
    ipcRenderer.removeAllListeners("docker-event-response");
    ipcRenderer.removeAllListeners("docker-event-error");
    ipcRenderer.removeAllListeners("docker-event-end");
  },

  // Docker File & Environment Management
  createDockerfile: (dockerfilePath: string, dockerFileScript: string) =>
    ipcRenderer.invoke("create-dockerfile", dockerfilePath, dockerFileScript),
  createEnvfile: (envfilePath: string, envs: EnvironmentVariable[]) =>
    ipcRenderer.invoke("create-envfile", envfilePath, envs),

  findDockerfile: (directory: string) =>
    ipcRenderer.invoke("find-dockerfile", directory),

  pullDatabaseImage: (
    databaseType: string
  ): Promise<{ success: boolean; tag?: string; error?: string }> => {
    return ipcRenderer.invoke("pull-database-image", databaseType);
  },

  pullAndStartDatabaseContainer: (
    databaseType: string,
    imageName: string,
    containerName: string,
    inboundPort: number,
    outboundPort: number,
    envs: Array<{ key: string; value: string }>
  ) =>
    ipcRenderer.invoke(
      "pullAndStartDatabaseContainer",
      databaseType,
      imageName,
      containerName,
      inboundPort,
      outboundPort,
      envs
    ),

  buildDockerImage: (
    contextPath: string,
    dockerfilePath: string,
    imageName: string,
    tag: string
  ): Promise<{
    success: boolean;
    image?: DockerImage;
    error?: string;
  }> =>
    ipcRenderer.invoke(
      "build-docker-image",
      contextPath,
      dockerfilePath,
      imageName,
      tag
    ),

  // Container Management

  createContainer: (options: ContainerCreateOptions) =>
    ipcRenderer.invoke("create-container", options),

  startContainer: (containerId: string, imageTag: string) =>
    ipcRenderer.invoke("start-container", containerId, imageTag),

  restartContainer: (containerId: string) =>
    ipcRenderer.invoke("restart-container", containerId),

  createContainerOptions: (
    name: string,
    containerName: string,
    inboundPort: number,
    outboundPort: number,
    envs: EnvVar[],
    healthCheckCommand: string[]
  ) =>
    ipcRenderer.invoke(
      "create-container-options",
      name,
      containerName,
      inboundPort,
      outboundPort,
      envs,
      healthCheckCommand
    ),
  createAndStartContainer: (options: ContainerCreateOptions) =>
    ipcRenderer.invoke("create-and-start-container", options),

  stopContainer: (containerId: string) =>
    ipcRenderer.invoke("stop-container", containerId),
  removeContainer: (containerId: string, options?: ContainerRemoveOptions) =>
    ipcRenderer.invoke("remove-container", containerId, options),
  removeImage: (imageId: string) => ipcRenderer.invoke("remove-image", imageId),

  // Docker Logs
  startLogStream: (containerId: string, deploymentId?: number) =>
    ipcRenderer.send("start-container-log-stream", containerId, deploymentId),
  stopLogStream: (containerId: string) =>
    ipcRenderer.send("stop-container-log-stream", containerId),
  onLogStream: (
    callback: (data: { containerId: string; log: string }) => void
  ) =>
    ipcRenderer.on("container-logs-stream", (_event, data) => callback(data)),
  onLogError: (
    callback: (data: { containerId: string; error: string }) => void
  ) => ipcRenderer.on("container-logs-error", (_event, data) => callback(data)),
  onLogEnd: (callback: (data: { containerId: string }) => void) =>
    ipcRenderer.on("container-logs-end", (_event, data) => callback(data)),
  removeAllLogListeners: () => {
    ipcRenderer.removeAllListeners("container-logs-stream");
    ipcRenderer.removeAllListeners("container-logs-error");
    ipcRenderer.removeAllListeners("container-logs-end");
  },

  // Stats & CPU Usage
  getCpuUsage: async () => ipcRenderer.invoke("get-cpu-usage"),
  getContainerMemoryUsage: (containerId: string) =>
    ipcRenderer.invoke("get-container-memory-usage", containerId),
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

  onCpuUsagePercent: (
    callback: (
      event: Electron.IpcRendererEvent,
      data: { containerId: string; cpuUsagePercent: number }
    ) => void
  ) => ipcRenderer.on("cpu-usage-percent", callback),
  onAverageCpuUsage: (
    callback: (
      event: Electron.IpcRendererEvent,
      data: { averageCpuUsage: number }
    ) => void
  ) => ipcRenderer.on("average-cpu-usage", callback),

  // Project & File Management
  getProjectSourceDirectory: (): Promise<string> =>
    ipcRenderer.invoke("get-project-source-directory"),
  downloadAndUnzip: async (
    repositoryUrl: string,
    rootDirectory: string
  ): Promise<{
    success: boolean;
    found: boolean;
    message?: string;
    dockerfilePath: string;
    contextPath: string;
  }> => ipcRenderer.invoke("download-and-unzip", repositoryUrl, rootDirectory),

  joinPath: (...paths: string[]): string => path.join(...paths),

  // pgrok Operations
  downloadPgrok: () => ipcRenderer.invoke("download-pgrok"),
  runPgrok: (
    remoteAddr: string,
    forwardAddr: string,
    token: string,
    deploymentId: number,
    subdomainName: string
  ) =>
    ipcRenderer.invoke(
      "run-pgrok",
      remoteAddr,
      forwardAddr,
      token,
      deploymentId,
      subdomainName
    ),
  onPgrokLog: (callback: (log: string) => void) =>
    ipcRenderer.on("pgrok-log", (_event, log) => callback(log)),
  stopPgrok: (deploymentId: number) =>
    ipcRenderer.invoke("stop-pgrok", deploymentId),

  // Port Management
  getInboundRules: () => ipcRenderer.invoke("get-inbound-rules"),
  togglePort: (name: string, newEnabled: string) =>
    ipcRenderer.invoke("toggle-port", name, newEnabled),
});

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
});
