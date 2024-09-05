import { Link, useLocation } from "react-router-dom";
import { IoMdClose } from "react-icons/io";
import { FaRegSquare } from "react-icons/fa";
import { IoSettingsSharp } from "react-icons/io5";
import { FiMinus } from "react-icons/fi";
import { useEffect, useState } from "react";
import LoginModal from "./../features/auth/LoginModal";
import { useAuthStore } from "../stores/authStore";
import SettingModal from "../features/auth/SettingModal";

const Header = () => {
  const location = useLocation();
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
    }
  }, [refreshToken]);

  const isActive = (path: string) =>
    location.pathname === path
      ? "text-color-5 bg-white rounded-t-lg font-semibold"
      : "text-color-10";

  const navContainer = `flex justify-between button ml-2.5 app-region-no-drag`;
  const navText = `text-color-10 text-sm px-6 py-1 mt-0.5 relative hover:text-color-5`;
  const pageBtn = `w-11 h-11 flex items-center justify-center hover:bg-color-2 cursor-pointer button app-region-no-drag`;
  const signBtn = isLoginModalOpen
    ? `bg-color-11 text-white text-xs px-4 py-1.5 rounded mr-4 font-sans font-medium cursor-pointer button app-region-no-drag`
    : `bg-color-6 text-white text-xs px-4 py-1.5 rounded mr-4 font-sans font-medium cursor-pointer button app-region-no-drag`;

  const Additional = () => (
    <div
      style={{ width: `calc(100% + 16px)` }}
      className="absolute bg-white w-full h-3.5 left-1/2 transform -translate-x-1/2"
    >
      <div className="absolute left-0 top-0 w-2 h-2.5 bg-color-1 rounded-br-lg"></div>
      <div className="absolute right-0 top-0 w-2 h-2.5 bg-color-1 rounded-bl-lg"></div>
    </div>
  );

  return (
    <div className="w-full flex justify-between items-center bg-color-1 app-region-drag relative">
      <div className={navContainer}>
        <Link to="/" className={`${navText} ${isActive("/")}`}>
          Home
          {location.pathname === "/" && <Additional />}
        </Link>
        <Link
          to="/dashboard"
          className={`${navText} ${isActive("/dashboard")}`}
        >
          Dashboard
          {location.pathname === "/dashboard" && <Additional />}
        </Link>
        <Link to="/port" className={`${navText} ${isActive("/port")}`}>
          Port
          {location.pathname === "/port" && <Additional />}
        </Link>
      </div>

      <div className="flex flex-wrap items-center">
        <div className="mr-4 relative">
          {accessToken ? (
            <>
              <div
                className="app-region-no-drag"
                onClick={() => toggleSettingModal("header")}
              >
                <IoSettingsSharp size={24} color="#c5c5c5" />
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
            <div onClick={handleLogout} className={signBtn}>
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
