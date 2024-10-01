import { useDockerStore } from "../../../stores/dockerStore";

// 이미지 빌드 함수
export const handleBuildImage = async (
  contextPath: string,
  dockerfilePath: string,
  name: string,
  tag: string
): Promise<{
  success: boolean;
  image?: DockerImage;
  message?: string;
}> => {
  try {
    console.log(`Building Docker image: ${name}:${tag} from ${contextPath}`);

    const result = await window.electronAPI.buildDockerImage(
      contextPath,
      dockerfilePath,
      name,
      tag
    );

    console.log(`Docker build success: ${result.success}`);
    if (result.error) {
      console.log(`Docker build error: ${result.error}`);
    }

    return {
      success: result.success,
      image: result.image,
      message: result.success
        ? "Docker image built successfully."
        : result.error || "Docker image build failed.",
    };
  } catch (error) {
    console.error("Error building Docker image:", error);
    return { success: false, message: String(error) };
  }
};

// 컨테이너 생성 및 시작
export const createAndStartContainer = async (
  dockerImage: DockerImage,
  inboundPort: number,
  outboundPort: number,
  envs: EnvVar[]
): Promise<string> => {
  try {
    console.log("Starting createAndStartContainer function");

    const existingImages = await window.electronAPI.getDockerImages();

    const repoTag = dockerImage.RepoTags?.[0];
    if (!repoTag) {
      return `Error: No RepoTag found for image: ${dockerImage}`;
    }

    if (!existingImages.some((img) => img.RepoTags?.includes(repoTag))) {
      return `Error: Image does not exist: ${repoTag}`;
    }

    console.log("Creating new container for image:", repoTag);
    const containerName = `${repoTag.replace(/[:/]/g, "-")}-container`;
    try {
      const containerOptions = await window.electronAPI.createContainerOptions(
        repoTag,
        containerName,
        inboundPort,
        outboundPort,
        envs
      );
      console.log("Created container options:", containerOptions);

      const result = await window.electronAPI.createAndStartContainer(
        containerOptions
      );
      if (result.success) {
        console.log("Successfully created and started container");
        const containers = await window.electronAPI.getDockerContainers(true);
        const createdContainer = containers.find(
          (c) => c.Id === result.containerId
        );

        if (createdContainer) {
          // Store에 저장
          useDockerStore.getState().addDockerContainer(createdContainer);
          console.log("Container stored in the state:", createdContainer);
        } else {
          console.error("Created container not found in the list.");
          return "Error: Created container not found in the list.";
        }

        return result.containerId; // 성공 시 containerId 반환
      } else {
        return `Error: Failed to start container: ${result.error}`;
      }
    } catch (containerError) {
      return `Error: Error in container creation process: ${containerError}`;
    }
  } catch (error) {
    console.error("Error in createAndStartContainer:", error);
    return `Error: ${error}`; // 에러 메시지 반환
  }
};
