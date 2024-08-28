import { Link, useLocation } from "react-router-dom";
import TitleBar from "./TitleBar";

const Header = () => {
  const location = useLocation();
  const navText = `text-color-10 font-medium`;

  // 페이지 경로에 따른 스타일을 설정
  const isActive = (path: string) =>
    location.pathname === path
      ? "text-color-5 font-bold underline"
      : "text-color-10";

  return (
    <>
      <TitleBar />
      <div className="flex items-center justify-between w-full px-4 py-3 bg-color-1">
        <div className="flex space-x-8 text-white button">
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
      </div>
    </>
  );
};

export default Header;
