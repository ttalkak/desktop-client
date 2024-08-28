import { IoMdClose } from "react-icons/io";
import { VscChromeMaximize } from "react-icons/vsc";
import { FiMinus } from "react-icons/fi";

const TitleBar = () => {
  const handleMinimize = () => {
    window.electronAPI.minimizeWindow();
  };

  const handleMaximize = () => {
    window.electronAPI.maximizeWindow();
  };

  const handleClose = () => {
    window.electronAPI.closeWindow();
  };

  return (
    <div className="w-full flex">
      <div
        className="w-10 h-10 flex items-center justify-center hover:bg-gray-600 cursor-pointer button"
        onClick={handleMinimize}
      >
        <FiMinus />
      </div>
      <div
        className="w-10 h-10 flex items-center justify-center hover:bg-gray-600 cursor-pointer button"
        onClick={handleMaximize}
      >
        <VscChromeMaximize />
      </div>
      <div
        className="w-10 h-10 flex items-center justify-center hover:bg-red-600 cursor-pointer button"
        onClick={handleClose}
      >
        <IoMdClose />
      </div>
    </div>
  );
};

export default TitleBar;
