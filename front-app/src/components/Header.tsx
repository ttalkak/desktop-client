import { Link } from "react-router-dom";
import "./Header.css";
import TitleBar from "./TitleBar";

const Header = () => {
  return (
    <div className="">
      <TitleBar />
      <div className="flex items-center justify-between w-full px-4 bg-color-1">
        <div className="flex space-x-4 text-white button">
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
      </div>
    </div>
  );
};

export default Header;
