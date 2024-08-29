import { useState, useEffect } from "react"

const DockerCheck = () => {
   

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
    <div className="container mx-auto p-6">

    
    <p>도커 작동여부 체크영역</p>
    <div>DockerCheck</div>
    <p>
    <button onClick={dockerStarter} className="bg-color-6  hover:bg-color-7 font-semibold py-2 px-4 border border-gray-400 rounded shadow">도커데스크탑 실행하기</button>
    </p>
    <p>
    <button onClick={dockerMonitor} className="bg-color-6  hover:bg-color-7 font-semibold py-2 px-4 border border-gray-400 rounded shadow">도커 실시간 모니터링 실행</button>
    </p>

    </div>
    </>
  )
}

export default DockerCheck