import { sendInstanceUpdate } from "../../websocket/sendUpdateUtils.ts";
import { processFrontendDeployment } from "./buildFrontHandler.ts";
import { processBackendDeployment } from "./buildBackHandler.ts";
import { prepareDeploymentContext } from "./deploymentUtils.ts";

export async function handleDockerBuild(compute: DeploymentCommand) {
  try {
    // if (compute.dockerImageName && compute.serviceType == "BACKEND") {
    //   //docker
    // } else {

    // }

    //env, dockerfile 여부 확인하고 생성 후 반환
    const { contextPath, dockerfilePath } = await prepareDeploymentContext(
      compute
    );

    if (!contextPath) {
      return; // prepareDeploymentContext 내에서 에러 처리 및 상태 업데이트 수행
    }

    switch (compute.serviceType) {
      case "FRONTEND":
        await processFrontendDeployment(compute, contextPath, dockerfilePath);
        break;
      case "BACKEND":
        await processBackendDeployment(compute, contextPath, dockerfilePath);
        break;
      default:
        break;
    }
  } catch (error) {
    console.error("Error during Docker build and setup:", error);
    sendInstanceUpdate(
      compute.deploymentId,
      "ERROR",
      compute.outboundPort,
      `dockerfile`
    );
  }
}
