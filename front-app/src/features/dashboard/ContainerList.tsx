import React, { useState, useEffect, useMemo, useCallback } from "react";
import { MdKeyboardArrowDown, MdKeyboardArrowUp } from "react-icons/md";
import {
  DeployContainerInfo,
  useContainerStore,
} from "../../stores/containerStore";
import { DeployStatus } from "../../types/deploy";
const MAX_LOGS_PER_CONTAINER = 1000;
const LOG_CLEANUP_INTERVAL = 15 * 60 * 1000; // 15 minutes
const LOG_RETENTION_PERIOD = 24 * 60 * 60 * 1000; // 24 hours

interface ParsedLog {
  timestamp: string;
  message: string;
}

const ContainerList: React.FC = () => {
  const [selectedContainerIds, setSelectedContainerIds] = useState<string[]>(
    []
  );
  const dockerContainers = useContainerStore((state) => state.containers);
  const [logData, setLogData] = useState<Record<string, ParsedLog[]>>({});

  const addLog = useCallback((containerId: string, newLog: ParsedLog) => {
    setLogData((prevData) => {
      const containerLogs = prevData[containerId] || [];
      const updatedLogs = [...containerLogs, newLog];
      if (updatedLogs.length > MAX_LOGS_PER_CONTAINER) {
        updatedLogs.shift();
      }
      return { ...prevData, [containerId]: updatedLogs };
    });
  }, []);

  useEffect(() => {
    const { onLogStream, onLogError } = window.electronAPI;

    const handleLog = (data: { containerId: string; log: string }) => {
      const parsedLog = parseLog(data.log);
      addLog(data.containerId, parsedLog);
    };

    const handleError = (data: { containerId: string; error: string }) => {
      const errorLog = {
        message: `Error: ${data.error}`,
        timestamp: new Date().toISOString(),
      };
      addLog(data.containerId, errorLog);
    };

    onLogStream(handleLog);
    onLogError(handleError);

    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setLogData((prevData) => {
        const newData = { ...prevData };
        Object.keys(newData).forEach((containerId) => {
          newData[containerId] = newData[containerId].filter(
            (log) =>
              now - new Date(log.timestamp).getTime() < LOG_RETENTION_PERIOD
          );
        });
        return newData;
      });
    }, LOG_CLEANUP_INTERVAL);

    return () => {
      clearInterval(cleanupInterval);
    };
  }, [addLog]);

  const toggleContainerSelection = useCallback((containerId: string) => {
    setSelectedContainerIds((prevIds) => {
      if (prevIds.includes(containerId)) {
        return prevIds.filter((id) => id !== containerId);
      } else {
        return [...prevIds, containerId];
      }
    });
  }, []);

  const formatCreatedTime = (created: number | undefined) => {
    if (created === undefined) return "Unknown";
    const date = new Date(created * 1000);
    if (isNaN(date.getTime())) return "Unknown";
    const dateString = date.toLocaleDateString();
    const timeString = date.toLocaleTimeString();
    return (
      <>
        <div>{dateString}</div>
        <div>{timeString}</div>
      </>
    );
  };

  const parseLog = (log: string): ParsedLog => {
    const logPattern = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\s(.*)$/;
    const match = log.match(logPattern);
    if (match) {
      return {
        timestamp: match[1],
        message: match[2],
      };
    }
    return {
      timestamp: new Date().toISOString(),
      message: log,
    };
  };

  const renderPorts = (ports?: { internal: number; external: number }[]) => {
    if (!ports || ports.length === 0) return <span>No Ports</span>;
    return (
      <ul className="list-none p-0">
        {ports.map((port, index) => (
          <li key={index}>
            {port.internal} : {port.external || "NA"}
          </li>
        ))}
      </ul>
    );
  };

  const Logs = ({ logs }: { logs: ParsedLog[] }) => {
    return (
      <div
        className="custom-scrollbar"
        style={{ height: "200px", overflowY: "scroll" }}
      >
        {logs.map((log, index) => (
          <div
            key={index}
            className={`text-xs ${
              log.message.toLowerCase().includes("error")
                ? "text-color-8"
                : "text-color-5"
            }`}
          >
            <span className="text-gray-500 mr-2">{log.timestamp}</span>
            <span>{log.message}</span>
          </div>
        ))}
      </div>
    );
  };

  const getStatusElement = (status: DeployStatus) => {
    switch (status) {
      case DeployStatus.RUNNING:
        return { color: "bg-green-400", text: "RUNNING" };
      case DeployStatus.STOPPED:
        return { color: "bg-red-400", text: "STOPPED" };
      case DeployStatus.NA:
        return { color: "bg-yellow-400", text: "N/A" };
      case DeployStatus.WAITING:
        return { color: "bg-yellow-400 animate-pulse", text: "ERROR" };
      case DeployStatus.ERROR:
        return { color: "bg-red-400 animate-pulse", text: "ERROR" };
      default:
        return { color: "bg-gray-400", text: "UNKNOWN" };
    }
  };

  const ContainerRow = useMemo(
    () =>
      ({ container }: { container: DeployContainerInfo }) => {
        const { id, containerId, status, containerName, ports, created } =
          container;
        const isSelected = selectedContainerIds.includes(containerId || "");

        const StatusComponent = ({ status }: { status?: DeployStatus }) => {
          const { color, text } = getStatusElement(status || DeployStatus.NA);
          return (
            <td className="py-2 text-sm text-gray-900">
              <div className="flex justify-center items-center">
                <div
                  className={`inline-block w-3 h-3 rounded-full mr-1 ${color}`}
                ></div>
                <div>{text}</div>
              </div>
            </td>
          );
        };

        return (
          <>
            <tr className="hover:bg-gray-50">
              <td className="py-2 px-4 text-sm text-gray-900">{id || "N/A"}</td>
              <td
                className="py-2 px-4 text-sm text-gray-900"
                title={containerName}
              >
                {containerName}
              </td>
              <td className="py-2 px-4 text-sm text-gray-900">
                {formatCreatedTime(created)}
              </td>
              <td className="py-2 px-4 text-sm text-gray-900">
                {renderPorts(ports)}
              </td>
              {StatusComponent({ status: status })}
              <td className="py-2 px-4 text-sm text-gray-900">
                <button
                  onClick={() =>
                    containerId && toggleContainerSelection(containerId)
                  }
                  className="flex items-center justify-center p-2 hover:bg-gray-200 rounded"
                >
                  {isSelected ? (
                    <MdKeyboardArrowUp className="text-gray-600" />
                  ) : (
                    <MdKeyboardArrowDown className="text-gray-600" />
                  )}
                </button>
              </td>
            </tr>
            {isSelected && containerId && (
              <tr>
                <td colSpan={6} className="p-4 bg-gray-100">
                  <Logs logs={logData[containerId] || []} />
                </td>
              </tr>
            )}
          </>
        );
      },
    [selectedContainerIds, logData, toggleContainerSelection]
  );

  // if (dockerContainers.length === 0) {
  //   return (
  //     <div className="flex flex-col items-center justify-center mt-8">
  //       <p className="text-center text-gray-700">
  //         현재 배포중인 서비스가 없습니다
  //       </p>
  //       <div className="mt-4 flex text-gray-400 text-sm ">
  //         <div className="text-gray-400 text-sm ">
  //           서비스 할당을 기다려주세요
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      <div className="overflow-hidden rounded-lg custom-scrollbar">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="sticky z-10 top-0 text-sm bg-white-gradient border-b">
            <tr>
              <th className="p-1">ServiceId</th>
              <th className="p-1">Name</th>
              <th className="p-1">Created</th>
              <th className="p-1">Ports</th>
              <th className="p-1">State</th>
              <th className="p-1">Logs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {dockerContainers.map((container) => (
              <ContainerRow key={container.id} container={container} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default React.memo(ContainerList);
