import Dockerode from "dockerode";
export {};

declare global {
  // 기존 형식

  interface databasesDTO {
    databaseId: string;
    databaseType: string;
    username: string;
    password: string;
    port: number;
  }
  export interface DeploymentCommand {
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

  // interface EnvironmentVariables {
  //   [key: string]: string; // key-value 쌍으로 된 환경 변수들
  // }

  // export interface DeploymentCommand {
  //   deploymentId: string;
  //   envs: EnvironmentVariables[];
  //   port: string;
  //   subdomainName: string;
  //   subdomainKey: string;
  //   serviceType: string; //FrontEnd/BackEnd
  //   branch: string; //main인지 아닌지
  //   hasDockerImage?: boolean; //도커 이미지 여부 확인
  //   containerName?: string; //container 이름
  //   inboundPort?: number;
  //   outboundPort?: number;
  //   repositoryUrl: string;
  //   rootDirectory: string;
  //   databases: databasesDTO[];
  // }

  // 콜백 타입 정의
  type LogCallback = (log: string) => void; // 로그 데이터 수신 콜백 타입
  type ErrorCallback = (error: string) => void; // 에러 데이터 수신 콜백 타입
  type EndCallback = () => void; // 스트림 종료 콜백 타입

  interface CpuUsageData {
    containerId: string;
    cpuUsagePercent: number;
  }

  //Docker health check 위한 stats 타입 정의
  export interface ContainerStats {
    read: string;
    precpu_stats: {
      cpu_usage: {
        total_usage: number;
        percpu_usage: number[];
        usage_in_kernelmode: number;
        usage_in_usermode: number;
      };
      system_cpu_usage: number;
      online_cpus: number;
    };
    cpu_stats: {
      cpu_usage: {
        total_usage: number;
        percpu_usage: number[];
        usage_in_kernelmode: number;
        usage_in_usermode: number;
      };
      system_cpu_usage: number;
      online_cpus: number;
    };
    memory_stats: {
      usage: number;
      max_usage: number;
      limit: number;
      stats: {
        active_anon: number;
        active_file: number;
        cache: number;
        dirty: number;
        hierarchical_memory_limit: number;
        hierarchical_memsw_limit: number;
        inactive_anon: number;
        inactive_file: number;
        mapped_file: number;
        pgfault: number;
        pgmajfault: number;
        pgpgin: number;
        pgpgout: number;
        rss: number;
        rss_huge: number;
        total_active_anon: number;
        total_active_file: number;
        total_cache: number;
        total_dirty: number;
        total_inactive_anon: number;
        total_inactive_file: number;
        total_mapped_file: number;
        total_pgfault: number;
        total_pgmajfault: number;
        total_pgpgin: number;
        total_pgpgout: number;
        total_rss: number;
        total_rss_huge: number;
        total_unevictable: number;
        total_writeback: number;
        unevictable: number;
        writeback: number;
      };
    };
    networks: {
      [interfaceName: string]: {
        rx_bytes: number;
        rx_dropped: number;
        rx_errors: number;
        rx_packets: number;
        tx_bytes: number;
        tx_dropped: number;
        tx_errors: number;
        tx_packets: number;
      };
    };
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
  type DockerImage = Dockerode.ImageInspectInfo;
  type DockerContainer = Dockerode.ContainerInspectInfo;
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

    fetchDockerImage: (imageId: string) => Promise<DockerImage>;
    fetchDockerContainer: (containerId: string) => Promise<DockerContainer>;
    getDockerImages: () => Promise<DockerImage[]>;
    getDockerContainers: (all: boolean) => Promise<DockerContainer[]>;

    //도커파일 경로찾기
    findDockerfile: (directory: string) => Promise<string | null>;
    getDockerExecutablePath: () => Promise<string | null>;
    openDockerDesktop: (dockerPath: string) => Promise<void>;
    createAndStartContainer: (
      containerOptions: Dockerode.ContainerCreateOptions
    ) => Promise<{ success: boolean; containerId: string; error?: string }>;

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

    // 개별 컨테이너 stats 가져오기
    monitorSingleContainer: (containerId: string) => Promise<void>;
    addContainerStatsListener: (
      channel: string,
      listener: (...args: any[]) => void
    ) => void;
    removeContainerStatsListener: (
      channel: string,
      listener: (...args: any[]) => void
    ) => void;
    getCpuUsage: () => Promise<number>; // 전체 CPU 사용률
    removeAllCpuListeners: () => void; // 컨테이너 cpu 사용률 리스너 제거
    monitorCpuUsage: () => void; // 컨테이너별 cpu 사용률 스트림 가져오는
    //아래 두개 무시하기
    // onCpuUsagePercent: (
    //   callback: (
    //     event: Electron.IpcRendererEvent,
    //     data: { containerId: string; cpuUsagePercent: number }
    //   ) => void
    // ) => void;

    // onAverageCpuUsage: (
    //   callback: (
    //     event: Electron.IpcRendererEvent,
    //     data: { averageCpuUsage: number }
    //   ) => void
    // ) => void;

    // 기타 기능들
    getInboundRules: () => Promise<string>;
    togglePort: (name: string, newEnabled: string) => Promise<void>;

    // pgrok 다운로드
    downloadPgrok: () => Promise<string>; // pgrok 파일 다운로드
    runPgrok: (
      remoteAddr: string,
      forwardAddr: string,
      token: string
    ) => Promise<string>; // pgrok 실행 메서드
    onPgrokLog: (callback: LogCallback) => void; // pgrok 로그 수신 메서드

    // 저장할 경로 지정 + 다운로드 하고 바로 unzip
    getProjectSourceDirectory: () => Promise<string>;
    downloadAndUnzip: (
      sourceCodeLink: string,
      branch: string,
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
    ) => Promise<{ success: boolean; containerId?: string; error?: string }>;

    stopContainer: (
      containerId: string
    ) => Promise<{ success: boolean; error?: string }>;
    removeContainer: (
      containerId: string,
      options?: ContainerRemoveOptions
    ) => Promise<{ success: boolean; error?: string }>;
  }

  //일렉트론 store 용 API 타입 지정
  interface storeAPI {
    initializeStore(): Promise<void>;
    getDockerImage(imageId: string): Promise<DockerImage | undefined>;
    getAllDockerImages(): Promise<DockerImage[]>;
    setDockerImage(image: DockerImage): Promise<void>;
    removeDockerImage(imageId: string): Promise<void>;

    getDockerContainer(
      containerId: string
    ): Promise<DockerContainer | undefined>;
    getAllDockerContainers(): Promise<DockerContainer[]>;
    setDockerContainer(container: DockerContainer): Promise<void>;
    removeDockerContainer(containerId: string): Promise<void>;
  }
  interface Window {
    electronAPI: ElectronAPI; // Electron API 인터페이스 지정
    storeAPI: storeAPI;
  }
}
