import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface DeployImageInfo {
  id: string;
  imageId?: string;
  serviceType: string;
  deployId: number;
  RepoTags?: string[];
  Created?: number;
  status?: DeployStatus;
  Size?: number;
  Containers?: number;
}

// 이미지 저장소 타입 정의
interface ImageStore {
  images: DeployImageInfo[];
  createImageEntry: (serviceType: string, deployId: number) => string;
  updateImageInfo: (
    id: string,
    imageInfo: Omit<DeployImageInfo, "id" | "serviceType" | "deployId">
  ) => void;
  removeImage: (id: string) => void;
  removeAllImages: () => void;
  getImageById: (id: string) => DeployImageInfo | undefined;
  getImageIdById: (id: string) => string | undefined;
}

const createId = (serviceType: string, deployId: string | number) =>
  `${serviceType}-${deployId}`;

// Zustand 이미지 저장소 생성
export const useImageStore = create<ImageStore>()(
  persist(
    (set, get) => ({
      images: [],

      // 이미지 엔트리 생성
      createImageEntry: (serviceType, deployId) => {
        const id = createId(serviceType, deployId);
        set((state) => ({
          images: [...state.images, { id, serviceType, deployId, imageId: "" }],
        }));
        return id;
      },

      // 이미지 정보 업데이트
      updateImageInfo: (id, imageInfo) =>
        set((state) => ({
          images: state.images.map((image) =>
            image.id === id ? { ...image, ...imageInfo } : image
          ),
        })),

      // 이미지 삭제
      removeImage: (id) =>
        set((state) => ({
          images: state.images.filter((image) => image.id !== id),
        })),

      // 모든 이미지 삭제
      removeAllImages: () =>
        set(() => ({
          images: [],
        })),

      // ID로 이미지 가져오기
      getImageById: (id) => get().images.find((image) => image.id === id),

      // ID로 이미지의 ID 가져오기
      getImageIdById: (id) =>
        get().images.find((image) => image.id === id)?.imageId,
    }),
    {
      name: "images", // 저장소 이름
      storage: createJSONStorage(() => sessionStorage), // sessionStorage에 저장
    }
  )
);
