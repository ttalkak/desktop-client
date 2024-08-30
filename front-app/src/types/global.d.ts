export {};
declare global {
  // 콜백 타입 정의
  type LogCallback = (log: string) => void; // 로그 데이터 수신 콜백 타입
  type ErrorCallback = (error: string) => void; // 에러 데이터 수신 콜백 타입
  type EndCallback = () => void; // 스트림 종료 콜백 타입

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
  
    // Docker 관련 메서드들
    checkDockerStatus: () => Promise<string>;
    getDockerImages: () => Promise<DockerImage[]>; 
    fetchDockerContainers: () => Promise<DockerContainer[]>; 
    getDockerExecutablePath: () => Promise<string | null>; 
    openDockerDesktop: (dockerPath: string) => Promise<void>; 
    createAndStartContainer: () => Promise<void>; 
  
    // Docker 이벤트 감지 및 렌더러 연결
    sendDockerEventRequest:()=> void;
    onDockerEventResponse:(callback :EventCallback) => void;
    onDockerEventError:()=>void;
    onDockerEventEnd:()=>void;
    removeAllListeners:()=>void;
    
    getDockerEvent: () => void; // 이벤트 스트림을 시작하는 메서드
    startLogStream: (containerId: string) => void; 
    onLogStream: (callback: LogCallback) => void; 
    onLogError: (callback: ErrorCallback) => void; 
    onLogEnd: (callback: EndCallback) => void; 
  
    // 인바운드, 포트설정
    getInboundRules: () => Promise<string>; 
    togglePort: (name: string, newEnabled: string) => Promise<void>; 
  }

  interface Window {
    electronAPI: ElectronAPI; // Electron API 인터페이스 지정
  }


}
