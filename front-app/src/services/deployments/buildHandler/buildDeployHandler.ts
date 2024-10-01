import { sendInstanceUpdate } from "../../websocket/sendUpdateUtils.ts";
import { prepareDeploymentContext } from "./deploymentUtils.ts";
import { buildAndDeploy } from "./buildProcessHandler.ts";
import {
  Deployment,
  useDeploymentStore,
} from "../../../stores/deploymentStore.tsx";

export async function handleDockerBuild(compute: DeploymentCommand) {
  try {
    // 기존 deployment 확인 및 삭제
    const store = useDeploymentStore.getState();
    const existingContainerId = Object.entries(store.containers).find(
      ([_, deployment]) => deployment.deploymentId === compute.deploymentId
    )?.[0];

    if (existingContainerId) {
      store.removeContainer(existingContainerId);
      console.log(
        `Removed existing deployment with ID: ${compute.deploymentId}`
      );
    }

    //1. compute.dockerImageName//Tag 있으면 db 임 =>  envs로 DB 컨테이너 띄워줌
    if (compute.dockerImageName && compute.serviceType === "BACKEND") {
      const { success, containerId, error } =
        await window.electronAPI.pullAndStartDatabaseContainer(
          compute.dockerImageName,
          compute.containerName,
          compute.outboundPort,
          compute.envs
        );
      if (success && containerId) {
        const deployment: Deployment = {
          deploymentId: compute.deploymentId,
          serviceType: compute.serviceType,
          hasDockerFile: !!compute.hasDockerFile,
          hasDockerImage: compute.hasDockerImage,
          containerName: compute.containerName,
          inboundPort: compute.inboundPort,
          outboundPort: compute.outboundPort,
          subdomainName: compute.subdomainName,
          subdomainKey: compute.subdomainKey,
          sourceCodeLink: compute.sourceCodeLink,
          dockerRootDirectory: compute.dockerRootDirectory,
          dockerFileScript: compute.dockerFileScript,
          envs: compute.envs,
          dockerImageName: compute.dockerImageName,
          dockerImageTag: compute.dockerImageTag,
        };

        store.addContainer(containerId, deployment);
        console.log("Backend build started");
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
