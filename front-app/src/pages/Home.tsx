import DashButtons from "../features/dashboard/DashButtons";

const Home = () => {
  const handleDownloadPgrok = () => {
    window.electronAPI
      .downloadPgrok()
      .then((message) => {
        console.log(`download-pgrok: ${message}`);
      })
      .catch((error) => {
        alert(`faild download-pgrok: ${error}`);
      });
  };

  const pTag = `text-yellow-300`;

  return (
    <>
      <p className={pTag}>This is a</p>
      <p className="bg-color-1">paragraph styled with Tailwind.</p>
      <div>Home 페이지</div>
      <DashButtons />
      <button onClick={handleDownloadPgrok}>pgrok 다운로드</button>
    </>
  );
};

export default Home;
