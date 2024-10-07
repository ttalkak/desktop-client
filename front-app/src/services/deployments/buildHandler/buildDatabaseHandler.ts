import { useDatabaseStore } from "../../../stores/databaseStore";
import { useDockerStore } from "../../../stores/dockerStore"; // Docker store 추가
import { sendInstanceUpdate } from "../../../services/websocket/sendUpdateUtils";
import { PGROK_URL } from "../pgrokHandler";
import { DatabaseCreate } from "../../../stores/databaseStore";

export async function handleDatabaseBuild(dbCreate: DatabaseCreate) {
  try {
    const { senderId, instance } = dbCreate;
    // 기존 deployment 확인 및 삭제 => 기존에 있었으면 rebuild 요청임
    const databaseStore = useDatabaseStore.getState();
    const dockerStore = useDockerStore.getState();

    // 기존 databaseId에 해당하는 containerId 찾기
    const existingContainerId = Object.entries(databaseStore.containerMap).find(
      ([_, deployment]) => deployment.databaseId === instance.databaseId
    )?.[0];

    if (existingContainerId) {
      // 기존 containerId 삭제
      await window.electronAPI.removeContainer(existingContainerId);
      await window.electronAPI.stopContainerStats([existingContainerId]);
      databaseStore.removeContainer(existingContainerId);
      dockerStore.removeDockerContainer(existingContainerId);
      console.log(
        `Removed existing deployment with ID: ${instance.databaseId} and containerId: ${existingContainerId}`
      );
    }

    const dbImageName = `${instance.dockerImageName}:${
      instance.dockerImageTag || "latest"
    }`;

    // Docker 컨테이너를 띄우는 API 호출
    const { success, image, container, error } =
      await window.electronAPI.pullAndStartDatabaseContainer(
        instance.dockerImageName,
        dbImageName, // dockerImageName 사용
        instance.containerName, // containerName 사용
        instance.inboundPort, // inboundPort
        instance.outboundPort, // 외부 포트
        instance.envs // 환경 변수들
      );

    console.log(`db id undefined 확인`, instance.databaseId);
    console.log(instance.outboundPort);

    if (success && container.Id) {
      // dbstore에 데이터베이스 저장
      databaseStore.addContainer(container.Id, instance); // 전체 dbCreate 객체 전달
      dockerStore.addDockerImage(image);
      dockerStore.addDockerContainer(container);
      console.log("Database container started and stored in dbstore");

      sendInstanceUpdate(
        instance.serviceType,
        instance.databaseId,
        senderId,
        "PENDING",
        instance.outboundPort,
        "CONTAINER COMPLETE"
      );

      const result = await window.electronAPI.runPgrok(
        PGROK_URL,
        `localhost:${instance.outboundPort}`,
        instance.subdomainKey,
        instance.databaseId
      );

      switch (result) {
        case "FAILED":
          sendInstanceUpdate(
            instance.serviceType,
            instance.databaseId,
            senderId,
            "ERROR",
            instance.outboundPort,
            "FAILED"
          );
          break;
        case "SUCCESS":
          sendInstanceUpdate(
            instance.serviceType,
            instance.databaseId,
            senderId,
            "RUNNING",
            instance.outboundPort,
            "RUNNING"
          );
          window.electronAPI.startLogStream(container.Id);
          break;
        default:
          break;
      }
    } else if (error) {
      sendInstanceUpdate(
        instance.serviceType,
        instance.databaseId,
        senderId,
        "ERROR",
        instance.outboundPort,
        "FAILED"
      );
    }
  } catch (error) {
    console.error("Error during database build process:", error);
  }
}
