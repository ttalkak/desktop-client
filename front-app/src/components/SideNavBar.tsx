import { Link, useLocation } from "react-router-dom";

const SideNavBar = () => {
  const location = useLocation();

  const isActive = (path: string) =>
    location.pathname === path ? "text-color-5 bg-color-1" : "text-color-10";

  const navContainer = `fixed top-[40.8px] left-0 w-64 h-screen flex flex-col button app-region-no-drag w-60 bg-white p-4`;
  const navText = `text-color-10 py-1.5 px-4 my-1.5 relative hover:text-color-5 hover:bg-color-1 rounded flex items-center`;

  return (
    <div className={navContainer}>
      <div className="flex flex-col justify-center">
        <div className="text-xl text-center font-bold">
          Click to run TTalkak
        </div>
        <button className="bg-color-12 rounded text-white py-1 my-4  hover:bg-color-13">
          start
        </button>
      </div>

      <div className="flex flex-col mt-6">
        <Link to="/" className={`${navText} ${isActive("/")}`}>
          <div className="ml-1">Home</div>
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
  );
};

export default SideNavBar;
