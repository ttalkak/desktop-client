import path from "node:path";
import { downloadFile, unzipFile, getTtalkakDirectory } from "./utils";
import { findDockerfile } from "./dockerManager";
import { ipcMain } from "electron";
import fs from "fs";

export function getProjectSourceDirectory(): string {
  const projectSourceDirectory = path.join(
    getTtalkakDirectory(), // 기본 Ttalkak 경로
    "project",
    "source"
  );

  // 디렉토리가 존재하지 않으면 생성
  if (!fs.existsSync(projectSourceDirectory)) {
    fs.mkdirSync(projectSourceDirectory, { recursive: true });
    console.log(`Directory created at: ${projectSourceDirectory}`);
  }

  return projectSourceDirectory; // 경로 반환
}

// 다운로드 하고 바로 unzip//도커 파일 경로 반환
async function downloadAndUnzip(
  repoUrl: string,
  dockerRootDirectory?: string
): Promise<{
  success: boolean;
  message?: string;
  dockerfilePath?: string;
  contextPath?: string;
}> {
  try {
    const downloadDir = getProjectSourceDirectory();
    const extractDir = getProjectSourceDirectory();

    // URL을 파싱하여 경로 부분을 추출

    const urlParts = repoUrl.split("/");
    const branch = urlParts[urlParts.length - 1].split(".")[0];
    const repoName = urlParts[urlParts.length - 5];

    console.log("reponame", repoName, branch);

    const zipFileName = `${repoName}-${branch}.zip`; // 레포지토리 이름을 기반으로 파일명 생성
    const zipFilePath = path.join(downloadDir, zipFileName); // 동적 파일명 설정
    const contextPath = `${extractDir}\\${repoName}-${branch}`;

    console.log("Downloading from:", repoUrl);
    console.log("Saving to:", zipFilePath);

    console.log("Downloading ZIP file...");
    await downloadFile(repoUrl, zipFilePath);
    console.log("Download completed:", zipFilePath);

    console.log("Unzipping file...");
    await unzipFile(zipFilePath, extractDir);
    console.log("Unzipping completed:", extractDir);

    let dockerfilePath: string | null = null;

    // 사용자가 제공한 dockerRootDirectory가 있는 경우
    if (dockerRootDirectory) {
      const dockerDir = path.resolve(extractDir, dockerRootDirectory);
      if (fs.existsSync(dockerDir)) {
        dockerfilePath = findDockerfile(dockerDir);
      } else {
        console.error(
          `Provided dockerRootDirectory not found at: ${dockerDir}`
        );
        return {
          success: false,
          message: `Provided dockerRootDirectory not found at: ${dockerDir}`,
        };
      }
    } else {
      // Dockerfile을 찾기 위해 디렉토리 내 탐색
      dockerfilePath = findDockerfile(extractDir);
    }

    if (!dockerfilePath) {
      return {
        success: false,
        message: "Dockerfile not found in any subdirectory.",
      };
    }

    // 성공 시 Dockerfile 경로와 함께 반환
    return { success: true, dockerfilePath, contextPath };
  } catch (error) {
    console.error("Error during download and unzip:", error);
    return { success: false, message: (error as Error).message };
  }
}

// IPC 핸들러로 projectSourceDirectory를 반환
ipcMain.handle("get-project-source-directory", async () => {
  return getProjectSourceDirectory();
});
// IPC 핸들러를 설정하여 다운로드 및 압축 해제를 처리
export const githubDownLoadAndUnzip = (): void => {
  ipcMain.handle(
    "download-and-unzip",
    async (_, repoUrl: string, dockerRootDirectory: string) => {
      return await downloadAndUnzip(repoUrl, dockerRootDirectory);
    }
  );
};
