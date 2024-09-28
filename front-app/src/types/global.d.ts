import Dockerode from "dockerode";
export {};

declare global {
  // Docker Basic Types
  type DockerImage = Dockerode.ImageInfo;
  type DockerContainer = Dockerode.ContainerInfo;
  type ContainerCreateOptions = Dockerode.ContainerCreateOptions;
  type ContainerRemoveOptions = Dockerode.ContainerRemoveOptions;

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

  // Container Stats Types
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

  // Database 인터페이스
  export interface Database {
    databaseId: number;
    databaseType: string;
    name?: string | null; // 이름은 null이 될 수 있음
    username: string;
    password: string;
    port: number;
  }

  // EnvironmentVariable 배열 정의
  export interface EnvironmentVariable {
    key: string;
    value: string;
  }

  // DeploymentCommand 인터페이스 수정
  export interface DeploymentCommand {
    deploymentId: number;
    serviceType: string; // 예: FRONTEND, BACKEND, web-service 등
    hasDockerFile: boolean;
    hasDockerImage: boolean;
    containerName: string;
    inboundPort: number;
    outboundPort: number;
    subdomainName: string;
    subdomainKey: string;
    sourceCodeLink: string;
    databases?: Database[];
    envs: EnvironmentVariable[]; // EnvironmentVariable 배열
    dockerRootDirectory?: string; // 선택적 필드
    dockerImageName?: string | null;
    dockerImageTag?: string | null;
    dockerFileScript?: string; // 선택적 필드
  }

  // Docker Image Build Result
  interface BuildDockerImageResult {
    status: string;
    image?: DockerImage;
    message?: string;
  }

  // Callback Types
  type CpuUsageCallback = (cpuUsage: number) => void;
  type ErrorCallback = (data: { containerId: string; error: string }) => void;
  type EndCallback = (data: { containerId: string }) => void;
  type LogCallback = (log: string) => void;

  // Electron API Interface
  interface ElectronAPI {
    // Window Management
    minimizeWindow: () => void;
    maximizeWindow: () => void;
    closeWindow: () => void;

    // System Operations
    getOsType: () => Promise<string>;
    terminateTasks: () => void;
    onTerminated: (
      callback: (event: Electron.IpcRendererEvent) => void
    ) => void;
    onTerminateError: (
      callback: (event: Electron.IpcRendererEvent, error: string) => void
    ) => void;

    // Docker Status and Management
    checkDockerStatus: () => Promise<"running" | "not running" | "unknown">;
    fetchDockerImage: (imageId: string) => Promise<Dockerode.ImageInspectInfo>;
    fetchDockerContainer: (
      containerId: string
    ) => Promise<Dockerode.ContainerInspectInfo>;
    getDockerImages: () => Promise<DockerImage[]>;
    getDockerContainers: (all: boolean) => Promise<DockerContainer[]>;
    findDockerfile: (directory: string) => Promise<{
      success: boolean;
      dockerfilePath?: string;
      message?: string;
    }>;
    getDockerExecutablePath: () => Promise<string | null>;
    openDockerDesktop: (dockerPath: string) => Promise<void>;

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

    // Container Stats
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

    // Network and Port Management
    getInboundRules: () => Promise<string>;
    togglePort: (name: string, newEnabled: string) => Promise<void>;

    // pgrok Operations
    downloadPgrok: () => Promise<string>;
    runPgrok: (
      remoteAddr: string,
      forwardAddr: string,
      token: string,
      deploymentId: number,
      subdomainName: string
    ) => Promise<string>;
    onPgrokLog: (callback: LogCallback) => void;
    stopPgrok: (deploymentId: number) => Promise<string>;

    // Project and Source Code Management
    getProjectSourceDirectory: () => Promise<string>;
    downloadAndUnzip: (
      sourceCodeLink?: string,
      dockerRootDirectory?: string
    ) => Promise<{
      success: boolean;
      message?: string;
      dockerfilePath: string;
      contextPath: string;
    }>;
    getDatabaseImageName: (databaseType: string) => Promise<string>;
    pullDockerImage: (imageName: string) => Promise<{
      success: boolean;
      error?: string;
    }>;
    joinPath: (...paths: string[]) => string;
    // DB Docker 이미지를 pull하는 메서드
    pullDatabaseImage: (
      databaseType: string
    ) => Promise<{ success: boolean; error?: string }>;

    // Dockerfile을 처리하는 메서드
    handleDockerfile: (
      contextPath: string,
      dockerFileScript?: string,
      envs?: EnvironmentVariables
    ) => Promise<{
      success: boolean;
      dockerfilePath?: string;
      message?: string;
    }>;

    // Docker Image and Container Operations
    buildDockerImage: (
      contextPath: string,
      dockerfilePath?: string,
      imageName?: string,
      tag?: string
    ) => Promise<BuildDockerImageResult>;
    removeImage: (imageId: string) => Promise<{
      success: boolean;
      error?: string;
    }>;
    createContainerOptions: (
      image: string,
      containerName?: string,
      inboundPort: number,
      outboundPort: number
    ) => Promise<Dockerode.ContainerCreateOptions>;
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
    ) => Promise<{
      success: boolean;
      error?: string;
    }>;
  }

  interface Window {
    electronAPI: ElectronAPI;
  }
}
