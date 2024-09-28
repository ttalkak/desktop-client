import path from "node:path";
import * as fs from "fs";

export function findDockerfile(directory: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const absoluteDirectory = path.resolve(directory);
    console.log(`탐색 중인 절대 경로: ${absoluteDirectory}`);

    const files = fs.readdirSync(absoluteDirectory);

    for (const file of files) {
      const fullPath = path.join(absoluteDirectory, file);
      const stat = fs.statSync(fullPath);
      console.log(`도커파일 탐색중.. 전달받은 rootDirectory 기준 ${fullPath}`);

      if (!stat.isDirectory() && file === "Dockerfile") {
        console.log(`Dockerfile found at: ${fullPath}`);
        resolve(fullPath);
        return;
      }
    }

    for (const file of files) {
      const fullPath = path.join(absoluteDirectory, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        findDockerfile(fullPath).then(resolve).catch(reject);
        return;
      }
    }

    console.log(`No Dockerfile found in directory: ${absoluteDirectory}`);

    reject(new Error("Dockerfile not found in the specified directory."));
  });
}
