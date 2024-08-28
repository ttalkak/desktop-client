import { Link, useLocation } from "react-router-dom";
import { IoMdClose } from "react-icons/io";
import { FaRegSquare } from "react-icons/fa";
import { FiMinus } from "react-icons/fi";

const Header = () => {
  const location = useLocation();

  const handleMinimize = () => {
    window.electronAPI.minimizeWindow();
  };

  const handleMaximize = () => {
    window.electronAPI.maximizeWindow();
  };

  const handleClose = () => {
    window.electronAPI.closeWindow();
  };

  const isActive = (path: string) =>
    location.pathname === path ? "text-color-5 font-bold" : "text-color-10";

  const navContainer = `flex space-x-10 text-white button ml-5 app-region-no-drag`;
  const navText = `text-color-10 font-normal text-sm`;
  const pageBtn = `w-11 h-11 flex items-center justify-center hover:bg-color-2 cursor-pointer button app-region-no-drag`;
  const signBtn = `bg-color-6 text-white text-xs px-4 py-1.5 rounded mr-4 font-sans font-medium cursor-pointer button app-region-no-drag`;

  return (
    <div className="w-full flex justify-between items-center bg-color-1 app-region-drag">
      <div className={navContainer}>
        <Link to="/" className={`${navText} ${isActive("/")}`}>
          Home
        </Link>
        <Link
          to="/dashboard"
          className={`${navText} ${isActive("/dashboard")}`}
        >
          Dashboard
        </Link>
        <Link to="/port" className={`${navText} ${isActive("/port")}`}>
          Port
        </Link>
      </div>
      <div className="flex flex-wrap items-center ">
        <Link className={signBtn} to={"/login"}>
          Sign in
        </Link>
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
