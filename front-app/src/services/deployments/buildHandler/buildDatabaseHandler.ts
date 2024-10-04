import {
  DatabaseCreateEvent,
  useDatabaseStore,
} from "../../../stores/databaseStore";
import { useDockerStore } from "../../../stores/dockerStore"; // Docker store 추가
import { sendInstanceUpdate } from "../../../services/websocket/sendUpdateUtils";
import { PGROK_URL } from "../pgrokHandler";

export async function handleDatabaseBuild(dbCreate: DatabaseCreateEvent) {
  try {
    // 기존 deployment 확인 및 삭제 => 기존에 있었으면 rebuild 요청임
    const databaseStore = useDatabaseStore.getState();
    const dockerStore = useDockerStore.getState();

    // 기존 databaseId에 해당하는 containerId 찾기
    const existingContainerId = Object.entries(databaseStore.containerMap).find(
      ([_, deployment]) => deployment.databaseId === dbCreate.databaseId
    )?.[0];

    if (existingContainerId) {
      // 기존 containerId 삭제

      await window.electronAPI.removeContainer(existingContainerId);
      await window.electronAPI.stopContainerStats([existingContainerId]);
      databaseStore.removeContainer(existingContainerId);
      dockerStore.removeDockerContainer(existingContainerId);
      console.log(
        `Removed existing deployment with ID: ${dbCreate.databaseId} and containerId: ${existingContainerId}`
      );
    }

    const dbImageName = `${dbCreate.dockerImageName}:${
      dbCreate.dockerImageTag || "latest"
    }`;

    // Docker 컨테이너를 띄우는 API 호출
    const { success, image, container, error } =
      await window.electronAPI.pullAndStartDatabaseContainer(
        dbCreate.dockerImageName,
        dbImageName, // dockerImageName 사용
        dbCreate.containerName, // containerName 사용
        dbCreate.inboundPort, // inboundPort
        dbCreate.outboundPort, // 외부 포트
        dbCreate.envs // 환경 변수들
      );

    if (success && container.Id) {
      // dbstore에 데이터베이스 저장
      databaseStore.addContainer(container.Id, dbCreate); // 전체 dbCreate 객체 전달
      dockerStore.addDockerImage(image);
      dockerStore.addDockerContainer(container);
      console.log("Database container started and stored in dbstore");

      sendInstanceUpdate(
        dbCreate.serviceType,
        dbCreate.databaseId,
        "RUNNING",
        dbCreate.outboundPort,
        "coniner 빌드 완료 pgrok 시작.."
      );

      await window.electronAPI.runPgrok(
        PGROK_URL,
        `localhost:${dbCreate.outboundPort}`,
        dbCreate.subdomainKey,
        dbCreate.databaseId
      );

      // pgrok 시작 (추가 로직 필요)
    } else if (error) {
      sendInstanceUpdate(
        dbCreate.serviceType,
        dbCreate.databaseId,
        "ERROR",
        dbCreate.outboundPort,
        "database build fail"
      );
    }
  } catch (error) {
    console.error("Error during database build process:", error);
  }
}
