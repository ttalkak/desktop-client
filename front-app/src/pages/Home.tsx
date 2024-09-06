import { useState, useEffect } from "react";

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

  return (
    <>
      <div className="m-10">
        <div className="border-2 min-w-1 min-h-10">
          <div>코인영역</div>
        </div>
        {/* pgrok 영역 */}
        <div>
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
        </div>
      </div>
    </>
  );
};

export default Home;
