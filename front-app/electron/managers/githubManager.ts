import fs from "fs";
import path from "node:path";
import { ipcMain } from "electron";
import { dockerFileMaker } from "./dockerFileManager";
import { findDockerfile } from "../managers/dockerManager";
import { downloadFile, unzipFile, getTtalkakDirectory } from "../utils";

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
  rootDirectory?: string,
  script?: string
): Promise<{
  success: boolean;
  message?: string;
  dockerfilePath?: string;
  contextPath?: string;
}> {
  try {
    let dockerfilePath: string | null = null;
    let dockerDir: string;

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
    const contextPath = `${extractDir}\\${repoName}-${safeBranchName}`; // 기본 압축 해제 경로//빌드위한 최상단 위치

    console.log("Downloading from:", repositoryUrl);
    console.log("Saving to.. same with contextPath:", contextPath);
    console.log("Downloading ZIP file...");

    await downloadFile(repositoryUrl, zipFilePath);
    console.log("Download completed:", zipFilePath);

    console.log("Unzipping file...");
    await unzipFile(zipFilePath, extractDir);
    console.log("Unzipping completed:", extractDir);

    // 사용자가 제공한 rootDirectory가 있는 경우 이를 포함한 경로로 설정
    if (rootDirectory) {
      dockerDir = path.resolve(
        extractDir,
        `${repoName}-${safeBranchName}`,
        rootDirectory
      );
      console.log(`Provided rootDirectory로 설정된 dockerDir: ${dockerDir}`);
    } else {
      // rootDirectory가 없을 경우 도커 파일 위치를 기본 경로 설정//contextPath와 동일
      dockerDir = path.resolve(extractDir, `${repoName}-${safeBranchName}`);
      console.log(`기본 설정 dockerDir: ${dockerDir}`);
    }

    // Dockerfile 경로 탐색
    if (fs.existsSync(dockerDir)) {
      //실제로 해당 디렉토리가 존재하는지 확인
      dockerfilePath = await findDockerfile(dockerDir); //있는 경우 dockerFile이 실제로 해당 경로에 있는지 확인
    } else {
      //해당 dockerDir가 존재하지 않는 경우
      return {
        success: false,
        message: `Directory not found at: ${dockerDir}`,
      };
    }

    //도커 파일이 없으면서 script는 있음
    if (!dockerfilePath && script) {
      const { success } = await dockerFileMaker(dockerfilePath, script);
      if (success) {
        return {
          success: true,
          message: "Dockerfile making success",
        };
      }
    } else if (!dockerfilePath && !script)
      // 둘다 없는 경우
      return {
        success: false,
        message: "Dockerfile not found in any subdirectory.",
      };

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
