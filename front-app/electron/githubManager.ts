import path from "node:path";
import { downloadFile, unzipFile, getTtalkakDirectory } from "./utils";
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

// IPC 핸들러로 projectSourceDirectory를 반환
ipcMain.handle("get-project-source-directory", async () => {
  return getProjectSourceDirectory();
});

// 다운로드 하고 바로 unzip
async function downloadAndUnzip(
  repoUrl: string,
  downloadDir: string = getProjectSourceDirectory(),
  extractDir: string = getProjectSourceDirectory()
): Promise<{ success: boolean; message?: string }> {
  try {
    const repoName = path.basename(repoUrl); // 레포지토리 이름 추출
    const zipFileName = `${repoName}.zip`; // 레포지토리 이름을 기반으로 파일명 생성
    const zipFilePath = path.join(downloadDir, zipFileName); // 동적 파일명 설정

    console.log("Downloading from:", repoUrl);
    console.log("Saving to:", zipFilePath);

    const zipUrl = `${repoUrl}/archive/refs/heads/main.zip`;

    console.log("Downloading ZIP file...");
    await downloadFile(zipUrl, zipFilePath);
    console.log("Download completed:", zipFilePath);

    console.log("Unzipping file...");
    await unzipFile(zipFilePath, extractDir);
    console.log("Unzipping completed:", extractDir);

    return { success: true };
  } catch (error) {
    console.error("Error during download and unzip:", error);
    return { success: false, message: (error as Error).message };
  }
}

// IPC 핸들러를 설정하여 다운로드 및 압축 해제를 처리
export const githubDownLoadAndUnzip = (): void => {
  ipcMain.handle(
    "download-and-unzip",
    async (
      _,
      repoUrl: string,
      downloadDir: string = getProjectSourceDirectory(),
      extractDir: string = getProjectSourceDirectory()
    ) => {
      return await downloadAndUnzip(repoUrl, downloadDir, extractDir);
    }
  );
};
