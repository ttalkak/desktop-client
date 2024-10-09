import React, { useEffect } from "react";
import ContainerList from "../features/dashboard/ContainerList";
import ImageList from "../features/dashboard/ImageList";
import { useAppStore } from "../stores/appStatusStore";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { useAuthStore } from "../stores/authStore";
import { useContainerStore } from "../stores/containerStore";

const DashBoard: React.FC = () => {
  const userSettings = useAuthStore((state) => state.userSettings);
  const serviceStatus = useAppStore((state) => state.serviceStatus);
  const dockerContainers = useContainerStore((state) => state.containers);
  const containerCount = dockerContainers.length;

  useEffect(() => {}, [
    serviceStatus,
    userSettings,
    containerCount,
    dockerContainers,
  ]);

  return (
    <div className="card h-full flex flex-col overflow-hidden">
      <Tabs defaultValue="account" className="flex flex-col h-full">
        <div className="flex justify-between w-full items-end pb-2 flex-shrink-0">
          <TabsList>
            <TabsTrigger value="account">Containers</TabsTrigger>
            <TabsTrigger value="password">Images</TabsTrigger>
          </TabsList>
          <div className="font-sans text-gray-600 text-sm pr-2.5">
            {`${containerCount} / ${userSettings?.maxCompute || 0}`}
          </div>
        </div>
        <div className="overflow-auto flex-grow custom-scrollbar">
          <TabsContent value="account" className="h-full">
            <ContainerList />
          </TabsContent>
          <TabsContent value="password" className="h-full">
            <ImageList />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default DashBoard;
