import fs from "fs/promises";

export const dockerFileHtmlPermission = async (
  dockerfilePath: string
): Promise<{
  success: boolean;
  message: string;
  original: string;
  modified: string;
}> => {
  try {
    // 파일 읽기
    const originalContent = await fs.readFile(dockerfilePath, "utf-8");

    // Dockerfile 내용을 줄 단위로 분리
    const lines = originalContent.split("\n");

    // HTML 경로를 포함하는 줄 찾기
    const htmlLine = lines.find((line) => line.toLowerCase().includes("html"));

    if (!htmlLine) {
      return {
        success: true,
        message: "HTML path not found in Dockerfile .  continue process",
        original: originalContent,
        modified: originalContent,
      };
    }

    // HTML 경로 추출
    const htmlPath = htmlLine.trim().split(" ").pop();

    if (!htmlPath) {
      return {
        success: true,
        message: "Failed to extract HTML path. continue process",
        original: originalContent,
        modified: originalContent,
      };
    }

    // 권한 설정 명령어 생성
    const permissionCommand = `RUN chmod -R 775 ${htmlPath}`;

    // 권한 설정 명령어 추가
    const modifiedLines = [...lines, permissionCommand];
    const modifiedContent = modifiedLines.join("\n");

    // 수정된 내용을 파일에 쓰기
    await fs.writeFile(dockerfilePath, modifiedContent, "utf-8");

    return {
      success: true,
      message: "Dockerfile edited successfully. HTML permission added.",
      original: originalContent,
      modified: modifiedContent,
    };
  } catch (error) {
    console.error("Error editing Dockerfile:", error);
    return {
      success: false,
      message: String(error),
      original: "",
      modified: "",
    };
  }
};
