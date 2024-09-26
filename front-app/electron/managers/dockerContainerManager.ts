import { docker } from "./dockerUtils";
import Docker from "dockerode";

//컨테이너 옵션 생성
export const createContainerOptions = (
  name: string,
  containerName: string,
  inboundPort: number = 80,
  outboundPort: number = 8080
): Docker.ContainerCreateOptions => {
  return {
    Image: name,
    name: containerName,
    ExposedPorts: inboundPort
      ? {
          [`${inboundPort}/tcp`]: {},
        }
      : {},
    HostConfig: {
      PortBindings:
        inboundPort && outboundPort
          ? {
              [`${inboundPort}/tcp`]: [{ HostPort: outboundPort + "" }],
            }
          : {},
    },
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
