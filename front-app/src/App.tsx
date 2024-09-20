import "./App.css";
import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Port from "./pages/Port";
import SignUp from "./pages/SignUp";
import DashBoard from "./pages/DashBoard";
import Layout from "./pages/Layout";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="dashboard" element={<DashBoard />} />
        <Route path="port" element={<Port />} />
      </Route>
      {/* Layout이 필요하지 않은 경로 */}
      <Route path="/signup" element={<SignUp />} />
    </Routes>
  );
}

export default App;
