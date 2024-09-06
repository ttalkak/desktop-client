import Docker from "dockerode";
import { EventEmitter } from "events";
import { useCpuStore } from "../stores/appStatusStore";

const docker = new Docker();

export function getContainerStatsStream(containerId: string): EventEmitter {
  const container = docker.getContainer(containerId);
  const statsEmitter = new EventEmitter();

  container.stats({ stream: true }, (err, stream) => {
    if (err) {
      console.error("Error fetching stats:", err);
      statsEmitter.emit("error", { containerId, error: err });
      return;
    }

    stream?.on("data", (data: Buffer) => {
      try {
        const stats = JSON.parse(data.toString());
        const cpuDelta =
          stats.cpu_stats.cpu_usage.total_usage -
          stats.precpu_stats.cpu_usage.total_usage;
        const systemDelta =
          stats.cpu_stats.system_cpu_usage -
          stats.precpu_stats.system_cpu_usage;
        const numberOfCpus = stats.cpu_stats.online_cpus;

        const cpuUsagePercent = (cpuDelta / systemDelta) * numberOfCpus * 100;
        statsEmitter.emit("data", { containerId, cpuUsagePercent });
      } catch (error) {
        console.error("Error parsing stats data:", error);
        statsEmitter.emit("error", { containerId, error });
      }
    });

    stream?.on("error", (err: Error) => {
      console.error("Stream error:", err);
      statsEmitter.emit("error", { containerId, error: err });
    });

    stream?.on("end", () => {
      statsEmitter.emit("end", { containerId });
    });
  });

  return statsEmitter;
}

export function monitorAllContainersCpuUsage(): void {
  docker.listContainers((err, containers) => {
    if (!containers || containers.length === 0) {
      console.error("No containers found.");
      return;
    }
    if (err) {
      console.error("Error listing containers:", err);
      return;
    }

    const setContainerCpuUsages = useCpuStore.getState().setContainerCpuUsages;
    const cpuUsages: CpuUsageData[] = [];

    containers.forEach((container) => {
      const statsEmitter = getContainerStatsStream(container.Id);

      statsEmitter.on(
        "data",
        ({ containerId, cpuUsagePercent }: CpuUsageData) => {
          const existingUsage = cpuUsages.find(
            (usage) => usage.containerId === containerId
          );
          if (existingUsage) {
            existingUsage.cpuUsagePercent = cpuUsagePercent;
          } else {
            cpuUsages.push({ containerId, cpuUsagePercent });
          }

          setContainerCpuUsages([...cpuUsages]);
        }
      );

      statsEmitter.on("error", ({ containerId, error }) => {
        console.error(`Error in container ${containerId}:`, error);
      });

      statsEmitter.on("end", ({ containerId }) => {
        console.log(`Monitoring ended for container ${containerId}`);
        const index = cpuUsages.findIndex(
          (usage) => usage.containerId === containerId
        );
        if (index !== -1) {
          cpuUsages.splice(index, 1);
          setContainerCpuUsages([...cpuUsages]);
        }
      });
    });
  });
}
