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
  const [_eventState, setEventState] = useState<DockerEvent | null>(null);

  const fetchDockerContainers = async () => {
    try {
      const containers = await window.electronAPI.fetchDockerContainers();
      setDockerContainers(containers);
    } catch (err) {
      setError("Failed to fetch Docker containers. Please try again.");
      console.error("Error fetching Docker containers:", err);
    }
  };

  const fetchDockerImages = async () => {
    try {
      const images = await window.electronAPI.getDockerImages();
      setDockerImages(images);
    } catch (err) {
      setError("Failed to fetch Docker images. Please try again.");
      console.error("Error fetching Docker images:", err);
    }
  };

  useEffect(() => {
    // 초기 데이터 로드
    const loadData = async () => {
      try {
        await Promise.all([fetchDockerContainers(), fetchDockerImages()]);
        setIsLoading(false); // 데이터 로드 후 로딩 상태를 false로 변경
      } catch (err) {
        setError("Failed to load Docker data.");
        setIsLoading(false); // 오류가 발생해도 로딩 상태를 false로 변경
      }
    };

    loadData();

    const handleDockerEvent = (dockerEvent: DockerEvent) => {
      setEventState(dockerEvent);
      console.log("Docker event received:", dockerEvent);

      if (dockerEvent.Type === "container") {
        setDockerContainers((prevContainers) => {
          let updatedContainers = [...prevContainers];
          const index = updatedContainers.findIndex(
            (container) => container.Id === dockerEvent.id
          );

          switch (dockerEvent.status) {
            case "create":
            case "start":
            case "unpause":
              if (index === -1) {
                fetchDockerContainers();
              } else {
                updatedContainers[index] = {
                  ...updatedContainers[index],
                  State: dockerEvent.status,
                };
              }
              break;

            case "stop":
            case "kill":
            case "pause":
            case "die":
              if (index !== -1) {
                updatedContainers[index] = {
                  ...updatedContainers[index],
                  State: dockerEvent.status,
                };
              }
              break;

            case "restart":
              if (index !== -1) {
                updatedContainers[index] = {
                  ...updatedContainers[index],
                  State: "restarted",
                };
              }
              break;

            case "destroy":
              if (index !== -1) {
                updatedContainers.splice(index, 1);
              }
              break;

            default:
              console.warn(
                "Unhandled Docker container event status:",
                dockerEvent.status
              );
              break;
          }

          return updatedContainers;
        });
      } else if (dockerEvent.Type === "image") {
        switch (dockerEvent.status) {
          case "pull":
          case "push":
          case "tag":
          case "untag":
          case "delete":
            fetchDockerImages();
            break;

          default:
            console.warn(
              "Unhandled Docker image event status:",
              dockerEvent.status
            );
            break;
        }
      }
    };

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
