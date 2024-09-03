import React from "react";
import DashList from "../features/dashboard/DashList";
import DockerStatusItem from "../features/dashboard/DockerStatusItem";
import CpuStatusItem from "../features/dashboard/CpuStatusItem";

const DashBoard: React.FC = () => {
  // Docker 이미지 빌드 핸들러 함수
  const handleBuildImage = async (contextPath: string) => {
    try {
      const result = await window.electronAPI.buildDockerImage(contextPath);
      console.log("Docker build status:", result.status);
      if (result.message) {
        console.log("Docker build message:", result.message);
      }
    } catch (error) {
      console.error("Error building Docker image:", error);
    }
  };

  const downloadHandler = async () => {
    const repoUrl = "https://github.com/sunsuking/kokoa-clone-2020";

    try {
      // 기본 Ttalkak 디렉토리 경로를 가져옴
      const projectSourceDirectory =
        await window.electronAPI.getProjectSourceDirectory();

      // 다운로드할 ZIP 파일 경로 설정
      const downloadPath = window.electronAPI.joinPath(projectSourceDirectory);
      const extractDir = projectSourceDirectory; // 압축 해제 경로를 동일한 디렉토리로 설정

      // ZIP 파일 다운로드 및 압축 해제
      await window.electronAPI.downloadAndUnzip(
        repoUrl,
        downloadPath,
        extractDir
      );
      console.log("Download and unzip successful");

      // 압축이 해제된 디렉토리에서 Docker 이미지를 빌드
      handleBuildImage(extractDir); // extractDir을 contextPath로 사용
    } catch (err) {
      console.log("Error during download and unzip:", err);
    }
  };

  const createAndStartContainers = async () => {
    try {
      const dockerImages = await window.storeAPI.getAllDockerImages();
      const dockerContainers = await window.storeAPI.getAllDockerContainers();

      for (const image of dockerImages) {
        const existingContainer = dockerContainers.find(
          (container) => container.Image === image.Id
        );

        if (existingContainer) {
          console.log(
            `Container for image ${image.RepoTags?.[0]} already exists. Skipping creation.`
          );
          continue;
        }

        // 컨테이너 생성 옵션 구성
        const containerOptions =
          await window.electronAPI.createContainerOptions(
            image.Id,
            `${image.RepoTags?.[0]?.replace(/[:/]/g, "-")}-container`, // 컨테이너 이름 생성
            {
              "80/tcp": "8080", // 예시로 기본 포트 매핑 설정
            }
          );

        const result = await window.electronAPI.createAndStartContainer();

        if (result.success) {
          console.log(
            `Container started successfully with ID: ${result.containerId}`
          );
        } else {
          console.error(`Failed to start container: ${result.error}`);
        }
      }
    } catch (error) {
      console.error("Error creating and starting containers:", error);
    }
  };

  return (
    <>
      <div className="mx-auto p-6">
        <div className="flex w-full">
          <div className="flex-1 mr-2">
            <CpuStatusItem />
          </div>
          <div className="flex-1 ml-2">
            <DockerStatusItem />
            <button
              className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
              onClick={downloadHandler}
            >
              깃 파일 zip으로 다운받고 unzip 후 이미지 빌드
            </button>

            <button
              className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
              onClick={createAndStartContainers}
            >
              이미지 값으로 컨테이너 생성 및 실행
            </button>
          </div>
        </div>
        <DashList />
      </div>
    </>
  );
};

export default DashBoard;
