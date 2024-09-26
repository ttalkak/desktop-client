import { docker } from "./dockerUtils";
import * as fs from "fs";
import path from "path";

export async function buildDockerImage(
  contextPath: string,
  dockerfilePath: string | null,
  imageName: string,
  tag: string
): Promise<{
  status: "success" | "exists" | "failed";
  image?: DockerImage;
}> {
  if (!dockerfilePath) {
    console.error("Dockerfile not found.");
    return { status: "failed" };
  }

  const fullTag = `${imageName}:${tag}`;

  const dockerImages = await docker.listImages();
  const imageInDocker = dockerImages.find((img) =>
    img.RepoTags?.includes(fullTag)
  );

  if (imageInDocker) {
    console.log(`Image ${fullTag} already exists. Deleting and rebuilding...`);
    const removeResult = await removeImage(fullTag);
    if (!removeResult.success) {
      return { status: "failed" };
    }
    console.log(`Rebuilding Docker image ${fullTag}`);
  }

  fs.chmod(dockerfilePath, "755", (err: NodeJS.ErrnoException | null) => {
    if (err) {
      console.error(`Failed to set permissions for Dockerfile: ${err.message}`);
      return { status: "failed" };
    }
    console.log(`Permissions set for Dockerfile at ${dockerfilePath}`);
  });

  const relativeDockerfilePath = path
    .relative(contextPath, dockerfilePath)
    .replace(/\\/g, "/");
  console.log("docker relativePath:", relativeDockerfilePath);
  console.log("docker contextPath", contextPath);

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

  stream.pipe(process.stdout, { end: true });

  return new Promise<{
    status: "success" | "exists" | "failed";
    image?: DockerImage;
  }>((resolve, reject) => {
    stream.on("end", async () => {
      console.log(`Docker image ${fullTag} built successfully`);

      try {
        const images = await docker.listImages({
          filters: { reference: [fullTag] },
        });
        const builtImage = images.find((img) =>
          img.RepoTags?.includes(fullTag)
        );
        resolve({ status: "success", image: builtImage });
      } catch (error) {
        console.error("Error inspecting built image:", error);
        reject({ status: "failed" });
      }
    });

    stream.on("error", (err: Error) => {
      console.error("Error building Docker image:", err);
      reject({ status: "failed" });
    });
  });
}

export const removeImage = async (
  imageId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const image = docker.getImage(imageId);

    const containers = await docker.listContainers({ all: false });
    const usingContainers = containers.filter(
      (container) => container.Image === imageId
    );

    if (usingContainers.length > 0) {
      console.log(`Image ${imageId} is used by the following containers:`);
      usingContainers.forEach((container) => {
        console.log(`Stopping and removing container ${container.Id}`);
      });

      for (const container of usingContainers) {
        const cont = docker.getContainer(container.Id);
        await cont.stop();
        await cont.remove();
        console.log(`Container ${container.Id} removed successfully`);
      }
    }

    await image.remove({ force: true });
    console.log(`Image ${imageId} removed successfully`);
    return { success: true };
  } catch (error) {
    console.error(`Error removing image ${imageId}:`, error);
    return { success: false, error: (error as Error).message };
  }
};
