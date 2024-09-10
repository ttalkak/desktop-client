import React, { useEffect, useState } from "react";
import ContainerList from "../features/dashboard/ContainerList";
import ImageList from "../features/dashboard/ImageList";
import { useAuthStore } from "../stores/authStore";
import { useAppStore, useDockerStore } from "../stores/appStatusStore";

const DashBoard: React.FC = () => {
  const dockerContainers = useDockerStore((state) => state.dockerContainers);
  const serviceStatus = useAppStore((state) => state.serviceStatus);
  const { accessToken, userSettings } = useAuthStore();
  const [activeView, setActiveView] = useState<"containers" | "images">(
    "containers"
  );
  const [computeUsagePercentage, setComputeUsagePercentage] =
    useState<number>(0);

  useEffect(() => {
    if (userSettings && "maxCompute" in userSettings) {
      const { maxCompute } = userSettings as { maxCompute: number };
      if (maxCompute > 0 && dockerContainers.length > 0) {
        const usagePercentage = (dockerContainers.length / maxCompute) * 100;
        setComputeUsagePercentage(usagePercentage);
      } else {
        setComputeUsagePercentage(0);
      }
    }
  }, [userSettings, dockerContainers]);

  const getStatusMessage = () => {
    if (!accessToken) {
      return "로그인이 필요합니다.";
    }
    if (!userSettings) {
      return "사용자 설정을 불러오는 중...";
    }
    if (serviceStatus === "stopped") {
      return "프로그램을 시작하세요.";
    }
    const { maxCompute } = userSettings as { maxCompute: number };
    return `${dockerContainers.length} / ${maxCompute} (${Math.round(
      computeUsagePercentage
    )}%)`;
  };

  return (
    <div className="col-span-2 py-6 card">
      <div className="flex items-center justify-between">
        <div className="flex space-x-2 bg-color-3 p-1.5 rounded-lg max-w-min w-full">
          <button
            className={`px-4 py-2 rounded-lg ${
              activeView === "containers"
                ? "bg-white text-black shadow"
                : "text-gray-500"
            }`}
            onClick={() => setActiveView("containers")}
          >
            Containers
          </button>
          <button
            className={`px-4 py-2 rounded-lg ${
              activeView === "images"
                ? "bg-white text-black shadow"
                : "text-gray-500"
            }`}
            onClick={() => setActiveView("images")}
          >
            Images
          </button>
        </div>
        <p className="font-sans text-gray-600 -end">{getStatusMessage()}</p>
      </div>
      <div className="mt-4 card">
        {activeView === "containers" && <ContainerList />}
        {activeView === "images" && <ImageList />}
      </div>
    </div>
  );
};

export default DashBoard;
