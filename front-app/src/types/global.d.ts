// Docker 데이터 타입 정의
interface DockerImage {
    Id: string;
    RepoTags: string[] | null;
    Created: number;
    Size: number;
    VirtualSize: number;
    Labels: { [key: string]: string } | null;
  }
  
  interface DockerContainer {
    Id: string;
    Names: string[];
    Image: string;
    ImageID: string;
    Command: string;
    Created: number;
    Ports: Array<{ PrivatePort: number; PublicPort?: number; Type: string }>;
    Labels: { [key: string]: string };
    State: string;
    Status: string;
  }
  
  // Electron API 타입 정의
  interface ElectronAPI {
    getDockerImages: () => Promise<DockerImage[]>;
    getDockerContainers: () => Promise<DockerContainer[]>;
    getContainers : ()=> Promise<DockerContainer[]>;
  }
  
  // Window 객체에 electronAPI 속성 추가
  interface Window {
    electronAPI: ElectronAPI;
  }
  