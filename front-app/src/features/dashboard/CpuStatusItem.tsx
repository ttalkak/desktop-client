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



const CpuStatusItem = () => {
  //dummydata
  const cpuUsage = 30;

  return (
    <div className="card">
    <p className="font-sans font-bold text-xl">Overall CPU Usage</p>
    <p className="font-sans text-color-10">System-wide CPU utilization</p>
    <div className="flex items-center">
      <LuCpu className="text-2xl text-color-6 mr-2"/>
      <CpuUsageBar usagePercentage={cpuUsage} />
    </div>
    </div>
  )
}

export default CpuStatusItem