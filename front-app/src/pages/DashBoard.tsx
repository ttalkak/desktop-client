import React, { useEffect } from "react";
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
  const serviceStatus = useAppStore((state) => state.serviceStatus);
  const { accessToken, userSettings } = useAuthStore();
  const dockerContainers = useDockerStore((state) => state.dockerContainers);
  const containerCount = dockerContainers.length;

  // userSettings가 null 또는 undefined일 경우 대비
  const maxCompute = userSettings?.maxCompute ?? 0;

  const computeUsagePercentage =
    maxCompute > 0 ? (containerCount / maxCompute) * 100 : 0;

  useEffect(() => {
    console.log("DashBoard rendered:", {
      serviceStatus,
      accessToken,
      userSettings,
      containerCount,
      maxCompute,
      computeUsagePercentage,
    });
  }, [
    serviceStatus,
    accessToken,
    userSettings,
    containerCount,
    maxCompute,
    computeUsagePercentage,
  ]);

  // 로그인 여부에 따라 내용 렌더링
  if (!accessToken) {
    return (
      <p className="font-sans text-gray-600 text-sm">로그인이 필요합니다.</p>
    );
  }

  return (
    <div className="card h-full items-center">
      <Tabs defaultValue="account">
        <div className="flex justify-between w-full items-end">
          <TabsList>
            <TabsTrigger value="account">Containers</TabsTrigger>
            <TabsTrigger value="password">Images</TabsTrigger>
          </TabsList>
          <p className="font-sans text-gray-600 text-sm">
            {`${containerCount} / ${maxCompute} (${Math.round(
              computeUsagePercentage
            )}%)`}
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
