import React, { useState, useEffect, useRef } from "react";
import { axiosInstance } from "../../axios/constants";
import { useAppStore } from "./../../stores/appStatusStore";

interface SettingModalProps {
  isOpen: boolean;
  onClose: (source: string) => void;
}

const SettingModal: React.FC<SettingModalProps> = ({ isOpen, onClose }) => {
  const serviceStatus = useAppStore((state) => state.serviceStatus);
  const modalRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [maxCompute, setMaxCompute] = useState<string>("0");
  const [portRange, setPortRange] = useState({ min: "0", max: "0" });

  const [initialMaxCompute, setInitialMaxCompute] = useState<number>(0);
  const [initialPortRange, setInitialPortRange] = useState({
    min: 0,
    max: 0,
  });

  const [rangeWarning, setRangeWarning] = useState<string>("");
  const [portError, setPortError] = useState<string>("");

  useEffect(() => {
    const userSettings = sessionStorage.getItem("userSettings");

    if (userSettings) {
      const parsedSettings = JSON.parse(userSettings);

      setMaxCompute(String(parsedSettings.maxCompute));
      setPortRange({
        min: String(parsedSettings.availablePortStart),
        max: String(parsedSettings.availablePortEnd),
      });

      setInitialMaxCompute(parsedSettings.maxCompute);
      setInitialPortRange({
        min: parsedSettings.availablePortStart,
        max: parsedSettings.availablePortEnd,
      });
    }
  }, [isOpen]);

  const handleMaxProjectsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (isNaN(Number(value))) {
      setRangeWarning("");
    } else {
      setMaxCompute(value);

      // 입력된 숫자가 1 미만이거나 10을 초과하는 경우
      const numericValue = Number(value);
      if (numericValue < 1 || numericValue > 10) {
        setRangeWarning("최대 10까지 지정할 수 있습니다.");
      } else {
        setRangeWarning("");
      }
    }
  };

  const handlePortRangeChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "min" | "max"
  ) => {
    const value = e.target.value;
    if (isNaN(Number(value))) {
    } else {
      const newPortRange = { ...portRange, [field]: value };
      setPortRange(newPortRange);

      // min 값이 max 값보다 큰 경우 에러 처리
      if (Number(newPortRange.min) > Number(newPortRange.max)) {
        setPortError("시작값이 종료값보다 클 수 없습니다.");
      } else {
        setPortError("");
      }
    }
  };

  const handleSave = async () => {
    if (rangeWarning || portError) return;

    console.log(maxCompute, portRange);

    // 변경된 값이 있는지 확인
    const isMaxProjectsChanged = Number(maxCompute) !== initialMaxCompute;
    const isPortRangeChanged =
      Number(portRange.min) !== initialPortRange.min ||
      Number(portRange.max) !== initialPortRange.max;

    // 변경된 값이 없으면 종료
    if (!isMaxProjectsChanged && !isPortRangeChanged) {
      console.log("변경사항이 없습니다.");
      setIsEditing(false);
      return;
    }

    try {
      const response = await axiosInstance.post("/compute/status", {
        maxCompute: Number(maxCompute),
        availablePortStart: Number(portRange.min),
        availablePortEnd: Number(portRange.max),
      });

      if (response.data.status === 200) {
        alert("설정이 저장되었습니다.");

        const updatedSettings = {
          maxCompute: Number(maxCompute),
          availablePortStart: Number(portRange.min),
          availablePortEnd: Number(portRange.max),
        };

        sessionStorage.setItem("userSettings", JSON.stringify(updatedSettings));

        setInitialMaxCompute(Number(maxCompute));
        setInitialPortRange({
          min: Number(portRange.min),
          max: Number(portRange.max),
        });
        setIsEditing(false);
      }
    } catch (error) {
      console.error("설정을 저장하는 중 오류가 발생했습니다.", error);
      alert("설정을 저장하는 중 오류가 발생했습니다.");
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        setIsEditing(false);
        setRangeWarning("");
        setPortError("");
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

  return (
    <div
      ref={modalRef}
      className="absolute top-full right-0 bg-white w-72 p-4 rounded shadow-lg z-50 mt-1 border border-color-2"
    >
      <form>
        <div className="flex flex-col mb-2">
          <label className="text-sm mb-2">컨테이너 수</label>
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
          {rangeWarning && (
            <p className="text-red-500 text-sm pt-1 pb-1.5">{rangeWarning}</p>
          )}
        </div>

        <div className="flex flex-col mb-2">
          <label className="text-sm mb-2">포트 대역</label>
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
          {portError && (
            <p className="text-red-500 text-sm pt-1 pb-1.5">{portError}</p>
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
                alert("서비스 실행 중에는 설정을 변경할 수 없습니다");
              }
            }}
            className="text-red-500 mt-2"
          >
            {isEditing ? "저장" : "편집"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SettingModal;
