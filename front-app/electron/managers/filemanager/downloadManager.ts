import fs from "fs";
import path from "node:path";
import { promisify } from "util";
import { findDockerfile } from "./dokerFileFinder";
import { downloadFile, unzipFile, getTtalkakDirectory } from "../../utils";

const unlinkAsync = promisify(fs.unlink);
const existsAsync = promisify(fs.exists);

// 기본 프로젝트 소스 디렉토리 경로 설정
export const projectSourceDirectory = path.join(
  getTtalkakDirectory(), // Ttalkak의 기본 경로 가져오기
  "project",
  "source"
);

// 프로젝트 소스 디렉토리를 반환하는 함수
export function getProjectSourceDirectory(): string {
  // 1. 프로젝트 소스 디렉토리 존재 여부 확인
  if (!fs.existsSync(projectSourceDirectory)) {
    fs.mkdirSync(projectSourceDirectory, { recursive: true });
    console.log(`1. 디렉토리가 생성되었습니다: ${projectSourceDirectory}`);
  }

  // 2. 디렉토리 경로 반환
  return projectSourceDirectory;
}

// 레포지토리를 다운로드하고 압축을 해제한 후 Dockerfile과 컨텍스트 경로를 반환하는 함수
export async function downloadAndUnzip(
  repositoryUrl: string,
  rootDirectory: string
): Promise<{
  success: boolean;
  found: boolean; // Dockerfile이 발견되었는지 여부 추가
  message?: string;
  contextPath?: string;
  dockerfilePath?: string;
}> {
  try {
    // 3. 다운로드 및 압축 해제 디렉토리 설정
    const downloadDir = getProjectSourceDirectory();
    const extractDir = getProjectSourceDirectory();

    // 4. URL을 파싱하여 브랜치 이름과 레포지토리 이름 추출
    const urlParts = repositoryUrl.split("/");
    const branch = repositoryUrl.substring(
      repositoryUrl.indexOf("heads/") + 6,
      repositoryUrl.lastIndexOf(".zip")
    );
    const safeBranchName = branch.replace(/\//g, "-"); // 브랜치 이름의 슬래시를 하이픈으로 대체
    const repoName = urlParts[4].toLowerCase(); // 레포지토리 이름 추출

    console.log("5. 레포 이름:", `${repoName}-${safeBranchName}`);

    // 6. ZIP 파일 이름 및 경로 설정
    const zipFileName = `${repoName}-${safeBranchName}.zip`;
    const zipFilePath = path.join(downloadDir, zipFileName);
    const savePath = `${extractDir}\\${repoName}-${safeBranchName}`;

    console.log("7. 다운로드 경로:", repositoryUrl);
    console.log("8. 저장 경로:", savePath);
    console.log("9. ZIP 파일 다운로드 중...");

    // 10. 기존 ZIP 파일이 있으면 삭제
    if (await existsAsync(zipFilePath)) {
      console.log(`10. 기존 파일 삭제 중: ${zipFilePath}...`);
      await unlinkAsync(zipFilePath);
      console.log("11. 기존 파일 삭제 완료.");
    }

    // 12. 파일 다운로드
    await downloadFile(repositoryUrl, zipFilePath);
    console.log("12. 다운로드 완료:", zipFilePath);

    // 13. 파일 압축 해제
    console.log("13. 파일 압축 해제 중...");
    await unzipFile(zipFilePath, extractDir);
    console.log("14. 압축 해제 완료:", extractDir);

    // 15. 사용자가 제공한 rootDirectory를 고려하여 Docker 디렉토리 설정
    const dockerDir = rootDirectory
      ? path.resolve(
          extractDir,
          `${repoName}-${safeBranchName}`,
          ...rootDirectory.split("/")
        ) // rootDirectory가 제공된 경우 이를 경로에 포함
      : path.resolve(extractDir, `${repoName}-${safeBranchName}`); // 제공되지 않으면 기본 경로 사용

    console.log(`15. Docker 디렉토리: ${dockerDir}`);

    // 16. 디렉토리가 존재하지 않으면 오류 반환
    if (!fs.existsSync(dockerDir)) {
      return {
        success: false,
        found: false,
        message: `디렉토리를 찾을 수 없습니다: ${dockerDir}`,
      };
    }

    // 17. Dockerfile 경로 찾기 및 존재 여부 확인
    const { found, dockerfilePath } = await findDockerfile(dockerDir);

    if (!found) {
      console.log(
        `17. Dockerfile이 없습니다. 기본 Dockerfile 경로 사용: ${dockerfilePath}`
      );
    } else {
      console.log(`18. Dockerfile이 발견되었습니다: ${dockerfilePath}`);
    }

    const contextPath = path.dirname(dockerfilePath); // Dockerfile의 부모 디렉토리를 컨텍스트 경로로 설정

    console.log(`19. 컨텍스트 경로: ${contextPath}`);

    // 20. Dockerfile과 컨텍스트 경로를 성공적으로 반환
    return { success: true, found, contextPath, dockerfilePath };
  } catch (error) {
    console.error("21. 다운로드 및 압축 해제 중 오류:", error);
    // 실패 시 오류 메시지와 경로 반환
    return {
      success: false,
      found: false,
      message: (error as Error).message,
      contextPath: "",
      dockerfilePath: "",
    };
  }
}
