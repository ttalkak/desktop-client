import { sendInstanceUpdate } from "../../websocket/sendUpdateUtils.ts";
import { processFrontendDeployment } from "./buildFrontHandler.ts";
import { processBackendDeployment } from "./buildBackHandler.ts";
import { prepareDeploymentContext } from "./deploymentUtils.ts";

export async function handleDockerBuild(compute: DeploymentCommand) {
  try {
    //1. compute.dockerImageName//Tag 있으면 db 임 =>  envs로 DB 컨테이너 띄워줌
    if (compute.dockerImageName && compute.serviceType === "BACKEND") {
      const { success, error } =
        await window.electronAPI.pullAndStartDatabaseContainer(
          compute.dockerImageName,
          compute.containerName,
          compute.outboundPort,
          compute.envs
        );
      if (success) {
        console.log("Backendbuild started");
      } else if (error) {
        sendInstanceUpdate(
          compute.deploymentId,
          "ERROR",
          compute.outboundPort,
          "database build fail"
        );
      }
    }

    //compute env, dockerfile 여부 확인하고 생성 후 반환
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
