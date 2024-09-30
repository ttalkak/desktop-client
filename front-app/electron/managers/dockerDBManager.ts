import { docker } from "./dockerUtils";
import {
  createContainer,
  startContainer,
  createContainerOptions,
} from "./dockerContainerManager";

// DB 타입에 따른 이미지 이름을 반환하는 함수
export function getDatabaseImageName(databaseType: string): string {
  switch (databaseType.toUpperCase()) {
    case "MYSQL":
      return "mysql:latest";
    case "POSTGRES":
      return "postgres:latest";
    case "REDIS":
      return "redis:latest";
    case "MONGODB":
      return "mongo:latest";
    case "MARIADB":
      return "mariadb:latest";
    default:
      throw new Error(`Unsupported database type: ${databaseType}`);
  }
}

// DB 타입을 입력받아 해당 Docker 이미지를 pull하는 함수
export async function pullDatabaseImage(
  databaseType: string
): Promise<{ success: boolean; tag?: string; error?: string }> {
  try {
    const imageName = getDatabaseImageName(databaseType);
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

// 환경 변수를 Docker-friendly 형식으로 변환하는 함수
// Record<string, string>을 Docker에 맞는 string[]로 변환
// const formattedEnvs = Object.entries(envObject).map(
//   ([key, value]) => `${key}=${value}`
// );

// DB 타입을 입력받아 Docker 이미지를 pull하고 컨테이너를 시작하는 함수
export async function pullAndStartDatabaseContainer(
  databaseType: string,
  containerName: string,
  inboundPort: number,
  outboundPort: number,
  envs: Array<{ key: string; value: string }> // Accept envs as an array of objects
): Promise<{ success: boolean; containerId?: string; error?: string }> {
  try {
    // DB 타입을 기반으로 이미지 이름 반환
    const imageName = getDatabaseImageName(databaseType);
    console.log(`Pulling Docker image for ${databaseType}: ${imageName}`);

    await pullDatabaseImage(databaseType);
    console.log(`Successfully pulled Docker image for ${databaseType}`);

    // 환경 변수를 Docker에서 사용할 수 있도록 변환
    const formattedEnvs = formattedEnvs(envs);

    // 컨테이너 옵션 생성 (환경 변수를 포함)
    const options = createContainerOptions(
      imageName,
      containerName,
      inboundPort,
      outboundPort,
      formattedEnvs // Pass the formatted envs
    );

    // 컨테이너 생성
    const { success, containerId, error } = await createContainer(options);
    if (!success || !containerId) {
      throw new Error(`Error creating container: ${error}`);
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
      `Failed to pull Docker image and start container for ${databaseType}: ${error}`
    );
    return { success: false, error: (error as Error).message };
  }
}
