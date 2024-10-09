import { sendInstanceUpdate } from "../../websocket/sendUpdateUtils";

export async function prepareDeploymentContext(
  deployCreate: DeploymentCreateEvent
) {
  const { senderId, instance } = deployCreate;
  const hasDockerFileScript = determineDeploymentType(instance);

  // 다운로드 및 압축 해제 시도
  const { success, found, contextPath, dockerfilePath, message } =
    await window.electronAPI.downloadAndUnzip(
      instance.sourceCodeLink,
      instance.dockerRootDirectory
    );

  // 다운로드 실패 시
  if (!success) {
    console.error("Download and unzip failed:", message);
    sendInstanceUpdate(
      instance.serviceType,
      instance.deploymentId,
      senderId,
      "ERROR",
      instance.outboundPort,
      "DOWNLOAD"
    );
    return { contextPath: null, dockerfilePath: null };
  }

  // 도커 파일 경로 설정
  let finalDockerfilePath = dockerfilePath;

  // Dockerfile 존재 여부와 스크립트 유무에 따른 처리
  if (found) {
    // Dockerfile이 있을 때
    console.log("Dockerfile found...start image build");
  } else if (!found && hasDockerFileScript) {
    // Dockerfile이 없고 스크립트가 있을 때
    console.log("Dockerfile not found, creating Dockerfile");

    // Dockerfile 생성 시도
    const createResult = await window.electronAPI.createDockerfile(
      dockerfilePath,
      instance.dockerFileScript
    );

    if (!createResult.success) {
      sendInstanceUpdate(
        instance.serviceType,
        instance.deploymentId,
        senderId,
        "ERROR",
        instance.outboundPort,
        "DOCKER"
      );
      return { contextPath: null, dockerfilePath: null };
    }

    finalDockerfilePath = createResult.dockerFilePath;
  } else {
    // Dockerfile도 없고 스크립트도 없을 때
    sendInstanceUpdate(
      instance.serviceType,
      instance.deploymentId,
      senderId,
      "ERROR",
      instance.outboundPort,
      "DOCKER"
    );
    return { contextPath: null, dockerfilePath: null };
  }

  // 결과 반환
  return { contextPath, dockerfilePath: finalDockerfilePath };
}

// 도커 스크립트 있는지 확인하는 함수
export function determineDeploymentType(instance: DeploymentCommand) {
  return instance.dockerFileScript && instance.dockerFileScript.trim() !== "";
}

// 기존 컨테이너 중지 및 삭제 처리 함수
export async function stopAndRemoveExistingContainer(containerId: string) {
  await window.electronAPI.stopContainerStats([containerId]);
  await window.electronAPI.stopContainer(containerId);
  await window.electronAPI.removeContainer(containerId);
}
