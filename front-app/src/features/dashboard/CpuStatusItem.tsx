import { useState, useEffect } from 'react';
import { LuCpu } from "react-icons/lu";

const CpuUsageBar = ({ usagePercentage }: { usagePercentage: number }) => {
  return (
    <div className="w-full bg-gray-200 rounded-full h-3">
      <div
        className={`bg-blue-500 h-3 ${
          usagePercentage === 100 ? 'rounded-full' : 'rounded-l-full'
        }`}
        style={{ width: `${usagePercentage}%` }}
      ></div>
    </div>
  );
};

const CpuStatusItem = ({ containerId }: { containerId: string }) => {
  const [cpuUsage, setCpuUsage] = useState(0);

  useEffect(() => {
    // CPU 사용률 스트림 시작
    window.electronAPI.startContainerStatsStream(containerId);

    // CPU 사용률 데이터 수신
    const handleCpuUsageData = (cpuUsage: number) => {
      setCpuUsage(cpuUsage);
    };

    // 에러 핸들링
    const handleCpuUsageError = (error: string) => {
      console.error("Error receiving CPU usage data:", error);
    };

    // 스트림 종료 핸들링
    const handleCpuUsageEnd = () => {
      console.log("CPU usage stream ended.");
    };

    // 이벤트 리스너 등록
    window.electronAPI.onCpuUsageData(handleCpuUsageData);
    window.electronAPI.onCpuUsageError(handleCpuUsageError);
    window.electronAPI.onCpuUsageEnd(handleCpuUsageEnd);

    // 클린업 함수에서 리스너 제거
    return () => {
      window.electronAPI.onCpuUsageData(() => {});  // 리스너 제거
      window.electronAPI.onCpuUsageError(() => {}); // 리스너 제거
      window.electronAPI.onCpuUsageEnd(() => {});   // 리스너 제거
    };
  }, [containerId]);

  return (
    <div className="card">
      <p className="font-sans font-bold text-xl">Container CPU Usage</p>
      <p className="font-sans text-color-10">System-wide CPU utilization</p>
      <div className="flex items-center">
        <LuCpu className="text-2xl text-color-6 mr-2" />
        <CpuUsageBar usagePercentage={cpuUsage} />
        <span className="ml-2">{cpuUsage.toFixed(2)}%</span>
      </div>
    </div>
  );
};

export default CpuStatusItem;
