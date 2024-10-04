import { sendInstanceUpdate } from "../websocket/sendUpdateUtils";

export const PGROK_URL = "pgrok.ttalkak.com:2222";

// pgrok 실행 함수
export async function startPgrok(compute: DeploymentCommand) {
  try {
    sendInstanceUpdate(
      compute.serviceType,
      compute.deploymentId,
      "RUNNING",
      compute.outboundPort,
      "port matching 시작.."
    );

    const message = await window.electronAPI.runPgrok(
      PGROK_URL,
      `http://localhost:${compute.outboundPort}`,
      compute.subdomainKey,
      compute.deploymentId,
      compute.subdomainName
    );
    console.log(`pgrok started: ${message}`);

    sendInstanceUpdate(
      compute.serviceType,
      compute.deploymentId,
      "RUNNING",
      compute.outboundPort,
      "배포 완료"
    );
  } catch (error) {
    console.error(`Failed to start pgrok: ${error}`);
    sendInstanceUpdate(
      compute.serviceType,
      compute.deploymentId,
      "ERROR",
      compute.outboundPort,
      "도메인 생성 실패"
    );
  }
}

//개별 pgrok 종료 함수
export async function stopPgrok(deploymentId: number) {
  try {
    await window.electronAPI.stopPgrok(deploymentId);
    console.log(`pgrok stopped : ${deploymentId}`);
  } catch (error) {
    console.error(`Failed to stop pgrok: ${deploymentId} : ${error}`);
  }
}
