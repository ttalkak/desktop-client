import DashList from "../features/dashboard/DashList";

const DashBoard = () => {
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
    <button onClick={dockerStarter}>도커데스크탑 실행하기</button>
    <button onClick={dockerMonitor}>도커 실시간 모니터링 실행</button>
    <DashList/>
    </>
  ) 
};

export default DashBoard;
