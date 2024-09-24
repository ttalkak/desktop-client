import path from "node:path";
import { downloadFile, unzipFile, getTtalkakDirectory } from "../utils";
import { findDockerfile } from "../managers/dockerManager";
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

//압축해제하면서 context와 dockerfile 경로 반환
async function downloadAndUnzip(
  repositoryUrl: string,
  rootDirectory?: string
): Promise<{
  success: boolean;
  message?: string;
  dockerfilePath?: string;
  contextPath?: string;
}> {
  try {
    let dockerfilePath: string | null = null;

    const downloadDir = getProjectSourceDirectory(); // 다운로드 위치
    const extractDir = getProjectSourceDirectory(); // 압축 해제할 위치

    // URL을 파싱하여 경로 부분을 추출
    const urlParts = repositoryUrl.split("/");
    const branch = repositoryUrl.substring(
      repositoryUrl.indexOf("heads/") + 6, // "heads/" 이후의 부분
      repositoryUrl.lastIndexOf(".zip") // ".zip" 직전까지
    );

    const safeBranchName = branch.replace(/\//g, "-");
    const repoName = urlParts[4].toLowerCase();

    console.log("reponame", `${repoName}-${safeBranchName}`);

    const zipFileName = `${repoName}-${safeBranchName}.zip`; // 레포지토리 이름을 기반으로 파일명 생성
    const zipFilePath = path.join(downloadDir, zipFileName); // 동적 파일명 설정
    const contextPath = `${extractDir}\\${repoName}-${safeBranchName}`; // 기본 압축 해제 경로

    console.log("Downloading from:", repositoryUrl);
    console.log("Saving to:", zipFilePath);

    console.log("Downloading ZIP file...");
    await downloadFile(repositoryUrl, zipFilePath);
    console.log("Download completed:", zipFilePath);

    console.log("Unzipping file...");
    await unzipFile(zipFilePath, extractDir);
    console.log("Unzipping completed:", extractDir);

    console.log("download&Unzip시 contextPath", contextPath);

    let dockerDir: string;

    // 사용자가 제공한 rootDirectory가 있는 경우 이를 포함한 경로로 설정
    if (rootDirectory) {
      dockerDir = path.resolve(
        extractDir,
        `${repoName}-${safeBranchName}`,
        rootDirectory
      );
      console.log(`Provided rootDirectory로 설정된 dockerDir: ${dockerDir}`);
    } else {
      // rootDirectory가 없을 경우 기본 경로 설정
      dockerDir = path.resolve(extractDir, `${repoName}-${safeBranchName}`);
      console.log(`기본 설정 dockerDir: ${dockerDir}`);
    }

    // Dockerfile 경로 탐색
    if (fs.existsSync(dockerDir)) {
      dockerfilePath = await findDockerfile(dockerDir);
    } else {
      console.error(`Directory not found at: ${dockerDir}`);
      return {
        success: false,
        message: `Directory not found at: ${dockerDir}`,
      };
    }

    if (!dockerfilePath) {
      return {
        success: false,
        message: "Dockerfile not found in any subdirectory.",
      };
    }

    // 성공 시 Dockerfile 경로와 함께 반환
    console.log(`02. dockerfilePath 확인`, dockerfilePath);
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
    async (_, repositoryUrl: string, rootDirectory: string) => {
      return await downloadAndUnzip(repositoryUrl, rootDirectory);
    }
  );
};
