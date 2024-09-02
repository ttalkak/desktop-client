import { useEffect, useState } from "react";

interface ContainerLogsProps {
  container: DockerContainer;
}

const ContainerLogs: React.FC<ContainerLogsProps> = ({ container }) => {
  const [logs, setLogs] = useState<string>('');
  const [cpuUsage, setCpuUsage] = useState<number>(0);

  useEffect(() => {
    setLogs(''); // 로그 초기화
    setCpuUsage(0); // CPU 사용률 초기화

    window.electronAPI.startLogStream(container.Id);

    const handleLog = (log: string) => {
      setLogs((prevLogs) => prevLogs + log);
    };

    const handleCpuUsage = (usage: number) => {
      setCpuUsage(usage);
    };

    const handleError = (error: string) => {
      console.error('Error fetching logs:', error);
    };

    const handleEnd = () => {
      console.log('Log stream ended');
    };

    window.electronAPI.onLogStream(handleLog);
    window.electronAPI.onCpuUsageData(handleCpuUsage); 
    window.electronAPI.onLogError(handleError);
    window.electronAPI.onLogEnd(handleEnd);

    return () => {
      window.electronAPI.stopLogStream(container.Id);
    };
  }, [container.Id]);

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-4">Logs for Container: {container.Id}</h2>
      <p><strong>CPU Usage:</strong> {cpuUsage.toFixed(2)}%</p>
      <pre className="bg-gray-100 p-2 border rounded h-60 overflow-y-auto whitespace-pre-wrap break-words">
        {logs}
      </pre>
    </div>
  );
};

export default ContainerLogs;
