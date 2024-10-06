import { docker } from "./dockerUtils";
import * as fs from "fs";
import path from "path";

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

//이미지 빌드
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
    console.log(`Image ${fullTag} already exists. Deleting and rebuilding...`);
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

  // 상대 경로로 Dockerfile 경로 설정
  const relativeDockerfilePath = path
    .relative(contextPath, dockerfilePath)
    .replace(/\\/g, "/");
  console.log("docker relativePath:", relativeDockerfilePath);

  // Docker 이미지를 빌드
  const stream = await new Promise<NodeJS.ReadableStream>((resolve, reject) => {
    docker.buildImage(
      { context: contextPath, src: ["."] },
      { t: fullTag, dockerfile: relativeDockerfilePath, nocache: true },
      (err, stream) => {
        if (err) {
          reject(err);
        } else if (stream) {
          resolve(stream);
        } else {
          reject(new Error("Stream is undefined"));
        }
      }
    );
  });

  // 빌드 결과를 처리
  stream.pipe(process.stdout, { end: true });

  return new Promise<{
    success: boolean;
    image?: DockerImage;
    error?: string;
  }>((resolve, reject) => {
    stream.on("end", async () => {
      console.log(`Docker image ${fullTag} built successfully`);

      try {
        // 빌드된 이미지를 다시 확인
        const images = await docker.listImages({
          filters: { reference: [fullTag] },
        });
        const builtImage = images.find((img) =>
          img.RepoTags?.includes(fullTag)
        );
        resolve({ success: true, image: builtImage });
      } catch (error) {
        console.error("Error inspecting built image:", error);
        reject({ success: false, error: "Error inspecting built image" });
      }
    });

    stream.on("error", (err: Error) => {
      console.error("Error building Docker image:", err);
      reject({ success: false, error: err.message });
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

    const containers = await docker.listContainers({ all: true });
    const usingContainers = containers.filter(
      (container) =>
        imageTags.includes(container.Image) ||
        container.ImageID === `sha256:${imageId}`
    );

    if (usingContainers.length > 0) {
      const containerIds = usingContainers
        .map((container) => container.Id.substring(0, 12))
        .join(", ");
      const errorMessage = `Image ${imageId} is currently in use: ${containerIds}`;
      console.log(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }

    await image.remove({ force: false });
    console.log(`Image ${imageId} removed successfully`);
    return { success: true };
  } catch (error) {
    console.error(`Error removing image ${imageId}:`, error);
    return { success: false, error: (error as Error).message };
  }
};
