import DashList from "../features/dashboard/DashList";

const DashBoard = () => {
  

  const DockerStarter = async () => {
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

  return (
    
    <>
    <button onClick={DockerStarter}>도커데스크탑 실행하기</button>
    
    <DashList/>
    </>
  ) 
};

export default DashBoard;
