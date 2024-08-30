import Dockerode from "dockerode";
import { ipcMain } from "electron";
import { exec } from "child_process";
import { BrowserWindow } from "electron";

// Dockerode 인스턴스 생성
export const docker = new Dockerode({ host: "127.0.0.1", port: 2375 });


//도커 실행여부 확인 ping()
function checkDockerStatus() {
  return new Promise((resolve) => {
    docker.ping()
      .then(() => {
        console.log('Docker is running.');
        resolve('running'); // Docker가 실행 중일 때 'running' 반환
      })
      .catch((error) => {
        console.error('Docker is not running:', error);
        resolve('unknown'); // Docker가 실행 중이 아니거나 접근할 수 없을 때 'unknown' 반환
      });
  });
}

// IPC 핸들러 등록 함수
export const handlecheckDockerStatus = (): void => {
  ipcMain.handle('check-docker-status', async () => {
    try {
      const status = await checkDockerStatus(); // Docker 상태 체크 후 결과를 기다림
      return status;  // Docker 실행 여부를 'running' 또는 'unknown'으로 반환
    } catch (error) {
      console.error('Error while checking Docker status:', error);
      return 'unknown'; // 오류 발생 시 'unknown' 반환
    }
  });
};

//도터 실행 정보 가져옴()=> 쓸지 안쓸지 모르겠음

// async function checkDockerInfo() {
//   try {
//     const info = await docker.info();
//     console.log('Docker is running. Info:', info);
//   } catch (error) {
//     console.error('Docker is not running:', error);
//   }
// }



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
        if (stderr && stderr.toLowerCase().includes("not found")) {
          // 표준 오류가 있고, 'not found'가 포함된 경우에만 오류로 처리
          console.error(`Docker not found: ${stderr}`);
          reject(`Docker not found: ${stderr}`); 
          return;
        }

        const dockerPaths = stdout.trim().split("\n");
        const dockerPath = dockerPaths[0]; // 첫 번째 경로 사용

        if (!dockerPath) {
          console.error("Docker path not found.");
          reject("Docker path not found.");
          return;
        }

        console.log(`Docker path found: ${dockerPath}`);
        resolve(dockerPath); // Docker 경로 반환
      });
    });
  });
};

// Docker Desktop 실행 IPC 핸들러
export const handleOpenDockerEvent = (): void => {
  ipcMain.handle("open-docker-desktop", async (_event, dockerPath) => {
    if (!dockerPath) {
      console.error("Docker executable path not provided.");
      return;
    }

    // Construct the command to open Docker Desktop or run a specific Docker command.
    const command = `"${dockerPath}"`; // Adjust this if you need to specify a particular command.

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Execution Error: ${error.message}`);
        return;
      }

      if (stderr) {
        // Log the stderr to understand if it's an expected output or a critical error.
        if (stderr.toLowerCase().includes("usage: docker") || stderr.toLowerCase().includes("common commands")) {
          // Likely the output of Docker's help command; handle as a non-critical issue.
          console.log(`Docker CLI help output detected: ${stderr}`);
        } else {
          // If not expected, treat it as a potential issue.
          console.error(`Unexpected Stderr: ${stderr}`);
          return;
        }
      }

      // Log any standard output for debugging purposes.
      console.log(`Command Output: ${stdout}`);
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
      return err;
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
      return err;
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
