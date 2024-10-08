import { sendInstanceUpdate } from "../websocket/sendUpdateUtils";
import { useContainerStore } from "../../stores/containerStore";

export async function handleContainerCommand(
  serviceId: string,
  command: string
) {
  const { getContainerIdById, getContainerById, updateContainerInfo } =
    useContainerStore.getState();

  const id = serviceId;
  const containerId = getContainerIdById(serviceId);
  const container = getContainerById(serviceId);

  if (!containerId || !container) {
    console.error(`No container or deployment found for ${serviceId}`);
    return;
  }

  const outboundPort = container.ports?.[0]?.external ?? 0;

  if (container && container.deployId) {
    switch (command) {
      case "START":
        {
          console.log(`Starting container: ${containerId}`);
          const { success } = await window.electronAPI.restartContainer(
            containerId
          );
          if (success) {
            //Stats 시작
            window.electronAPI.startContainerStats([containerId]);
            //store 업데이트
            updateContainerInfo(id, { status: DeployStatus.RUNNING });
            //상태 전송
            if (container && container.deployId) {
              sendInstanceUpdate(
                container.serviceType,
                container.deployId,
                container.senderId,
                "RUNNING",
                outboundPort,
                "RUNNING"
              );
            }
          } else {
            updateContainerInfo(id, { status: DeployStatus.ERROR });
          }
        }
        break;

      case "STOP":
        {
          console.log(`Stopping container: ${containerId}`);
          await window.electronAPI.stopContainerStats([containerId]);
          const { success } = await window.electronAPI.stopContainer(
            containerId
          );
          if (success) {
            sendInstanceUpdate(
              container.serviceType,
              container.deployId,
              container.senderId,
              "STOPPED",
              outboundPort,
              `STOPPED`
            );
            updateContainerInfo(id, { status: DeployStatus.STOPPED });
          } else {
            updateContainerInfo(id, { status: DeployStatus.ERROR });
          }
        }
        break;

      case "RESTART":
        {
          console.log(`Restarting container: ${containerId}`);
          const { success } = await window.electronAPI.restartContainer(
            containerId
          );
          if (success) {
            updateContainerInfo(id, { status: DeployStatus.RUNNING });

            window.electronAPI.startContainerStats([containerId]);
            sendInstanceUpdate(
              container.serviceType,
              container.deployId,
              container.senderId,
              "RUNNING",
              outboundPort,
              "RUNNING"
            );
          } else {
            updateContainerInfo(id, { status: DeployStatus.ERROR });
          }
        }
        break;

      case "DELETE":
        {
          console.log(`Deleting container: ${containerId}`);
          const { success } = await window.electronAPI.removeContainer(
            containerId
          );
          if (success) {
            window.electronAPI.stopContainerStats([containerId]);
            window.electronAPI.stopPgrok(container.deployId);

            sendInstanceUpdate(
              container.serviceType,
              container.deployId,
              container.senderId,
              "DELETED",
              outboundPort,
              "DELETED"
            );
            updateContainerInfo(id, { status: DeployStatus.DELETED });
          }
        }
        break;

      default:
        console.warn(`Unknown command: ${command}`);
    }
  }
}
