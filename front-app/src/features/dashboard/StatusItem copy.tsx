import { useEffect } from "react";
import { FaCircle, FaPlay } from "react-icons/fa";
import { useAppStore } from "../../stores/appStatusStore";
const StatusItem = () => {
  const dockerStatus = useAppStore((state) => state.dockerStatus);
  const websocketStatus = useAppStore((state) => state.websocketStatus);
  const serviceStatus = useAppStore((state) => state.serviceStatus);

  const setDockerStatus = useAppStore((state) => state.setDockerStatus);
  // const setWebsocketStatus = useAppStore((state) => state.setWebsocketStatus);
  const setServiceStatus = useAppStore((state) => state.setServiceStatus);

  // Tailwind 스타일링
  const startbtn = `flex items-center justify-center text-white text-sm px-6 py-2 rounded mr-4 font-sans font-medium cursor-pointer button app-region-no-drag ${
    serviceStatus === "running"
      ? "bg-green-500"
      : serviceStatus === "loading"
      ? "bg-yellow-500"
      : "bg-red-500"
  } ${serviceStatus === "loading" ? "cursor-not-allowed" : ""}`;

  const dockerStatusColor: Record<
    "running" | "not running" | "unknown",
    string
  > = {
    running: "text-color-7",
    "not running": "text-color-8",
    unknown: "text-color-3",
  } as const;

  const websocketStatusColor: Record<
    "connected" | "connecting" | "disconnected",
    string
  > = {
    connected: "text-color-5",
    connecting: "text-color-4",
    disconnected: "text-color-3",
  } as const;

  const serviceStatusColor: Record<"running" | "loading" | "stopped", string> =
    {
      running: "text-color-7",
      loading: "text-color-6",
      stopped: "text-color-8",
    } as const;

  const buttonText =
    serviceStatus === "running"
      ? "Running"
      : serviceStatus === "loading"
      ? "Loading..."
      : "Start Service";

  // Docker 상태 체크 함수
  const dockerCheckHandler = async () => {
    try {
      const status = await window.electronAPI.checkDockerStatus();
      console.log("Docker Status:", status);
      setDockerStatus(status);
      return status;
    } catch (error) {
      console.error("Error while checking Docker status:", error);
      setDockerStatus("unknown");
    }
  };

  // Docker가 "running" 상태가 될 때까지 기다리는 함수
  const waitForDockerToStart = async (maxRetries = 10, interval = 3000) => {
    let retries = 0;
    while (retries < maxRetries) {
      const status = await dockerCheckHandler();
      if (status === "running") {
        return true;
      }
      retries += 1;
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
    return false;
  };

  // Docker 실행 함수
  const startDockerIfNotRunning = async () => {
    const status = await window.electronAPI.checkDockerStatus();
    if (status !== "running") {
      console.log("Docker is not running. Starting Docker...");
      try {
        const resolvedPath =
          "C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe";
        await window.electronAPI.openDockerDesktop(resolvedPath);
        console.log("Docker started successfully.");

        // Docker가 시작될 때까지 기다림
        const dockerStarted = await waitForDockerToStart();
        if (!dockerStarted) {
          throw new Error("Docker failed to start within the expected time.");
        }
      } catch (error) {
        console.error("Failed to start Docker:", error);
        throw new Error("Docker failed to start");
      }
    } else {
      console.log("Docker is already running.");
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
      return { success: false, message: error };
    }
  };

  const createAndStartContainers = async (
    dockerImages: { RepoTags: string[] }[]
  ) => {
    try {
      const dockerContainers = await window.storeAPI.getAllDockerContainers();

      for (const image of dockerImages) {
        const existingContainer = dockerContainers.find(
          (container) => container.Image === image.RepoTags?.[0]
        );

        if (!existingContainer) {
          const repoTag = image.RepoTags?.[0] || ""; // "my-image:latest" 형태
          const containerOptions =
            await window.electronAPI.createContainerOptions(
              repoTag,
              `${repoTag.replace(/[:/]/g, "-")}-container`,
              { "80/tcp": "8080" }
            );

          const result = await window.electronAPI.createAndStartContainer(
            containerOptions
          );

          if (!result.success) {
            console.error(`Failed to start container: ${result.error}`);
          }
        }
      }
    } catch (error) {
      console.error("Error creating and starting containers:", error);
    }
  };

  const serviceHandler = async () => {
    setServiceStatus("loading");
    try {
      await startDockerIfNotRunning();

      const repoUrls = ["https://github.com/sunsuking/kokoa-clone-2020"];
      const projectSourceDirectory =
        await window.electronAPI.getProjectSourceDirectory();

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

      const buildPromises = downloadResults.map(async ({ extractDir }) => {
        return await handleBuildImage(extractDir);
      });

      const buildResults = await Promise.all(buildPromises);
      console.log(buildResults);

      const successfulBuilds = buildResults
        .filter((result) => result.success && result.image !== undefined)
        .map((result) => result.image as DockerImage);

      if (successfulBuilds.length > 0) {
        console.log(`Creating and starting containers for successful builds`);
        await createAndStartContainers(successfulBuilds);
        setServiceStatus("running");
      } else {
        console.log("No successful builds to create containers for");
        setServiceStatus("stopped");
      }
    } catch (err) {
      console.error("Error in service handler:", err);
      setServiceStatus("stopped");
    }
  };

  useEffect(() => {
    dockerCheckHandler();
    const intervalId = setInterval(dockerCheckHandler, 30000);
    window.electronAPI.sendDockerEventRequest();

    const eventHandler = (data: DockerEvent) => {
      console.log("Docker event detected:", data);
      dockerCheckHandler();
    };

    window.electronAPI.onDockerEventResponse(eventHandler);

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
            실행시 아래 버튼을 클릭하세요
          </p>
          <div
            className={startbtn}
            onClick={serviceStatus !== "loading" ? serviceHandler : undefined}
          >
            <p className="mr-3">{buttonText}</p>
            <FaPlay />
          </div>
        </div>

        <div>
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
