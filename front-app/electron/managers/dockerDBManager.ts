import { docker } from "./dockerUtils";
import { createContainer, startContainer } from "./dockerContainerManager";
import { createContainerOptions } from "./dockerContainerManager";

type EnvVar = { key: string; value: string };

interface DatabaseConfig {
  imageName: string;
  defaultPort: number;
}

// DB 타입에 따른 이미지 이름과 기본 포트를 반환하는 함수
function getDatabaseConfig(databaseType: string): DatabaseConfig {
  switch (databaseType.toUpperCase()) {
    case "MYSQL":
      return { imageName: "mysql", defaultPort: 3306 };
    case "POSTGRES":
      return { imageName: "postgres", defaultPort: 5432 };
    case "REDIS":
      return { imageName: "redis", defaultPort: 6379 };
    case "MONGODB":
      return { imageName: "mongo", defaultPort: 27017 };
    case "MARIADB":
      return { imageName: "mariadb:latest", defaultPort: 3306 };
    default:
      throw new Error(`Unsupported database type: ${databaseType}`);
  }
}

// DB 타입을 입력받아 해당 Docker 이미지를 pull하는 함수
export async function pullDatabaseImage(
  databaseType: string
): Promise<{ success: boolean; tag?: string; error?: string }> {
  try {
    const { imageName } = getDatabaseConfig(databaseType);
    console.log(`Pulling Docker image for ${databaseType}: ${imageName}`);

    // 이미지 풀
    await docker.pull(imageName);

    // 이미지 태그 반환
    const imageInfo = await docker.getImage(imageName).inspect();
    const tag = imageInfo.RepoTags[0]; // 첫 번째 태그 반환 (예: mysql:latest)

    return { success: true, tag };
  } catch (error) {
    console.error(`Failed to pull Docker image for ${databaseType}: ${error}`);
    return { success: false, error: (error as Error).message };
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
    const { imageName, defaultPort } = getDatabaseConfig(databaseType);
    console.log(`Pulling Docker image for ${databaseType}: ${imageName}`);

    await pullDatabaseImage(databaseType);
    console.log(`Successfully pulled Docker image for ${databaseType}`);

    const options = createContainerOptions(
      imageName,
      containerName,
      defaultPort,
      outboundPort || defaultPort,
      envs
    );

    const { success, containerId, error } = await createContainer(options);
    if (!success || !containerId) {
      throw new Error(`Error creating container: ${error}`);
    }

    const startResult = await startContainer(containerId);
    if (!startResult.success) {
      throw new Error(`Error starting container: ${startResult.error}`);
    }

    console.log(`Container ${containerId} started successfully.`);
    return { success: true, containerId };
  } catch (error) {
    console.error(
      `Failed to pull Docker image and start container for ${databaseType}: ${error}`
    );
    return { success: false, error: (error as Error).message };
  }
}
