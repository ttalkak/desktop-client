import fs from "fs";
import path from "path";
import { dockerFileHtmlPermission } from "./dockerFileHtmlPermission"; // 권한 설정 함수 가져오기

// 도커파일이 없는 경우 파일을 생성 후 디렉토리에 넣어주는 함수 (비동기식)
export const dockerFileMaker = async (
  dockerfilePath: string,
  dockerFileScript: string
): Promise<{
  success: boolean;
  message: string;
  contextPath: string;
  dockerFilePath: string;
}> => {
  console.log("start DockerFilMaker!!!");
  const directory = path.dirname(dockerfilePath); // 디렉토리 경로 추출
  const fileName = "Dockerfile"; // 파일 이름 정의

  // Dockerfile 경로 설정
  const fullFilePath = path.join(directory, fileName);

  try {
    // 파일이 이미 존재하는지 확인
    if (fs.existsSync(dockerfilePath)) {
      console.log(`Dockerfile already exists at ${dockerfilePath}`);
      return {
        success: false,
        message: "Dockerfile already exists",
        contextPath: directory,
        dockerFilePath: fullFilePath,
      };
    }

    // 디렉토리가 존재하는지 확인하고 없으면 생성 (비동기식)
    if (!fs.existsSync(dockerfilePath)) {
      console.log(
        `Directory does not exist. Creating directory: ${dockerfilePath}`
      );
      await fs.promises.mkdir(directory, { recursive: true }); // 디렉토리 생성
    }

    // 파일 생성 (비동기식)
    console.log(`Creating Dockerfile at ${fullFilePath}...`);
    await fs.promises.writeFile(fullFilePath, dockerFileScript, "utf8");
    console.log(`File created successfully at ${fullFilePath}`);

    // Dockerfile 생성 후, 권한 설정 로직 적용
    const permissionResult = await dockerFileHtmlPermission(fullFilePath);

    if (permissionResult.success) {
      console.log(
        `Permissions applied successfully to Dockerfile at: ${fullFilePath}`
      );
      return {
        success: true,
        message: "File created and permissions applied successfully",
        contextPath: directory,
        dockerFilePath: fullFilePath,
      };
    } else {
      console.error(`Failed to apply permissions: ${permissionResult.message}`);
      return {
        success: false,
        message: `File created but failed to apply permissions: ${permissionResult.message}`,
        contextPath: directory,
        dockerFilePath: fullFilePath,
      };
    }
  } catch (error) {
    console.error("Error during Dockerfile creation:", error);
    return {
      success: false,
      message: `Error: ${(error as Error).message}`,
      contextPath: "",
      dockerFilePath: "",
    };
  }
};
