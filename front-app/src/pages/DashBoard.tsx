import DashList from "../features/dashboard/DashList";
import DockerCheck from "../features/dashboard/DockerCheck";
import { useState, useEffect } from "react";

//1.도커 실행여부 체크 => 안되어있으면 실행하기 버튼 보이기//실행해주세요//자동실행 => 로딩으로 처리
//2.도커 실행완료후 실시간 모니터링 처리 =>



const DashBoard = () => {
  const [ dockerState , setDockerState] = useState<boolean>(false)

  const dockerCheckHandler = async () => {
      try {
        const status = await window.electronAPI.checkDockerStatus();
        console.log('Docker Status:', status);
        setDockerState(true)
      } catch (error) {
        console.error('Error while checking Docker status:', error);
        setDockerState(false)
      }
    };

    useEffect(() => {
      const checkDockerStatus = async () => {
        await dockerCheckHandler();
      };
  
      checkDockerStatus(); // 비동기 함수 호출
    }, []);




    return (
    
    <>
    <div className="container mx-auto p-6">
    <p>Dashboard</p>
      
    </div>
    <p>{dockerState}</p>

    <DashList/>
    
    
    <DockerCheck/>
    </>
  ) 
};

export default DashBoard;
