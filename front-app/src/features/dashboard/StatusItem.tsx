import { useState, useEffect } from "react";
import { FaCircle, FaPlay } from "react-icons/fa";

const StatusItem = () => {
  const [dockerStatus, setDockerStatus] = useState("unknown"); // "running" | "not running" | "unknown"
  const [websocketStatus, _setWebsocketStatus] = useState("disconnected"); //"connected" | "connecting" | "disconnected"
  const [serviceStatus, _setServiceStatus] = useState("stopped"); // "running" | "loading" | "stopped"

  //tailwind
  const startbtn = `flex items-center justify-center text-white text-sm px-6 py-2 rounded mr-4 font-sans font-medium cursor-pointer button app-region-no-drag ${
    serviceStatus === "running"
      ? "bg-green-500"
      : serviceStatus === "loading"
      ? "bg-yellow-500"
      : "bg-red-500"
  }`;

  // Docker 상태에 따른 색상 매핑 (as const=readonly 적용)
  const dockerStatusColor: Record<
    "running" | "not running" | "unknown",
    string
  > = {
    running: "text-color-7",
    "not running": "text-color-8",
    unknown: "text-color-3",
  } as const;

  // 웹소켓 상태에 따른 색상 매핑 (as const=readonly 적용)
  const websocketStatusColor: Record<
    "connected" | "connecting" | "disconnected",
    string
  > = {
    connected: "text-color-5",
    connecting: "text-color-4",
    disconnected: "text-color-3",
  } as const;

  // 서비스 상태에 따른 색상 매핑 (as const=readonly 적용)
  const serviceStatusColor: Record<"running" | "loading" | "stopped", string> =
    {
      running: "text-color-7",
      loading: "text-color-6",
      stopped: "text-color-8",
    } as const;

  // 상태에 따른 버튼 텍스트 설정
  const buttonText =
    serviceStatus === "running"
      ? "Running"
      : serviceStatus === "loading"
      ? "Loading..."
      : "Service Unavailable";

  // Docker 상태 체크 함수
  const dockerCheckHandler = async () => {
    try {
      const status = await window.electronAPI.checkDockerStatus();
      console.log("Docker Status:", status);
      setDockerStatus(status); // 상태 업데이트
      return status;
    } catch (error) {
      console.error("Error while checking Docker status:", error);
      setDockerStatus("unknown");
    }
  };

  // Docker 이미지 빌드 핸들러 함수
  const handleBuildImage = async (
    contextPath: string,
    name: string = "my-docker-image",
    tag: string = "latest"
  ) => {
    try {
      const result = await window.electronAPI.buildDockerImage(
        contextPath,
        name,
        tag
      );
      console.log("Docker build status:", result.status);
      if (result.message) {
        console.log("Docker build message:", result.message);
      }

      return {
        success: result.status === "success" || result.status === "exists",
        image: { RepoTags: [`${name}:${tag}`] },
        message: result.message,
      };
    } catch (error) {
      console.error("Error building Docker image:", error);
      return { success: false, message: error }; // 수정: 오류 시 반환
    }
  };

  //컨테이너 생성 및 빌드 함수
  const createAndStartContainers = async (
    dockerImages: { RepoTags: string[] }[]
  ) => {
    try {
      const dockerContainers = await window.storeAPI.getAllDockerContainers();

      for (const image of dockerImages) {
        const existingContainer = dockerContainers.find(
          (container) => container.Image === image.RepoTags?.[0]
        );

        if (existingContainer) {
          console.log(
            `Container for image ${image.RepoTags?.[0]} already exists. Skipping creation.`
          );
          continue;
        }

        // 이미지 이름과 태그가 정확히 설정되었는지 확인
        const repoTag = image.RepoTags?.[0] || ""; // "my-image:latest" 형태
        console.log("레포테그!1!", repoTag);
        const containerOptions =
          await window.electronAPI.createContainerOptions(
            repoTag, // 이미지 이름과 태그를 함께 전달
            `${repoTag.replace(/[:/]/g, "-")}-container`, // 컨테이너 이름 생성
            { "80/tcp": "8080" } // 포트 매핑
          );

        const result = await window.electronAPI.createAndStartContainer(
          containerOptions
        );

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

  const serviceHandler = async () => {
    // 여러 URL을 받아 처리하기 위해 repoUrls 배열을 설정합니다.
    const repoUrls = [
      "https://github.com/sunsuking/kokoa-clone-2020",
      // "https://github.com/example/repo",예시
    ];

    try {
      const projectSourceDirectory =
        await window.electronAPI.getProjectSourceDirectory();

      // 모든 저장소에 대해 다운로드 및 압축 해제 작업을 병렬로 수행
      const downloadPromises = repoUrls.map(async (repoUrl) => {
        const downloadPath = window.electronAPI.joinPath(
          projectSourceDirectory
        );
        const extractDir = downloadPath;

        await window.electronAPI.downloadAndUnzip(
          repoUrl,
          downloadPath,
          extractDir
        );

        console.log(`Download and unzip successful for ${repoUrl}`);

        return { repoUrl, extractDir };
      });

      const downloadResults = await Promise.all(downloadPromises);
      console.log("All downloads and unzips completed");

      // 각 저장소에 대해 Docker 이미지 빌드 수행
      const buildPromises = downloadResults.map(async ({ extractDir }) => {
        return await handleBuildImage(extractDir); // 수정: 빌드 결과 반환
      });

      const buildResults = await Promise.all(buildPromises);
      console.log(buildResults);

      // 성공적으로 빌드된 이미지에 대해서만 컨테이너 생성 및 시작
      const successfulBuilds = buildResults
        .filter((result) => result.success && result.image !== undefined)
        .map((result) => result.image as DockerImage);

      if (successfulBuilds.length > 0) {
        console.log(`Creating and starting containers for successful builds`);
        await createAndStartContainers(successfulBuilds);
      } else {
        console.log("No successful builds to create containers for");
      }
    } catch (err) {
      console.error("Error in service handler:", err);
    }
  };

  useEffect(() => {
    dockerCheckHandler();

    // 주기적인 상태 확인 (예: 30초마다)
    const intervalId = setInterval(dockerCheckHandler, 30000);
    // Docker 이벤트 구독 및 상태 확인
    window.electronAPI.sendDockerEventRequest();

    // 이벤트 발생 시 즉시 상태 확인
    const eventHandler = (data: DockerEvent) => {
      console.log("Docker event detected:", data);
      dockerCheckHandler();
    };

    window.electronAPI.onDockerEventResponse(eventHandler);

    // 정리 함수
    return () => {
      clearInterval(intervalId);
      window.electronAPI.removeAllListeners();
    };
  }, []);

  return (
    <div className="card">
      <div className="flex items-center">
        <div className="mr-4">
          <p className="font-sans font-bold text-xl">서비스 상태</p>
          <p className="font-sans text-gray-500">
            실행시 아래버튼을 클릭하세요
          </p>
          <div className={`flex ${startbtn}`} onClick={serviceHandler}>
            <p className="mr-3">{buttonText}</p>
            <FaPlay />
          </div>
        </div>

        <div>
          {/* Docker 상태 */}
          <div className="flex items-center ml-1">
            <FaCircle
              className={`text-xs mr-1 ${
                dockerStatusColor[
                  dockerStatus as "running" | "not running" | "unknown"
                ]
              }`}
            />
            <span>Docker 상태</span>
          </div>

          {/* Websocket 상태 */}
          <div className="flex items-center ml-1">
            <FaCircle
              className={`text-xs mr-1 ${
                websocketStatusColor[
                  websocketStatus as "connected" | "connecting" | "disconnected"
                ]
              }`}
            />
            <span>통신</span>
          </div>

          {/* Service 상태 */}
          <div className="flex items-center ml-1">
            <FaCircle
              className={`text-xs mr-1 ${
                serviceStatusColor[
                  serviceStatus as "running" | "loading" | "stopped"
                ]
              }`}
            />
            <span>전체 Service 상태</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusItem;
