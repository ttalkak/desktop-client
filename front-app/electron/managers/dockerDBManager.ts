import { docker } from "./dockerUtils";
import {
  createContainer,
  startContainer,
  createContainerOptions,
} from "./dockerContainerManager";

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
    case "MONGO":
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

// DB 타입을 입력받아 Docker 이미지를 pull하고 컨테이너를 시작하는 함수
export async function pullAndStartDatabaseContainer(
  databaseType: string,
  containerName: string,
  outboundPort: number,
  envs: EnvVar[]
): Promise<{ success: boolean; containerId?: string; error?: string }> {
  try {
    // 기본 포트 가져오기
    const { imageName, defaultPort, healthCheckCommand } =
      getDatabaseConfig(databaseType);
    console.log(imageName);

    await docker.pull(imageName, {});
    // 공통 로직 호출

    // 이미지 태그 반환
    const imageInfo = await docker.getImage(imageName).inspect();
    const tag = imageInfo.RepoTags[0]; // 첫 번째 태그 반환 (예: mysql:latest)

    console.log("Docker image pulled:", tag);
    // 컨테이너 옵션 생성
    const options = createContainerOptions(
      tag,
      containerName,
      defaultPort,
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
      throw new Error(`Error creating container: ${createError}`);
    }

    // 컨테이너 시작
    const startResult = await startContainer(containerId);
    if (!startResult.success) {
      throw new Error(`Error starting container: ${startResult.error}`);
    }

    console.log(`Container ${containerId} started successfully.`);
    return { success: true, containerId };
  } catch (error) {
    console.error(
      `Failed to pull Docker image and start container for ${databaseType}:`,
      error
    );
    return { success: false, error: (error as Error).message };
  }
}
