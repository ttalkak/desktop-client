import { docker } from "./dockerUtils";
import { createContainer, restartContainer } from "./dockerContainerManager";
import { formatEnvs } from "./dockerContainerManager";

interface DatabaseConfig {
  imageName: string;
  defaultPort: number;
  command: string;
  healthCheckCommand?: string[]; //필요시 healthcheck 명령어 추가
}

//databasetype에 따른 빌드 command 처리
function getDatabaseConfig(
  databaseType: string,
  imageName: string,
  containerName: string,
  inboundPort: number,
  outboundPort: number,
  envs: EnvVar[]
): DatabaseConfig {
  const formattedEnvs = formatEnvs(envs);
  const envString = formattedEnvs.map((env) => `-e ${env}`).join(" ");

  const baseCommand = `docker run -d \\
  --name ${containerName} \\
  -p ${outboundPort}:${inboundPort} \\
  ${envString} \\
  -e TZ=Asia/Seoul`;

  console.log("databaseCommand :", baseCommand);
  switch (databaseType.toUpperCase()) {
    case "MYSQL":
      return {
        imageName: "mysql",
        defaultPort: 3306,
        command: `${baseCommand} \\
  ${imageName}`,
        healthCheckCommand: [
          "CMD-SHELL",
          "mysqladmin ping -h localhost -P 3306 || exit 1",
        ],
      };
    case "POSTGRES":
      return {
        imageName: "postgres",
        defaultPort: 5432,
        command: `${baseCommand} \\
  ${imageName}`,
        healthCheckCommand: [
          "CMD-SHELL",
          "pg_isready -h localhost -p 5432 || exit 1",
        ],
      };
    case "REDIS":
      return {
        imageName: "redis",
        defaultPort: 6379,
        command: `${baseCommand} \\
  ${imageName} \\
  redis-server --requirepass "${
    envs.find((e) => e.key === "REDIS_PASSWORD")?.value || "your_password"
  }"`,
        healthCheckCommand: ["CMD-SHELL", "redis-cli -p 6379 ping || exit 1"],
      };
    case "MONGO":
      return {
        imageName: "mongo",
        defaultPort: 27017,
        command: `${baseCommand} \\
  ${imageName}`,
        healthCheckCommand: [
          "CMD-SHELL",
          "mongo --eval 'db.stats()' --port 27017 || exit 1",
        ],
      };
    case "MARIADB":
      return {
        imageName: "mariadb",
        defaultPort: 3306,
        command: `${baseCommand} \\
  ${imageName}`,
        healthCheckCommand: [
          "CMD-SHELL",
          "mysqladmin ping -h localhost -P 3306 || exit 1",
        ],
      };
    default:
      console.warn(`Unsupported database type: ${databaseType}`);
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
    const { command } = getDatabaseConfig(
      databaseType,
      imageName,
      containerName,
      inboundPort,
      outboundPort,
      envs
    );

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

    // 데이터베이스 컨테이너 생성
    const {
      success: createSuccess,
      containerId,
      error: createError,
    } = await createContainer(command);
    if (!createSuccess || !containerId) {
      return {
        success: false,
        error: createError || `Error creating DB container`,
      };
    }

    // 컨테이너 시작
    const { success: startSuccess, error: startError } = await restartContainer(
      containerId
    );
    if (!startSuccess) {
      return {
        success: false,
        error:
          startError || `Failed to start container with ID: ${containerId}`,
      };
    }

    // 컨테이너 정보 가져오기
    const existingContainers = await docker.listContainers({ all: true });
    const container = existingContainers.find(
      (container) => container.Id === containerId
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
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
