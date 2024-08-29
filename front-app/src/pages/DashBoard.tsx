import DashList from "../features/dashboard/DashList";
import CpuStatusItem from "../features/dashboard/CpuStatusItem";
import DockerStatusItem from "../features/dashboard/DockerStatusItem";
// import DockerLogs from "../features/dashboard/DockerLogs";
import { useState, useEffect } from "react";

//1.도커 실행여부 체크 => 안되어있으면 실행하기 버튼 보이기//실행해주세요//자동실행 => 로딩으로 처리
//2.도커 실행완료후 실시간 모니터링 처리 =>



const DashBoard = () => {
    return (
      
      <>

      <div className=" mx-auto p-6">
        <div className="flex w-full">
          <div className="flex-1 mr-2">
          <CpuStatusItem />

          </div>
          <div className="flex-1 ml-2">

          <DockerStatusItem/>
          </div>

        </div>
    <DashList/>
    </div>
    
    

    </>
  ) 
};

export default DashBoard;
