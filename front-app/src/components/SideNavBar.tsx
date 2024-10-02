import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaCircle } from "react-icons/fa";
import { startService } from "../services/startService";
import { useAppStore } from "../stores/appStatusStore";
import { useAuthStore } from "../stores/authStore";
import { stopAllTasks } from "../services/stopAllFunction";
import { ImSpinner8 } from "react-icons/im";

const SideNavBar = () => {
  const dockerStatus = useAppStore((state) => state.dockerStatus);
  const websocketStatus = useAppStore((state) => state.websocketStatus);
  const serviceStatus = useAppStore((state) => state.serviceStatus);
  const setDockerStatus = useAppStore((state) => state.setDockerStatus);

  // 로그인 상태와 사용자 설정 가져오기
  const { accessToken } = useAuthStore();

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
    "not running": "text-color-2",
    unknown: "text-color-2",
  } as const;

  const websocketStatusColor: Record<
    "connected" | "connecting" | "disconnected",
    string
  > = {
    connected: "text-color-7",
    connecting: "text-color-2",
    disconnected: "text-color-2",
  } as const;

  const serviceStatusColor: Record<"running" | "loading" | "stopped", string> =
    {
      running: "text-color-7",
      loading: "text-color-2",
      stopped: "text-color-2",
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
    const initializeState = async () => {
      if (accessToken) {
        // 로그인 상태가 확인되면 처리
        await dockerCheckHandler();
      }
    };

    initializeState(); // 비동기 초기화 함수 호출

    return () => {
      // Cleanup 함수가 필요하면 여기에 추가
    };
  }, [accessToken]);

  const isLoggedIn = Boolean(accessToken);
  // const isLoggedIn = true;

  return (
    <div className={navContainer}>
      <div className="flex flex-col justify-center">
        <div className="text-xl text-center font-bold">
          Click to run Ttalkak
        </div>

        {serviceStatus === "running" ? (
          <button
            onClick={stopAllTasks}
            className={`bg-color-15 rounded py-1 mt-4 flex items-center justify-center`}
          >
            <div className="ml-1.5 text-white">stop</div>
          </button>
        ) : (
          <button
            onClick={startService}
            className={`bg-color-12 rounded text-white py-1 mt-4 hover:bg-color-13`}
            disabled={!isLoggedIn}
          >
            start
          </button>
        )}

        <div className="mt-1 flex justify-between flex-row-reverse items-center h-6">
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
          {serviceStatus === "running" && (
            <div className="flex items-center text-sm">
              <ImSpinner8
                className="animate-spin-slow mr-1.5 mt-0.5"
                color="#757575"
                size={10}
              />
              <div>running</div>
            </div>
          )}
        </div>

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
