import React from "react";
import DashList from "../features/dashboard/DashList";
import DockerStatusItem from "../features/dashboard/DockerStatusItem";

const DashBoard: React.FC = () => {
  // 다운로드 핸들러 함수
  const downloadHandler = async () => {
    const repoUrl = "https://github.com/sunsuking/kokoa-clone-2020";

    try {
      // 기본 Ttalkak 디렉토리 경로를 가져옴
      const projectSourceDirectory =
        await window.electronAPI.getProjectSourceDirectory();

      // 다운로드할 ZIP 파일 경로 설정
      const downloadPath = window.electronAPI.joinPath(projectSourceDirectory);
      const extractDir = projectSourceDirectory; // 압축 해제 경로를 동일한 디렉토리로 설정

      console.log("repoUrl:", repoUrl); // 확인용 콘솔 로그
      console.log("downloadPath:", downloadPath); // 확인용 콘솔 로그
      console.log("extractDir:", extractDir); // 확인용 콘솔 로그

      // ZIP 파일 다운로드 및 압축 해제
      await window.electronAPI.downloadAndUnzip(
        repoUrl,
        downloadPath,
        extractDir
      );
      console.log("Download and unzip successful");
    } catch (err) {
      console.log("Error during download and unzip:", err);
    }
  };

  return (
    <>
      <div className="mx-auto p-6">
        <div className="flex w-full">
          <div className="flex-1 mr-2">{/* <CpuStatusItem /> */}</div>
          <div className="flex-1 ml-2">
            <DockerStatusItem />
            <button
              className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
              onClick={downloadHandler}
            >
              깃 파일 zip으로 다운받고 unzip
            </button>
          </div>
        </div>
        <DashList />
      </div>
    </>
  );
};

export default DashBoard;
