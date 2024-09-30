import { determineDeploymentType } from "./deploymentUtils";

export async function processDataBaseDeployment(compute: DeploymentCommand) {
  const { hasEnvs } = determineDeploymentType(compute);

  if (!hasEnvs) {
    console.log("DB 빌드를 위한 envs가 없습니다.");
  }

  console.log(`Processing DataBase deployment: ${compute.dockerImageName}`);

  //db pull  당기기
  if (compute.dockerImageName) {
    console.log(`Pulling database image for ${compute.dockerImageName}`);
    await window.electronAPI.pullDatabaseImage(compute.dockerImageName);
  }
}
