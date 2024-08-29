import Dockerode from "dockerode";
import { ipcMain } from "electron";
import { exec } from "child_process";
import { BrowserWindow } from "electron";

// Dockerode 인스턴스 생성
export const docker = new Dockerode({ host: "127.0.0.1", port: 2375 });

//도커 이벤트 스트림 구독(로컬에서 발생하는 도커 이벤트 감지)---------------------
async function getDockerEvent() {
  return new Promise((resolve, reject) => {
    docker.getEvents((err, stream) => {
      if (err) {
        console.error("Error connecting to Docker events:", err);
        reject(err.message);
        return;
      }

      stream?.on("data", (chunk) => {
        try {
          const event = JSON.parse(chunk.toString());
          // Docker 이벤트를 렌더러 프로세스로 전송
          BrowserWindow.getAllWindows().forEach((win) => {
            win.webContents.send("docker-event-response", event);
          });
          resolve(event); // 데이터를 성공적으로 수신한 경우 resolve
        } catch (parseError) {
          console.error("Error parsing Docker event:", parseError);
          reject(parseError); // 파싱 오류가 발생한 경우 reject
        }
      });

      stream?.on("error", (error) => {
        console.error("Stream Error:", error);
        reject(error.message); // 스트림 오류가 발생한 경우 reject
      });

      stream?.on("end", () => {
        console.log("Docker events stream ended");
        resolve(null); // 스트림이 종료된 경우 resolve
      });
    });
  });
}

// DockerEvent 감지 핸들러
export const handleGetDockerEvent = (): void => {
  ipcMain.handle("get-docker-event", async () => {
    console.log("Docker event request received");
    try {
      const result = await getDockerEvent(); // 비동기 함수 호출 후 결과를 기다림
      console.log(result, ":try parsing");
      return result; // 성공적으로 처리된 결과 반환
    } catch (error) {
      console.error("Error while handling Docker event:", error);
      throw error; // 오류 발생 시 오류를 던짐
    }
  });
};

//경로 가져오기---------------------------------------------------
export const getDockerPath = (): void => {
  ipcMain.handle("get-docker-path", async () => {
    return new Promise((resolve, reject) => {
      const command = "where docker";

      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error getting Docker path: ${error.message}`);
          reject(`Error getting Docker path: ${error.message}`); // 오류가 발생하면 reject 호출
          return;
        }
        if (stderr) {
          console.error(`Stderr: ${stderr}`);
          reject(`Stderr: ${stderr}`); // 표준 오류가 있으면 reject 호출
          return;
        }
        const dockerPath = stdout.trim().split("\n")[1];
        console.log(`Docker path found: ${dockerPath}`);
        resolve(dockerPath); // Docker 경로 반환
      });
    });
  });
};

// Docker Desktop 실행 IPC 핸들러
export const handleOpenDockerEvent = (): void => {
  ipcMain.handle("open-docker-desktop", (_event, dockerPath) => {
    if (!dockerPath) {
      console.error("Docker executable path not provided.");
      return;
    }

    const command = `"${dockerPath}"`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`Stderr: ${stderr}`);
        return;
      }
      console.log(`Output: ${stdout}`);
    });
  });
};

// Docker 이미지 목록을 가져오는 IPC 핸들러
export const handleGetDockerImages = (): void => {
  ipcMain.handle("get-docker-images", async () => {
    try {
      const images = await docker.listImages();
      return images;
    } catch (err) {
      console.error("Error fetching Docker images:", err);
      return;
    }
  });
};

// Docker 컨테이너 목록을 가져오는 IPC 핸들러
export const handleFetchDockerContainers = (): void => {
  ipcMain.handle("fetch-docker-containers", async () => {
    try {
      const containers = await docker.listContainers();
      return containers;
    } catch (err) {
      console.error("Error fetching container:", err);
      return;
    }
  });
};

// Docker 컨테이너 로그 가져오기 IPC 이벤트 처리
export const handleFetchContainerLogs = (): void => {
  ipcMain.on(
    "start-container-log-stream",
    async (event, containerId: string) => {
      try {
        const container = docker.getContainer(containerId);
        const logStream = await container.logs({
          follow: true,
          stdout: true,
          stderr: true,
          since: 0,
          timestamps: true,
        });

        logStream.on("data", (chunk) => {
          event.sender.send("container-logs-stream", chunk.toString());
        });

        logStream.on("error", (err) => {
          console.error("Error fetching logs:", err);
          event.sender.send("container-logs-error", err.message);
        });

        logStream.on("end", () => {
          event.sender.send("container-logs-end");
        });
      } catch (err) {
        console.error("Error fetching logs:", err);
        event.sender.send("container-logs-error");
      }
    }
  );
};

// Docker 컨테이너를 생성 및 실행하는 함수
export const createAndStartContainer = (): void => {
  const containerOptions = {
    Image: "nginx:latest",
    name: "my-nginx-container",
    ExposedPorts: {
      "80/tcp": {},
    },
    HostConfig: {
      PortBindings: {
        "80/tcp": [
          {
            HostPort: "8080",
          },
        ],
      },
    },
  };

  docker.createContainer(containerOptions, (err, container) => {
    if (err) {
      console.error("Error creating container:", err);
      return;
    }

    container?.start((err, _data) => {
      if (err) {
        console.error("Error starting container:", err);
        return;
      }
      console.log("Container started successfully");
    });
  });
};

//전체 컨테이너 정지

//이미지 빌드
