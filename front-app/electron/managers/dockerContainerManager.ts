import { exec } from "child_process";
import { promisify } from "util";

// exec을 Promise로 변환하여 사용
const execAsync = promisify(exec);

// 환경 변수를 Docker-friendly 형식으로 변환하는 함수
export function formatEnvs(envs: EnvVar[]): string[] {
  return envs.map(({ key, value }) => {
    // 값에 특수 문자나 공백이 포함된 경우 따옴표로 묶음
    const escapedValue = value.includes("'") ? `"${value}"` : `'${value}'`;
    return `${key}=${escapedValue}`;
  });
}

// 도커 이미지 빌드하는 곳(프론트, 백엔드)
export const createContainerOptions = (
  imageName: string,
  containerName: string,
  inboundPort: number,
  outboundPort: number,
  envs: EnvVar[] = []
  // healthCheckCommand: string[]
): string => {
  const formattedEnvs = formatEnvs(envs); // 환경 변수 처리
  const envString = formattedEnvs.map((env) => `-e ${env}`).join(" ");
  return `docker run -d --name ${containerName} -p ${outboundPort}:${inboundPort} ${envString} ${imageName}`;
};

// 컨테이너 생성
export const createContainer = async (
  options: string
): Promise<{ success: boolean; containerId?: string; error?: string }> => {
  try {
    const { stdout, stderr } = await execAsync(options);

    if (stderr) {
      console.error("Error creating container:", stderr);
      return { success: false, error: stderr };
    }

    const containerId = stdout.trim();
    console.log(`Container created successfully: ${containerId}`);

    return { success: true, containerId };
  } catch (err) {
    console.error("Error creating container:", err);
    return { success: false, error: (err as Error).message };
  }
};

// 컨테이너 시작
export const startContainer = async (
  containerId: string,
  imageTag: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { stderr } = await execAsync(`docker run ${imageTag}`);

    if (stderr) {
      const { success } = await removeContainer(containerId);
      if (!success) {
        return { success: false, error: "removeContainerFail" };
      }
      await execAsync(`docker run ${imageTag}`);
    }

    console.log(`Container ${imageTag} started successfully`);

    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, error: (err as Error).message };
  }
};

// 컨테이너 시작
export const restartContainer = async (
  containerId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    await execAsync(`docker start ${containerId}`);
    console.log(`Container ${containerId} started successfully`);
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, error: (err as Error).message };
  }
};

// 컨테이너 정지
export const stopContainer = async (
  containerId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { stderr } = await execAsync(`docker stop ${containerId}`);

    if (stderr) {
      console.error(`Error stopping container ${containerId}:`, stderr);
      return { success: false, error: stderr };
    }
    console.log(`Container ${containerId} stopped successfully.`);
    return { success: true };
  } catch (err) {
    console.error(`Error stopping container ${containerId}`);
    return { success: false, error: (err as Error).message };
  }
};

// 컨테이너 삭제
export const removeContainer = async (
  containerId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    await stopContainer(containerId);
    const { stderr } = await execAsync(`docker rm -f ${containerId}`);

    if (stderr) {
      console.log(`Container ${containerId} removed successfully.`);
      return { success: false, error: "remove failed" };
    }
    return { success: true };
  } catch (err) {
    console.error(`Error removing container ${containerId}:`, err);
    return { success: false, error: "remove failed" };
  }
};
