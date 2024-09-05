import React, { useState, useEffect } from "react";
import { MdKeyboardArrowDown, MdKeyboardArrowUp } from "react-icons/md";
import ContainerLogs from "./ContainerLogs";
import { useAppStore } from "./../../stores/appStatusStore";

const ContainerList: React.FC = () => {
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(
    null
  );
  const [localDockerContainers, setLocalDockerContainers] = useState<
    DockerContainer[]
  >([]);
  const setDockerContainers = useAppStore((state) => state.setDockerContainers);

  useEffect(() => {
    const handleStorageChange = () => {
      const storedContainers = sessionStorage.getItem("containers");
      if (storedContainers) {
        try {
          const parsedContainers = JSON.parse(storedContainers);
          setLocalDockerContainers(parsedContainers);
          setDockerContainers(parsedContainers); // 전역 상태도 업데이트
        } catch (error) {
          console.error("Failed to parse stored containers:", error);
        }
      }
    };

    // 초기 로드
    handleStorageChange();

    // storage 이벤트 리스너 추가
    window.addEventListener("storage", handleStorageChange);

    // 주기적으로 sessionStorage 확인 (옵션)
    const intervalId = setInterval(handleStorageChange, 1000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(intervalId);
    };
  }, [setDockerContainers]);

  const handleContainerSelect = (containerId: string) => {
    setSelectedContainerId((prevId) =>
      prevId === containerId ? null : containerId
    );
  };

  // 이미지 이름을 짧게 표시하는 함수
  const shortenImageName = (imageName: string) => {
    const parts = imageName.split("/");
    return parts[parts.length - 1].split(":")[0];
  };

  // 생성 시간을 포맷팅하는 함수
  const formatCreatedTime = (created: string | number | undefined) => {
    if (created === undefined) return "Unknown";
    const date = new Date(
      typeof created === "string" ? created : Number(created) * 1000
    );
    return isNaN(date.getTime()) ? "Invalid Date" : date.toLocaleString();
  };

  if (localDockerContainers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center mt-8">
        <p className="text-center text-xl text-gray-500">
          현재 실행 중인 Docker 컨테이너가 없습니다.
        </p>
        <div className="mt-4">
          <span className="text-gray-400">
            Docker 컨테이너를 실행한 후 새로 고침해주세요.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <table className="min-w-full bg-white border border-gray-300 mt-2">
        <thead>
          <tr>
            <th className="py-2 px-4 border-b">Name</th>
            <th className="py-2 px-4 border-b">Image</th>
            <th className="py-2 px-4 border-b">Created</th>
            <th className="py-2 px-4 border-b">Ports</th>
            <th className="py-2 px-4 border-b">State</th>
            <th className="py-2 px-4 border-b">Logs</th>
          </tr>
        </thead>
        <tbody>
          {localDockerContainers.map((container) => {
            const { Id, Name, Image, Created, NetworkSettings, State } =
              container;
            const isSelected = selectedContainerId === Id;

            return (
              <React.Fragment key={Id}>
                <tr>
                  <td className="py-2 px-4 border-b">{Name}</td>
                  <td className="py-2 px-4 border-b" title={Image}>
                    {shortenImageName(Image)}
                  </td>
                  <td className="py-2 px-4 border-b">
                    {formatCreatedTime(Created)}
                  </td>
                  <td className="py-2 px-4 border-b">
                    {NetworkSettings.Ports &&
                    Object.keys(NetworkSettings.Ports).length > 0 ? (
                      Object.entries(NetworkSettings.Ports).map(
                        ([port, bindings], idx) =>
                          bindings?.map((binding, bIdx) => (
                            <div key={`${idx}-${bIdx}`} className="text-sm">
                              {binding.HostIp}:{binding.HostPort} → {port}
                            </div>
                          )) || (
                            <span className="text-sm text-gray-500">
                              No Ports
                            </span>
                          )
                      )
                    ) : (
                      <span className="text-sm text-gray-500">No Ports</span>
                    )}
                  </td>
                  <td className="py-2 px-4 border-b">{State.Status}</td>
                  <td className="py-2 px-4 border-b">
                    <button
                      onClick={() => handleContainerSelect(Id)}
                      className="flex items-center justify-center p-2 hover:bg-gray-200 rounded"
                      title="View Logs"
                    >
                      {isSelected ? (
                        <MdKeyboardArrowUp className="text-gray-600" />
                      ) : (
                        <MdKeyboardArrowDown className="text-gray-600" />
                      )}
                    </button>
                  </td>
                </tr>
                {isSelected && (
                  <tr>
                    <td colSpan={10} className="p-4 bg-gray-100 border-b">
                      <ContainerLogs containerId={Id} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ContainerList;
