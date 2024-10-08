import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { DeployStatus } from "../types/deploy";

export interface Port {
  internal: number;
  external: number;
}

export interface DeployContainerInfo {
  id: string;
  senderId?: string;
  deployId?: number;
  serviceType?: string;
  containerName?: string;
  imageTag?: string;
  status?: DeployStatus;
  containerId?: string;
  ports?: Port[];
  subdomainName?: string;
  created?: number;
}

// 컨테이너 저장소 타입 정의
interface ContainerStore {
  containers: DeployContainerInfo[];
  createContainerEntry: (serviceType: string, deployId: number) => string;
  updateContainerInfo: (
    id: string,
    containerInfo: Omit<DeployContainerInfo, "id" | "serviceType" | "deployId">
  ) => void;
  removeContainer: (id: string) => void;
  removeAllContainers: () => void;
  getContainerById: (id: string) => DeployContainerInfo | undefined;
  getContainerIdById: (id: string) => string | undefined;
  getContainerByContainerId: (
    containerId: string
  ) => DeployContainerInfo | undefined;
}

// ID 생성 함수
const createId = (serviceType: string, deployId: string | number) =>
  `${serviceType}-${deployId}`;

// Zustand 컨테이너 저장소 생성
export const useContainerStore = create<ContainerStore>()(
  persist(
    (set, get) => ({
      containers: [],

      // 컨테이너 엔트리 생성 (ID만)
      createContainerEntry: (serviceType, deployId) => {
        const id = createId(serviceType, deployId);
        set((state) => ({
          containers: [...state.containers, { id, serviceType, deployId }],
        }));
        return id;
      },

      // 컨테이너 정보 업데이트
      updateContainerInfo: (id, containerInfo) =>
        set((state) => ({
          containers: state.containers.map((container) =>
            container.id === id ? { ...container, ...containerInfo } : container
          ),
        })),

      // 컨테이너 삭제
      removeContainer: (id) =>
        set((state) => ({
          containers: state.containers.filter(
            (container) => container.id !== id
          ),
        })),

      // 모든 컨테이너 삭제
      removeAllContainers: () =>
        set(() => ({
          containers: [],
        })),

      // ID로 컨테이너 가져오기
      getContainerById: (id) =>
        get().containers.find((container) => container.id === id),

      // ID로 컨테이너의 ID 가져오기
      getContainerIdById: (id) =>
        get().containers.find((container) => container.id === id)?.containerId,
      // containerId로 컨테이너 정보 가져오기
      getContainerByContainerId: (containerId) =>
        get().containers.find(
          (container) => container.containerId === containerId
        ),
    }),
    {
      name: "containers", // 저장소 이름
      storage: createJSONStorage(() => sessionStorage), // sessionStorage에 저장
    }
  )
);
