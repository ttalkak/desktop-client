import Dockerode from "dockerode";
export {};

declare global {
  // 기존 형식

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

  interface databasesDTO {
    databaseId: string;
    databaseType: string;
    username: string;
    password: string;
    port: number;
  }

  export interface DeploymentCommand {
    deploymentId: number;
    hasDockerImage: boolean;
    envs?: EnvironmentVariables[];
    containerName: string;
    serviceType: string;
    inboundPort?: number;
    outboundPort?: number;
    subdomainName: string;
    subdomainKey: string;
    sourceCodeLink: string;
    dockerRootDirectory: string;
    branch: string;
    databases?: databasesDTO[] | [];
  }

  interface ContainerStatsError {
    containerId: string;
    error: string;
  }

  // 콜백 타입 정의
  type LogCallback = (log: string) => void; // 로그 데이터 수신 콜백 타입
  type ErrorCallback = (error: string) => void; // 에러 데이터 수신 콜백 타입
  type EndCallback = () => void; // 스트림 종료 콜백 타입

  interface CpuUsageData {
    containerId: string;
    cpuUsagePercent: number;
  }

  // Docker Event Actor 정의 (예: 어떤 컨테이너나 이미지에 대한 이벤트인지)
  interface DockerEventActor {
    ID: string;
    Attributes: Record<string, string>; // 추가 속성을 포함하는 객체
  }

  // Docker Event 타입 정의
  interface DockerEvent {
    status: string; // 이벤트 상태 (예: start, stop, die, delete 등)
    id: string; // 컨테이너 또는 이미지 ID
    Type: string; // 이벤트 타입 (예: container, image 등)
    Action: string; // 수행된 액션 (예: start, stop, die, delete 등)
    Actor: DockerEventActor; // 이벤트와 연관된 요소
    scope: string; // 이벤트 범위 (예: local, global)
    time: number; // 이벤트 발생 시간 (Unix 타임스탬프)
    timeNano: number; // 이벤트 발생 시간 (나노초 단위)
  }

  // 이벤트 콜백 타입 정의
  type EventCallback = (event: DockerEvent) => void;

  interface DockerPort {
    IP: string;
    PrivatePort: number;
    PublicPort?: number;
    Type: string;
  }

  // 도커 이미지, 컨테이너 타입
  type DockerImage = Dockerode.ImageInfo;
  type DockerContainer = Dockerode.ContainerInfo;
  type ContainerCreateOptions = Dockerode.ContainerCreateOptions;
  type ContainerRemoveOptions = Dockerode.ContainerRemoveOptions;

  // CPU 사용률 콜백 타입 정의
  type CpuUsageCallback = (cpuUsage: number) => void;

  //도커 이미지 빌드 결과 반환
  interface BuildDockerImageResult {
    status: string;
    image?: DockerImage;
    message?: string;
  }

  // Electron API의 타입 지정
  interface ElectronAPI {
    minimizeWindow: () => void;
    maximizeWindow: () => void;
    closeWindow: () => void;

    //OS확인용
    getOsType: () => Promise<string>;
    // Docker 관련 메서드들
    checkDockerStatus: () => Promise<"running" | "not running" | "unknown">;

    fetchDockerImage: (imageId: string) => Promise<Dockerode.ImageInspectInfo>;
    fetchDockerContainer: (
      containerId: string
    ) => Promise<Dockerode.ContainerInspectInfo>;
    getDockerImages: () => Promise<DockerImage[]>;
    getDockerContainers: (all: boolean) => Promise<DockerContainer[]>;

    //도커파일 경로찾기
    findDockerfile: (directory: string) => Promise<{
      success: boolean;
      dockerfilePath?: string;
      message?: string;
    }>;
    getDockerExecutablePath: () => Promise<string | null>;
    openDockerDesktop: (dockerPath: string) => Promise<void>;

    // Docker 이벤트 감지 및 렌더러 연결
    sendDockerEventRequest: () => void;
    onDockerEventResponse: (callback: EventCallback) => void;
    onDockerEventError: (callback: ErrorCallback) => void;
    onDockerEventEnd: (callback: EndCallback) => void;
    removeAllDockerEventListeners: () => void;

    // Docker 로그 스트리밍 관련 메서드들
    startLogStream: (containerId: string) => void;
    onLogStream: (callback: LogCallback) => void;
    onLogError: (callback: ErrorCallback) => void;
    onLogEnd: (callback: EndCallback) => void;
    stopLogStream: (containerId: string) => void;
    clearLogListeners: () => void;

    //1회성 컨테이너 메모리 가져오기
    getContainerMemoryUsage(
      containerId: string
    ): Promise<{ success: boolean; memoryUsage?: number; error?: string }>;

    // 주기적으로 개별 컨테이너 stats 가져오기
    startContainerStats: (
      containerIds: string[]
    ) => Promise<{ success: boolean; message: string }>;
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

    //CPU 사용률
    getCpuUsage: () => Promise<number>; // 전체 CPU 사용률
    removeAllCpuListeners: () => void; // 컨테이너 cpu 사용률 리스너 제거
    monitorCpuUsage: () => void; // 컨테이너별 cpu 사용률 스트림 가져오는

    // 기타 기능들
    getInboundRules: () => Promise<string>;
    togglePort: (name: string, newEnabled: string) => Promise<void>;

    // pgrok 다운로드
    downloadPgrok: () => Promise<string>; // pgrok 파일 다운로드
    runPgrok: (
      remoteAddr: string,
      forwardAddr: string,
      token: string,
      deploymentId: number,
      subdomainName: string
    ) => Promise<string>; // pgrok 실행 메서드
    onPgrokLog: (callback: LogCallback) => void; // pgrok 로그 수신 메서드

    // 저장할 경로 지정 + 다운로드 하고 바로 unzip
    getProjectSourceDirectory: () => Promise<string>;
    downloadAndUnzip: (
      sourceCodeLink: string,
      // branch: string,
      dockerRootDirectory: string
    ) => Promise<{
      success: boolean;
      message?: string;
      dockerfilePath: string;
      contextPath: string;
    }>;

    // path join을 위한 메서드
    joinPath: (...paths: string[]) => string;

    // 디렉토리 기준으로 이미지 빌드/삭제
    buildDockerImage: (
      contextPath: string,
      dockerfilePath?: string,
      imageName?: string,
      tag?: string
    ) => Promise<BuildDockerImageResult>;

    removeImage: (
      imageId: string
    ) => Promise<{ success: boolean; error?: string }>;

    //컨테이너 생성/실행/정지/삭제
    createContainerOptions: (
      image: string,
      containerName?: string,
      inboundPort: number,
      outboundPort: number
    ) => Promise<Dockerode.ContainerCreateOptions>;

    createContainer: (
      options: Dockerode.ContainerCreateOptions
    ) => Promise<{ success: boolean; containerId?: string; error?: string }>;

    startContainer: (
      containerId: string
    ) => Promise<{ success: boolean; error?: string }>;

    createAndStartContainer: (
      options: ContainerCreateOptions
    ) => Promise<{ success: boolean; containerId: string; error?: string }>;

    stopContainer(
      containerId: string
    ): Promise<{ success: boolean; error?: string }>;

    removeContainer: (
      containerId: string,
      options?: ContainerRemoveOptions
    ) => Promise<{ success: boolean; error?: string }>;
  }

  interface Window {
    electronAPI: ElectronAPI; // Electron API 인터페이스 지정
  }
}
