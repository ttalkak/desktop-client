export {};
declare global {
  // 콜백 타입 정의
  type LogCallback = (log: string) => void; // 로그 데이터 수신 콜백 타입
  type ErrorCallback = (error: string) => void; // 에러 데이터 수신 콜백 타입
  type EndCallback = () => void; // 스트림 종료 콜백 타입
  interface DockerPort {
    IP: string;
    PrivatePort: number;
    PublicPort?: number; // PublicPort는 옵션일 수 있음
    Type: string; // 예: 'tcp', 'udp'
  }

  interface DockerImage {
    Containers: number;
    Created: number;
    Id: string;
    Labels: Record<string, string>;
    ParentId: string;
    RepoDigests: string[];
    RepoTags: string[];
    SharedSize: number;
    Size: number;
  }

  interface DockerContainer {
    Id: string;
    Names: string[];
    Image: string;
    ImageID: string;
    Command: string;
    Created: number;
    Ports: DockerPort[]; // DockerPort 배열로 설정
    State: string;
    Status: string;
    [key: string]: any; // 기타 속성
  }

  // Electron API의 타입 지정
  interface ElectronAPI {
    minimizeWindow: () => void;
    maximizeWindow: () => void;
    closeWindow: () => void;

    //도커 현재 상태
    checkDockerStatus:() =>Promise<string>;

    getDockerImages: () => Promise<DockerImage[]>; // Docker 이미지 목록 가져오기
    fetchDockerContainers: () => Promise<DockerContainer[]>; // Docker 컨테이너 목록 가져오기
    getDockerExecutablePath: () => Promise<string | null>; // Docker 경로 가져오기
    openDockerDesktop: (dockerPath: string) => Promise<void>; // Docker Desktop 실행
    createAndStartContainer: () => Promise<void>; // 컨테이너 생성 및 시작
    getDockerEvent:()=>Promise<void>; //도커 이벤트감지 렌더러 연결
    //도커 로그관련
    startLogStream: (containerId: string) => void; // 컨테이너 로그 스트림 시작
    onLogStream: (callback: LogCallback) => void; // 로그 스트림 데이터 수신
    onLogError: (callback: ErrorCallback) => void; // 로그 오류 수신
    onLogEnd: (callback: EndCallback) => void; // 로그 스트림 종료 수신
    
    //인바운드, 포트설정
    getInboundRules: () => Promise<string>; // Inbound 규칙 가져오기
    togglePort: (name: string, newEnabled: string) => Promise<void>; // 포트 활성화/비활성화 전환
    
  }

  interface Window {
    electronAPI: ElectronAPI; // Electron API 인터페이스 지정
  }


}
