import { Outlet } from "react-router-dom";
import Header from "../components/Header";
import SideNavBar from "../components/SideNavBar";
import Footer from "../components/Footer";
import OverlayPanel from "../components/OverlayPanel";

const Layout = () => {
  const isLoggedIn = false;

  return (
    <div className="bg-color-1 h-screen flex flex-col relative">
      <Header />
      <div
        className="flex overflow-hidden "
        style={{ height: "calc(100vh - 40.8px - 24px)" }}
      >
        <div>
          <SideNavBar />
        </div>
        <div className="flex-grow overflow-auto custom-scrollbar ml-64 py-6 px-6 relative">
          {!isLoggedIn && <OverlayPanel />}
          <Outlet />
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Layout;
