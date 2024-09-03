import Store from "electron-store";
import Docker from "dockerode";
import { DockerStoreSchema, schema } from "./dockerStoreSchema";

const store = new Store<DockerStoreSchema>({ schema });

// Docker 이미지 관련 함수들
export function getDockerImage(imageId: string): DockerImage | undefined {
  return store.get(`dockerImages.${imageId}`);
}

//store의 전체 이미지 목록 가져오기
export function getAllDockerImages(): Docker.ImageInfo[] {
  const images = store.get("dockerImages") as Record<string, Docker.ImageInfo>;
  return Object.values(images);
}

//store의 도커 이미지 셋팅
export function setDockerImage(image: Docker.ImageInfo): void {
  const images = store.get("dockerImages") as Record<string, Docker.ImageInfo>;
  images[image.Id] = image;
  store.set("dockerImages", images);
}

export function removeDockerImage(imageId: string): void {
  const images = store.get("dockerImages");
  delete images[imageId];
  store.set("dockerImages", images);
}

// Docker 컨테이너 관련 함수들
export function getDockerContainer(
  containerId: string
): DockerContainer | undefined {
  return store.get(`dockerContainers.${containerId}`);
}

export function getAllDockerContainers(): DockerContainer[] {
  return Object.values(store.get("dockerContainers"));
}

export function setDockerContainer(container: DockerContainer): void {
  store.set(`dockerContainers.${container.Id}`, container);
}

export function removeDockerContainer(containerId: string): void {
  const containers = store.get("dockerContainers");
  delete containers[containerId];
  store.set("dockerContainers", containers);
}

// 필요한 경우 추가 함수들
export function getRunningContainers(): DockerContainer[] {
  return getAllDockerContainers().filter(
    (container) => container.State === "running"
  );
}
