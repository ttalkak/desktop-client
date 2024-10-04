import create from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// 기존 DatabaseCreateEvent 인터페이스 수정
export interface DatabaseCreateEvent {
  containerName: string;
  databaseId: number;
  dockerImageName: string;
  dockerImageTag: string;
  envs: EnvironmentVariable[];
  inboundPort: number;
  outboundPort: number;
  serviceType: string;
  subdomainKey: string;
}

// 새로운 DatabaseState 인터페이스// envs 미 포함
interface DatabaseState {
  containerMap: {
    [containerId: string]: {
      databaseId: number;
      containerName: string;
      dockerImageName: string;
      dockerImageTag: string;
      inboundPort: number;
      outboundPort: number;
      serviceType: string;
      subdomainKey: string;
    };
  };
  addDatabase: (containerId: string, dbCreate: DatabaseCreateEvent) => void; // 새로운 database 추가
  deleteDatabase: (containerId: string) => void; // 특정 containerId 기준으로 database 삭제
  clearDatabases: () => void; // 전체 삭제
}

// sessionStorage 적용하여 상태 관리
export const useDatabaseStore = create<DatabaseState>()(
  persist(
    (set, get) => ({
      containerMap: {}, // containerId를 key로 하여 필요한 필드만 저장

      // containerId와 필요한 데이터 필드들을 추가
      addDatabase: (containerId: string, dbCreate: DatabaseCreateEvent) =>
        set((state) => ({
          containerMap: {
            ...state.containerMap,
            [containerId]: {
              databaseId: dbCreate.databaseId,
              containerName: dbCreate.containerName,
              dockerImageName: dbCreate.dockerImageName,
              dockerImageTag: dbCreate.dockerImageTag,
              inboundPort: dbCreate.inboundPort,
              outboundPort: dbCreate.outboundPort,
              serviceType: dbCreate.serviceType,
              subdomainKey: dbCreate.subdomainKey,
            },
          },
        })),

      // 특정 containerId를 기준으로 database 삭제
      deleteDatabase: (containerId: string) => {
        const { [containerId]: _, ...rest } = get().containerMap; // 해당 containerId 데이터 삭제
        set({ containerMap: rest });
      },

      // 모든 containerId 데이터 삭제
      clearDatabases: () => set({ containerMap: {} }),
    }),
    {
      name: "container-storage", // sessionStorage에 저장될 키 이름
      storage: createJSONStorage(() => sessionStorage), // sessionStorage 사용
    }
  )
);
