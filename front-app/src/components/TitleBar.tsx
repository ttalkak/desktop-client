import { IoMdClose } from "react-icons/io";
import { FaRegSquare } from "react-icons/fa";
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

  const logo = `font-sans text-color-3 ml-4 text-`;
  const pageBtn = `w-10 h-10 flex items-center justify-center hover:bg-color-9 cursor-pointer button app-region-no-drag`;
  const signBtn = `bg-color-6 text-white text-xs px-4 py-1.5 rounded mr-5 font-sans font-medium cursor-pointer button app-region-no-drag`;

  return (
    <div className="w-full flex justify-between items-center bg-color-5 app-region-drag">
      <div className={logo}>icon Logo</div>
      <div className="flex flex-wrap items-center ">
        <div className={signBtn}>Sign in</div>
        <div className={pageBtn} onClick={handleMinimize}>
          <FiMinus color="#adadad" />
        </div>
        <div className={pageBtn} onClick={handleMaximize}>
          <FaRegSquare color="#adadad" size={12} />
        </div>
        <div className={pageBtn} onClick={handleClose}>
          <IoMdClose color="#adadad" />
        </div>
      </div>
    </div>
  );
};

export default TitleBar;
