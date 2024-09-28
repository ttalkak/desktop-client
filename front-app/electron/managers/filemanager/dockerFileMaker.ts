import fs from "fs";
import path from "path";

// 도커파일이 없는 경우 파일을 생성 후 디렉토리에 넣어주는 함수 (비동기식)
export const dockerFileMaker = async (
  dockerfilePath: string,
  dockerFileScript: string
): Promise<{
  success: boolean;
  message: string;
  contextPath?: string;
  dockerFilePath?: string;
}> => {
  console.log("start DockerFilMaker!!!");
  const directory = path.dirname(dockerfilePath); // 디렉토리 경로 추출
  const fileName = "Dockerfile"; // 파일 이름 정의

  // Dockerfile 경로 설정
  const fullFilePath = path.join(directory, fileName);

  try {
    // 파일이 이미 존재하는지 확인
    if (fs.existsSync(fullFilePath)) {
      console.log(`Dockerfile already exists at ${fullFilePath}`);
      return {
        success: false,
        message: "Dockerfile already exists",
        contextPath: directory,
        dockerFilePath: fullFilePath,
      }; // 이미 파일이 존재하는 경우 반환
    }

    // 디렉토리가 존재하는지 확인하고 없으면 생성 (비동기식)
    if (!fs.existsSync(directory)) {
      console.log(`Directory does not exist. Creating directory: ${directory}`);
      await fs.promises.mkdir(directory, { recursive: true }); // 디렉토리 생성
    }

    // 파일 생성 (비동기식)
    console.log(`Creating Dockerfile at ${fullFilePath}...`);
    await fs.promises.writeFile(fullFilePath, dockerFileScript, "utf8");
    console.log(`File created successfully at ${fullFilePath}`);

    // 성공 시 contextPath (디렉토리 경로)와 dockerFilePath 반환
    return {
      success: true,
      message: "File created successfully",
      contextPath: directory,
      dockerFilePath: fullFilePath,
    };
  } catch (error) {
    console.error("Error during Dockerfile creation:", error);
    return { success: false, message: `Error: ${(error as Error).message}` }; // 실패 시 에러 메시지 반환
  }
};
