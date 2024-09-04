import React, { useState, useEffect, useRef } from "react";
import { getUserSettings } from "./../../axios/auth";
import axios from "axios";

interface SettingModalProps {
  isOpen: boolean;
  onClose: (source: string) => void;
}

const SettingModal: React.FC<SettingModalProps> = ({ isOpen, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // 상태 관리
  const [maxProjects, setMaxProjects] = useState<number>(4);
  const [portRange, setPortRange] = useState({ min: 10000, max: 15000 });
  const [isEditing, setIsEditing] = useState(false); // 하나의 편집/저장 버튼

  const [initialMaxProjects, setInitialMaxProjects] = useState<number>(4);
  const [initialPortRange, setInitialPortRange] = useState({
    min: 10000,
    max: 15000,
  });

  // 값 변경 핸들러
  const handleMaxProjectsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMaxProjects(Number(e.target.value));
  };

  const handlePortRangeChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "min" | "max"
  ) => {
    setPortRange({
      ...portRange,
      [field]: Number(e.target.value),
    });
  };

  // 저장 버튼 클릭 시 두 값을 백엔드로 전송하는 로직
  const handleSave = async () => {
    // 변경된 값이 있는지 확인
    const isMaxProjectsChanged = maxProjects !== initialMaxProjects;
    const isPortRangeChanged =
      portRange.min !== initialPortRange.min ||
      portRange.max !== initialPortRange.max;

    // 변경된 값이 없으면 저장하지 않음
    if (!isMaxProjectsChanged && !isPortRangeChanged) {
      console.log("변경사항이 없습니다.");
      setIsEditing(false);
      return;
    }

    try {
      // 변경된 값이 있는 경우 백엔드로 전송
      await axios.post("/api/user/settings", {
        maxProjects: isMaxProjectsChanged ? maxProjects : undefined,
        portRange: isPortRangeChanged ? portRange : undefined,
      });

      // 성공적으로 저장 후 상태 변경
      setInitialMaxProjects(maxProjects);
      setInitialPortRange(portRange);
      setIsEditing(false);
      alert("설정이 저장되었습니다.");
    } catch (error) {
      console.error("설정을 저장하는 중 오류가 발생했습니다.", error);
      alert("설정을 저장하는 중 오류가 발생했습니다.");
    }
  };

  useEffect(() => {
    const fetchSettings = async () => {
      const response = await getUserSettings(); // getUserSettings 함수 호출
      if (response.success) {
        const { maxProjects, portRange } = response.settings;

        setMaxProjects(maxProjects);
        setInitialMaxProjects(maxProjects);
        setPortRange(portRange);
        setInitialPortRange(portRange);
      } else {
        console.error(response.message);
      }
    };

    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

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
              type="number"
              value={maxProjects}
              onChange={handleMaxProjectsChange}
              disabled={!isEditing}
              className="border p-1 rounded w-16 text-center"
            />
          </div>
        </div>

        <div className="flex flex-col space-y-2">
          <label className="text-sm">
            포트 대역 설정 (초기: 10000 ~ 15000)
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              value={portRange.min}
              onChange={(e) => handlePortRangeChange(e, "min")}
              disabled={!isEditing}
              className="border p-1 rounded w-24 text-center"
            />
            <span>~</span>
            <input
              type="number"
              value={portRange.max}
              onChange={(e) => handlePortRangeChange(e, "max")}
              disabled={!isEditing}
              className="border p-1 rounded w-24 text-center"
            />
          </div>
        </div>

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
