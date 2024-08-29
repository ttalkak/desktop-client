import React, { useState, useEffect } from 'react';
import { HiOutlineDotsVertical } from "react-icons/hi";

interface ContainerListProps {
  containers: DockerContainer[];
}

const ContainerList: React.FC<ContainerListProps> = ({ containers }) => {
  const [selectedContainers, setSelectedContainers] = useState<string[]>([]);
  const [logs, setLogs] = useState<string>('');
  const [selectedContainerId, setSelectedContainerId] = useState<string>('');

  const handleContainerSelect = (id: string) => {
    setSelectedContainers((prevSelected) =>
      prevSelected.includes(id)
        ? prevSelected.filter((containerId) => containerId !== id)
        : [...prevSelected, id]
    );
  };

  const fetchLogs = (containerId: string) => {
    setSelectedContainerId(containerId);
    setLogs('');
    window.electronAPI.startLogStream(containerId);
  };

  useEffect(() => {
    const handleLog = (log: string) => {
      setLogs((prevLogs) => prevLogs + log);
    };

    const handleError = (error: string) => {
      console.error('Error fetching logs:', error);
    };

    const handleEnd = () => {
      console.log('Log stream ended');
    };

    window.electronAPI.onLogStream(handleLog);
    window.electronAPI.onLogError(handleError);
    window.electronAPI.onLogEnd(handleEnd);

    return () => {
      window.electronAPI.onLogStream(handleLog);
      window.electronAPI.onLogError(handleError);
      window.electronAPI.onLogEnd(handleEnd);
    };
  }, []);

  if (containers.length === 0) {
    return <div className="text-center mt-8">현재 실행 중인 Docker 컨테이너가 없습니다.</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Docker Containers</h2>
      <table className="min-w-full bg-white border border-gray-300 mt-4">
        <thead>
          <tr>
            <th className="py-2 px-4 border-b"></th>
            <th className="py-2 px-4 border-b">Names</th>
            <th className="py-2 px-4 border-b">Image</th>
            <th className="py-2 px-4 border-b">Created</th>
            <th className="py-2 px-4 border-b">Ports</th>
            <th className="py-2 px-4 border-b">State</th>
            <th className="py-2 px-4 border-b">Status</th>
            <th className="py-2 px-4 border-b">Actions</th>
          </tr>
        </thead>
        <tbody>
          {containers.map((container, index) => {
            const { Id, Names, Image, Created, Ports, State, Status } = container;
            return (
              <tr key={index}>
                <td className="py-2 px-4 border-b">
                  <input
                    type="checkbox"
                    checked={selectedContainers.includes(Id)}
                    onChange={() => handleContainerSelect(Id)}
                  />
                </td>
                <td className="py-2 px-4 border-b">{Names.join(', ')}</td>
                <td className="py-2 px-4 border-b">{Image}</td>
                <td className="py-2 px-4 border-b">{new Date(Created * 1000).toLocaleString()}</td>
                <td className="py-2 px-4 border-b">
                  {Ports.map((port, idx) => (
                    <span key={idx}>
                      {port.IP}:{port.PublicPort} → {port.PrivatePort} ({port.Type})
                    </span>
                  ))}
                </td>
                <td className="py-2 px-4 border-b">{State}</td>
                <td className="py-2 px-4 border-b">{Status}</td>
                <td className="py-2 px-4 border-b">
                  <button onClick={() => fetchLogs(Id)}>
                    <HiOutlineDotsVertical />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {selectedContainerId && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Logs for Container: {selectedContainerId}</h2>
          <pre className="bg-gray-100 p-4 border rounded">{logs}</pre>
        </div>
      )}
    </div>
  );
};

export default ContainerList;