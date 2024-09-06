const DockerBuildStatusItem = () => {
  const userSettings = sessionStorage.getItem("userSettings");
  const dockerContainers = JSON.parse(
    sessionStorage.getItem("dockerContainers") || "[]"
  );

  // 기본값 설정
  let maxCompute = 5; // 기본값 5
  let containerCount = dockerContainers.length; // 실행 중인 Docker 컨테이너 수

  if (userSettings) {
    const parsedSettings = JSON.parse(userSettings);
    maxCompute = parsedSettings.maxCompute || 5; // maxCompute가 없으면 기본값 5 사용
  }

  const computeUsagePercentage = (containerCount / maxCompute) * 100;

  return (
    <div className="card">
      <p className="font-sans font-bold text-xl">배포 진행 사항</p>
      <div className="flex justify-between">
        <p className="font-sans text-color-10">현재 배포 상태</p>
        {/* 분수 형태 */}
        <p className="font-sans text-gray-600 -end">
          {containerCount} / {maxCompute} ({Math.round(computeUsagePercentage)}
          %)
        </p>
      </div>
      {/* 바 형태 */}
      <div className="w-full bg-gray-300 h-3 rounded-full mt-2">
        <div
          className={`bg-blue-500 h-full ${
            computeUsagePercentage >= 100 ? "rounded-full" : "rounded-l-full"
          }`}
          style={{ width: `${computeUsagePercentage}%` }}
        ></div>
      </div>
    </div>
  );
};

export default DockerBuildStatusItem;
