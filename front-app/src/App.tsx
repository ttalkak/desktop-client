import "./App.css";
import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import DashBoard from "./pages/DashBoard";
import Port from "./pages/Port";
import Header from "./components/Header";
import SignUp from "./pages/SignUp";
import SideNavBar from "./components/SideNavBar";
import Footer from "./components/Footer";

function App() {
  return (
    <div className="bg-color-1 h-screen flex flex-col">
      <Header />
      <div className="flex overflow-hidden">
        <SideNavBar />
        <div
          className="flex-grow overflow-auto custom-scrollbar ml-64 px-6 py-6"
          style={{ height: "calc(100vh - 40.8px - 24px)" }}
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<DashBoard />} />
            <Route path="/port" element={<Port />} />
            <Route path="/signup" element={<SignUp />} />
          </Routes>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default App;
