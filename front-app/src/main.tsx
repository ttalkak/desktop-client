// import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { HashRouter } from "react-router-dom";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <HashRouter>
    {/* <React.StrictMode> */}
      <App />
    {/* </React.StrictMode> */}
  </HashRouter>
);

// // Use contextBridge
// window.ipcRenderer.on("main-process-message", (_event, message) => {
//   console.log(message);
// });
