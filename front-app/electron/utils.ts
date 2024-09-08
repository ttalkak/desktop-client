import * as os from "os";
import * as path from "path";
import axios from "axios";
import * as fs from "fs";
import StreamZip from "node-stream-zip";

export function getUserHomeDirectory(): string {
  return os.homedir();
}

export function getTtalkakDirectory(): string {
  return path.join(getUserHomeDirectory(), "AppData", "Local", "Ttalkak");
}

export async function downloadFile(url: string, dest: string) {
  const response = await axios({
    url,
    method: "GET",
    responseType: "stream",
  });

  const writer = fs.createWriteStream(dest);

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

// ZIP 파일 압축 해제 함수
export async function unzipFile(
  zipFilePath: string,
  destDir: string
): Promise<void> {
  const zip = new StreamZip.async({ file: zipFilePath, storeEntries: true });

  try {
    // 압축 해제할 디렉토리가 없으면 생성
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    // ZIP 파일의 모든 엔트리 가져오기
    const entries = await zip.entries();
    for (const entry of Object.values(entries)) {
      const filePath = path.join(destDir, entry.name);
      // console.log(`Extracting ${entry.name} to ${filePath}`);

      if (entry.isDirectory) {
        // 디렉토리 생성
        if (!fs.existsSync(filePath)) {
          fs.mkdirSync(filePath, { recursive: true });
        }
      } else {
        // 파일 압축 해제
        // console.log(`Successfully extracted ${entry.name}`);
        await zip.extract(entry.name, filePath);
      }
    }

    console.log("Unzip completed!");
  } catch (err) {
    console.error("Error during unzip:", err);
    throw err;
  } finally {
    await zip.close(); // ZIP 파일 닫기
  }
}
