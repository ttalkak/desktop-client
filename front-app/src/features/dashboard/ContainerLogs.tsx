import React, { useEffect, useState } from "react";

interface ContainerLogsProps {
  containerId: string;
}

interface ParsedLog {
  timestamp?: string;
  message: string;
}

const parseLog = (log: string): ParsedLog => {
  const logPattern = /^(\d+-\d+-\d+T\d+:\d+:\d+\.\d+Z)?\s*(.*)$/;
  const match = log.match(logPattern);
  if (match) {
    return {
      timestamp: match[1] || "",
      message: match[2] || log,
    };
  }
  return { message: log };
};

const shortenContainerId = (id: string, length: number = 8): string => {
  if (id.length <= length) return id;
  return `${id.slice(0, length)}...`;
};

const ContainerLogs: React.FC<ContainerLogsProps> = ({ containerId }) => {
  const [logs, setLogs] = useState<ParsedLog[]>([]);

  useEffect(() => {
    const { onLogStream, onLogError } = window.electronAPI;

    console.log("Setting up log listeners for container:", containerId); // 리스너 설정 확인

    // 로그 스트림 수신 처리
    const handleLog = (data: { containerId: string; log: string }) => {
      console.log("Received log data:", data); // 로그 데이터 수신 확인
      if (data.containerId === containerId) {
        const parsedLog = parseLog(data.log);
        setLogs((prevLogs) => [...prevLogs, parsedLog]);
      }
    };

    const handleError = (data: { containerId: string; error: string }) => {
      console.log("Received error data:", data); // 에러 데이터 수신 확인
      if (data.containerId === containerId) {
        console.error("Error fetching logs:", data.error);
        setLogs((prevLogs) => [
          ...prevLogs,
          { message: `Error: ${data.error}` },
        ]);
      }
    };

    // IPC 이벤트 리스너 설정
    onLogStream(handleLog);
    onLogError(handleError);
  }, [containerId]);

  return (
    <div className="mt-1 w-full">
      <h2 className="text-sm font-semibold">
        Logs for Container: {shortenContainerId(containerId)}
      </h2>
      <div
        className="text-xs bg-gray-100 p-2 border rounded h-60 overflow-hidden whitespace-pre-wrap break-words mt-3 cumstom-scrollbar"
        style={{
          maxWidth: "100%",
          wordBreak: "break-all",
          whiteSpace: "pre-wrap",
        }}
      >
        {logs.map((log, index) => (
          <div
            key={index}
            className={`mb-2 ${
              log.message.toLowerCase().includes("error")
                ? "text-red-600"
                : log.message.toLowerCase().includes("warn")
                ? "text-yellow-600"
                : "text-black"
            }`}
          >
            {log.timestamp && (
              <span className="text-gray-500 mr-2">{log.timestamp}</span>
            )}
            <span>{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ContainerLogs;
