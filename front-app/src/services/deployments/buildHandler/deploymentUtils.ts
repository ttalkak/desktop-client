import { sendInstanceUpdate } from "../../websocket/sendUpdateUtils";

export async function prepareDeploymentContext(compute: DeploymentCommand) {
  const { hasDockerFileScript } = determineDeploymentType(compute);

  const { success, found, contextPath, dockerfilePath, message } =
    await window.electronAPI.downloadAndUnzip(
      compute.sourceCodeLink,
      compute.dockerRootDirectory
    );

  // 다운로드 실패 시
  if (!success) {
    console.error("Download and unzip failed:", message);
    sendInstanceUpdate(
      compute.serviceType,
      compute.deploymentId,
      "ERROR",
      compute.outboundPort,
      "소스코드 다운로드 실패, 경로를 확인하세요"
    );
    return { contextPath: null, dockerfilePath: null };
  }

  //도커 파일
  let finalDockerfilePath = dockerfilePath;

  // Switch문으로 조건 나누기
  switch (true) {
    // Dockerfile이 있을 때
    case found: {
      console.log("Dockerfile found...start image build");
      break;
    }

    // Dockerfile이 없고 스크립트가 있을 때
    case !found && hasDockerFileScript: {
      console.log("Dockerfile not found, creating Dockerfile");

      // Dockerfile 생성
      const createResult = await window.electronAPI.createDockerfile(
        dockerfilePath,
        compute.dockerFileScript
      );
      if (!createResult.success) {
        sendInstanceUpdate(
          compute.serviceType,
          compute.deploymentId,
          "ERROR",
          compute.outboundPort,
          "도커 파일 생성 실패"
        );
        return { contextPath: null, dockerfilePath: null };
      }

      finalDockerfilePath = createResult.dockerFilePath;

      break;
    }

    // Dockerfile이 없고, 스크립트도 없을 때
    case !found && !hasDockerFileScript: {
      sendInstanceUpdate(
        compute.serviceType,
        compute.deploymentId,
        "ERROR",
        compute.outboundPort,
        "도커 파일 생성 실패.. 파일을 확인해주세요"
      );
      return { contextPath: null, dockerfilePath: null };
    }

    default:
      console.error("Unexpected case occurred in deployment preparation.");
      return { contextPath: null, dockerfilePath: null };
  }

  return { contextPath, dockerfilePath: finalDockerfilePath };
}

//도커 스크립트 있는지 검증
export function determineDeploymentType(compute: DeploymentCommand) {
  const hasDockerFileScript =
    compute.dockerFileScript && compute.dockerFileScript.trim() !== "";

  return { hasDockerFileScript };
}
