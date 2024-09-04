import React from "react";
import DashList from "../features/dashboard/DashList";
import StatusItem from "../features/dashboard/StatusItem";
import CpuStatusItem from "../features/dashboard/CpuStatusItem";

const DashBoard: React.FC = () => {
  return (
    <>
      <div className="mx-auto p-6">
        <div className="flex w-full">
          <div className="flex-1 mr-2">
            <CpuStatusItem />
          </div>
          <div className="flex-1 ml-2">
            <StatusItem />
          </div>
        </div>
        <DashList />
      </div>
    </>
  );
};

export default DashBoard;
