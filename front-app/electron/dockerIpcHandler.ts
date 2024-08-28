import Dockerode from "dockerode";
import { ipcMain } from "electron";

//도커 데이터 관리용

const Docker = Dockerode;
const docker = new Docker({ host: "127.0.0.1", port: 2375 });

function dockerIpcHandlers(mainWindow) {
  // 이미지 목록 불러오기 IPC 이벤트 처리
  ipcMain.handle("get-docker-images", async () => {
    try {
      const images = await docker.listImages(); // Docker 이미지 목록 가져오기
      return images; // 이미지 목록을 렌더러 프로세스로 반환
    } catch (err) {
      console.error("Error fetching images:", err);
      return;
    }
  });

  // 컨테이너 목록 불러오기 IPC 이벤트 처리
  ipcMain.handle("fetch-docker-containers", async () => {
    try {
      const containers = await docker.listContainers(); // Docker 이미지 목록 가져오기
      return containers;
    } catch (err) {
      console.error("Error fetching container:", err);
      return;
    }
  });

  //Docker로드 코드 작성
  const containerOptions = {
    Image: "nginx:latest", // 사용할 이미지
    name: "my-nginx-container", // 컨테이너 이름
    ExposedPorts: {
      "80/tcp": {}, // 컨테이너 내부에서 노출할 포트
    },
    HostConfig: {
      PortBindings: {
        "80/tcp": [
          {
            HostPort: "8080", // 호스트에서 매핑할 포트 (예: 호스트의 8080 -> 컨테이너의 80)
          },
        ],
      },
    },
  };

  // 컨테이너 생성 및 실행
  docker.createContainer(containerOptions, (err, container) => {
    if (err) {
      console.error("Error creating container:", err);
      return;
    }

    // 생성된 컨테이너를 시작
    container?.start((err, _data) => {
      if (err) {
        console.error("Error starting container:", err);
        return;
      }
      console.log("Container started successfully");
    });
  });
}

module.exports = dockerIpcHandlers;
