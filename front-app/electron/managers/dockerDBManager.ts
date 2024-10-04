import { docker } from "./dockerUtils";
import {
  createContainer,
  startContainer,
  createContainerOptions,
} from "./dockerContainerManager";
import { ContainerInfo } from "dockerode";

type EnvVar = { key: string; value: string };

interface DatabaseConfig {
  imageName: string;
  defaultPort: number;
  healthCheckCommand: string[]; // 헬스 체크 명령어 추가
}

function getDatabaseConfig(databaseType: string): DatabaseConfig {
  switch (databaseType.toUpperCase()) {
    case "MYSQL":
      return {
        imageName: "mysql",
        defaultPort: 3306,
        healthCheckCommand: [
          "CMD-SHELL",
          "mysqladmin ping -h localhost -P 3306 || exit 1",
        ],
      };
    case "POSTGRES":
      return {
        imageName: "postgres",
        defaultPort: 5432,
        healthCheckCommand: [
          "CMD-SHELL",
          "pg_isready -h localhost -p 5432 || exit 1",
        ],
      };
    case "REDIS":
      return {
        imageName: "redis",
        defaultPort: 6379,
        healthCheckCommand: ["CMD-SHELL", "redis-cli -p 6379 ping || exit 1"],
      };
    case "MONGODB":
      return {
        imageName: "mongo",
        defaultPort: 27017,
        healthCheckCommand: [
          "CMD-SHELL",
          "mongo --eval 'db.stats()' --port 27017 || exit 1",
        ],
      };
    case "MARIADB":
      return {
        imageName: "mariadb",
        defaultPort: 3306,
        healthCheckCommand: [
          "CMD-SHELL",
          "mysqladmin ping -h localhost -P 3306 || exit 1",
        ],
      };
    default:
      throw new Error(`Unsupported database type: ${databaseType}`);
  }
}

/// Docker 이미지를 pull하는 Promise 기반 함수
async function pullDatabseImage(imageName: string): Promise<{
  success: boolean;
  image?: DockerImage;
  error?: string;
}> {
  return new Promise((resolve) => {
    docker.pull(imageName, {}, (err, stream) => {
      if (err || !stream) {
        console.error(
          `Error pulling image: ${err?.message || "Stream not available"}`
        );
        return resolve({
          success: false,
          error: err?.message || "Stream not available",
        });
      }

      docker.modem.followProgress(stream, () => {
        console.log(`Docker image ${imageName} pulled successfully.`);

        // listImages()를 사용하여 이미지 목록 가져오기
        docker.listImages((err, images) => {
          if (err) {
            console.error(`Error listing images: ${err.message}`);
            return resolve({ success: false, error: err.message });
          }

          // 방금 pull한 이미지 찾기
          const pulledImage = images?.find(
            (image) => image.RepoTags && image.RepoTags.includes(imageName)
          );

          if (pulledImage) {
            resolve({ success: true, image: pulledImage }); // 성공 시 이미지 반환
          } else {
            console.error(`Pulled image not found in list: ${imageName}`);
            resolve({ success: false, error: `Image not found` });
          }
        });
      });
    });
  });
}

//db image pull 후 dbcontainer 생성
export async function pullAndStartDatabaseContainer(
  databaseType: string,
  imageName: string,
  containerName: string,
  inboundPort: number,
  outboundPort: number,
  envs: EnvVar[]
): Promise<{
  success: boolean;
  image?: DockerImage;
  container?: DockerContainer;
  error?: string;
}> {
  try {
    // 기본 포트 및 healthCheckCommand 가져오기
    const { defaultPort, healthCheckCommand } = getDatabaseConfig(databaseType);

    // Docker 이미지 풀링
    const {
      success,
      image,
      error: pullError,
    } = await pullDatabseImage(imageName);

    if (!success || !image) {
      return {
        success: false,
        error: pullError || `Failed to pull image: ${imageName}`,
      };
    }

    // 컨테이너 옵션 생성
    const options = createContainerOptions(
      imageName,
      containerName,
      inboundPort || defaultPort,
      outboundPort || defaultPort, // 아웃바운드 포트가 없으면 기본 포트 사용
      envs,
      healthCheckCommand
    );

    // 컨테이너 생성
    const {
      success: createSuccess,
      containerId,
      error: createError,
    } = await createContainer(options);
    if (!createSuccess || !containerId) {
      return {
        success: false,
        error: `Error creating container: ${createError}`,
      };
    }

    // 컨테이너 시작
    const startResult = await startContainer(containerId);
    if (!startResult.success) {
      return {
        success: false,
        error: `Failed to start container with ID: ${containerId}`,
      };
    }

    // 컨테이너 정보 가져오기
    const existingContainers = await docker.listContainers({ all: true });
    const container = existingContainers.find(
      (container) => container.Id === containerId // 수정: 할당 대신 비교
    );

    if (!container) {
      return {
        success: false,
        error: `Container with ID ${containerId} not found.`,
      };
    }

    console.log(`Container ${containerId} started successfully.`);
    return { success: true, image, container };
  } catch (error) {
    console.error(
      `Failed to pull Docker image and start container for ${databaseType}:`,
      error
    );
    return { success: false, error: (error as Error).message };
  }
}
