// import DashList from "../features/dashboard/DashList";
// import DashSummary from "../features/dashboard/DashSummary";
import DockerStatus from "../features/dashboard/DockerStatus";

const DashBoard = () => {

  // 리액트 컴포넌트에서 dockerapi 활용하여 로컬환경에서 실행중인 dockerimage,containerlist 가져오기




  return (
    <>
    <p>로컬 도커 상태 불러오기</p>
    <DockerStatus />
  

    </>
  ) 
};

export default DashBoard;
