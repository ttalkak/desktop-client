// dockerUtils.ts

import { docker } from "./dockerManager";
import { ipcMain } from "electron";

export async function pullDockerImage(imageName: string): Promise<void> {
  const stream = await docker.pull(imageName);
  return new Promise<void>((resolve, reject) => {
    docker.modem.followProgress(stream, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

export async function createDockerContainer(
  imageName: string,
  envVars: string[],
  port: number
) {
  const container = await docker.createContainer({
    Image: imageName,
    Env: envVars,
    ExposedPorts: {
      [`${port}/tcp`]: {},
    },
    HostConfig: {
      PortBindings: {
        [`${port}/tcp`]: [{ HostPort: `${port}` }],
      },
    },
  });

  await container.start();
  return container.id;
}

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

function getEnvVariables(
  databaseType: string,
  username?: string,
  password?: string
): string[] {
  switch (databaseType.toUpperCase()) {
    case "MYSQL":
      const envVars: string[] = [];
      if (password) {
        envVars.push(`MYSQL_ROOT_PASSWORD=${password}`);
      }
      if (username) {
        envVars.push(`MYSQL_USER=${username}`);
      }
      if (password && username) {
        envVars.push(`MYSQL_PASSWORD=${password}`);
      }
      return envVars;
    case "POSTGRESQL":
      return [
        username && `POSTGRES_USER=${username}`,
        password && `POSTGRES_PASSWORD=${password}`,
      ].filter(Boolean) as string[];
    case "REDIS":
      return password ? [`REDIS_PASSWORD=${password}`] : [];
    case "MONGODB":
      return [
        username && `MONGO_INITDB_ROOT_USERNAME=${username}`,
        password && `MONGO_INITDB_ROOT_PASSWORD=${password}`,
      ].filter(Boolean) as string[];
    case "MARIADB":
      const mariaDBEnvVars: string[] = [];
      if (password) {
        mariaDBEnvVars.push(`MARIADB_ROOT_PASSWORD=${password}`);
      }
      if (username) {
        mariaDBEnvVars.push(`MARIADB_USER=${username}`);
      }
      if (password && username) {
        mariaDBEnvVars.push(`MARIADB_PASSWORD=${password}`);
      }
      return mariaDBEnvVars;
    default:
      throw new Error(`Unsupported database type: ${databaseType}`);
  }
}

// db 셋팅 함수
export function handleDatabaseSetup() {
  ipcMain.handle("setup-database", async (_event, dbInfo: any) => {
    try {
      const database = dbInfo.databases[0];
      const { databaseType, username, password, port } = database;

      const imageName = getDatabaseImageName(databaseType);
      const envVars = getEnvVariables(databaseType, username, password);

      // Docker 이미지 pull
      await pullDockerImage(imageName);

      // Docker 컨테이너 실행
      const containerId = await createDockerContainer(imageName, envVars, port);

      return { success: true, containerId };
    } catch (error) {
      console.error(`Failed to setup database:`, error);
      return { success: false, message: (error as Error).message };
    }
  });
}
