import { useState, useEffect } from "react"
// import { FaCircle } from 'react-icons/fa';


const DockerStatusItem = () => {

  const [dockerStatus, setDockerStatus] = useState('unknown'); // 기본값: 'running'


  // Docker 상태에 따른 색상 매핑 (as const 사용)
  // const statusColor: Record<'running' | 'unknown', string> = {
  //   running: 'text-green-500',
  //   unknown: 'text-gray-500',
  // };




  // Docker 상태 체크 함수
  const dockerCheckHandler = async () => {
    try {
      const status = await window.electronAPI.checkDockerStatus();
      console.log('Docker Status:', status);
      setDockerStatus(status); // 상태 업데이트
    } catch (error) {
      console.error('Error while checking Docker status:', error);
      setDockerStatus('unknown');
    }
  };

  useEffect(() => {
    dockerCheckHandler(); // 컴포넌트 마운트 시 Docker 상태 체크
  }, []);

    //도커 시작 버튼
    const dockerStarter = async () => {
      try {
        const dockerPath = await window.electronAPI.getDockerExecutablePath();
        console.log(dockerPath)
        if (dockerPath) {
          await window.electronAPI.openDockerDesktop(dockerPath);
          console.log('Docker Desktop started successfully');
        } else {
          console.error('Failed to find Docker executable path');
        }
      } catch (error) {
        console.error('Error starting Docker Desktop:', error);
      }
    };
  
    //도커 실시간 모니터링 실행
    const dockerMonitor = async() =>{
      await window.electronAPI.getDockerEvent();
      console.log('감지 실행중')
  
    };


    return (
      <>
        <div className="card">
          <div className="flex items-center">
            <div>
              <p className="font-sans font-bold text-xl">Docker Status</p>
              <p className="font-sans text-gray-500">Current docker status</p>
            </div>
            <div className="flex items-center ml-2">
              {/* <FaCircle className={`${statusColor[dockerStatus]} text-xs mr-1`} /> */}
              <span className="font-sans">{dockerStatus}</span>
            </div>
          </div>
  
          <button
            onClick={dockerStarter}
            className="bg-blue-500 hover:bg-blue-600 font-semibold py-2 px-4 border border-gray-400 rounded shadow"
          >
            도커데스크탑 실행하기
          </button>
          <button
            onClick={dockerMonitor}
            className="bg-blue-500 hover:bg-blue-600 font-semibold py-2 px-4 border border-gray-400 rounded shadow"
          >
            도커 실시간 모니터링 실행
          </button>
        </div>
      </>
    );
  };
  
  export default DockerStatusItem;