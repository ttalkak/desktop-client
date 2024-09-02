import { useState, useEffect } from "react";
import { LuCpu } from "react-icons/lu";

const CpuUsageBar = ({ usagePercentage }: { usagePercentage: number }) => {
  return (
    <div className="w-full bg-gray-200 rounded-full h-3">
      <div
        className={`bg-blue-500 h-3 ${
          usagePercentage === 100 ? "rounded-full" : "rounded-l-full"
        }`}
        style={{ width: `${usagePercentage}%` }}
      ></div>
    </div>
  );
};

const CpuStatusItem = () => {
  const [cpuUsage, setCpuUsage] = useState(0);

  useEffect(() => {
    const handleAverageCpuUsage = (
      _event: Electron.IpcRendererEvent,
      data: { averageCpuUsage: number }
    ) => {
      setCpuUsage(data.averageCpuUsage);
    };

    window.electronAPI.onAverageCpuUsage(handleAverageCpuUsage);

    return () => {
      // Clean up the listener when the component unmounts
      window.electronAPI.removeAllListeners();
    };
  }, []);

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
