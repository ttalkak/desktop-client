import { sendInstanceUpdate } from "../../websocket/sendUpdateUtils";

export async function prepareDeploymentContext(compute: DeploymentCommand) {
  const { hasDockerFileScript } = determineDeploymentType(compute);

  const { success, found, contextPath, dockerfilePath, message } =
    await window.electronAPI.downloadAndUnzip(
      compute.sourceCodeLink,
      compute.dockerRootDirectory
    );

  // 다운로드 실패 시 처리
  if (!success) {
    console.error("Download and unzip failed:", message);
    return { contextPath: null, dockerfilePath: null };
  }

  let finalDockerfilePath = dockerfilePath;

  // Switch문으로 조건 나누기
  switch (true) {
    // Dockerfile이 있을 때
    case found: {
      console.log("Dockerfile found");
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

export function determineDeploymentType(compute: DeploymentCommand) {
  const hasEnvs = compute.envs && compute.envs.length > 0;
  const hasDockerFileScript =
    compute.dockerFileScript && compute.dockerFileScript.trim() !== "";

  return { hasEnvs, hasDockerFileScript };
}
