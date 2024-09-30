import { buildAndDeploy } from "./buildProcessHandler";
import { determineDeploymentType } from "./deploymentUtils";

export async function processFrontendDeployment(
  compute: DeploymentCommand,
  contextPath: string,
  dockerfilePath: string
) {
  const { hasEnvs, hasDockerFileScript } = determineDeploymentType(compute);

  console.log(`Processing FRONTEND deployment: ${compute.subdomainName}`);
  console.log(
    `Envs: ${hasEnvs ? "Yes" : "No"}, DockerfileScript: ${
      hasDockerFileScript ? "Yes" : "No"
    }`
  );
  console.log(`Dockerfile Path: ${dockerfilePath || "Not found"}`);

  await buildAndDeploy(compute, contextPath, dockerfilePath);
}
