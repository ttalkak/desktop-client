export{};
declare global {
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

  interface Window {
    electronAPI: {
      minimizeWindow: () => void;
      maximizeWindow: () => void;
      closeWindow: () => void;
      getDockerImages: () => Promise<DockerImage[]>;
      fetchDockerContainers: () => Promise<DockerContainer[]>;
      getInboundRules: () => Promise<string>;
      togglePort: (name: string, newEnabled: string) => Promise<void>;
      getDockerExecutablePath: () => Promise<string | null>; // Docker 경로 가져오기
      openDockerDesktop: (dockerPath: string) => Promise<void>; // Docker Desktop 실행
      createAndStartContainer: () => Promise<void>; 
    };
  }
}


