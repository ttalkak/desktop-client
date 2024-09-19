import { ipcMain } from "electron";
import { docker } from "./dockerManager";
// 도커 이벤트, 메모리, 사용량 감지

// 도커 이벤트 감지: 개별 컨테이너별 ID 기준
export const handleGetDockerEvent = (): void => {
  ipcMain.on("get-docker-event", (event) => {
    docker.getEvents(
      { filters: { type: ["container", "image", "network", "daemon"] } },
      (err, stream) => {
        if (err) {
          console.error("Error connecting to Docker events:", err);
          event.reply("docker-event-error", err.message);
          return;
        }

        if (stream) {
          stream.on("data", (chunk: Buffer) => {
            try {
              const dockerEvent = JSON.parse(chunk.toString());
              const necessaryActions = [
                "create",
                "start",
                "restart",
                "stop",
                "die",
                "kill",
                "destroy",
                "attach",
                "health_status",
                "network_connect",
                "network_disconnect",
                "oom",
                "checkpoint_create",
                "checkpoint_delete",
                "pull",
                "push",
                "delete",
                "load",
                "save",
                "reload",
                "shutdown",
              ];

              if (
                (dockerEvent.Type === "container" ||
                  dockerEvent.Type === "image") &&
                necessaryActions.includes(dockerEvent.Action)
              ) {
                console.log(
                  `이벤트타입 : ${dockerEvent.Type}, 이벤트종류: ${dockerEvent.Action} `
                );
                event.reply("docker-event-response", dockerEvent);
              }
            } catch (parseError) {
              console.error("Error parsing Docker event:", parseError);
              event.reply("docker-event-error", parseError);
            }
          });

          stream.on("error", (error: Error) => {
            console.error("Stream Error:", error);
            event.reply("docker-event-error", error.message);
          });

          stream.on("end", () => {
            console.log("Docker events stream ended");
            event.reply("docker-event-end");
          });
        } else {
          event.reply("docker-event-error", "No stream returned");
        }
      }
    );
  });
};

//메모리 사용량 : 개별 컨테이너
export async function getContainerMemoryUsage(
  containerId: string
): Promise<number> {
  const container = docker.getContainer(containerId);

  try {
    // Docker 컨테이너의 stats를 1회성으로 수신
    const stats = await container.stats({ stream: false });

    // 메모리 사용량 추출 (stats.memory_stats.usage가 메모리 사용량을 나타냄)
    const memoryUsage = stats.memory_stats.usage;

    return memoryUsage;
  } catch (error) {
    console.error("Error fetching memory usage:", error);
    throw error;
  }
}

//메모리 사용량 ipc 핸들러
export function handleGetContainerMemoryUsage() {
  ipcMain.handle(
    "get-container-memory-usage",
    async (_event, containerId: string) => {
      try {
        // getContainerMemoryUsage 함수 호출하여 메모리 사용량 가져옴
        const memoryUsage = await getContainerMemoryUsage(containerId);
        return { success: true, memoryUsage };
      } catch (error) {
        console.error("Failed to get memory usage:", error);
        return { success: false, error: error };
      }
    }
  );
}

//주기적으로 컨테이너 stats check:  개별 컨테이너 stats cpu, 디스크 리딩 포함, 각기 다른 주기로 모니터링
const statsIntervals = new Map<string, NodeJS.Timeout>();

export function handleGetContainerStatsPeriodic() {
  ipcMain.handle(
    "start-container-stats",
    async (event, containerIds: string[]) => {
      console.log(
        `Starting stats monitoring for containers: ${containerIds.join(", ")}`
      );

      for (const containerId of containerIds) {
        // 이미 모니터링 중이라면 기존 인터벌 제거
        if (statsIntervals.has(containerId)) {
          clearInterval(statsIntervals.get(containerId));
        }

        const intervalId = setInterval(async () => {
          try {
            const container = docker.getContainer(containerId);

            // 컨테이너 시작 시간 가져오기 => runningTime 계산용
            const inspectData = await container.inspect();
            const startedAt = new Date(inspectData.State.StartedAt).getTime();
            const currentTime = Date.now();
            const runningTime = Math.floor((currentTime - startedAt) / 1000); // 초 단위

            const stats = await new Promise((resolve, reject) => {
              container.stats({ stream: false }, (err, stats) => {
                if (err) reject(err);
                else
                  resolve({
                    cpu_usage: stats?.cpu_stats.cpu_usage.total_usage,
                    memory_usage: stats?.memory_stats.usage,
                    container_id: containerId,
                    running_time: runningTime,
                    blkio_read:
                      stats?.blkio_stats?.io_service_bytes_recursive?.find(
                        (io) => io.op === "Read"
                      )?.value ?? 0,
                    blkio_write:
                      stats?.blkio_stats?.io_service_bytes_recursive?.find(
                        (io) => io.op === "Write"
                      )?.value ?? 0,
                  });
              });
            });

            console.log(`Fetched stats for container ${containerId}:`, stats);
            event.sender.send("container-stats-update", stats);
          } catch (error) {
            console.error(
              `Error fetching stats for container ${containerId}:`,
              error
            );
            event.sender.send("container-stats-error", {
              containerId,
              error: error,
            });
          }
        }, 60000);

        statsIntervals.set(containerId, intervalId);
      }

      return {
        success: true,
        message: `Started monitoring containers: ${containerIds.join(", ")}`,
      };
    }
  );

  ipcMain.handle("stop-container-stats", (_event, containerIds: string[]) => {
    const stoppedContainers: string[] = [];
    const notMonitoredContainers: string[] = [];

    for (const containerId of containerIds) {
      if (statsIntervals.has(containerId)) {
        clearInterval(statsIntervals.get(containerId));
        statsIntervals.delete(containerId);
        stoppedContainers.push(containerId);
      } else {
        notMonitoredContainers.push(containerId);
      }
    }

    return {
      success: true,
      stoppedContainers,
      notMonitoredContainers,
      message: `Stopped monitoring containers: ${stoppedContainers.join(
        ", "
      )}. Not monitored: ${notMonitoredContainers.join(", ")}`,
    };
  });
}
