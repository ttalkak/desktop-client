import{ useEffect, useState } from 'react';
import Docker from 'dockerode';

const docker = new Docker({ socketPath: '/var/run/docker.sock' }); // Docker 소켓 설정 (Linux/Unix)

const DockerLogs = () => {
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [logs, setLogs] = useState<string>('');
  const [selectedContainerId, setSelectedContainerId] = useState<string>('');

  // 실행 중인 컨테이너 목록 가져오기
  useEffect(() => {
    const fetchContainers = async () => {
      try {
        const containerList = await docker.listContainers({ all: false }); // 실행 중인 컨테이너 목록 가져오기
        setContainers(containerList);
      } catch (error) {
        console.error('Error fetching containers:', error);
      }
    };

    fetchContainers();
  }, []);

  // 선택된 컨테이너의 로그 가져오기
  const fetchLogs = async (containerId: string) => {
    try {
      setSelectedContainerId(containerId);
      const container = docker.getContainer(containerId);
      const logStream = await container.logs({
        follow: true,
        stdout: true,
        stderr: true,
        since: 0,
        timestamps: true,
      });

      logStream.on('data', (chunk) => {
        setLogs((prevLogs) => prevLogs + chunk.toString());
      });
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Docker Containers Logs</h1>
      <ul>
        {containers.map((container) => (
          <li key={container.Id} className="mb-2">
            <button
              onClick={() => fetchLogs(container.Id)}
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              {container.Names.join(', ')} - {container.Id}
            </button>
          </li>
        ))}
      </ul>
      {selectedContainerId && (
        <div className="mt-4">
          <h2 className="text-xl font-bold">Logs for Container: {selectedContainerId}</h2>
          <pre className="bg-gray-100 p-4 border rounded">{logs}</pre>
        </div>
      )}
    </div>
  );
};

export default DockerLogs;
