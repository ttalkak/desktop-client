import React, { useState, useEffect, useRef } from "react";
import { axiosInstance } from "../../axios/constants";

interface SettingModalProps {
  isOpen: boolean;
  onClose: (source: string) => void;
}

const SettingModal: React.FC<SettingModalProps> = ({ isOpen, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [maxCompute, setMaxCompute] = useState<string>("0");
  const [portRange, setPortRange] = useState({ min: "0", max: "0" });

  const [initialMaxCompute, setInitialMaxCompute] = useState<number>(0);
  const [initialPortRange, setInitialPortRange] = useState({
    min: 0,
    max: 0,
  });

  const [errorMessage, setErrorMessage] = useState<string>("");

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
      setErrorMessage("숫자만 입력 가능합니다.");
    } else {
      setErrorMessage("");
      setMaxCompute(value);
    }
  };

  const handlePortRangeChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "min" | "max"
  ) => {
    const value = e.target.value;
    if (isNaN(Number(value))) {
      setErrorMessage("숫자만 입력 가능합니다.");
    } else {
      setErrorMessage("");
      setPortRange({
        ...portRange,
        [field]: value,
      });
    }
  };

  const handleSave = async () => {
    if (errorMessage) return;

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
      const response = await axiosInstance.post(
        "https://ttalkak.com/v1/compute/status",
        {
          maxCompute: Number(maxCompute),
          availablePortStart: Number(portRange.min),
          availablePortEnd: Number(portRange.max),
        }
      );

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

  // 외부 클릭 시 모달 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
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
      className="absolute top-full right-0 bg-white px-4 pt-8 pb-5 rounded shadow-lg z-50 mt-1 border border-color-2"
    >
      <form className="space-y-6">
        <div className="flex flex-col space-y-2">
          <label className="text-sm">
            최대 허용 프로젝트 수 (초기 설정: 4)
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={maxCompute}
              onChange={handleMaxProjectsChange}
              disabled={!isEditing}
              className={`border p-1 rounded w-16 text-center ${
                !isEditing ? "text-gray-400" : ""
              }`}
            />
          </div>
        </div>

        <div className="flex flex-col space-y-2">
          <label className="text-sm">
            포트 대역 설정 (초기: 10000 ~ 15000)
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={portRange.min}
              onChange={(e) => handlePortRangeChange(e, "min")}
              disabled={!isEditing}
              className={`border p-1 rounded w-24 text-center ${
                !isEditing ? "text-gray-400" : ""
              }`}
            />
            <span>~</span>
            <input
              type="text"
              value={portRange.max}
              onChange={(e) => handlePortRangeChange(e, "max")}
              disabled={!isEditing}
              className={`border p-1 rounded w-24 text-center ${
                !isEditing ? "text-gray-400" : ""
              }`}
            />
          </div>
        </div>

        {errorMessage && <p className="text-red-500 text-sm">{errorMessage}</p>}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              if (isEditing) {
                handleSave();
              } else {
                setIsEditing(true);
              }
            }}
            className="text-red-500"
          >
            {isEditing ? "저장" : "편집"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SettingModal;
