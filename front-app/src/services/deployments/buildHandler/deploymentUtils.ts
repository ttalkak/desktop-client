import { sendInstanceUpdate } from "../../websocket/sendUpdateUtils";

export async function prepareDeploymentContext(compute: DeploymentCommand) {
  const { success, found, contextPath, dockerfilePath, message } =
    await window.electronAPI.downloadAndUnzip(
      compute.sourceCodeLink,
      compute.dockerRootDirectory
    );

  compute.hasDockerFile;

  if (!success) {
    console.error("Download and unzip failed:", message);
    sendInstanceUpdate(
      compute.deploymentId,
      "ERROR",
      compute.outboundPort,
      `dockerfile`
    );
    return { contextPath: null, dockerfilePath: null };
  }

  if (!contextPath || !dockerfilePath) {
    console.error("Context path is missing");
    sendInstanceUpdate(
      compute.deploymentId,
      "WAITING",
      compute.outboundPort,
      "dockerfile"
    );
    return { contextPath: null, dockerfilePath: null };
  }

  let finalDockerfilePath = dockerfilePath;

  if (!found && compute.dockerFileScript) {
    console.log("Creating Dockerfile from provided script");
    const createResult = await window.electronAPI.createDockerfile(
      contextPath,
      compute.dockerFileScript
    );
    if (!createResult.success) {
      sendInstanceUpdate(
        compute.deploymentId,
        "WAITING",
        compute.outboundPort,
        "dockerfile"
      );
      return { contextPath: null, dockerfilePath: null };
    }
    if (createResult.contextPath && createResult.dockerFilePath) {
      finalDockerfilePath = createResult.dockerFilePath;
    }
  }

  return { contextPath, dockerfilePath: finalDockerfilePath };
}

export function determineDeploymentType(compute: DeploymentCommand) {
  const hasEnvs = compute.envs && compute.envs.length > 0;
  const hasDockerFileScript =
    compute.dockerFileScript && compute.dockerFileScript.trim() !== "";

  return { hasEnvs, hasDockerFileScript };
}
