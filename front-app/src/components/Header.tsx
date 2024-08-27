
import { Link } from 'react-router-dom';
import './Header.css';


const Header = () => {
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
    <div className="titlebar">
      <div className="flex items-center justify-between w-full px-4">
        <div className="flex space-x-4 text-white">
          <Link to="/" className="hover:underline">
            Home
          </Link>
          <Link to="/dashboard" className="hover:underline">
            Dashboard
          </Link>
          <Link to="/port" className="hover:underline">
            Port
          </Link>
        </div>
        <div className="window-controls flex space-x-2">
          <div
            className="w-10 h-10 flex items-center justify-center hover:bg-gray-600 cursor-pointer"
            onClick={handleMinimize}
          >
            _
          </div>
          <div
            className="w-10 h-10 flex items-center justify-center hover:bg-gray-600 cursor-pointer"
            onClick={handleMaximize}
          >
            [ ]
          </div>
          <div
            className="w-10 h-10 flex items-center justify-center hover:bg-red-600 cursor-pointer"
            onClick={handleClose}
          >
            X
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
