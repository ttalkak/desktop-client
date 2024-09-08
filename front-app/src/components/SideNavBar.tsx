import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaCircle } from "react-icons/fa";
import { startService } from "../utils/serviceUtils";
import { disconnectWebSocket } from "../utils/stompService";
import { useAppStore } from "../stores/appStatusStore";
import { useDockerStore, useCpuStore } from "../stores/appStatusStore";

const SideNavBar = () => {
  const dockerStatus = useAppStore((state) => state.dockerStatus);
  const websocketStatus = useAppStore((state) => state.websocketStatus);
  const serviceStatus = useAppStore((state) => state.serviceStatus);
  const setDockerStatus = useAppStore((state) => state.setDockerStatus);
  const setDockerImages = useDockerStore((state) => state.setDockerImages);
  const setDockerContainers = useDockerStore(
    (state) => state.setDockerContainers
  );
  const setCpuStore = useCpuStore((state) => state.setContainerCpuUsages);

  const location = useLocation();

  const isActive = (path: string) =>
    location.pathname === path ? "text-color-5 bg-color-1" : "text-color-10";

  const navContainer = `fixed top-[40.8px] left-0 w-64 h-screen flex flex-col button app-region-no-drag w-60 bg-white p-4`;
  const navText = `text-color-10 py-1.5 px-4 my-1.5 relative hover:text-color-5 hover:bg-color-1 rounded flex items-center`;

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
    setDockerImages([]);
    setDockerContainers([]);
    setCpuStore([]);
    const intervalId = setInterval(dockerCheckHandler, 30000);
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  return (
    <div className={navContainer}>
      <div className="flex flex-col justify-center">
        <div className="text-xl text-center font-bold">
          Click to run TTalkak
        </div>

        <button
          onClick={startService}
          className="bg-color-12 rounded text-white py-1 mt-4 mb-2  hover:bg-color-13"
        >
          start
        </button>
        <div className="flex justify-end">
          <FaCircle
            className={`text-tiny mr-1 ${
              dockerStatusColor[
                dockerStatus as "running" | "not running" | "unknown"
              ]
            }`}
          />

          <FaCircle
            className={`text-tiny mr-1 ${
              websocketStatusColor[
                websocketStatus as "connected" | "connecting" | "disconnected"
              ]
            }`}
          />

          <FaCircle
            className={`text-tiny mr-1 ${
              serviceStatusColor[
                serviceStatus as "running" | "loading" | "stopped"
              ]
            }`}
          />
        </div>
        <button
          onClick={disconnectWebSocket}
          className="bg-color-8 rounded text-white py-1 my-4  hover:bg-color-13"
        >
          웹소켓 연결해지
        </button>

        <div className="flex flex-col mt-6">
          <Link to="/" className={`${navText} ${isActive("/")}`}>
            <div className="ml-1">Home</div>
          </Link>
          <Link
            to="/dashboard"
            className={`${navText} ${isActive("/dashboard")}`}
          >
            Dashboard
          </Link>
          <Link to="/port" className={`${navText} ${isActive("/port")}`}>
            Port
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SideNavBar;
