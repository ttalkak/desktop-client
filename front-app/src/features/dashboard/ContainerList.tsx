import React, { useState } from "react";
import { MdKeyboardArrowDown, MdKeyboardArrowUp } from "react-icons/md";
import ContainerLogs from "./ContainerLogs";

interface ContainerListProps {
  containers: DockerContainer[];
}

const ContainerList: React.FC<ContainerListProps> = ({ containers }) => {
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(
    null
  );

  const handleContainerSelect = (containerId: string) => {
    if (selectedContainerId === containerId) {
      setSelectedContainerId(null);
    } else {
      setSelectedContainerId(containerId);
    }
  };

  if (containers.length === 0) {
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
          {containers.map((container) => {
            const { Id, Name, Image, Created, NetworkSettings, State } =
              container;
            const isSelected = selectedContainerId === Id;

            // Created 시간이 Unix Epoch라면 표시를 하지 않도록 수정
            const createdTime = Created
              ? new Date(Number(Created) * 1000).toLocaleString()
              : "Unknown";

            return (
              <React.Fragment key={Id}>
                <tr>
                  <td className="py-2 px-4 border-b">{Name}</td>
                  <td className="py-2 px-4 border-b">{Image}</td>
                  <td className="py-2 px-4 border-b">{createdTime}</td>
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
