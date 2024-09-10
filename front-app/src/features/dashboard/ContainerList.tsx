import React, { useState, useEffect } from "react";
import { MdKeyboardArrowDown, MdKeyboardArrowUp } from "react-icons/md";
import ContainerLogs from "./ContainerLogs";
import { useDockerStore } from "../../stores/appStatusStore";
import { ContainerInspectInfo } from "dockerode";

const ContainerList: React.FC = () => {
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(
    null
  );
  // const [cpuUsages, setCpuUsages] = useState<{ [key: string]: number }>({});
  const dockerContainers = useDockerStore((state) => state.dockerContainers);

  useEffect(() => {
    // window.electronAPI.monitorCpuUsage();

    return () => {};
  }, []);

  const handleContainerSelect = (containerId: string) => {
    setSelectedContainerId((prevId) =>
      prevId === containerId ? null : containerId
    );
  };

  const shortenImageName = (imageName: string) => {
    const parts = imageName.split("/");
    return parts[parts.length - 1].split(":")[0];
  };

  const formatCreatedTime = (created: string | number | undefined) => {
    if (created === undefined) return "Unknown";
    const date = new Date(
      typeof created === "string" ? created : Number(created) * 1000
    );
    return isNaN(date.getTime()) ? "Invalid Date" : date.toLocaleString();
  };

  if (dockerContainers.length === 0) {
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
            <th className="py-2 px-4 border-b">CPU Usage</th>
            <th className="py-2 px-4 border-b">Logs</th>
          </tr>
        </thead>
        <tbody>
          {dockerContainers.map((container: ContainerInspectInfo) => {
            const { Id, Name, Image, Created, State, NetworkSettings } =
              container;

            const Ports = NetworkSettings?.Ports || {};
            const isSelected = selectedContainerId === Id;
            // const cpuUsage = cpuUsages[Id] || 0;

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
                    {Object.entries(Ports).map(([key, value]) =>
                      value.map((port, index) => (
                        <div key={index}>
                          <p>
                            {port.HostPort}:{key.split("/")[0]} (
                            {key.split("/")[1]})
                          </p>
                        </div>
                      ))
                    )}
                  </td>
                  <td className="py-2 px-4 border-b">
                    {State ? (
                      <div>
                        {State.Running && <p>Running</p>}
                        {State.Paused && <p>Paused</p>}
                        {State.Restarting && <p>Restarting</p>}
                        {State.OOMKilled && <p>Out of Memory</p>}
                        {State.Dead && <p>Dead</p>}
                        {State.Error && <p>{State.Error}</p>}
                        {State.ExitCode !== 0 && <p>{State.ExitCode}</p>}
                      </div>
                    ) : (
                      <p>No health information available</p>
                    )}
                  </td>
                  <td className="py-2 px-4 border-b">수정중</td>
                  {/* <td className="py-2 px-4 border-b">
                  {cpuUsage.toFixed(2)}%
                  </td> */}
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
