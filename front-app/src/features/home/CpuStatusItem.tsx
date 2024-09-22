import { useState, useEffect } from "react";
import { LuCpu } from "react-icons/lu";

const CpuStatusItem = () => {
  const [cpuUsage, setCpuUsage] = useState<number>(0);

  // CPU 사용률을 가져오는 함수
  const handleGetCpuUsage = () => {
    window.electronAPI
      .getCpuUsage() // preload에서 expose한 API 호출
      .then((usage) => {
        setCpuUsage(usage); // CPU 사용률을 상태에 저장
      })
      .catch((error) => {
        alert(`Failed to get CPU usage: ${error}`);
      });
  };

  useEffect(() => {
    handleGetCpuUsage();
  }, []);

  return (
    <div className="card w-1/2 mr-1">
      <p className="font-sans font-bold text-xl">CPU 사용률</p>
      <p className="font-sans text-color-10 text-xs">배포 CPU 사용률</p>
      <div className="flex items-center mt-2">
        <LuCpu className="text-2xl text-color-6 mr-2" />
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`bg-blue-500 h-3 ${
              cpuUsage === 100 ? "rounded-full" : "rounded-l-full"
            }`}
            style={{ width: `${cpuUsage}%` }}
          ></div>
        </div>
        <span className="ml-2">{cpuUsage.toFixed(2)}%</span>
      </div>
    </div>
  );
};

export default CpuStatusItem;
