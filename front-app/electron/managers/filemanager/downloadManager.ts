import fs from "fs";
import path from "node:path";
import { promisify } from "util";
import { ipcMain } from "electron";
import { findDockerfile } from "./dokerFileFinder";
import { downloadFile, unzipFile, getTtalkakDirectory } from "../../utils";

const unlinkAsync = promisify(fs.unlink);
const existsAsync = promisify(fs.exists);

export const projectSourceDirectory = path.join(
  getTtalkakDirectory(), // 기본 Ttalkak 경로
  "project",
  "source"
);
export function getProjectSourceDirectory(): string {
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
    const savePath = `${extractDir}\\${repoName}-${safeBranchName}`; // 기본 압축 해제 경로//빌드위한 최상단 위치

    console.log("Downloading from:", repositoryUrl);
    console.log("Saving to:", savePath);
    console.log("Downloading ZIP file...");

    // 기존 파일이 있으면 삭제
    if (await existsAsync(zipFilePath)) {
      console.log(`기존 파일 ${zipFilePath} 삭제 중...`);
      await unlinkAsync(zipFilePath);
      console.log("기존 파일 삭제 완료.");
    }

    await downloadFile(repositoryUrl, zipFilePath);
    console.log("Download completed:", zipFilePath);

    console.log("Unzipping file...");
    await unzipFile(zipFilePath, extractDir);
    console.log("Unzipping completed:", extractDir);

    // 사용자가 제공한 rootDirectory가 있는 경우 이를 포함한 경로로 설정
    const dockerDir = rootDirectory
      ? path.resolve(
          extractDir,
          `${repoName}-${safeBranchName}`,
          ...rootDirectory.split("/")
        ) // rootDirectory가 경로로 들어오면 이를 경로로 설정
      : path.resolve(extractDir, `${repoName}-${safeBranchName}`);
    // 없으면 기본 경로로 설정

    console.log(`Docker Directory: ${dockerDir}`);

    if (!fs.existsSync(dockerDir)) {
      return {
        success: false,
        message: `Directory not found at: ${dockerDir}`,
      };
    }

    const dockerfilePath = await findDockerfile(dockerDir);
    const contextPath = path.dirname(dockerfilePath);

    return { success: true, contextPath, dockerfilePath };
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
