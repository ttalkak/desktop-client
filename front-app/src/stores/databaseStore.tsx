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

// 새로운 DatabaseState 인터페이스// envs 미 포함  COMMAND 처리시 ID type 충돌 오류로 Sting, number
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
  addContainer: (
    containerId: string | number,
    dbCreate: DatabaseCreateEvent
  ) => void; // 새로운 database 추가
  removeContainer: (containerId: string | number) => void; // 특정 containerId 기준으로 database 삭제

  clearAllContainers: () => void; // 전체 삭제
  getContainerIdById: (databaseId: string | number) => string | null;
}

// sessionStorage 적용하여 상태 관리
export const useDatabaseStore = create<DatabaseState>()(
  persist(
    (set, get) => ({
      containerMap: {}, // containerId를 key로 하여 필요한 필드만 저장

      // containerId와 필요한 데이터 필드들을 추가
      addContainer: (
        containerId: string | number,
        dbCreate: DatabaseCreateEvent
      ) =>
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
      removeContainer: (containerId: string | number) => {
        const { [containerId]: _, ...rest } = get().containerMap; // 해당 containerId 데이터 삭제
        set({ containerMap: rest });
      },

      // 모든 containerId 데이터 삭제
      clearAllContainers: () => set({ containerMap: {} }),

      // databaseId를 기준으로 containerId를 반환하는 함수 추가
      getContainerIdById: (databaseId: string | number) => {
        const containerMap = get().containerMap;
        const containerEntry = Object.entries(containerMap).find(
          ([_, value]) => value.databaseId === databaseId
        );
        return containerEntry ? containerEntry[0] : null; // containerId 반환 또는 null 반환
      },
    }),
    {
      name: "container-storage", // sessionStorage에 저장될 키 이름
      storage: createJSONStorage(() => sessionStorage), // sessionStorage 사용
    }
  )
);
