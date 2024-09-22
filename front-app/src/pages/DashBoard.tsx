import React, { useEffect } from "react";
import ContainerList from "../features/dashboard/ContainerList";
import ImageList from "../features/dashboard/ImageList";
import { useAppStore, useDockerStore } from "../stores/appStatusStore";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { useAuthStore } from "../stores/authStore";

const DashBoard: React.FC = () => {
  const userSettings = useAuthStore((state) => state.userSettings);
  const serviceStatus = useAppStore((state) => state.serviceStatus);
  const dockerContainers = useDockerStore((state) => state.dockerContainers);
  const containerCount = dockerContainers.length;

  // userSettings가 null 또는 undefined일 경우 대비
  const maxCompute = userSettings?.maxCompute ?? 0;

  const computeUsagePercentage =
    maxCompute > 0 ? (containerCount / maxCompute) * 100 : 0;
  useEffect(() => {}, [
    serviceStatus,
    userSettings,
    containerCount,
    maxCompute,
    computeUsagePercentage,
  ]);

  return (
    <div className="card h-full items-center">
      <Tabs defaultValue="account">
        <div className="flex justify-between w-full items-end">
          <TabsList>
            <TabsTrigger value="account">Containers</TabsTrigger>
            <TabsTrigger value="password">Images</TabsTrigger>
          </TabsList>
          <p className="font-sans text-gray-600 text-sm">
            {`${containerCount} / ${userSettings?.maxCompute} (${Math.round(
              computeUsagePercentage
            )}%)`}
          </p>
        </div>
        <div className="justify-center h-full">
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
