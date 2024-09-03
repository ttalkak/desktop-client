import { useState, useEffect } from "react";
import DashButtons from "../features/dashboard/DashButtons";

const Home = () => {
  const [pgrokLogs, setPgrokLogs] = useState<string[]>([]);

  const handleRunPgrok = () => {
    const remoteAddr = "34.47.78.129:2222";
    const forwardAddr = "http://localhost:3000";
    const token = "8a98e3e8309819f93ab7ac9461759f51f2e9f8fc";

    window.electronAPI
      .runPgrok(remoteAddr, forwardAddr, token)
      .then((message) => {
        console.log(`pgrok started: ${message}`);
      })
      .catch((error) => {
        alert(`Failed to start pgrok: ${error}`);
      });
  };

  const handleDownloadPgrok = () => {
    window.electronAPI
      .downloadPgrok()
      .then((message) => {
        console.log(`download-pgrok: ${message}`);
        handleRunPgrok();
      })
      .catch((error) => {
        alert(`Failed to download pgrok: ${error}`);
      });
  };

  useEffect(() => {
    const handlePgrokLog = (log: string) => {
      setPgrokLogs((prevLogs) => [...prevLogs, log]);
    };

    window.electronAPI.onPgrokLog(handlePgrokLog);

    return () => {
      // Clean up listener on component unmount
      window.electronAPI.onPgrokLog(() => {});
    };
  }, []);

  const pTag = `text-yellow-300`;

  return (
    <>
      <p className={pTag}>This is a</p>
      <p className="bg-color-1">paragraph styled with Tailwind.</p>
      <div>Home 페이지</div>
      <DashButtons />
      <button onClick={handleDownloadPgrok}>pgrok 다운로드</button>
      <div>
        <h2>pgrok Logs:</h2>
        <div
          style={{
            whiteSpace: "pre-wrap",
            backgroundColor: "#333",
            color: "#eee",
            padding: "10px",
            borderRadius: "5px",
          }}
        >
          {pgrokLogs.length > 0 ? pgrokLogs.join("\n") : "No logs yet."}
        </div>
      </div>
    </>
  );
};

export default Home;
