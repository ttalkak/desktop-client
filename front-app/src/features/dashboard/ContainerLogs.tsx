import { useEffect, useState } from "react";

interface ContainerLogsProps {
  container: DockerContainer;
}

const ContainerLogs: React.FC<ContainerLogsProps> = ({ container }) => {
  const [logs, setLogs] = useState<string>("");

  useEffect(() => {
    setLogs(""); // 로그 초기화

    // 로그 스트림 시작
    window.electronAPI.startLogStream(container.Id);

    // 핸들러 함수들 정의
    const handleLog = (log: string) => {
      setLogs((prevLogs) => prevLogs + log);
    };

    const handleError = (error: string) => {
      console.error("Error fetching logs:", error);
    };

    const handleEnd = () => {
      console.log("Log stream ended");
    };

    // 핸들러 등록
    window.electronAPI.onLogStream(handleLog);
    window.electronAPI.onLogError(handleError);
    window.electronAPI.onLogEnd(handleEnd);

    // 컴포넌트 언마운트 시 로그 스트림 중지
    return () => {
      window.electronAPI.stopLogStream(container.Id);
    };
  }, [container.Id]);

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-4">
        Logs for Container: {container.Id}
      </h2>
      <pre className="bg-gray-100 p-2 border rounded h-60 overflow-y-auto whitespace-pre-wrap break-words">
        {logs}
      </pre>
    </div>
  );
};

export default ContainerLogs;
