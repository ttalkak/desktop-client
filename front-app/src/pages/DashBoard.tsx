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
  const userSettings = useAuthStore.getState().userSettings;
  const serviceStatus = useAppStore((state) => state.serviceStatus);
  const dockerContainers = useDockerStore((state) => state.dockerContainers);
  const containerCount = dockerContainers.length;

  useEffect(() => {}, [
    serviceStatus,
    userSettings,
    containerCount,
    dockerContainers,
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
            {`${containerCount} / ${userSettings?.maxCompute || 0} (${
              userSettings?.maxCompute
                ? Math.round((containerCount / userSettings.maxCompute) * 100)
                : 0
            }%)`}
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
