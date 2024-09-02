import path from "node:path";
import { downloadFile, unzipFile } from "./utils";
import { ipcMain } from "electron";

//다운로드 하고 바로 unzip
async function downloadAndUnzip(repoUrl: string, downloadDir: string, extractDir: string): Promise<void> {
    try {
        const repoName = path.basename(repoUrl); // 레포지토리 이름 추출
        const zipFileName = `${repoName}.zip`; // 레포지토리 이름을 기반으로 파일명 생성
        const zipFilePath = path.join(downloadDir, zipFileName); // 동적 파일명 설정
        
        console.log("Downloading from:", repoUrl);
        console.log("Saving to:", zipFilePath);

        const zipUrl = `${repoUrl}/archive/refs/heads/main.zip`;
        
        console.log('Downloading ZIP file...');
        await downloadFile(zipUrl, zipFilePath);
        console.log('Download completed:', zipFilePath);

        console.log('Unzipping file...');
        await unzipFile(zipFilePath, extractDir);
        console.log('Unzipping completed:', extractDir);
    } catch (error) {
        console.error('Error during download and unzip:', error);
    }
}


export const githubDownLoadAndUnzip = ():void => {
    ipcMain.handle('download-and-unzip', async (_, repoUrl, downloadDir, extractDir) => {
        return await downloadAndUnzip(repoUrl, downloadDir, extractDir);
    });
}


