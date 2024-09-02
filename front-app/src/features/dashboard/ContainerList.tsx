import React, { useState } from 'react';
import { MdKeyboardArrowDown, MdKeyboardArrowUp } from "react-icons/md";
import ContainerLogs from './ContainerLogs';

interface ContainerListProps {
  containers: DockerContainer[];
}


const ContainerList: React.FC<ContainerListProps> = ({ containers }) => {
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);

  const handleContainerSelect = (containerId: string) => {
    if (selectedContainerId === containerId) {
      // 이미 선택된 컨테이너를 클릭하면 선택 해제
      setSelectedContainerId(null);
    } else {
      // 다른 컨테이너를 클릭하면 그 컨테이너를 선택
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
            <th className="py-2 px-4 border-b">Names</th>
            <th className="py-2 px-4 border-b">Image</th>
            <th className="py-2 px-4 border-b">Created</th>
            <th className="py-2 px-4 border-b">Ports</th>
            <th className="py-2 px-4 border-b">State</th>
            <th className="py-2 px-4 border-b">Status</th>
            <th className="py-2 px-4 border-b">Logs</th>
          </tr>
        </thead>
        <tbody>
          {containers.map((container, _index) => {
            const { Id, Names, Image, Created, Ports, State, Status } = container;
            const isSelected = selectedContainerId === Id;
            return (
              <React.Fragment key={Id}>
                <tr>
                  <td className="py-2 px-4 border-b">{Names.join(', ')}</td>
                  <td className="py-2 px-4 border-b">{Image}</td>
                  <td className="py-2 px-4 border-b">{new Date(Created * 1000).toLocaleString()}</td>
                  <td className="py-2 px-4 border-b">
                    {Ports.length > 0 ? (
                      Ports.map((port, idx) => (
                        <div key={idx} className="text-sm">
                          {port.IP}:{port.PublicPort} → {port.PrivatePort} ({port.Type})
                        </div>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500">No Ports</span>
                    )}
                  </td>
                  <td className="py-2 px-4 border-b">{State}</td>
                  <td className="py-2 px-4 border-b">{Status}</td>
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
                    <td colSpan={7} className="p-4 bg-gray-100 border-b">
                      <ContainerLogs container={container} />
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
