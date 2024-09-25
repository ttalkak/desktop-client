import fs from "fs";
// import { projectSourceDirectory } from "./githubManager";

//도커파일이 없는 경우 파일 생성 후 디렉토리에 넣어주는 함수

// 저장 디렉토리 : 압축해제후 rootDirectory 위치 => contextPath 받아와서 저장하기
// 파일 이름 : Dockerfile

// const projectDirectory = projectSourceDirectory;
// const fileName = "Dockerfile";

export const dockerFileMaker = (dataString: string, localFilePath: string) => {
  console.log(`try dockerfile making..`);
  // 파일로 저장 (동기식)
  fs.writeFileSync(localFilePath, dataString, "utf8");
  console.log(`File created successfully at ${localFilePath}`);
};
