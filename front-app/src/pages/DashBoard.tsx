import React, { useEffect, useState } from "react";
import ContainerList from "../features/dashboard/ContainerList";
import ImageList from "../features/dashboard/ImageList";
import { useDockerStore } from "../stores/appStatusStore";

const DashBoard: React.FC = () => {
  const userSettings = sessionStorage.getItem("userSettings");
  const dockerContainers = useDockerStore((state) => state.dockerContainers);
  const [activeView, setActiveView] = useState<"containers" | "images">(
    "containers"
  );
  const [computeUsagePercentage, setComputeUsagePercentage] =
    useState<number>(0);

  let maxCompute = 0;

  useEffect(() => {
    if (userSettings) {
      const parsedSettings = JSON.parse(userSettings);
      maxCompute = parsedSettings.maxCompute || 5; // maxCompute가 없으면 기본값 5 사용
    } else {
      maxCompute = 0;
    }

    const containerCount = dockerContainers.length; // 할당받은 Container 수
    const usagePercentage =
      maxCompute > 0 ? (containerCount / maxCompute) * 100 : 0;
    setComputeUsagePercentage(usagePercentage);
  }, [userSettings, dockerContainers]);

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
        {/* 분수 형태 */}

        <p className="font-sans text-gray-600 -end">
          {!userSettings
            ? "로그인이 필요합니다."
            : `${dockerContainers.length} / ${maxCompute} (${Math.round(
                computeUsagePercentage
              )}%)`}
        </p>
      </div>
      <div className="mt-4 card">
        {activeView === "containers" && <ContainerList />}
        {activeView === "images" && <ImageList />}
      </div>
    </div>
  );
};

export default DashBoard;
