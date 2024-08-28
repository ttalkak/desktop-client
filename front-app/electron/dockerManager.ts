import Dockerode from 'dockerode';
import { ipcMain } from 'electron';
import { exec } from 'child_process';

// Dockerode 인스턴스 생성
export const docker = new Dockerode({ host: '127.0.0.1', port: 2375 });

//경로가져오기
export const getDockerPath = (): void => {
  ipcMain.handle('get-docker-path', () => {
    const command = 'where docker';
    console.log(command)
    // exec를 사용하여 명령어 실행
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error getting Docker path: ${error.message}`);
        return null; // 오류가 발생하면 null 반환
      }
      if (stderr) {
        console.error(`Stderr: ${stderr}`);
        return null; // 표준 오류가 있으면 null 반환
      }

      const dockerPath = stdout.trim().split('\n')[0]; // 첫 번째 경로를 사용
      console.log(`Docker path found: ${dockerPath}`);
      return dockerPath; // Docker 경로 반환
    });
  });
}

// Docker Desktop 실행 IPC 핸들러
export const handleOpenDocker = (): void => {
  ipcMain.handle('open-docker-desktop', (_event, dockerPath) => {
    if (!dockerPath) {
      console.error('Docker executable path not provided.');
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
  ipcMain.handle('get-docker-images', async () => {
    try {
      const images = await docker.listImages();
      return images;
    } catch (err) {
      console.error('Error fetching Docker images:', err);
      return;
    }
  });
};

// Docker 컨테이너 목록을 가져오는 IPC 핸들러
export const handleFetchDockerContainers = (): void => {
  ipcMain.handle('fetch-docker-containers', async () => {
    try {
      const containers = await docker.listContainers();
      return containers;
    } catch (err) {
      console.error('Error fetching container:', err);
      return;
    }
  });
};

// Docker 컨테이너를 생성 및 실행하는 함수
export const createAndStartContainer = (): void => {
  const containerOptions = {
    Image: 'nginx:latest',
    name: 'my-nginx-container',
    ExposedPorts: {
      '80/tcp': {},
    },
    HostConfig: {
      PortBindings: {
        '80/tcp': [
          {
            HostPort: '8080',
          },
        ],
      },
    },
  };

  docker.createContainer(containerOptions, (err, container) => {
    if (err) {
      console.error('Error creating container:', err);
      return;
    }

    container?.start((err, _data) => {
      if (err) {
        console.error('Error starting container:', err);
        return;
      }
      console.log('Container started successfully');
    });
  });
};
