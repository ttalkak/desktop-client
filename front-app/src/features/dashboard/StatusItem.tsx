import { useEffect } from "react";
import { FaCircle, FaPlay } from "react-icons/fa";
import { useAppStore } from "../../stores/appStatusStore";
import { startService } from "../../utils/dockerUtils";

const StatusItem = () => {
  const dockerStatus = useAppStore((state) => state.dockerStatus);
  const websocketStatus = useAppStore((state) => state.websocketStatus);
  const serviceStatus = useAppStore((state) => state.serviceStatus);

  const setDockerStatus = useAppStore((state) => state.setDockerStatus);

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

  const dockerCheckHandler = async () => {
    try {
      const status = await window.electronAPI.checkDockerStatus();
      setDockerStatus(status);
      return status;
    } catch (error) {
      setDockerStatus("unknown");
    }
  };

  useEffect(() => {
    dockerCheckHandler();
    const intervalId = setInterval(dockerCheckHandler, 30000);
    window.electronAPI.sendDockerEventRequest();

    const eventHandler = (data: DockerEvent) => {
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
            className={`${startbtn} ${
              serviceStatusColor[
                serviceStatus as "running" | "loading" | "stopped"
              ]
            } `}
            onClick={startService} // 버튼 클릭 시 startService 함수 실행
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
