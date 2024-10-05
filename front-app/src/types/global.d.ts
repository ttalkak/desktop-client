import Dockerode from "dockerode";
export {};

// Docker Related Types
declare global {
  type OSType = "WINDOWS" | "MACOS" | "LINUX";
  // Docker Basic Types
  type DockerImage = Dockerode.ImageInfo;
  type DockerContainer = Dockerode.ContainerInfo;
  type ContainerCreateOptions = Dockerode.ContainerCreateOptions;
  type ContainerRemoveOptions = Dockerode.ContainerRemoveOptions;
  type EnvVar = { key: string; value: string };
  // Docker Event Types
  interface DockerEventActor {
    ID: string;
    Attributes: Record<string, string>;
  }

  interface DockerEvent {
    status: string;
    id: string;
    Type: string;
    Action: string;
    Actor: DockerEventActor;
    scope: string;
    time: number;
    timeNano: number;
  }

  type EventCallback = (event: DockerEvent) => void;

  interface DockerPort {
    IP: string;
    PrivatePort: number;
    PublicPort?: number;
    Type: string;
  }

  // Docker Image Build Result
  interface BuildDockerImageResult {
    status: string;
    image?: DockerImage;
    message?: string;
  }

  // Docker Logs
  type LogCallback = (log: string) => void;

  // Docker Event Listeners
  interface ElectronAPI {
    openDockerDesktop: (dockerPath: string | null) => Promise<void>;
    checkDockerStatus: () => Promise<"running" | "not running" | "unknown">;
    // Docker Events
    sendDockerEventRequest: () => void;
    onDockerEventResponse: (callback: EventCallback) => void;
    onDockerEventError: (callback: ErrorCallback) => void;
    onDockerEventEnd: (callback: EndCallback) => void;
    removeAllDockerEventListeners: () => void;

    // Docker Logs
    startLogStream: (containerId: string, deploymentId?: number) => void;
    stopLogStream: (containerId: string) => void;
    onLogStream: (
      callback: (data: { containerId: string; log: string }) => void
    ) => void;
    onLogError: (
      callback: (data: { containerId: string; error: string }) => void
    ) => void;
    onLogEnd: (callback: (data: { containerId: string }) => void) => void;
    removeAllLogListeners: () => void;

    // Docker Image and Container Operations
    fetchDockerImage: (imageId: string) => Promise<Dockerode.ImageInspectInfo>;
    fetchDockerContainer: (
      containerId: string
    ) => Promise<Dockerode.ContainerInspectInfo>;
    getDockerImages: () => Promise<DockerImage[]>;
    getDockerContainers: (all: boolean) => Promise<DockerContainer[]>;
    //image, container manipulate
    pullDockerImage: (imageName: string) => Promise<{
      success: boolean;
      error?: string;
    }>;

    buildDockerImage: (
      contextPath: string,
      dockerfilePath: string,
      imageName?: string,
      tag?: string
    ) => Promise<{
      success: boolean;
      image?: DockerImage;
      error?: string;
    }>;

    removeImage: (
      imageId: string
    ) => Promise<{ success: boolean; error?: string }>;

    createContainerOptions: (
      name: string,
      containerName: string,
      inboundPort: number,
      outboundPort: number,
      envs: EnvVar[],
      healthCheckCommand: string[]
    ) => Promise<ContainerCreateOptions>;

    createContainer: (options: Dockerode.ContainerCreateOptions) => Promise<{
      success: boolean;
      containerId?: string;
      error?: string;
    }>;
    startContainer: (containerId: string) => Promise<{
      success: boolean;
      error?: string;
    }>;
    createAndStartContainer: (options: ContainerCreateOptions) => Promise<{
      success: boolean;
      containerId: string;
      error?: string;
    }>;
    stopContainer(containerId: string): Promise<{
      success: boolean;
      error?: string;
    }>;
    removeContainer: (
      containerId: string,
      options?: ContainerRemoveOptions
    ) => Promise<{ success: boolean; error?: string }>;

    // Dockerfile, env 생성 메서드
    createDockerfile: (
      dockerfilePath: string,
      dockerFileScript: string
    ) => Promise<{
      success: boolean;
      message: string;
      contextPath: string;
      dockerFilePath: string;
    }>;

    createEnvfile: (
      envfilePath: string,
      envs: EnvironmentVariable[]
    ) => Promise<{ success: boolean; message?: string }>;
  }

  // Container Stats and CPU Usage Types
  interface ContainerStatsError {
    containerId: string;
    error: string;
  }

  interface ContainerStats {
    cpu_usage: number;
    memory_usage: number;
    container_id: string;
    running_time: number;
    blkio_read: number;
    blkio_write: number;
  }

  interface CpuUsageData {
    containerId: string;
    cpuUsagePercent: number;
  }

  type CpuUsageCallback = (cpuUsage: number) => void;

  // Container Stats Event Listeners
  interface ElectronAPI {
    getContainerMemoryUsage(containerId: string): Promise<{
      success: boolean;
      memoryUsage?: number;
      error?: string;
    }>;
    startContainerStats: (containerIds: string[]) => Promise<{
      success: boolean;
      message: string;
    }>;
    stopContainerStats: (containerIds: string[]) => Promise<{
      success: boolean;
      stoppedContainers: string[];
      notMonitoredContainers: string[];
      message: string;
    }>;
    onContainerStatsUpdate: (callback: (stats: ContainerStats) => void) => void;
    onContainerStatsError: (
      callback: (error: ContainerStatsError) => void
    ) => void;
    removeContainerStatsListeners: () => void;

    // CPU Usage
    getCpuUsage: () => Promise<number>;
    removeAllCpuListeners: () => void;
    monitorCpuUsage: () => void;
  }

  export interface EnvironmentVariable {
    key: string;
    value: string;
  }

  export interface DeploymentCommand {
    deploymentId: number;
    serviceType: string;
    hasDockerFile: boolean;
    hasDockerImage: boolean;
    containerName: string;
    inboundPort: number;
    outboundPort: number;
    subdomainName: string;
    subdomainKey: string;
    sourceCodeLink: string;
    dockerRootDirectory: string; // 선택적 필드에서 필수 필드로 변경
    dockerFileScript: string; // 선택적 필드에서 필수 필드로 변경
    envs: EnvironmentVariable[];
    dockerImageName: string | null; // 백엔드 db 설정 있을때
    dockerImageTag: string | null; // 백엔드 db 설정있을때
  }

  // pgrok Operations
  interface ElectronAPI {
    downloadPgrok: () => Promise<string>;
    runPgrok: (
      remoteAddr: string,
      forwardAddr: string,
      token: string,
      deploymentId: number,
      subdomainName?: string
    ) => Promise<string>;
    onPgrokLog: (callback: LogCallback) => void;
    stopPgrok: (deploymentId: number) => Promise<string>;
  }

  // System and Project Operations
  interface ElectronAPI {
    minimizeWindow: () => void;
    maximizeWindow: () => void;
    closeWindow: () => void;
    getOsType: () => Promise<string>;
    terminateTasks: () => void;
    onTerminated: (
      callback: (event: Electron.IpcRendererEvent) => void
    ) => void;
    onTerminateError: (
      callback: (event: Electron.IpcRendererEvent, error: string) => void
    ) => void;
    getProjectSourceDirectory: () => Promise<string>;
    downloadAndUnzip: (
      sourceCodeLink?: string,
      dockerRootDirectory?: string
    ) => Promise<{
      success: boolean;
      found: boolean;
      message?: string;
      contextPath: string;
      dockerfilePath: string;
    }>;
    getDatabaseImageName: (databaseType: string) => Promise<string>;

    pullDatabaseImage: (
      databaseType: string
    ) => Promise<{ success: boolean; tag?: string; error?: string }>;

    joinPath: (...paths: string[]) => string;
    // 기타 기능들
    getInboundRules: () => Promise<string>;
    togglePort: (name: string, newEnabled: string) => Promise<void>;

    pullDatabaseImage: (
      databaseType: string
    ) => Promise<{ success: boolean; tag?: string; error?: string }>;

    pullAndStartDatabaseContainer: (
      databaseType: string,
      imageName: string,
      containerName: string,
      inboundPort: number,
      outboundPort: number,
      envs: Array<{ key: string; value: string }>
    ) => Promise<{
      success: boolean;
      image: DockerImage;
      container: DockerContainer;
      error?: string;
    }>;
  }

  interface Window {
    electronAPI: ElectronAPI;
  }
}
