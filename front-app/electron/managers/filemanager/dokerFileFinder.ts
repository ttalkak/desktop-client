import path from "node:path";
import * as fs from "fs";
import { dockerFileHtmlPermission } from "./dockerFileHtmlPermission";

export function findDockerfile(directory: string): Promise<{
  found: boolean; // Dockerfile이 있는지 여부를 나타냄
  dockerfilePath: string; // 찾은 Dockerfile의 경로 또는 기본 Dockerfile 경로
}> {
  return new Promise((resolve, reject) => {
    const absoluteDirectory = path.resolve(directory);
    console.log(`Searching in absolute directory: ${absoluteDirectory}`);

    const files = fs.readdirSync(absoluteDirectory);

    // 현재 디렉토리에서 Dockerfile을 찾는 첫 번째 루프
    for (const file of files) {
      const fullPath = path.join(absoluteDirectory, file);
      const stat = fs.statSync(fullPath);
      console.log(`Searching for Dockerfile in: ${fullPath}`);
      if (!stat.isDirectory() && file === "Dockerfile") {
        console.log(`Dockerfile found at: ${fullPath}`);
        resolve({
          found: true,
          dockerfilePath: fullPath,
        });
        return;
      }
    }
    //   if (!stat.isDirectory() && file === "Dockerfile") {
    //     console.log(`Dockerfile found at: ${fullPath}`);

    //     // Dockerfile에 HTML 권한 설정 추가
    //     dockerFileHtmlPermission(fullPath)
    //       .then((result) => {
    //         if (result.success) {
    //           console.log(
    //             `Dockerfile found and permissions applied successfully. ${result.success}`
    //           );
    //           resolve({
    //             found: true,
    //             dockerfilePath: fullPath,
    //           });
    //         } else {
    //           console.log(
    //             `Dockerfile found, but failed to apply permissions: ${result.message}`
    //           );
    //           resolve({
    //             found: true,
    //             dockerfilePath: fullPath,
    //           });
    //         }
    //       })
    //       .catch((error) => {
    //         console.log(
    //           `Dockerfile found, but failed to apply permissions due to error: ${error.message}`
    //         );
    //         reject({
    //           found: true,
    //           dockerfilePath: fullPath,
    //         });
    //       });
    //     return;
    //   }
    // }

    // 서브 디렉토리에서 Dockerfile을 찾는 두 번째 루프
    for (const file of files) {
      const fullPath = path.join(absoluteDirectory, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        findDockerfile(fullPath).then(resolve).catch(reject);
        return;
      }
    }

    console.log(`No Dockerfile found in directory: ${absoluteDirectory}`);

    // Dockerfile이 없는 경우, 기본 dockerDir 경로를 반환하고 found를 false로 설정
    resolve({
      found: false,
      dockerfilePath: path.join(absoluteDirectory, "Dockerfile"),
    });
  });
}
