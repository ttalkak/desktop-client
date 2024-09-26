import fs from "fs";
import path from "node:path";
import { ipcMain } from "electron";
import { dockerFileMaker } from "./dockerFileManager";
import { findDockerfile } from "./dockerUtils";
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
// 압축 해제 및 Dockerfile 경로 반환 함수
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

    // URL에서 브랜치명 추출 및 ZIP 파일 이름 생성
    const urlParts = repositoryUrl.split("/");
    const branch = repositoryUrl.substring(
      repositoryUrl.indexOf("heads/") + 6, // "heads/" 이후의 부분
      repositoryUrl.lastIndexOf(".zip") // ".zip" 직전까지
    );
    const safeBranchName = branch.replace(/\//g, "-");
    const repoName = urlParts[4].toLowerCase();

    const zipFileName = `${repoName}-${safeBranchName}.zip`; // ZIP 파일 이름 설정
    const zipFilePath = path.join(downloadDir, zipFileName);
    const savePath = `${extractDir}\\${repoName}-${safeBranchName}`; // 압축 해제 경로 설정

    await downloadFile(repositoryUrl, zipFilePath);
    await unzipFile(zipFilePath, extractDir);

    // rootDirectory가 있는 경우 해당 경로로 설정, 없을 경우 기본 경로 설정
    dockerDir = rootDirectory
      ? path.resolve(extractDir, `${repoName}-${safeBranchName}`, rootDirectory)
      : path.resolve(extractDir, `${repoName}-${safeBranchName}`);

    let contextPath: string | undefined;
    try {
      // Dockerfile 경로 찾기
      dockerfilePath = await findDockerfile(dockerDir);
      contextPath = path.dirname(dockerfilePath);
    } catch (error) {
      console.error("Dockerfile not found, attempting to create it...");

      // Dockerfile을 찾지 못했고 script가 있으면 dockerFileMaker 실행
      if (script) {
        const { success } = await dockerFileMaker(dockerDir, script); // Dockerfile 생성 시 root 디렉토리 경로 사용
        if (success) {
          console.log("Dockerfile successfully created.");
          dockerfilePath = path.join(dockerDir, "Dockerfile"); // 새로 생성된 Dockerfile 경로
          contextPath = dockerDir; // context는 dockerDir
        } else {
          return {
            success: false,
            message: "Failed to create Dockerfile.",
          };
        }
      } else {
        return {
          success: false,
          message: "Dockerfile not found and script not provided.",
        };
      }
    }

    console.log(`Dockerfile 경로: ${dockerfilePath}`);
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
