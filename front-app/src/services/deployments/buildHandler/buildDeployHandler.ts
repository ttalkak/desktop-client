import { sendInstanceUpdate } from "../../websocket/sendUpdateUtils.ts";
import { prepareDeploymentContext } from "./deploymentUtils.ts";
import { buildAndDeploy } from "./buildProcessHandler.ts";

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

    if (compute.sourceCodeLink) {
      //compute env, dockerfile 여부 확인하고 생성 후 반환
      const { contextPath, dockerfilePath } = await prepareDeploymentContext(
        compute
      );

      if (!contextPath) {
        return;
      }

      switch (compute.serviceType) {
        case "FRONTEND":
          await buildAndDeploy(compute, contextPath, dockerfilePath);
          break;
        case "BACKEND":
          await buildAndDeploy(compute, contextPath, dockerfilePath);
          break;
        default:
          break;
      }
    }
  } catch (error) {
    console.error("Error during Docker build and setup:", error);
    sendInstanceUpdate(
      compute.deploymentId,
      "ERROR",
      compute.outboundPort,
      `fail to build`
    );
  }
}
