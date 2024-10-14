import React, { useState, useEffect, useRef } from "react";
import { axiosInstance } from "../../axios/constants";
import { useAppStore } from "./../../stores/appStatusStore";
import { useAuthStore } from "../../stores/authStore";
import { TbPercentage } from "react-icons/tb";
import { RiFileInfoLine } from "react-icons/ri";

interface SettingModalProps {
  isOpen: boolean;
  onClose: (source: string) => void;
}

const SettingModal: React.FC<SettingModalProps> = ({ isOpen, onClose }) => {
  const serviceStatus = useAppStore((state) => state.serviceStatus);
  const modalRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [errorMessages, setErrorMessages] = useState({
    projectWarning: "",
    rangeWarning: "",
    cpuWarning: "",
    memoryWarning: "",
  });

  const userSettings = useAuthStore((state) => state.userSettings);
  const setUserSettings = useAuthStore((state) => state.setUserSettings);

  const [maxCPU, setMaxCPU] = useState<string>("0");
  const [maxMemory, setMaxMemory] = useState<string>("0");
  const [maxCompute, setMaxCompute] = useState<string>("0");
  const [portRange, setPortRange] = useState({ min: "0", max: "0" });

  const [hoverInfo, setHoverInfo] = useState<string>("");

  useEffect(() => {
    if (userSettings) {
      setMaxCPU(String(userSettings.maxCPU));
      setMaxMemory(String(userSettings.maxMemory));
      setMaxCompute(String(userSettings.maxCompute));
      setPortRange({
        min: String(userSettings.availablePortStart),
        max: String(userSettings.availablePortEnd),
      });
    }
  }, [userSettings, isOpen]);

  const updateErrorMessages = (
    field: keyof typeof errorMessages,
    message: string
  ) => {
    setErrorMessages((prev) => ({ ...prev, [field]: message }));
  };

  const handleMaxProjectsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!isNaN(Number(value))) {
      setMaxCompute(value);

      const numericValue = Number(value);
      if (numericValue < 1 || numericValue > 10) {
        updateErrorMessages(
          "projectWarning",
          "최대 10까지 지정할 수 있습니다."
        );
      } else {
        updateErrorMessages("projectWarning", "");
      }
    }
  };

  const handlePortRangeChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "min" | "max"
  ) => {
    const value = e.target.value;
    if (!isNaN(Number(value))) {
      const newPortRange = { ...portRange, [field]: value };
      setPortRange(newPortRange);

      if (Number(newPortRange.min) > Number(newPortRange.max)) {
        updateErrorMessages(
          "rangeWarning",
          "시작값은 종료값보다 클 수 없습니다."
        );
      } else {
        updateErrorMessages("rangeWarning", "");
      }
    }
  };

  const handleMaxCPUChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!isNaN(Number(value))) {
      setMaxCPU(value);

      const numericValue = Number(value);
      if (numericValue < 1 || numericValue > 100) {
        updateErrorMessages("cpuWarning", "최대 100까지 지정할 수 있습니다.");
      } else {
        updateErrorMessages("cpuWarning", "");
      }
    }
  };

  const handleMaxMemoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!isNaN(Number(value))) {
      setMaxMemory(value);

      const numericValue = Number(value);
      if (numericValue < 1 || numericValue > 100) {
        updateErrorMessages(
          "memoryWarning",
          "최대 100까지 지정할 수 있습니다."
        );
      } else {
        updateErrorMessages("memoryWarning", "");
      }
    }
  };

  const handleSave = async () => {
    const { projectWarning, rangeWarning, cpuWarning, memoryWarning } =
      errorMessages;
    if (projectWarning || rangeWarning || cpuWarning || memoryWarning) return;

    // 기존 값과 변경된 값 비교
    const isMaxCPUChanged = Number(maxCPU) !== userSettings?.maxCPU;
    const isMaxMemoryChanged = Number(maxMemory) !== userSettings?.maxMemory;
    const isMaxProjectsChanged =
      Number(maxCompute) !== userSettings?.maxCompute;
    const isPortRangeChanged =
      Number(portRange.min) !== userSettings?.availablePortStart ||
      Number(portRange.max) !== userSettings?.availablePortEnd;

    if (
      !isMaxCPUChanged &&
      !isMaxMemoryChanged &&
      !isMaxProjectsChanged &&
      !isPortRangeChanged
    ) {
      console.log("변경사항이 없습니다.");
      setIsEditing(false);
      return;
    }

    if (!userSettings || !userSettings.userId) {
      console.error("userSettings가 유효하지 않습니다.");
      return;
    }

    try {
      const response = await axiosInstance.post("/compute/status", {
        maxCPU: Number(maxCPU),
        maxMemory: Number(maxMemory),
        maxCompute: Number(maxCompute),
        availablePortStart: Number(portRange.min),
        availablePortEnd: Number(portRange.max),
      });

      if (response.data.status === 200) {
        window.electronAPI.showMessageBox("설정이 저장되었습니다.")
        // alert("설정이 저장되었습니다.");

        const updatedSettings = {
          ...userSettings,
          maxCPU: Number(maxCPU),
          maxMemory: Number(maxMemory),
          maxCompute: Number(maxCompute),
          availablePortStart: Number(portRange.min),
          availablePortEnd: Number(portRange.max),
        };

        setUserSettings(updatedSettings);
        setIsEditing(false);
        onClose("modal");
      }
    } catch (error) {
      console.error("설정을 저장하는 중 오류가 발생했습니다.", error);
      window.electronAPI.showMessageBox("설정을 저장하는 중 오류가 발생했습니다.")
      // alert("설정을 저장하는 중 오류가 발생했습니다.");
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        setIsEditing(false);
        setErrorMessages({
          projectWarning: "",
          rangeWarning: "",
          cpuWarning: "",
          memoryWarning: "",
        });
        onClose("modal");
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose, isOpen]);

  if (!isOpen) return null;

  const tooltip =
    "absolute bottom-full mb-1 bg-white border text-xs rounded py-1 px-2 shadow-lg filter-none opacity-100 text-black z-50";

  return (
    <div
      ref={modalRef}
      className="absolute top-full right-0 bg-white w-72 p-4 rounded shadow-lg z-50 mt-1 border border-color-2"
    >
      <form>
        <div className="flex flex-col mb-2">
          <label className="text-sm mb-2 flex items-center">
            컨테이너 수
            <div className="relative">
              <RiFileInfoLine
                size={16}
                color="#b5bfc4"
                className="ml-1 cursor-pointer"
                onMouseEnter={() => {
                  setHoverInfo("project");
                }}
                onMouseLeave={() => {
                  setHoverInfo("");
                }}
              />
              {hoverInfo === "project" && (
                <div className={`${tooltip} w-48`}>
                  최대로 할당받을 수 있는 프로젝트 수 입니다.
                </div>
              )}
            </div>
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={maxCompute}
              onChange={handleMaxProjectsChange}
              disabled={!isEditing}
              className={`border p-1 rounded w-16 text-center w-full ${
                !isEditing ? "text-gray-400" : ""
              }`}
            />
          </div>
          {errorMessages.projectWarning && (
            <p className="text-red-500 text-sm pt-1 pb-1.5">
              {errorMessages.projectWarning}
            </p>
          )}
        </div>

        <div className="flex flex-col mb-2 relative">
          <label className="text-sm mb-2 flex items-center">
            CPU 사용량
            <div className="relative">
              <RiFileInfoLine
                size={16}
                color="#b5bfc4"
                className="ml-1 cursor-pointer"
                onMouseEnter={() => {
                  setHoverInfo("cpu");
                }}
                onMouseLeave={() => {
                  setHoverInfo("");
                }}
              />
              {hoverInfo === "cpu" && (
                <div className={`${tooltip} w-48`}>
                  최대로 허용할 CPU 사용량 입니다.
                </div>
              )}
            </div>
          </label>
          <input
            type="text"
            value={maxCPU}
            onChange={handleMaxCPUChange}
            disabled={!isEditing}
            className={`border p-1 rounded w-16 text-center w-full ${
              !isEditing ? "text-gray-400" : ""
            }`}
          />
          <div className="text-color-10 absolute top-9 right-3.5">
            <TbPercentage />
          </div>
          {errorMessages.cpuWarning && (
            <p className="text-red-500 text-sm pt-1 pb-1.5">
              {errorMessages.cpuWarning}
            </p>
          )}
        </div>

        <div className="flex flex-col mb-2 relative">
          <label className="text-sm mb-2 flex items-center">
            메모리 사용량
            <div className="relative">
              <RiFileInfoLine
                size={16}
                color="#b5bfc4"
                className="ml-1 cursor-pointer"
                onMouseEnter={() => {
                  setHoverInfo("memory");
                }}
                onMouseLeave={() => {
                  setHoverInfo("");
                }}
              />
              {hoverInfo === "memory" && (
                <div className={`${tooltip} w-48`}>
                  최대로 허용할 메모리 용량 입니다.
                </div>
              )}
            </div>
          </label>
          <input
            type="text"
            value={maxMemory}
            onChange={handleMaxMemoryChange}
            disabled={!isEditing}
            className={`border p-1 rounded w-16 text-center w-full ${
              !isEditing ? "text-gray-400" : ""
            }`}
          />
          <div className="text-color-10 absolute top-8 right-4">GB</div>
          {errorMessages.memoryWarning && (
            <p className="text-red-500 text-sm pt-1 pb-1.5">
              {errorMessages.memoryWarning}
            </p>
          )}
        </div>

        <div className="flex flex-col mb-2">
          <label className="text-sm mb-2 flex items-center">
            포트 대역{" "}
            <div className="relative">
              <RiFileInfoLine
                size={16}
                color="#b5bfc4"
                className="ml-1 cursor-pointer"
                onMouseEnter={() => {
                  setHoverInfo("port");
                }}
                onMouseLeave={() => {
                  setHoverInfo("");
                }}
              />
              {hoverInfo === "port" && (
                <div className={`${tooltip} w-48`}>
                  딸깍 프로젝트를 배포할 포트 대역 입니다.
                </div>
              )}
            </div>
          </label>
          <div className="flex items-center space-x-2 justify-between">
            <input
              type="text"
              value={portRange.min}
              onChange={(e) => handlePortRangeChange(e, "min")}
              disabled={!isEditing}
              className={`border p-1 rounded w-24 text-center w-28 ${
                !isEditing ? "text-gray-400" : ""
              }`}
            />
            <span className="text-color-3">-</span>
            <input
              type="text"
              value={portRange.max}
              onChange={(e) => handlePortRangeChange(e, "max")}
              disabled={!isEditing}
              className={`border p-1 rounded w-24 text-center w-28 ${
                !isEditing ? "text-gray-400" : ""
              }`}
            />
          </div>
          {errorMessages.rangeWarning && (
            <p className="text-red-500 text-sm pt-1 pb-1.5">
              {errorMessages.rangeWarning}
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              if (serviceStatus === "stopped") {
                if (isEditing) {
                  handleSave();
                } else {
                  setIsEditing(true);
                }
              } else {
                window.electronAPI.showMessageBox("서비스 실행 중에는 설정을 변경할 수 없습니다")
                // alert("서비스 실행 중에는 설정을 변경할 수 없습니다");
              }
            }}
            className={`mt-2 px-3.5 py-1 rounded text-sm ${
              isEditing
                ? "bg-color-13 text-white"
                : "bg-[#eaf0f5] text-color-13"
            }`}
          >
            {isEditing ? "저장" : "편집"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SettingModal;
