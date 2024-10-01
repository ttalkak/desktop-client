import { sendInstanceUpdate } from "../../websocket/sendUpdateUtils";

export async function prepareDeploymentContext(compute: DeploymentCommand) {
  const { hasEnvs, hasDockerFileScript } = determineDeploymentType(compute);

  const { success, found, contextPath, dockerfilePath, message } =
    await window.electronAPI.downloadAndUnzip(
      compute.sourceCodeLink,
      compute.dockerRootDirectory
    );

  // contextPath와 dockerfilePath 콘솔 출력
  console.log("Context Path:", contextPath);
  console.log("Dockerfile Path:", dockerfilePath);

  // 다운로드 실패 시 처리
  if (!success) {
    console.error("Download and unzip failed:", message);
    return { contextPath: null, dockerfilePath: null };
  }

  let finalDockerfilePath = dockerfilePath;
  // let envFileCreated = false;

  // Switch문으로 조건 나누기
  switch (true) {
    // Dockerfile이 있을 때
    case found: {
      console.log("Dockerfile found");
      // envs가 있는 경우 .env 파일 생성
      // if (hasEnvs) {
      //   console.log("Creating .env file for environment variables");
      //   const envResult = await window.electronAPI.createEnvfile(
      //     dockerfilePath,
      //     compute.envs
      //   );
      //   if (!envResult.success) {
      //     console.error("Failed to create .env file");
      //     sendInstanceUpdate(
      //       compute.deploymentId,
      //       "ERROR",
      //       compute.outboundPort,
      //       "환경 변수 생성 실패"
      //     );
      //     return { contextPath: null, dockerfilePath: null };
      //   }
      //   envFileCreated = true;
      // }
      break;
    }

    // Dockerfile이 없고 env가 있으며, 스크립트가 있을 때
    case !found && hasEnvs && hasDockerFileScript: {
      console.log("Dockerfile not found, creating Dockerfile and .env file");

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

      // .env 파일 생성
      // const envResult = await window.electronAPI.createEnvfile(
      //   dockerfilePath,
      //   compute.envs
      // );
      // if (!envResult.success) {
      //   console.error("Failed to create .env file");
      //   sendInstanceUpdate(
      //     compute.deploymentId,
      //     "ERROR",
      //     compute.outboundPort,
      //     "환경변수 생성 실패"
      //   );
      //   return { contextPath: null, dockerfilePath: null };
      // }
      // envFileCreated = true;
      break;
    }

    // Dockerfile이 없고 env가 없으며 스크립트가 있을 때
    case !found && !hasEnvs && hasDockerFileScript: {
      console.log(
        "Dockerfile not found, creating Dockerfile without .env file"
      );

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
          "dockerfile"
        );
        return { contextPath: null, dockerfilePath: null };
      }
      finalDockerfilePath = createResult.dockerFilePath;
      break;
    }

    // Dockerfile이 없고 env도 없으며, 스크립트도 없을 때
    case !found && !hasEnvs && !hasDockerFileScript: {
      sendInstanceUpdate(
        compute.deploymentId,
        "ERROR",
        compute.outboundPort,
        "dockerfile"
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
