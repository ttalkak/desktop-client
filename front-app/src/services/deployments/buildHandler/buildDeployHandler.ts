import { sendInstanceUpdate } from "../../websocket/sendUpdateUtils.ts";
import { prepareDeploymentContext } from "./deploymentUtils.ts";
import { buildAndDeploy } from "./buildProcessHandler.ts";
import { useDeploymentStore } from "../../../stores/deploymentStore.tsx";
import { useDockerStore } from "../../../stores/dockerStore.tsx";

export async function handleDockerBuild(compute: DeploymentCommand) {
  try {
    // 기존 deployment 확인 및 삭제=>기존에 있었으면 rebuild 요청임
    const deploymentstore = useDeploymentStore.getState();
    const dockerstore = useDockerStore.getState();

    // 기존에 존재하던건지 확인
    const existingContainerId = Object.entries(deploymentstore.containers).find(
      ([_, deployment]) => deployment.deploymentId === compute.deploymentId
    )?.[0];

    if (existingContainerId) {
      deploymentstore.removeContainer(existingContainerId);
      dockerstore.removeDockerContainer(existingContainerId);
      console.log(
        `Removed existing deployment with ID: ${compute.deploymentId}`
      );
    }

    // 소스코드 있음 FRONTEND 또는 BACKEND
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
      compute.serviceType,
      compute.deploymentId,
      "ERROR",
      compute.outboundPort,
      `fail to build`
    );
  }
}
