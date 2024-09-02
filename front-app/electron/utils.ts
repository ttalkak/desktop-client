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
  const zip = new StreamZip({
    file: zipFilePath,
    storeEntries: true,
  });

  return new Promise<void>((resolve, reject) => {
    zip.on("ready", () => {
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      for (const entry of Object.values(zip.entries())) {
        const filePath = path.join(destDir, entry.name);

        if (entry.isDirectory) {
          if (!fs.existsSync(filePath)) {
            fs.mkdirSync(filePath, { recursive: true });
          }
        } else {
          zip.extract(entry.name, filePath, (error) => {
            if (error) {
              reject(error);
            }
          });
        }
      }

      zip.close();
      console.log("Unzip completed!");
      resolve();
    });

    zip.on("error", reject);
  });
}
