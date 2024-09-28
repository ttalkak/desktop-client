import { client } from "./stompClientUtils";
import {
  getRunningContainers,
  getTotalMemoryUsage,
  globalStats,
} from "../monitoring/healthCheckPingUtils";
import { useDeploymentStore } from "../../stores/deploymentStore";

export const sendCurrentState = async (userId: string) => {
  try {
    const usedCPU = await window.electronAPI.getCpuUsage();
    const images = await window.electronAPI.getDockerImages();
    const totalSize = images.reduce((acc, image) => acc + (image.Size || 0), 0);
    const runningContainers = await getRunningContainers();
    const containerMemoryUsage = await getTotalMemoryUsage(runningContainers);
    const totalUsedMemory = totalSize + containerMemoryUsage;

    const deployments = [];
    for (const [containerId, stats] of globalStats.entries()) {
      const deploymentId = useDeploymentStore
        .getState()
        .getDeploymentByContainer(containerId);
      if (deploymentId !== undefined) {
        deployments.push({
          deploymentId: deploymentId,
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
      computerType: await window.electronAPI.getOsType(),
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
