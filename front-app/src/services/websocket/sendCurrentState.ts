import { client } from "./stompClientUtils";
import {
  getTotalMemoryUsage,
  globalStats,
} from "../monitoring/healthCheckPingUtils";
import useDeploymentStore from "../../stores/deploymentStore";
import { useDockerStore } from "../../stores/dockerStore";
import { useDatabaseStore } from "../../stores/databaseStore";

export const sendCurrentState = async (userId: string) => {
  const dockerStore = useDockerStore.getState();
  const databaseStore = useDatabaseStore.getState(); // 제대로 선언됨

  try {
    const osType = await window.electronAPI.getOsType();
    const usedCPU = await window.electronAPI.getCpuUsage();
    const images = await window.electronAPI.getDockerImages();
    const totalSize = images.reduce((acc, image) => acc + (image.Size || 0), 0);
    const runningContainers = dockerStore.dockerContainers;
    const containerMemoryUsage = await getTotalMemoryUsage(runningContainers);
    const totalUsedMemory = totalSize + containerMemoryUsage;

    const deployments = [];

    for (const [containerId, stats] of globalStats.entries()) {
      const deployment = useDeploymentStore.getState().containers[containerId];
      const deploymentId = deployment?.deploymentId; // deployment가 없는 경우 안전하게 처리

      const database = databaseStore.containerMap[containerId];
      const databaseId = database?.databaseId; // database가 없는 경우 안전하게 처리

      if (deploymentId !== undefined) {
        deployments.push({
          id: deploymentId,
          serviceType: deployment.serviceType,
          status: runningContainers.some((c) => c.Id === containerId)
            ? "RUNNING"
            : "STOPPED",
          useMemory: stats.memory_usage,
          useCPU: stats.cpu_usage,
          runningTime: stats.running_time,
          diskRead: stats.blkio_read,
          diskWrite: stats.blkio_write,
        });
      }

      if (databaseId !== undefined) {
        deployments.push({
          id: databaseId,
          serviceType: database.serviceType,
          status: runningContainers.some((c) => c.Id === containerId)
            ? "RUNNING"
            : "STOPPED",
          useMemory: stats.memory_usage,
          useCPU: stats.cpu_usage,
          runningTime: stats.running_time,
          diskRead: stats.blkio_read,
          diskWrite: stats.blkio_write,
        });
      }
    }

    const currentState = {
      userId: userId,
      computerType: osType,
      usedCompute: runningContainers.length,
      usedMemory: totalUsedMemory,
      usedCPU: usedCPU,
      deployments: deployments,
    };

    client?.publish({
      destination: "/pub/compute/ping",
      body: JSON.stringify(currentState),
    });
    console.log("Current state sent:", currentState);
  } catch (error) {
    console.error("Error sending current state:", error);
  }
};
