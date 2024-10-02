import { docker } from "./dockerUtils";
import Docker from "dockerode";

// 환경 변수를 Docker-friendly 형식으로 변환하는 함수
function formatEnvs(envs: EnvVar[]): string[] {
  return envs
    .filter(({ key }) => key !== "PORT") // PORT는 별도로 처리하고, 나머지를 환경 변수로 변환
    .map(({ key, value }) => `${key}=${value}`);
}

// 특정 포트는 ExposedPorts와 PortBindings에 추가
function getPortBindings(envs: EnvVar[]): {
  [port: string]: { HostPort: string }[];
} {
  const portBindings: { [port: string]: { HostPort: string }[] } = {};

  envs
    .filter(({ key }) => key === "PORT") // PORT key에 해당하는 값만 처리
    .forEach(({ value }) => {
      const port = value;
      portBindings[`${port}/tcp`] = [{ HostPort: port }]; // 동일한 포트로 노출
    });

  return portBindings;
}

export const createContainerOptions = (
  name: string,
  containerName: string,
  inboundPort: number,
  outboundPort: number,
  envs: EnvVar[] = []
): Docker.ContainerCreateOptions => {
  const formattedEnvs = formatEnvs(envs); // PORT가 아닌 환경 변수 처리
  const portBindings = getPortBindings(envs); // PORT에 대한 노출 포트 처리

  return {
    Image: name,
    name: containerName,
    ExposedPorts: {
      [`${inboundPort}/tcp`]: {}, // 기본 inbound 포트
      ...Object.keys(portBindings).reduce((acc, port) => {
        acc[port] = {}; // PORT에 대한 추가 노출 포트 설정
        return acc;
      }, {} as Record<string, object>), // 빈 객체 타입을 Record<string, object>로 정의
    },
    HostConfig: {
      PortBindings: {
        [`${inboundPort}/tcp`]: [{ HostPort: outboundPort.toString() }],
        ...portBindings, // PORT 값에 따른 PortBindings 추가
      },
    },
    Env: formattedEnvs.length > 0 ? formattedEnvs : undefined, // PORT 외 나머지 환경 변수 전달
    Healthcheck: {
      Test: ["CMD-SHELL", "curl -f http://localhost/ || exit 1"],
      Interval: 30000000000,
      Timeout: 10000000000,
      Retries: 3,
      StartPeriod: 5000000000,
    },
  };
};

//컨테이너 생성
export const createContainer = async (
  options: Docker.ContainerCreateOptions
): Promise<{ success: boolean; containerId?: string; error?: string }> => {
  try {
    const existingContainers = await docker.listContainers({ all: true });
    const existingContainer = existingContainers.find((container) =>
      container.Names.includes(`/${options.name}`)
    );

    if (existingContainer) {
      console.log(
        `Container with name ${options.name} already exists with ID ${existingContainer.Id}.`
      );
      return {
        success: true,
        containerId: existingContainer.Id,
        error: "Container with this name already exists",
      };
    }

    const container = await docker.createContainer(options);
    console.log(`Container ${container.id} created successfully`);
    return { success: true, containerId: container.id };
  } catch (error) {
    console.error("Error creating container:", error);
    return { success: false, error: (error as Error).message };
  }
};

//컨테이너 시작
export const startContainer = async (
  containerId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const container = docker.getContainer(containerId);
    const containerInfo = await container.inspect();

    if (containerInfo.State && containerInfo.State.Status !== "running") {
      await container.start();
      console.log(`Container ${containerId} started successfully`);

      // 컨테이너가 실행된 후 권한 변경
      await container.exec({
        Cmd: ["chmod", "-R", "755", "/"],
        AttachStdout: true,
        AttachStderr: true,
      });
      console.log(
        `Permissions updated successfully for container ${containerId}`
      );

      return { success: true };
    } else if (containerInfo.State.Status === "running") {
      console.log(`Container ${containerId} is already running`);
      return { success: true };
    } else {
      console.error(
        `Container ${containerId} is not in a state that can be started`
      );
      return { success: false, error: "Container is not in a startable state" };
    }
  } catch (error) {
    console.error(`Error starting container ${containerId}:`, error);
    return { success: false, error: (error as Error).message };
  }
};

//컨테이너 정지
export const stopContainer = async (containerId: string): Promise<void> => {
  try {
    const container = docker.getContainer(containerId);
    const containerInfo = await container.inspect();

    if (containerInfo.State.Running) {
      await container.stop();
      console.log(`Container ${containerId} stopped successfully.`);
      const stopResult = await container.wait();
      console.log(
        `Container ${containerId} stopped with status code ${stopResult.StatusCode}`
      );
    } else if (containerInfo.State.Status === "exited") {
      console.log(`Container ${containerId} is already stopped.`);
    } else if (containerInfo.State.Status === "stopping") {
      console.log(`Container ${containerId} is already stopping.`);
    } else {
      console.log(`Container ${containerId} is not running.`);
    }
  } catch (err) {
    console.error(`Error stopping container ${containerId}:`, err);
  }
};

// 컨테이너 삭제
export const removeContainer = async (
  containerId: string,
  options?: Docker.ContainerRemoveOptions
): Promise<void> => {
  try {
    const container = docker.getContainer(containerId);

    // 컨테이너 상태 확인
    const containerInfo = await container.inspect();

    // 컨테이너가 실행 중이면 정지
    if (containerInfo.State.Running) {
      console.log(`Container ${containerId} is running. Stopping container...`);
      await container.stop();
      console.log(`Container ${containerId} stopped successfully.`);

      // 컨테이너가 완전히 중지될 때까지 기다림
      const stopResult = await container.wait();
      console.log(
        `Container ${containerId} stopped with status code ${stopResult.StatusCode}`
      );
    }

    // 컨테이너 삭제
    await container.remove({ force: true, ...options });
    console.log(`Container ${containerId} removed successfully.`);
  } catch (err) {
    console.error(`Error removing container ${containerId}:`, err);
  }
};
