import React, { useState } from "react";
import { MdKeyboardArrowDown, MdKeyboardArrowUp } from "react-icons/md";
import ContainerLogs from "./ContainerLogs";
import { useDockerStore } from "../../stores/appStatusStore";
import { ContainerInspectInfo } from "dockerode";

interface PortMapping {
  inboundPort: string;
  outboundPort: string;
  protocol: string;
}

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

  const formatCreatedTime = (created: string | number | undefined) => {
    if (created === undefined) return "Unknown";
    const date = new Date(
      typeof created === "string" ? created : Number(created) * 1000
    );
    return isNaN(date.getTime()) ? "Invalid Date" : date.toLocaleString();
  };

  const renderPorts = (
    ports:
      | {
          [portAndProtocol: string]: Array<{
            HostIp: string;
            HostPort: string;
          }>;
        }
      | undefined
  ) => {
    if (!ports) return <div>No Ports</div>;

    const portMappings: PortMapping[] = [];

    Object.entries(ports).forEach(([portAndProtocol, hostBindings]) => {
      const [port, protocol] = portAndProtocol.split("/");
      hostBindings.forEach((binding) => {
        portMappings.push({
          inboundPort: port,
          outboundPort: binding.HostPort,
          protocol: protocol,
        });
      });
    });

    return portMappings.length > 0 ? (
      <ul>
        {portMappings.map((mapping, index) => (
          <li key={index}>
            {mapping.inboundPort} : {mapping.outboundPort} ({mapping.protocol})
          </li>
        ))}
      </ul>
    ) : (
      <div>No Ports</div>
    );
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
            <th className="py-2 px-4 border-b">Logs</th>
          </tr>
        </thead>
        <tbody>
          {dockerContainers.map((container: ContainerInspectInfo) => {
            const { Id, Name, Image, Created, State, NetworkSettings } =
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
                    {renderPorts(NetworkSettings.Ports)}
                  </td>
                  <td className="py-2 px-4 border-b">
                    {State ? (
                      <div>{State.Status}</div>
                    ) : (
                      <p>No health information available</p>
                    )}
                  </td>
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
                    <td colSpan={6} className="p-4 bg-gray-100 border-b">
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
