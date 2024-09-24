import { useDeploymentStore } from "../stores/deploymentStore";

// compute-update 관련 handleCommand 함수: 주어진 command와 deploymentId를 처리
export function handleContainerCommand(deploymentId: number, command: string) {
  const containerId = useDeploymentStore
    .getState()
    .getContainerByDeployment(deploymentId);

  if (!containerId) {
    console.error(`No container found for deploymentId: ${deploymentId}`);
    return;
  }

  switch (command) {
    case "START":
      window.electronAPI.startContainer(containerId);
      break;
    case "RESTART":
      window.electronAPI.startContainer(containerId);
      break;
    case "DELETE":
      window.electronAPI.removeContainer(containerId);
      break;
    case "STOP":
      window.electronAPI.stopContainer(containerId);
      window.electronAPI.stopPgrok(deploymentId); //정지시 pgrok 로그도 정지
      break;
    case "REBUILD":
      window.electronAPI.stopContainer(containerId);
      window.electronAPI.removeContainer(containerId);
      break;
    default:
      console.log(`Unknown command: ${command}`);
  }
}
