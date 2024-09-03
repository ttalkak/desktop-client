import React, { useState, useEffect } from "react";
import ContainerList from "./ContainerList";
import ImageList from "./ImageList";

const DashList: React.FC = () => {
  const [activeView, setActiveView] = useState<"containers" | "images">(
    "containers"
  );
  const [dockerImages, setDockerImages] = useState<DockerImage[]>([]);
  const [dockerContainers, setDockerContainers] = useState<DockerContainer[]>(
    []
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadDockerData = async () => {
    try {
      setIsLoading(true);

      // Electron Store에서 데이터 로드
      const storedImages = await window.storeAPI.getAllDockerImages();
      const storedContainers = await window.storeAPI.getAllDockerContainers();

      // 실제 Docker에서 이미지 및 컨테이너 목록 가져오기
      const [actualImages, actualContainers] = await Promise.all([
        window.electronAPI.getDockerImages(),
        window.electronAPI.getDockerContainers(),
      ]);

      // 이미지 비교 및 업데이트
      const newImages = actualImages.filter(
        (img) => !storedImages.some((storedImg) => storedImg.Id === img.Id)
      );
      const removedImages = storedImages.filter(
        (storedImg) => !actualImages.some((img) => img.Id === storedImg.Id)
      );

      newImages.forEach((img) => window.storeAPI.setDockerImage(img));
      removedImages.forEach((img) => window.storeAPI.removeDockerImage(img.Id));

      // 컨테이너 비교 및 업데이트
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

      // 상태 업데이트
      setDockerImages(await window.storeAPI.getAllDockerImages());
      setDockerContainers(await window.storeAPI.getAllDockerContainers());
      setIsLoading(false);
    } catch (err) {
      console.error("Failed to load Docker data:", err);
      setError("Failed to load Docker data.");
      setIsLoading(false);
    }
  };

  const handleDockerEvent = async (dockerEvent: DockerEvent) => {
    console.log("Docker event received:", dockerEvent);

    try {
      if (dockerEvent.Type === "container") {
        const container = await window.electronAPI.fetchDockerContainer(
          dockerEvent.id
        );

        if (["create", "start", "unpause"].includes(dockerEvent.status)) {
          window.storeAPI.setDockerContainer(container);
        } else if (
          ["stop", "kill", "pause", "die", "destroy"].includes(
            dockerEvent.status
          )
        ) {
          if (dockerEvent.status === "destroy") {
            window.storeAPI.removeDockerContainer(dockerEvent.id);
          } else {
            window.storeAPI.setDockerContainer(container);
          }
        }
        setDockerContainers(await window.storeAPI.getAllDockerContainers());
      } else if (dockerEvent.Type === "image") {
        const image = await window.electronAPI.fetchDockerImage(dockerEvent.id);

        if (["pull", "push", "tag"].includes(dockerEvent.status)) {
          window.storeAPI.setDockerImage(image);
        } else if (["untag", "delete"].includes(dockerEvent.status)) {
          if (dockerEvent.status === "delete") {
            window.storeAPI.removeDockerImage(dockerEvent.id);
          } else {
            window.storeAPI.setDockerImage(image);
          }
        }
        setDockerImages(await window.storeAPI.getAllDockerImages());
      }
    } catch (err) {
      console.error("Error handling Docker event:", err);
      setError("Error handling Docker event.");
    }
  };

  useEffect(() => {
    loadDockerData();

    // Docker 이벤트 리스너 설정
    window.electronAPI.onDockerEventResponse(handleDockerEvent);

    // 이벤트 수신 시작
    window.electronAPI.sendDockerEventRequest();

    // 컴포넌트 언마운트 시 리스너 정리
    return () => {
      window.electronAPI.removeAllListeners();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="text-center">
        <div role="status">
          <svg
            aria-hidden="true"
            className="inline w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600"
            viewBox="0 0 100 101"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
              fill="currentColor"
            />
            <path
              d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717"
              fill="currentFill"
            />
          </svg>
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-center mt-8 text-red-500">{error}</div>;
  }

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
