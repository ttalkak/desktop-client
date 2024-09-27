import { useDeploymentDetailsStore } from "../../stores/deploymentDetailsStore";
import { useDeploymentStore } from "../../stores/deploymentStore";
import { handleBuildImage } from "../deployments/dockerUtils";
import { useDockerStore } from "../../stores/appStatusStore";
import { sendInstanceUpdate } from "../websocket/sendUpdateUtils";
import { createAndStartContainer } from "../deployments/dockerUtils";

const addDockerImage = useDockerStore.getState().addDockerImage;

export async function handleContainerCommand(
  deploymentId: number,
  command: string,
  userId: string
) {
  console.log(`Received command: ${command} for deploymentId: ${deploymentId}`);

  const containerId = useDeploymentStore
    .getState()
    .getContainerByDeployment(deploymentId);

  if (!containerId) {
    console.error(`No container found for deploymentId: ${deploymentId}`);
    return;
  }

  const compute =
    useDeploymentDetailsStore.getState().deploymentDetails[deploymentId];
  const repoUrl = compute?.details?.sourceCodeLink;
  const rootDirectory = compute?.details?.dockerRootDirectory;

  if (!compute) {
    console.error(
      `No deployment details found for deploymentId: ${deploymentId}`
    );
    return;
  }

  console.log(`Deployment details fetched for deploymentId: ${deploymentId}`);

  switch (command) {
    case "START":
      {
        console.log(`Starting container: ${containerId}`);
        const { success } = await window.electronAPI.startContainer(
          containerId
        );
        if (success) {
          console.log(`Container started: ${containerId}`);
          window.electronAPI.startContainerStats([containerId]);
          sendInstanceUpdate(
            userId,
            deploymentId,
            "RUNNING",
            compute.details.outboundPort,
            "deploy started"
          );
        } else {
          console.error(`Failed to start container: ${containerId}`);
          sendInstanceUpdate(
            userId,
            deploymentId,
            "ALLOCATE_ERROR",
            compute.details.outboundPort,
            "deploy start failed"
          );
        }
      }
      break;

    case "RESTART":
      {
        console.log(`Restarting container: ${containerId}`);
        const { success } = await window.electronAPI.startContainer(
          containerId
        );
        if (success) {
          console.log(`Container restarted: ${containerId}`);
          sendInstanceUpdate(
            userId,
            deploymentId,
            "RUNNING",
            compute.details.outboundPort,
            "deploy restarted"
          );
        } else {
          console.error(`Failed to restart container: ${containerId}`);
          sendInstanceUpdate(
            userId,
            deploymentId,
            "ERROR",
            compute.details.outboundPort,
            "deploy restart failed"
          );
        }
      }
      break;

    case "DELETE":
      {
        console.log(`Deleting container: ${containerId}`);
        const { success } = await window.electronAPI.removeContainer(
          containerId
        );
        if (success) {
          console.log(`Container deleted: ${containerId}`);
          sendInstanceUpdate(
            userId,
            deploymentId,
            "DELETED",
            compute.details.outboundPort,
            "deploy deleted success"
          );
        } else {
          console.error(`Failed to delete container: ${containerId}`);
          sendInstanceUpdate(
            userId,
            deploymentId,
            "ALLOCATE_ERROR",
            compute.details.outboundPort,
            "deleted failed"
          );
        }
      }
      break;

    case "STOP":
      {
        console.log(`Stopping container stats for containerId: ${containerId}`);
        await window.electronAPI.startContainerStats([containerId]);

        console.log(`Stopping container: ${containerId}`);
        const { success } = await window.electronAPI.stopContainer(containerId);
        if (success) {
          console.log(`Container stopped: ${containerId}`);
          sendInstanceUpdate(
            userId,
            deploymentId,
            "STOPPED",
            compute.details.outboundPort,
            "deploy stopped success"
          );
        } else {
          console.error(`Failed to stop container: ${containerId}`);
          sendInstanceUpdate(
            userId,
            deploymentId,
            "ALLOCATE_ERROR",
            compute.details.outboundPort,
            "deploy stopped failed"
          );
        }

        console.log(`Stopping pgrok for deploymentId: ${deploymentId}`);
        await window.electronAPI.stopPgrok(deploymentId);
      }
      break;

    case "REBUILD":
      {
        console.log(`Rebuilding container for deploymentId: ${deploymentId}`);
        await window.electronAPI.stopContainerStats([containerId]);
        await window.electronAPI.stopLogStream(containerId);
        await window.electronAPI.stopPgrok(deploymentId);
        await window.electronAPI.stopContainer(containerId);
        await window.electronAPI.removeContainer(containerId);

        sendInstanceUpdate(
          userId,
          deploymentId,
          "STOPPED",
          compute.details?.outboundPort,
          "rebuild will start"
        );

        if (repoUrl) {
          console.log(`Rebuilding container for repoUrl: ${repoUrl}`);
          const { success, dockerfilePath, contextPath } =
            await window.electronAPI.downloadAndUnzip(repoUrl, rootDirectory);

          if (success) {
            console.log(`Downloaded and unzipped repo successfully`);
            const { image } = await handleBuildImage(
              contextPath,
              dockerfilePath
            );
            if (!image) {
              console.error(`Failed to build Docker image`);
            } else {
              console.log(`Docker image built successfully: ${image}`);
              addDockerImage(image);

              const newContainerId = await createAndStartContainer(
                image,
                compute.details?.inboundPort || 80,
                compute.details?.outboundPort || 8080
              );

              if (newContainerId) {
                console.log(`New container started: ${newContainerId}`);
                sendInstanceUpdate(
                  userId,
                  deploymentId,
                  "RUNNING",
                  compute.details?.outboundPort,
                  ""
                );
                window.electronAPI.startLogStream(newContainerId);
                window.electronAPI
                  .runPgrok(
                    "pgrok.ttalkak.com:2222",
                    `http://localhost:${compute.details?.outboundPort}`,
                    compute.details.subdomainKey,
                    compute.details.deploymentId,
                    compute.details.subdomainName
                  )
                  .then((message) => {
                    console.log(`pgrok started: ${message}`);
                  })
                  .catch((error) => {
                    console.error(`Failed to start pgrok: ${error}`);
                  });
              }
            }
          } else {
            console.error(
              `Failed to download and unzip for repoUrl: ${repoUrl}`
            );
          }
        } else {
          console.error(`No repoUrl found for deploymentId: ${deploymentId}`);
        }
      }
      break;

    default:
      console.warn(`Unknown command: ${command}`);
  }
}
