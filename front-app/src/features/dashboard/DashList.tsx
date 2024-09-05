import React, { useEffect, useState } from "react";
import ContainerList from "./ContainerList";
import ImageList from "./ImageList";
import { useAppStore } from "../../stores/statusStore";

const DashList: React.FC = () => {
  const {
    dockerStatus,
    dockerImages,
    dockerContainers,
    setDockerStatus,
    setDockerImages,
    setDockerContainers,
  } = useAppStore();

  const [activeView, setActiveView] = useState<"containers" | "images">(
    "containers"
  );

  // Docker 상태 확인 함수
  const checkDockerStatus = async () => {
    try {
      const status = await window.electronAPI.checkDockerStatus();
      setDockerStatus(status);
    } catch (error) {
      setDockerStatus("unknown");
    }
  };

  // Docker 이미지와 컨테이너 데이터를 로드하는 함수
  const loadDockerData = async () => {
    try {
      if (dockerStatus !== "running") {
        return;
      }

      const storedImages = await window.storeAPI.getAllDockerImages();
      const storedContainers = await window.storeAPI.getAllDockerContainers();

      const [actualImages, actualContainers] = await Promise.all([
        window.electronAPI.getDockerImages(),
        window.electronAPI.getDockerContainers(),
      ]);

      const newImages = actualImages.filter(
        (img) => !storedImages.some((storedImg) => storedImg.Id === img.Id)
      );
      const removedImages = storedImages.filter(
        (storedImg) => !actualImages.some((img) => img.Id === storedImg.Id)
      );

      newImages.forEach((img) => window.storeAPI.setDockerImage(img));
      removedImages.forEach((img) => window.storeAPI.removeDockerImage(img.Id));

      const newContainers = actualContainers.filter(
        (container) =>
          !storedContainers.some(
            (storedContainer) => storedContainer.Id === container.Id
          )
      );
      const removedContainers = storedContainers.filter(
        (storedContainer) =>
          !actualContainers.some(
            (container) => container.Id === storedContainer.Id
          )
      );

      newContainers.forEach((container) =>
        window.storeAPI.setDockerContainer(container)
      );
      removedContainers.forEach((container) =>
        window.storeAPI.removeDockerContainer(container.Id)
      );

      setDockerImages(await window.storeAPI.getAllDockerImages());
      setDockerContainers(await window.storeAPI.getAllDockerContainers());
    } catch (err) {
      console.error("Failed to load Docker data.", err);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      await checkDockerStatus();
      await loadDockerData();
    };

    initialize();

    // Docker 이벤트 리스너 설정
    window.electronAPI.onDockerEventResponse(
      async (dockerEvent: DockerEvent) => {
        try {
          await loadDockerData();
        } catch (err) {
          console.error("Error handling Docker event:", err);
        }
      }
    );

    // 이벤트 수신 시작
    window.electronAPI.sendDockerEventRequest();

    // 컴포넌트 언마운트 시 리스너 정리
    return () => {
      window.electronAPI.removeAllListeners();
    };
  }, []);

  useEffect(() => {
    if (dockerStatus === "running") {
      loadDockerData();
    }
  }, [dockerStatus]);

  return (
    <div>
      <div className="col-span-2 py-6">
        <div className="flex items-center justify-between">
          <div className="flex space-x-2 bg-color-2 p-1.5 rounded-lg max-w-min w-full">
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
            <button
              className="px-4 py-2 rounded-lg bg-red-500 text-white shadow"
              onClick={async () => {
                await window.storeAPI.initializeStore();
                await loadDockerData();
              }}
            >
              Reset Store
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-blue-500 text-white shadow"
              onClick={loadDockerData}
            >
              Refresh Data
            </button>
          </div>
        </div>
        {activeView === "containers" ? (
          dockerContainers.length > 0 ? (
            <ContainerList containers={dockerContainers} />
          ) : (
            <div className="text-center mt-8 text-red-500">
              No containers found or failed to load containers.
            </div>
          )
        ) : activeView === "images" ? (
          dockerImages.length > 0 ? (
            <ImageList images={dockerImages} />
          ) : (
            <div className="text-center mt-8 text-red-500">
              No images found or failed to load images.
            </div>
          )
        ) : null}
      </div>
    </div>
  );
};

export default DashList;
