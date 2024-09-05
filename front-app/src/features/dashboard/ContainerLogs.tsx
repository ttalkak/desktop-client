import React, { useEffect, useState } from "react";

interface ContainerLogsProps {
  containerId: string;
}

const ContainerLogs: React.FC<ContainerLogsProps> = ({ containerId }) => {
  const [logs, setLogs] = useState<string>("");

  useEffect(() => {
    const {
      startLogStream,
      onLogStream,
      onLogError,
      onLogEnd,
      stopLogStream,
      clearLogListeners,
    } = window.electronAPI;

    // 로그 스트리밍 시작
    startLogStream(containerId);

    // 로그 스트림 수신 처리
    const handleLog = (log: string) => {
      setLogs((prevLogs) => prevLogs + log);
    };

    const handleError = (error: string) => {
      console.error("Error fetching logs:", error);
    };

    const handleEnd = () => {
      console.log("Log stream ended");
    };

    // IPC 이벤트 리스너 설정
    onLogStream(handleLog);
    onLogError(handleError);
    onLogEnd(handleEnd);

    // 컴포넌트 언마운트 시 로그 스트리밍 중지
    return () => {
      stopLogStream(containerId);
      clearLogListeners();
    };
  }, [containerId]);

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-4">
        Logs for Container: {containerId}
      </h2>
      <pre className="bg-gray-100 p-2 border rounded h-60 overflow-y-auto whitespace-pre-wrap break-words">
        {logs}
      </pre>
    </div>
  );
};

export default ContainerLogs;
