import { useState, useEffect } from "react";
import DashButtons from "../features/dashboard/DashButtons";

const Home = () => {
  const [pgrokLogs, setPgrokLogs] = useState<string[]>([]);

  const handleRunPgrok = () => {
    const remoteAddr = "34.47.108.121:2222";
    const forwardAddr = "http://localhost:3000";
    const token = "asdf1-qwejkn1lkj-2kjnjk-asdf";

    window.electronAPI
      .runPgrok(remoteAddr, forwardAddr, token)
      .then((message) => {
        console.log(`pgrok started: ${message}`);
      })
      .catch((error) => {
        alert(`Failed to start pgrok: ${error}`);
      });
  };

  useEffect(() => {
    const handlePgrokLog = (log: string) => {
      setPgrokLogs((prevLogs) => [...prevLogs, log]);
    };

    window.electronAPI.onPgrokLog(handlePgrokLog);

    return () => {
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
      <button onClick={handleRunPgrok}>pgrok 실행</button>
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
