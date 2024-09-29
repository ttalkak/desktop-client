import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// Docker State
interface DockerState {
  dockerImages: DockerImage[];
  dockerContainers: DockerContainer[];
  setDockerImages: (images: DockerImage[]) => void;
  addDockerImage: (newImage: DockerImage) => void;
  updateDockerImage: (imageId: string, updates: Partial<DockerImage>) => void;
  removeDockerImage: (imageId: string) => void;
  clearDockerImages: () => void;
  setDockerContainers: (containers: DockerContainer[]) => void;
  addDockerContainer: (newContainer: DockerContainer) => void;
  updateDockerContainer: (
    containerId: string,
    updates: Partial<DockerContainer>
  ) => void;
  removeDockerContainer: (containerId: string) => void;
  clearDockerContainers: () => void;
}

export const useDockerStore = create<DockerState>()(
  persist(
    (set) => ({
      dockerImages: [],
      dockerContainers: [],
      setDockerImages: (images) => set({ dockerImages: images }),
      addDockerImage: (newImage) =>
        set((state) => {
          const existingImageIndex = state.dockerImages.findIndex(
            (image) => image.Id === newImage.Id
          );
          if (existingImageIndex !== -1) {
            const updatedImages = [...state.dockerImages];
            updatedImages[existingImageIndex] = newImage;
            return { dockerImages: updatedImages };
          } else {
            return { dockerImages: [...state.dockerImages, newImage] };
          }
        }),
      updateDockerImage: (imageId, updates) =>
        set((state) => ({
          dockerImages: state.dockerImages.map((image) =>
            image.Id === imageId ? { ...image, ...updates } : image
          ),
        })),
      removeDockerImage: (imageId) =>
        set((state) => ({
          dockerImages: state.dockerImages.filter(
            (image) => image.Id !== imageId
          ),
        })),
      clearDockerImages: () => set({ dockerImages: [] }),
      setDockerContainers: (containers) =>
        set({ dockerContainers: containers }),
      addDockerContainer: (newContainer) =>
        set((state) => {
          const existingContainerIndex = state.dockerContainers.findIndex(
            (container) => container.Id === newContainer.Id
          );
          if (existingContainerIndex !== -1) {
            const updatedContainers = [...state.dockerContainers];
            updatedContainers[existingContainerIndex] = newContainer;
            return { dockerContainers: updatedContainers };
          } else {
            return {
              dockerContainers: [...state.dockerContainers, newContainer],
            };
          }
        }),
      updateDockerContainer: (containerId, updates) =>
        set((state) => ({
          dockerContainers: state.dockerContainers.map((container) =>
            container.Id === containerId
              ? { ...container, ...updates }
              : container
          ),
        })),
      removeDockerContainer: (containerId) =>
        set((state) => ({
          dockerContainers: state.dockerContainers.filter(
            (container) => container.Id !== containerId
          ),
        })),
      clearDockerContainers: () => set({ dockerContainers: [] }),
    }),
    {
      name: "dockerStore",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
