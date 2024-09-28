import { pullDockerImage } from "./dockerImageManager";

// DB 타입에 따른 이미지 이름을 반환하는 함수
export function getDatabaseImageName(databaseType: string): string {
  switch (databaseType.toUpperCase()) {
    case "MYSQL":
      return "mysql:latest";
    case "POSTGRESQL":
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

//DB 타입을 입력받아 해당 Docker 이미지를 pull하는 함수
export async function pullDatabaseImage(
  databaseType: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const imageName = getDatabaseImageName(databaseType);
    console.log(`Pulling Docker image for ${databaseType}: ${imageName}`);
    await pullDockerImage(imageName);
    console.log(`Successfully pulled Docker image for ${databaseType}`);
    return { success: true };
  } catch (error) {
    console.error(`Failed to pull Docker image for ${databaseType}: ${error}`);
    return { success: false };
  }
}
