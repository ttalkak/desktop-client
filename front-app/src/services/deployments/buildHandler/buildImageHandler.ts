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
  envs: EnvVar[],
  healthCheckCommand: string[]
): Promise<{ success: boolean; containerId?: string; error?: string }> => {
  try {
    console.log("Starting createAndStartContainer function");

    const repoTag = dockerImage.RepoTags?.[0];
    if (!repoTag) {
      return {
        success: false,
        error: `No RepoTag found for image: ${dockerImage}`,
      };
    }

    const existingImages = await window.electronAPI.getDockerImages();
    if (!existingImages.some((img) => img.RepoTags?.includes(repoTag))) {
      return { success: false, error: `Image does not exist: ${repoTag}` };
    }

    const containerName = `${repoTag.replace(/[:/]/g, "-")}-container`;
    const containerOptions = await window.electronAPI.createContainerOptions(
      repoTag,
      containerName,
      inboundPort,
      outboundPort,
      envs,
      healthCheckCommand
    );
    console.log("Created container options:", containerOptions);

    const result = await window.electronAPI.createAndStartContainer(
      containerOptions
    );
    if (!result.success) {
      return {
        success: false,
        error: `Failed to start container: ${result.error}`,
      };
    }

    const containers = await window.electronAPI.getDockerContainers(true);
    const createdContainer = containers.find(
      (c) => c.Id === result.containerId
    );

    if (!createdContainer) {
      return {
        success: false,
        error: "Created container not found in the list.",
      };
    }

    // Store에 저장
    useDockerStore.getState().addDockerContainer(createdContainer);
    console.log("Container stored in the state:", createdContainer);

    return { success: true, containerId: result.containerId };
  } catch (error) {
    console.error("Error in createAndStartContainer:", error);
    return {
      success: false,
      containerId: undefined,
      error: "컨테이너 생성 실패",
    };
  }
};
