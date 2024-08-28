import "./App.css";
import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import DashBoard from "./pages/DashBoard";
import Port from "./pages/Port";
import Header from "./components/Header";

function App() {
  return (
    <div className="flex flex-col h-screen">
      <Header />
      <div className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<DashBoard />} />
          <Route path="/port" element={<Port />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
