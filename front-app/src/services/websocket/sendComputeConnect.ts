import { useDockerStore } from "../../stores/appStatusStore";
import { useDeploymentStore } from "../../stores/deploymentStore";
import {
  getRunningContainers,
  getTotalMemoryUsage,
  globalStats,
} from "../monitoring/healthCheckPingUtils";
import { client } from "./stompClientUtils";

interface Deployment {
  deploymentId: number;
  status: string;
  useMemory: number;
  useCPU: number;
  runningTime: number;
  diskRead: number;
  diskWrite: number;
}
// Compute 연결 요청 관련 인터페이스 정의
interface ComputeConnectRequest {
  userId: string;
  computerType: string;
  usedCompute: number;
  usedMemory: number;
  usedCPU: number;
  deployments: Deployment[]; // 배열로 수정
}

export const sendComputeConnectMessage = async (
  userId: string
): Promise<void> => {
  try {
    const platform = await window.electronAPI.getOsType();
    const usedCPU = await window.electronAPI.getCpuUsage();
    const images = await window.electronAPI.getDockerImages();
    const usedCompute = useDockerStore.getState().dockerContainers.length;
    const totalSize = images.reduce((acc, image) => acc + (image.Size || 0), 0);
    const runningContainers = await getRunningContainers();
    const containerMemoryUsage = await getTotalMemoryUsage(runningContainers);
    const totalUsedMemory = totalSize + containerMemoryUsage;
    const deployments: Deployment[] = [];
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

    const createComputeRequest: ComputeConnectRequest = {
      userId: userId,
      computerType: platform,
      usedCompute: usedCompute || 0,
      usedMemory: totalUsedMemory || 0,
      usedCPU: usedCPU || 0,
      deployments: deployments, // 배열로 전달
    };

    client?.publish({
      destination: "/pub/compute/connect",
      body: JSON.stringify(createComputeRequest),
    });
    console.log("Compute connect message sent:", createComputeRequest);
  } catch (error) {
    console.error("Error sending compute connect message:", error);
  }
};
