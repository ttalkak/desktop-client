const PGROK_URL = "pgrok.ttalkak.com:2222";

// pgrok 실행 함수
export async function startPgrok(compute: DeploymentCommand) {
  try {
    const message = await window.electronAPI.runPgrok(
      PGROK_URL,
      `http://localhost:${compute.outboundPort}`,
      compute.subdomainKey,
      compute.deploymentId,
      compute.subdomainName
    );
    console.log(`pgrok started: ${message}`);
  } catch (error) {
    console.error(`Failed to start pgrok: ${error}`);
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
