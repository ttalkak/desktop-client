import React, { useEffect } from "react";
import ContainerList from "../features/dashboard/ContainerList";
import ImageList from "../features/dashboard/ImageList";
import { useAppStore } from "../stores/appStatusStore";
import { useDockerStore } from "../stores/dockerStore";
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
          <div className="font-sans text-gray-600 text-sm pr-2.5">
            {`${containerCount} / ${userSettings?.maxCompute || 0}`}
          </div>
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
