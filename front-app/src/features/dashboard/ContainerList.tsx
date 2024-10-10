import React, { useState, useEffect, useCallback } from "react";
import { MdKeyboardArrowDown, MdKeyboardArrowUp } from "react-icons/md";
import {
  DeployContainerInfo,
  useContainerStore,
} from "../../stores/containerStore";
import { DeployStatus } from "../../types/deploy";
import Loading from "../../components/Loading";

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
  const dockerContainers = useContainerStore((state) =>
    state.containers.filter(
      (container) => container.status !== DeployStatus.DELETED
    )
  );
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
      window.electronAPI.removeAllLogListeners(); // 리스너 정리
    };
  }, [addLog]);

  const toggleContainerSelection = useCallback((containerId: string) => {
    setSelectedContainerIds((prevIds) => {
      const isSelected = prevIds.includes(containerId);
      if (isSelected) {
        window.electronAPI.stopLogStream(containerId); // 로그 스트림 중지
        return prevIds.filter((id) => id !== containerId);
      } else {
        window.electronAPI.startLogStream(containerId); // 로그 스트림 시작
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
            {port.external || "NA"} : {port.internal}
          </li>
        ))}
      </ul>
    );
  };

  const Logs = React.memo(({ logs }: { logs: ParsedLog[] }) => {
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
  });

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

  const StatusComponent = React.memo(
    ({ status }: { status?: DeployStatus }) => {
      const { color, text } = getStatusElement(status || DeployStatus.NA);
      return (
        <div className="flex justify-center items-center">
          <div
            className={`inline-block w-3 h-3 rounded-full mr-1 ${color}`}
          ></div>
          <div>{text}</div>
        </div>
      );
    }
  );

  const ContainerRow = ({ container }: { container: DeployContainerInfo }) => {
    const isSelected = selectedContainerIds.includes(
      container.containerId || ""
    );

    return (
      <>
        <React.Fragment key={container.id}>
          {container.status === DeployStatus.RUNNING ? (
            <tr className="hover:bg-gray-50">
              <td className="py-2 px-4 text-sm text-gray-900">
                {container.id || "N/A"}
              </td>
              <td
                className="py-2 px-4 text-sm text-gray-900"
                title={container.containerName}
              >
                {container.containerName}
              </td>
              <td className="py-2 px-4 text-sm text-gray-900">
                {formatCreatedTime(container.created)}
              </td>
              <td className="py-2 px-4 text-sm text-gray-900">
                {renderPorts(container.ports)}
              </td>
              <td className="py-2 text-sm text-gray-900">
                <StatusComponent status={container.status} />
              </td>
              <td className="py-2 px-4 text-sm text-gray-900">
                <button
                  onClick={() =>
                    container.containerId &&
                    toggleContainerSelection(container.containerId)
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
          ) : (
            <tr className="hover:bg-gray-50">
              <td className="py-2 px-4 text-sm text-gray-900">
                {container.id}
              </td>
              <td
                colSpan={5}
                className="py-2 px-4 text-xl text-gray-900 text-center align-middle"
              >
                <div className="flex justify-center items-center">
                  <Loading />
                </div>
              </td>
            </tr>
          )}

          {isSelected && container.containerId && (
            <tr>
              <td colSpan={6} className="p-4 bg-gray-100">
                <Logs logs={logData[container.containerId] || []} />
              </td>
            </tr>
          )}
        </React.Fragment>
      </>
    );
  };

  if (dockerContainers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center mt-8">
        <p className="text-center text-gray-700">
          현재 배포중인 서비스가 없습니다
        </p>
        <div className="mt-4 flex text-gray-400 text-sm ">
          <div className="text-gray-400 text-sm ">
            서비스 할당을 기다려주세요
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="rounded-lg">
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
