import { useDockerStore } from "../../stores/appStatusStore.tsx";
import { useDeploymentStore } from "../../stores/deploymentStore.tsx";
import { useDeploymentDetailsStore } from "../../stores/deploymentDetailsStore.tsx";
import { createAndStartContainer, handleBuildImage } from "./dockerUtils.ts";
import { sendInstanceUpdate } from "../websocket/sendUpdateUtils";
import { startContainerStatsMonitoring } from "../monitoring/healthCheckPingUtils";
import { startPgrok } from "./pgrokHandler.ts";

// 상수 정의
const DEFAULT_INBOUND_PORT = 80;
const DEFAULT_OUTBOUND_PORT = 8080;

// 공통 유틸 함수: Docker 이미지 및 컨테이너 생성 로직
export async function handleDockerBuild(compute: DeploymentCommand) {
  try {
    const { success, contextPath } = await window.electronAPI.downloadAndUnzip(
      compute.sourceCodeLink,
      compute.dockerRootDirectory
    );

    // 1. Dockerfile 및 .env 파일 처리 (contextPath가 있으면 그걸 기반으로 빌드)
    let dockerfileResult;

    if (success && contextPath) {
      // contextPath가 있는 경우 해당 경로를 사용하여 Docker 빌드
      dockerfileResult = await window.electronAPI.handleDockerfile(
        contextPath,
        compute.dockerFileScript,
        compute.envs
      );
    } else {
      // contextPath가 없거나 다운로드에 실패한 경우 Dockerfile 생성
      sendInstanceUpdate(
        compute.deploymentId,
        "WAITING",
        compute.outboundPort,
        "dockerfile"
      );
      return;
    }

    // Dockerfile 처리 결과 확인
    if (!dockerfileResult.success) {
      sendInstanceUpdate(
        compute.deploymentId,
        "WAITING",
        compute.outboundPort,
        "dockerfile"
      );
      return;
    }

    // 2. Docker 이미지 빌드
    const { image } = await handleBuildImage(
      contextPath, // contextPath가 있으면 그 경로 사용, 없으면 rootDirectory 사용
      dockerfileResult.dockerfilePath!,
      compute.subdomainName
    );
    if (!image) {
      sendInstanceUpdate(
        compute.deploymentId,
        "WAITING",
        compute.outboundPort,
        "dockerfile"
      );
      return;
    }

    // 3. 도커 이미지 추가
    useDockerStore.getState().addDockerImage(image);

    // 4. 컨테이너 생성 및 시작
    const containerId = await createAndStartContainer(
      image,
      compute.inboundPort || DEFAULT_INBOUND_PORT,
      compute.outboundPort || DEFAULT_OUTBOUND_PORT
    );

    if (!containerId) {
      sendInstanceUpdate(
        compute.deploymentId,
        "WAITING",
        compute.outboundPort,
        "dockerfile"
      );
      return;
    }

    // 5. 배포 및 컨테이너 상태 업데이트
    sendInstanceUpdate(
      compute.deploymentId,
      "RUNNING",
      compute.outboundPort,
      ""
    );

    // 6. Deployment 및 DeploymentDetails 상태 업데이트
    useDeploymentStore
      .getState()
      .addDeployment(compute.deploymentId, containerId);
    useDeploymentDetailsStore
      .getState()
      .setRepoUrl(compute.deploymentId, compute.sourceCodeLink);
    useDeploymentDetailsStore
      .getState()
      .setDeploymentDetails(compute.deploymentId, compute);

    // 7. 컨테이너 상태 및 로그 모니터링 시작
    window.electronAPI.startContainerStats([containerId]);
    window.electronAPI.startLogStream(containerId);
    startContainerStatsMonitoring();
    await startPgrok(compute);
  } catch (error) {
    console.error("Error during Docker build and setup:", error);
    sendInstanceUpdate(
      compute.deploymentId,
      "ERROR",
      compute.outboundPort,
      (error as Error).message
    );
  }
}
