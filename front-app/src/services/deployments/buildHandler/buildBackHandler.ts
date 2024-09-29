import { buildAndDeploy } from "./buildProcessHandler";
import { determineDeploymentType } from "./deploymentUtils";

export async function processBackendDeployment(
  compute: DeploymentCommand,
  contextPath: string,
  dockerfilePath: string | null
) {
  const { hasEnvs, hasDockerFileScript } = determineDeploymentType(compute);

  console.log(`Processing BACKEND deployment: ${compute.subdomainName}`);
  console.log(
    `Envs: ${hasEnvs ? "Yes" : "No"}, DockerfileScript: ${
      hasDockerFileScript ? "Yes" : "No"
    }`
  );
  console.log(`Dockerfile Path: ${dockerfilePath || "Not found"}`);

  //db pull  당기기
  if (compute.dockerImageName) {
    console.log(`Pulling database image for ${compute.dockerImageName}`);
    await window.electronAPI.pullDatabaseImage(compute.dockerImageName);
  }

  await buildAndDeploy(compute, contextPath, dockerfilePath);
}
