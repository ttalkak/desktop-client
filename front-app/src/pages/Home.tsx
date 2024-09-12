import { useState, useEffect } from "react";
import CpuStatusItem from "../features/home/CpuStatusItem";
import PaymentStatusItem from "../features/home/PaymentStatusItem";

const Home = () => {
  const [pgrokLogs, setPgrokLogs] = useState<string[]>([]);

  const handleRunPgrok = () => {
    const remoteAddr = "34.47.108.121:2222";
    const forwardAddr = "http://localhost:3000";
    const token = "asdjkf2-qwenjf-wendka";

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

  return (
    <>
      <div className="">
        <div className="flex">
          <CpuStatusItem />
          <PaymentStatusItem />
        </div>

        <div
          className="mt-2"
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
