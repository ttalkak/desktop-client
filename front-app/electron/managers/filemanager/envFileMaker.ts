import fs from "fs";
import path from "path";

// .env 파일을 생성 후 디렉토리에 넣어주는 함수 (비동기식)
export const envFileMaker = async (
  envfilePath: string,
  envs: Array<{ key: string; value: string }>
): Promise<{
  success: boolean;
  message: string;
}> => {
  console.log("start envFileMaker!!!");
  const fileName = ".env"; // 파일 이름 정의

  // envfile 경로 설정
  const fullFilePath = path.join(envfilePath, fileName);
  console.log(`Full file path for .env: ${fullFilePath}`);

  try {
    // 파일이 이미 존재하는지 확인
    if (fs.existsSync(fullFilePath)) {
      console.log(`.env already exists at ${fullFilePath}. Deleting it.`);
      // 이미 파일이 존재하는 경우 삭제
      await fs.promises.unlink(fullFilePath);
      console.log(".env file deleted successfully.");
    }

    // 디렉토리가 존재하는지 확인하고 없으면 생성 (비동기식)
    if (!fs.existsSync(envfilePath)) {
      console.log(
        `Directory does not exist. Creating directory: ${envfilePath}`
      );
      await fs.promises.mkdir(envfilePath, { recursive: true }); // 디렉토리 생성
      console.log(`Directory created: ${envfilePath}`);
    }

    // envs 배열을 key=value 형식으로 변환
    const script = envs
      .map(({ key, value }) => `${key}=${value}`) // key=value 형식으로 변환
      .join("\n"); // 각 항목을 줄바꿈(\n)으로 구분
    console.log(`Generated .env content: \n${script}`);

    // 파일 생성 (비동기식)
    console.log(`Creating .env at ${fullFilePath}...`);
    await fs.promises.writeFile(fullFilePath, script, "utf8");
    console.log(`.env successfully created at ${fullFilePath}`);

    return {
      success: true,
      message: ".env File created successfully",
    };
  } catch (error) {
    console.error("Error during .env creation:", error);
    return { success: false, message: `Error: ${(error as Error).message}` }; // 실패 시 에러 메시지 반환
  }
};
