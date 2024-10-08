import { client } from "./stompClientUtils";
import {
  getTotalMemoryUsage,
  globalStats,
} from "../monitoring/healthCheckPingUtils";
import { useCpuStore } from "../../stores/cpuStore";
import { useContainerStore } from "../../stores/containerStore";
import { useImageStore } from "../../stores/imageStore";

export const sendCurrentState = async (userId: string) => {
  try {
    const OsType = await useCpuStore.getState().osType;
    const { containers, getContainerByContainerId } =
      useContainerStore.getState();
    const usedCPU = await window.electronAPI.getCpuUsage();
    const images = await useImageStore.getState().images;
    const totalSize = images.reduce((acc, image) => acc + (image.Size || 0), 0);
    const runningContainers = containers;
    const containerMemoryUsage = await getTotalMemoryUsage(runningContainers);
    const totalUsedMemory = totalSize + containerMemoryUsage;

    const deployments = [];

    for (const [containerId, stats] of globalStats.entries()) {
      const deployment = getContainerByContainerId(containerId);
      const deployId = deployment?.deployId; // deployment가 없는 경우 안전하게 처리

      console.log("ping확인용", deployment);

      if (deployment !== undefined) {
        deployments.push({
          id: deployId,
          serviceType: deployment.serviceType,
          status: deployment.status,
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
      computerType: OsType,
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
