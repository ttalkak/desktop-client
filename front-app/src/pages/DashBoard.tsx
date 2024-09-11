import React, { useState, useEffect } from "react";
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

const StatusDisplay = () => {
  const dockerContainers = useDockerStore((state) => state.dockerContainers);
  const userSettings = useAuthStore((state) => state.userSettings);
  const [isUpdating, setIsUpdating] = useState(false);
  const containerCount = dockerContainers.length;
  const maxCompute = userSettings?.maxCompute || 0;
  const computeUsagePercentage =
    maxCompute > 0 ? (containerCount / maxCompute) * 100 : 0;

  useEffect(() => {
    console.log("Status updated:", {
      containerCount,
      maxCompute,
      computeUsagePercentage,
      isUpdating,
    });
  }, [containerCount, maxCompute, computeUsagePercentage, isUpdating]);

  if (isUpdating) {
    return <p className="font-sans text-gray-600 text-sm">업데이트 중...</p>;
  }

  return (
    <p className="font-sans text-gray-600 text-sm">
      {`${containerCount} / ${maxCompute} (${Math.round(
        computeUsagePercentage
      )}%)`}
    </p>
  );
};

const DashBoard: React.FC = () => {
  const serviceStatus = useAppStore((state) => state.serviceStatus);
  const { accessToken, userSettings, updateMaxCompute } = useAuthStore();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateMaxCompute = async (newValue: number) => {
    setIsUpdating(true);
    try {
      await updateMaxCompute(newValue);
      console.log("MaxCompute updated successfully");
    } catch (error) {
      console.error("Failed to update MaxCompute:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    console.log("DashBoard rendered:", {
      serviceStatus,
      accessToken,
      userSettings,
    });
  }, [serviceStatus, accessToken, userSettings]);

  return (
    <div className="card h-full items-center">
      <Tabs defaultValue="account">
        <div className="flex justify-between w-full items-end">
          <TabsList>
            <TabsTrigger value="account">Containers</TabsTrigger>
            <TabsTrigger value="password">Images</TabsTrigger>
          </TabsList>
          <StatusDisplay />
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
