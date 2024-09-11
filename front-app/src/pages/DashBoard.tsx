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

  // maxCompute 초기값을 sessionStorage에서 가져옴
  const [maxCompute, setMaxCompute] = useState<number>(() => {
    const storedSettings = sessionStorage.getItem("userSettings");
    if (storedSettings) {
      const parsedSettings = JSON.parse(storedSettings);
      return parsedSettings.maxCompute || 0;
    }
    return 0;
  });

  // userSettings가 업데이트될 때 maxCompute 값도 업데이트
  useEffect(() => {
    if (userSettings && "maxCompute" in userSettings) {
      setMaxCompute(userSettings.maxCompute as number);
    }
  }, [userSettings]);

  // sessionStorage의 maxCompute 값 변경 감지
  useEffect(() => {
    const handleStorageChange = () => {
      const updatedSettings = sessionStorage.getItem("userSettings");
      if (updatedSettings) {
        const parsedSettings = JSON.parse(updatedSettings);
        if (parsedSettings.maxCompute !== maxCompute) {
          console.log(
            "Updating maxCompute from sessionStorage:",
            parsedSettings.maxCompute
          );
          setMaxCompute(parsedSettings.maxCompute);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [maxCompute]);

  // computeUsagePercentage 계산
  useEffect(() => {
    const calculateUsage = async () => {
      if (maxCompute > 0 && dockerContainers.length > 0) {
        const usagePercentage = (dockerContainers.length / maxCompute) * 100;
        console.log("Updating computeUsagePercentage:", usagePercentage);
        setComputeUsagePercentage(usagePercentage);
      } else {
        setComputeUsagePercentage(0);
      }
    };

    calculateUsage();
  }, [maxCompute, dockerContainers]);

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
    console.log(
      "Rendering status message:",
      dockerContainers.length,
      maxCompute,
      computeUsagePercentage
    );
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
