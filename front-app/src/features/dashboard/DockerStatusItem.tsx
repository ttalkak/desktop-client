import { useState, useEffect } from "react";
import { FaCircle } from 'react-icons/fa';

const DockerStatusItem = () => {
  const [dockerStatus, setDockerStatus] = useState("unknown"); // 기본값: 'running'

  // Docker 상태에 따른 색상 매핑 (as cons=readonly 적용)
  const statusColor: Record<'running' | 'not running' | 'unknown' , string> = {
    'running': 'text-green-500',
    'not running': 'text-red-500', // 예시로 'text-red-500' 추가
    'unknown': 'text-gray-500',
  } as const;

  // Docker 상태 체크 함수
  const dockerCheckHandler = async ()=> {
    try {
      const status = await window.electronAPI.checkDockerStatus();
      console.log("Docker Status:", status);
      setDockerStatus(status); // 상태 업데이트
      return status;
    } catch (error) {
      console.error("Error while checking Docker status:", error);
      setDockerStatus("unknown");
    }
  };

  //도커 시작 
  // const dockerStarter = async () => {
  //   try {
  //     const dockerPath = await window.electronAPI.getDockerExecutablePath();
  //     console.log(dockerPath);
  //     if (dockerPath) {
  //       await window.electronAPI.openDockerDesktop(dockerPath);
  //       console.log("Docker Desktop started successfully");
  //     } else {
  //       console.error("Failed to find Docker executable path");
  //     }
  //   } catch (error) {
  //     console.error("Error starting Docker Desktop:", error);
  //   }
  // };
  

  useEffect(() => {
    // const checkAndStartDocker = async () => {
    //   const status= await dockerCheckHandler(); // Docker 상태 확인
    //   if (status !== "running") { // Docker가 실행 중이지 않으면
    //     await dockerStarter(); // Docker 시작
    //   } else {
    //     console.log("Docker is already running, no need to start it.");
    //   }
    // };

    // checkAndStartDocker(); // 컴포넌트 마운트 시 상태 확인 및 시작 시도
    // dockerMonitor();

    dockerCheckHandler();

    // Docker 이벤트 구독 및 상태 확인
    window.electronAPI.sendDockerEventRequest();

    window.electronAPI.onDockerEventResponse((data) => {
      console.log("Docker event detected:", data);
      dockerCheckHandler();  // 이벤트 발생 시 Docker 상태 확인
    });

    return () => {
      window.electronAPI.removeAllListeners(); // 컴포넌트 언마운트 시 리스너 제거
    };




























  }, []);





  return (
    <>
      <div className="card">
        <div className="flex items-center">
          <div>
            <p className="font-sans font-bold text-xl">Docker Status</p>
            <p className="font-sans text-gray-500">Current docker status</p>
          </div>
          <div className="flex items-center ml-2">
          <FaCircle className={`text-xs mr-1 ${statusColor[dockerStatus as 'running' | 'not running' | 'unknown']}`} />
          <span>{dockerStatus === 'running' ? 'Docker is running' : 'Docker is not running'}</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default DockerStatusItem;
