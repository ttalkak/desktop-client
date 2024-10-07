import { sendInstanceUpdate } from "../websocket/sendUpdateUtils";

export const PGROK_URL = "pgrok.ttalkak.com:2222";

// pgrok 실행 함수
export async function startPgrok(deployCreate: DeploymentCreateEvent) {
  const { senderId, instance } = deployCreate;

  try {
    const message = await window.electronAPI.runPgrok(
      PGROK_URL,
      `http://localhost:${instance.outboundPort}`,
      instance.subdomainKey,
      instance.deploymentId,
      instance.subdomainName
    );
    console.log(`pgrok started: ${message}`);

    sendInstanceUpdate(
      instance.serviceType,
      instance.deploymentId,
      senderId,
      "RUNNING",
      instance.outboundPort,
      `RUNNING`
    );
  } catch (error) {
    console.error(`Failed to start pgrok: ${error}`);
    sendInstanceUpdate(
      instance.serviceType,
      instance.deploymentId,
      senderId,
      "ERROR",
      instance.outboundPort,
      "DOMAIN"
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
