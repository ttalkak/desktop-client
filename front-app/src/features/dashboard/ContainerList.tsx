import React, { useState } from "react";
import { MdKeyboardArrowDown, MdKeyboardArrowUp } from "react-icons/md";
import ContainerLogs from "./ContainerLogs";
import { useDockerStore } from "../../stores/dockerStore";
import Dockerode from "dockerode";

const ContainerList: React.FC = () => {
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(
    null
  );
  const dockerContainers = useDockerStore((state) => state.dockerContainers);

  const handleContainerSelect = (containerId: string) => {
    setSelectedContainerId((prevId) =>
      prevId === containerId ? null : containerId
    );
  };

  const shortenImageName = (imageName: string) => {
    const parts = imageName.split("/");
    return parts[parts.length - 1].split(":")[0];
  };

  const formatCreatedTime = (created: number) => {
    const date = new Date(created * 1000);
    const dateString = date.toLocaleDateString(); // 날짜만 추출
    const timeString = date.toLocaleTimeString(); // 시간만 추출
    return (
      <>
        <div>{dateString}</div>
        <div>{timeString}</div>
      </>
    );
  };

  const renderPorts = (ports: Dockerode.Port[]) => {
    if (!ports || ports.length === 0) return <div>No Ports</div>;

    return (
      <ul>
        {ports.map((port, index) => (
          <li key={`${port.PrivatePort}-${port.PublicPort}-${index}`}>
            {port.PrivatePort} : {port.PublicPort || "N/A"} ({port.Type})
          </li>
        ))}
      </ul>
    );
  };

  const tableBody = "py-2 px-4 text-sm text-gray-900 align-middle text-center";

  if (dockerContainers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center mt-8">
        <p className="text-center text-gray-700">
          현재 실행 중인 Docker 컨테이너가 없습니다.
        </p>
        <div className="mt-4">
          <span className="text-gray-400 text-sm">
            Docker 컨테이너를 실행해주세요.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      <div className="overflow-hidden rounded-lg custom-scrollbar">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="sticky z-10 top-0 text-sm bg-white-gradient border-b">
            <tr>
              <th className="p-1">Name</th>
              <th className="p-1">Image</th>
              <th className="p-1">Created</th>
              <th className="p-1">Ports</th>
              <th className="p-1">State</th>
              <th className="p-1">Logs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white overflow-y-auto">
            {dockerContainers.map((container: DockerContainer) => {
              const { Id, Names, Image, Created, State, Ports } = container;
              const isSelected = selectedContainerId === Id;

              return (
                <React.Fragment key={Id}>
                  <tr className="hover:bg-gray-50">
                    <td className={tableBody}>{Names}</td>
                    <td className={tableBody} title={Image}>
                      {shortenImageName(Image)}
                    </td>
                    <td className="py-2 px-4 text-xs text-gray-900 align-middle text-center">
                      {formatCreatedTime(Created)}
                    </td>
                    <td className={tableBody}>{renderPorts(Ports)}</td>
                    <td className={tableBody}>{State}</td>
                    <td className={tableBody}>
                      <button
                        onClick={() => handleContainerSelect(Id)}
                        className={`flex items-center justify-center p-2 hover:bg-gray-200 rounded`}
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
                      <td colSpan={6} className="p-4 bg-gray-100">
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
    </div>
  );
};

export default ContainerList;
