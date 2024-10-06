import { useDockerStore } from "../../stores/dockerStore";
import { sendInstanceUpdate } from "../websocket/sendUpdateUtils";
import { useDatabaseStore } from "../../stores/databaseStore";

export async function terminateAndRemoveDatabases() {
  const containers = useDockerStore.getState().dockerContainers;
  const databaseStore = useDatabaseStore.getState();

  // 1. 데이터베이스 컨테이너 종료 및 삭제
  const containerPromises = containers.map(async (container) => {
    const containerId = container.Id;
    const database = Object.entries(databaseStore.containerMap).find(
      ([id]) => id === containerId
    );

    if (database) {
      const [_, dbData] = database;
      try {
        sendInstanceUpdate(
          "DATABASE",
          dbData.databaseId,
          "WAITING",
          dbData.outboundPort,
          "cloud manipulate"
        );
        await window.electronAPI.removeContainer(containerId);
        console.log(`Database container ${containerId} successfully removed`);

        // 데이터베이스 스토어에서 해당 컨테이너 정보 제거
        databaseStore.removeContainer(containerId);
      } catch (error) {
        console.warn(`Error removing database container ${containerId}:`);
      }
    }
  });

  // 모든 데이터베이스 컨테이너가 삭제될 때까지 대기
  await Promise.all(containerPromises);

  console.log("All database containers have been successfully removed.");
}
