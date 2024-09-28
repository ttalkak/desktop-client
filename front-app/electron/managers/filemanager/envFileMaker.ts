import fs from "fs";
import path from "path";

// .env 파일을 생성 후 디렉토리에 넣어주는 함수 (비동기식)
export const envFileMaker = async (
  envfilePath: string,
  envs: EnvironmentVariable
): Promise<{
  success: boolean;
  message: string;
  contextPath?: string;
  envFilePath?: string;
}> => {
  console.log("start envFileMaker!!!");
  const directory = path.dirname(envfilePath); // 디렉토리 경로 추출
  const fileName = ".env"; // 파일 이름 정의

  // envfile 경로 설정
  const fullFilePath = path.join(directory, fileName);

  try {
    // 파일이 이미 존재하는지 확인
    if (fs.existsSync(fullFilePath)) {
      console.log(`.env already exists at ${fullFilePath}`);
      return {
        success: false,
        message: ".env already exists",
        contextPath: directory,
        envFilePath: fullFilePath,
      }; // 이미 파일이 존재하는 경우 경로도 반환
    }

    // 디렉토리가 존재하는지 확인하고 없으면 생성 (비동기식)
    if (!fs.existsSync(directory)) {
      console.log(`.env does not exist. Creating directory: ${directory}`);
      await fs.promises.mkdir(directory, { recursive: true }); // 디렉토리 생성
    }

    // envs 객체를 key=value 형식으로 변환
    const script = Object.entries(envs)
      .map(([key, value]) => `${key}=${value}`) // key=value 형식으로 변환
      .join("\n"); // 각 항목을 줄바꿈(\n)으로 구분

    // 파일 생성 (비동기식)
    console.log(`Creating .env at ${fullFilePath}...`);
    await fs.promises.writeFile(fullFilePath, script, "utf8");
    console.log(`.env successfully created at ${fullFilePath}`);

    return {
      success: true,
      message: ".env File created successfully",
      contextPath: directory, // 상위 경로 반환
      envFilePath: fullFilePath, // .env 파일 경로 반환
    };
  } catch (error) {
    console.error("Error during .env creation:", error);
    return { success: false, message: `Error: ${(error as Error).message}` }; // 실패 시 에러 메시지 반환
  }
};
