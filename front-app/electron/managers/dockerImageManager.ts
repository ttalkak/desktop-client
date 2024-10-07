import { docker } from "./dockerUtils";
import * as fs from "fs";
import path from "path";
import { exec } from "child_process";
import { removeContainer } from "./dockerContainerManager";

// Docker 이미지를 pull 받는 함수
export async function pullDockerImage(imageName: string): Promise<void> {
  const stream = await docker.pull(imageName);
  return new Promise<void>((resolve, reject) => {
    docker.modem.followProgress(stream, (err) => {
      if (err) {
        reject(err);
      } else {
        console.log(`Docker image ${imageName} pulled successfully`);
        resolve();
      }
    });
  });
}

// 이미지 빌드 함수 (CMD 명령어 사용)
export async function buildDockerImage(
  contextPath: string,
  dockerfilePath: string | null,
  imageName: string,
  tag: string
): Promise<{
  success: boolean;
  image?: DockerImage;
  error?: string;
}> {
  if (!dockerfilePath) {
    console.error("Dockerfile not found.");
    return { success: false, error: "Dockerfile not found" };
  }

  const fullTag = `${imageName}:${tag}`;

  // Docker 이미지 목록을 조회하여 이미 존재하는지 확인
  const dockerImages = await docker.listImages();
  const imageInDocker = dockerImages.find((img) =>
    img.RepoTags?.includes(fullTag)
  );

  // 이미 존재하는 이미지가 있으면 삭제 후 다시 빌드
  if (imageInDocker) {
    const removeResult = await removeImage(fullTag);
    if (!removeResult.success) {
      return { success: false, error: "Failed to remove existing image" };
    }
    console.log(`Rebuilding Docker image ${fullTag}`);
  }

  try {
    // Dockerfile 권한을 755로 설정 (콜백 기반 비동기 처리)
    await new Promise<void>((resolve, reject) => {
      fs.chmod(dockerfilePath, "755", (err: NodeJS.ErrnoException | null) => {
        if (err) {
          return reject(err); // 에러 발생 시 reject 호출
        }
        console.log(`Permissions set for Dockerfile at ${dockerfilePath}`);
        resolve(); // 성공적으로 권한 설정이 완료되면 resolve 호출
      });
    });
  } catch (err) {
    console.error(`Failed to set permissions for Dockerfile: ${err}`);
    return {
      success: false,
      error: `Failed to set permissions: ${err}`,
    };
  }

  const linuxDockerfilePath = path.posix.normalize(
    dockerfilePath.replace(/\\/g, "/")
  );
  // 상대 경로로 Dockerfile 경로 설정
  const relativeDockerfilePath = path
    .relative(contextPath, dockerfilePath)
    .replace(/\\/g, "/");
  console.log("docker relativePath:", relativeDockerfilePath);

  // CMD 명령어로 Docker 이미지 빌드
  const dockerBuildCommand = `docker build -t ${fullTag} -f ${linuxDockerfilePath} ${contextPath}`;

  return new Promise<{
    success: boolean;
    image?: DockerImage;
    error?: string;
  }>((resolve, reject) => {
    exec(dockerBuildCommand, (error, stdout, stderr) => {
      if (error) {
        console.error("Error building Docker image:", error);
        return reject({ success: false, error: stderr || error.message });
      }

      console.log(stdout); // 빌드 과정 출력

      // 빌드된 이미지를 다시 확인
      docker
        .listImages({ filters: { reference: [fullTag] } })
        .then((images) => {
          const builtImage = images.find((img) =>
            img.RepoTags?.includes(fullTag)
          );
          if (builtImage) {
            resolve({ success: true, image: builtImage });
          } else {
            resolve({ success: false, error: "Image not found after build" });
          }
        })
        .catch((err) => {
          console.error("Error inspecting built image:", err);
          reject({ success: false, error: "Error inspecting built image" });
        });
    });
  });
}

export const removeImage = async (
  imageId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const image = docker.getImage(imageId);

    // Get image details to get RepoTags
    const imageInfo = await image.inspect();
    const imageTags = imageInfo.RepoTags || [];

    // Get all containers (both running and stopped)
    const containers = await docker.listContainers({ all: true });
    const usingContainers = containers.filter(
      (container) =>
        imageTags.includes(container.Image) ||
        container.ImageID === `sha256:${imageId}`
    );

    if (usingContainers.length > 0) {
      // Stop and remove all containers using the image
      for (const container of usingContainers) {
        removeContainer(container.Id);
        console.log(`Container ${container.Id} stopped and removed`);
      }
    }

    // Remove the image after containers are stopped and removed
    await image.remove({ force: true });
    console.log(`Image ${imageId} removed successfully`);
    return { success: true };
  } catch (error) {
    console.error(`Error removing image ${imageId}:`, error);
    return { success: false, error: (error as Error).message };
  }
};
