import { IoMdClose } from "react-icons/io";
import { FaRegSquare } from "react-icons/fa";
import { IoSettingsSharp } from "react-icons/io5";
import { FiMinus } from "react-icons/fi";
import { useEffect, useState } from "react";
import LoginModal from "./../features/auth/LoginModal";
import { useAuthStore } from "../stores/authStore";
import SettingModal from "../features/auth/SettingModal";
import {
  parseInboundRule,
  parsePortNumber,
} from "../features/port/parseInboundRule";
import { getUserSettings } from "../axios/auth";
import logoImg from "./../assets/images/logo.png";

const Header = () => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSettingModalOpen, setIsSettingModalOpen] = useState(false);
  const [isFromModal, setIsFromModal] = useState(false);

  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const clearTokens = useAuthStore((state) => state.clearTokens);

  const handleMinimize = () => {
    window.electronAPI.minimizeWindow();
  };

  const handleMaximize = () => {
    window.electronAPI.maximizeWindow();
  };

  const handleClose = () => {
    window.electronAPI.closeWindow();
  };

  const handleLogout = () => {
    clearTokens();
  };

  const handleDownloadPgrok = () => {
    window.electronAPI
      .downloadPgrok()
      .then((message) => {
        console.log(`download-pgrok: ${message}`);
      })
      .catch((error) => {
        console.log(`Failed to download pgrok: ${error}`);
      });
  };

  const toggleSettingModal = (source: string) => {
    console.log("toggle", source);
    if (source === "modal") {
      setIsFromModal(true);
      setIsSettingModalOpen(false);
    } else {
      if (isFromModal) {
        setIsFromModal(false);
      } else {
        setIsSettingModalOpen(true);
      }
    }
  };

  const toggleLoginModal = (source: string) => {
    if (source === "modal") {
      setIsFromModal(true);
      setIsLoginModalOpen(false);
    } else {
      if (isFromModal) {
        setIsFromModal(false);
      } else {
        setIsLoginModalOpen(true);
      }
    }
  };

  const fetchInboundRules = async () => {
    try {
      const result = await window.electronAPI.getInboundRules();
      const parsedRules = parseInboundRule(result).map(
        (rule) => rule.localPort
      );
      parsePortNumber(parsedRules);
    } catch (error) {
      console.error("Failed to load inbound rules:", error);
    }
  };

  useEffect(() => {
    if (isFromModal) {
      const timer = setTimeout(() => {
        setIsFromModal(false);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isFromModal]);

  useEffect(() => {
    if (refreshToken) {
      handleDownloadPgrok();
      fetchInboundRules();
      getUserSettings();
    }
  }, [refreshToken]);

  const pageBtn = `w-10 h-10 flex items-center justify-center hover:bg-color-1 cursor-pointer button app-region-no-drag`;
  const signBtn = isLoginModalOpen
    ? `bg-color-13 text-white text-xs px-4 py-1.5 rounded mr-4 font-sans font-medium cursor-pointer button app-region-no-drag hover:bg-color-13`
    : `bg-color-12 text-white text-xs px-4 py-1.5 rounded mr-4 font-sans font-medium cursor-pointer button app-region-no-drag hover:bg-color-13`;

  const logoutBtn =
    "bg-color-1 text-color-4 text-xs px-4 py-1.5 rounded mr-4 font-sans font-medium cursor-pointer button app-region-no-drag hover:bg-color-2";

  return (
    <div className="bg-white fixed top-0 left-0 w-full flex justify-between items-center border-b border-color-2 app-region-drag relative">
      <div className="ml-5 flex flex-wrap items-center">
        <img
          style={{ width: "26px", height: "15px" }}
          src={logoImg}
          alt="Ttalkak"
        />
        <div className="ml-3 mt-0.5 font-bold">Ttalkak</div>
      </div>

      <div className="flex flex-wrap items-center">
        <div className="mr-4 relative">
          {accessToken ? (
            <>
              <div
                className="app-region-no-drag cursor-pointer"
                onClick={() => toggleSettingModal("header")}
              >
                <IoSettingsSharp size={24} color="#3A91D1" />
              </div>
              <SettingModal
                isOpen={isSettingModalOpen}
                onClose={toggleSettingModal}
              />
            </>
          ) : null}
        </div>
        <div className="relative">
          {accessToken ? (
            <div onClick={handleLogout} className={logoutBtn}>
              Logout
            </div>
          ) : (
            <div className={signBtn} onClick={() => toggleLoginModal("header")}>
              Sign in
            </div>
          )}
          <LoginModal isOpen={isLoginModalOpen} onClose={toggleLoginModal} />
        </div>
        <div className={pageBtn} onClick={handleMinimize}>
          <FiMinus color="#a4a4a4" />
        </div>
        <div className={pageBtn} onClick={handleMaximize}>
          <FaRegSquare color="#a4a4a4" size={12} />
        </div>
        <div className={pageBtn} onClick={handleClose}>
          <IoMdClose color="#a4a4a4" />
        </div>
      </div>
    </div>
  );
};

export default Header;
