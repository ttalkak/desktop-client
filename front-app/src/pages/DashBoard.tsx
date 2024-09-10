import React, { useEffect, useState } from "react";
import ContainerList from "../features/dashboard/ContainerList";
import ImageList from "../features/dashboard/ImageList";
import { useAuthStore } from "../stores/authStore";
import { useAppStore, useDockerStore } from "../stores/appStatusStore";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";

const DashBoard: React.FC = () => {
  const dockerContainers = useDockerStore((state) => state.dockerContainers);
  const serviceStatus = useAppStore((state) => state.serviceStatus);
  const { accessToken, userSettings } = useAuthStore();
  const [computeUsagePercentage, setComputeUsagePercentage] =
    useState<number>(0);

  useEffect(() => {
    if (userSettings && "maxCompute" in userSettings) {
      const { maxCompute } = userSettings as { maxCompute: number };
      if (maxCompute > 0 && dockerContainers.length > 0) {
        const usagePercentage = (dockerContainers.length / maxCompute) * 100;
        setComputeUsagePercentage(usagePercentage);
      } else {
        setComputeUsagePercentage(0);
      }
    }
  }, [userSettings, dockerContainers]);

  const getStatusMessage = () => {
    if (!accessToken) {
      return "로그인 후 이용 가능합니다";
    }
    if (!userSettings) {
      return "사용자 설정을 불러오는 중...";
    }
    if (serviceStatus === "stopped") {
      return "프로그램을 실행 후 이용 가능합니다";
    }
    const { maxCompute } = userSettings as { maxCompute: number };
    return `${dockerContainers.length} / ${maxCompute} (${Math.round(
      computeUsagePercentage
    )}%)`;
  };

  return (
    <div className="card h-full items-center">
      <Tabs defaultValue="account">
        <div className="flex justify-between w-full items-end">
          <TabsList>
            <TabsTrigger value="account">Containers</TabsTrigger>
            <TabsTrigger value="password">Images</TabsTrigger>
          </TabsList>
          <p className="font-sans text-gray-600 text-sm">
            {getStatusMessage()}
          </p>
        </div>
        <div className="flex justify-center h-full">
          <TabsContent value="account">
            <ContainerList />
          </TabsContent>
          <TabsContent value="password">
            <ImageList />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default DashBoard;
