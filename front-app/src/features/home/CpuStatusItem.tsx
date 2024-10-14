import { useState, useEffect } from "react";
import { FiCpu } from "react-icons/fi";

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
        window.electronAPI.showMessageBox("CPU 사용량을 가져오는데 실패했습니다.")
        console.log(`Failed to get CPU usage: ${error}`);
      });
  };

  useEffect(() => {
    handleGetCpuUsage();
  }, []);

  return (
    <div className="card w-1/2 mr-1">
      <p className="font-sans font-bold text-lg">CPU 사용률</p>
      <p className="font-sans text-color-10 text-xs">배포 CPU 사용률</p>
      <div className="flex items-center mt-2">
        <FiCpu className="text-2xl text-color-15 mr-2" />
        <div className="w-full bg-color-2 rounded-full h-2.5">
          <div
            className={`bg-color-9 h-2.5 ${
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
