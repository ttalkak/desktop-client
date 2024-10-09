import { ipcMain } from "electron";
import { Readable } from "stream";
import { docker } from "./dockerUtils";

const logStreams: Record<string, Readable> = {};

export const handleFetchContainerLogs = (): void => {
  ipcMain.on(
    "start-container-log-stream",
    async (event, containerId: string) => {
      try {
        const container = docker.getContainer(containerId);
        const logStream = (await container.logs({
          follow: true,
          stdout: true,
          stderr: true,
          since: 0,
          timestamps: true,
        })) as Readable;

        logStreams[containerId] = logStream;

        logStream.on("data", async (chunk: Buffer) => {
          const log = chunk.toString();
          event.sender.send("container-logs-stream", {
            containerId,
            log,
          });
        });

        logStream.on("error", (err: Error) => {
          event.sender.send("container-logs-error", {
            containerId,
            error: err.message,
          });
        });

        logStream.on("end", () => {
          event.sender.send("container-logs-end", { containerId });
        });
      } catch (err) {
        event.sender.send("container-logs-error", {
          containerId,
          error: (err as Error).message || "Unknown error",
        });
      }
    }
  );

  ipcMain.on("stop-container-log-stream", (event, containerId: string) => {
    const logStream = logStreams[containerId];
    if (logStream) {
      logStream.destroy();
      delete logStreams[containerId];
      event.sender.send("container-logs-end", {
        containerId,
        message: `Log stream for container ${containerId} has been stopped.`,
      });
    } else {
      event.sender.send("container-logs-error", {
        containerId,
        error: `No active log stream for container ${containerId}.`,
      });
    }
  });
};
