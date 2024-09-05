import { useEffect } from "react";
import { FaCircle, FaPlay } from "react-icons/fa";
import { useAppStore } from "../../stores/appStatusStore";
import { startService } from "../../utils/startService";
import { disconnectWebSocket } from "../../utils/stompService";

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
    connected: "text-color-7",
    connecting: "text-color-6",
    disconnected: "text-color-8",
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
    return () => {
      clearInterval(intervalId);
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
            onClick={startService}
          >
            <p className="mr-3">{buttonText}</p>
            <FaPlay />
          </div>
          {/* WebSocket 연결 해지 버튼 */}
          <div
            className={`${startbtn} bg-red-500`} // 버튼 스타일 (빨간색 배경)
            onClick={disconnectWebSocket} // 클릭 시 WebSocket 연결 해지
          >
            <p className="mr-3">Disconnect WebSocket</p>
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
