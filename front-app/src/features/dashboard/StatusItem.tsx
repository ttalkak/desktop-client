import { useState, useEffect } from "react";
import { FaCircle } from "react-icons/fa";
import { FaPlay } from "react-icons/fa";

const StatusItem = () => {
  const [dockerStatus, setDockerStatus] = useState("unknown"); // "running" | "not running" | "unknown"
  const [websocketStatus, setwebsocketStatus] = useState("disconnected"); //"connected" | "connecting" | "disconnected"
  const [serviceStatus, setServiceStatus] = useState("stopped"); // "running" | "loading" | "stopped"

  //tailwind
  const startbtn = `flex items-center justify-center text-white text-sm px-6 py-2 rounded mr-4 font-sans font-medium cursor-pointer button app-region-no-drag ${
    serviceStatus === "running"
      ? "bg-green-500"
      : serviceStatus === "loading"
      ? "bg-yellow-500"
      : "bg-red-500"
  }`;
  // Docker 상태에 따른 색상 매핑 (as cons=readonly 적용)
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
    connected: "text-color-5", // 웹소켓이 연결되었을 때의 색상
    connecting: "text-color-4", // 웹소켓이 연결 중일 때의 색상
    disconnected: "text-color-3", // 웹소켓이 연결되지 않았을 때의 색상
  } as const;

  // 서비스 상태에 따른 색상 매핑 (as cons=readonly 적용)
  const serviceStatusColor: Record<"running" | "loading" | "stopped", string> =
    {
      running: "text-color-7",
      loading: "text-color-6", // 예시로 'text-red-500' 추가
      stopped: "text-color-8",
    } as const;

  // 상태에 따른 버튼 텍스트 설정
  const buttonText =
    serviceStatus === "running"
      ? "Running"
      : serviceStatus === "loading"
      ? "Loading..."
      : "Service Unavailable";

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
          (container) => container.Image === image.RepoTags?.[0]
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
            image.RepoTags?.[0] || "", // 이미지 이름
            `${image.RepoTags?.[0]?.replace(/[:/]/g, "-")}-container`, // 컨테이너 이름 생성
            {
              "80/tcp": "8080", // 예시로 기본 포트 매핑 설정
            }
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

  useEffect(() => {
    dockerCheckHandler();

    // Docker 이벤트 구독 및 상태 확인
    window.electronAPI.sendDockerEventRequest();

    window.electronAPI.onDockerEventResponse((data) => {
      console.log("Docker event detected:", data);
      dockerCheckHandler(); // 이벤트 발생 시 Docker 상태 확인
    });

    // return () => {
    //   window.electronAPI.removeAllListeners(); // 컴포넌트 언마운트 시 리스너 제거
    // };=> 나중에 앱 종료시 제거하도록 설정
  }, []);

  return (
    <>
      <div className="card">
        <div className="flex items-center">
          <div className="mr-4">
            <p className="font-sans font-bold text-xl">Service Status</p>
            <p className="font-sans text-gray-500">Current service status</p>
            <div className={`flex ${startbtn}`}>
              <p className="mr-3">{buttonText}</p>
              <FaPlay onClick={downloadHandler} />
              {/* [unzip후이미지빌드까지 연결됨] */}
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
              <span>
                {dockerStatus === "running"
                  ? "Docker running"
                  : dockerStatus === "not running"
                  ? "Docker not running"
                  : "Docker status unknown"}
              </span>
            </div>

            {/* Websocket 상태 */}
            <div className="flex items-center ml-1">
              <FaCircle
                className={`text-xs mr-1 ${
                  websocketStatusColor[
                    websocketStatus as
                      | "connected"
                      | "connecting"
                      | "disconnected"
                  ]
                }`}
              />
              <span>
                {websocketStatus === "connected"
                  ? "Websocket connected"
                  : websocketStatus === "connecting"
                  ? "Websocket connecting"
                  : "Websocket disconnected"}
              </span>
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
              <span>
                {serviceStatus === "running"
                  ? "Service running"
                  : serviceStatus === "loading"
                  ? "Service loading"
                  : "Service stopped"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default StatusItem;
