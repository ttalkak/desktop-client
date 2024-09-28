import { findDockerfile } from "./dokerFileFinder";
import { dockerFileMaker } from "./dockerFileMaker";
import { envFileMaker } from "./envFileMaker";
import path from "path";

// Dockerfile 탐색 및 없으면 생성
export async function handleDockerfile(
  contextPath: string,
  dockerFileScript?: string,
  envs?: EnvironmentVariable
): Promise<{ success: boolean; dockerfilePath?: string; message?: string }> {
  try {
    let dockerfilePath = await findDockerfile(contextPath);

    if (envs) {
      await envFileMaker(contextPath, envs);
      console.log(`.env file created at ${contextPath}`);
    }

    if (!dockerfilePath && dockerFileScript) {
      const result = await dockerFileMaker(contextPath, dockerFileScript);
      if (result.success) {
        console.log(`Dockerfile created at ${contextPath}`);
        dockerfilePath = path.join(contextPath, "Dockerfile");
      } else {
        return { success: false, message: "Failed to create Dockerfile." };
      }
    }

    if (!dockerfilePath) {
      return {
        success: false,
        message: "Dockerfile not found and not created.",
      };
    }

    return { success: true, dockerfilePath };
  } catch (error) {
    console.error("Error handling Dockerfile:", error);
    return { success: false, message: (error as Error).message };
  }
}
