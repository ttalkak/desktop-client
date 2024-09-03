import Store from "electron-store";
import { DockerStoreSchema, schema } from "./dockerStoreSchema";
import { ipcMain } from "electron";

const store = new Store<DockerStoreSchema>({ schema });

// Store 초기화 함수
export function initializeStore() {
  store.clear(); // 기존 데이터를 모두 삭제하고 초기화
  store.set("dockerImages", {}); // 초기값 설정
  store.set("dockerContainers", {}); // 초기값 설정
}

// Docker 이미지 관련 함수들
export function getDockerImage(imageId: string): DockerImage | undefined {
  return store.get(`dockerImages.${imageId}`);
}

//store의 전체 이미지 목록 가져오기
export function getAllDockerImages(): DockerImage[] {
  const images = store.get("dockerImages") as Record<string, DockerImage>;
  return Object.values(images);
}

//store의 도커 이미지 셋팅
export function setDockerImage(image: DockerImage): void {
  const images = store.get("dockerImages") as Record<string, DockerImage>;
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

export function registerStoreIpcHandlers() {
  // store 초기화 핸들러
  ipcMain.handle("initialize-store", () => {
    initializeStore();
  });

  // Docker 이미지 관련 IPC 핸들러 등록
  ipcMain.handle("get-docker-image", (_event, imageId: string) => {
    return getDockerImage(imageId);
  });

  ipcMain.handle("get-all-docker-images", () => {
    return getAllDockerImages();
  });

  ipcMain.handle("set-docker-image", (_event, image) => {
    setDockerImage(image);
  });

  ipcMain.handle("remove-docker-image", (_event, imageId: string) => {
    removeDockerImage(imageId);
  });

  // Docker 컨테이너 관련 IPC 핸들러 등록
  ipcMain.handle("get-docker-container", (_event, containerId: string) => {
    return getDockerContainer(containerId);
  });

  ipcMain.handle("get-all-docker-containers", () => {
    return getAllDockerContainers();
  });

  ipcMain.handle("set-docker-container", (_event, container) => {
    setDockerContainer(container);
  });

  ipcMain.handle("remove-docker-container", (_event, containerId: string) => {
    removeDockerContainer(containerId);
  });
}
