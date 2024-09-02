import DashList from "../features/dashboard/DashList";
// import CpuStatusItem from "../features/dashboard/CpuStatusItem";
import DockerStatusItem from "../features/dashboard/DockerStatusItem";

const DashBoard = () => {
  const downloadHandler = () => {
    const repoUrl = "https://github.com/sunsuking/kokoa-clone-2020";
    const downloadPath = "c:/Users/SSAFY/Downloads";
    const extractDir = "c:/Users/SSAFY/Desktop";

    console.log(window.electronAPI.downloadAndUnzip);
    const tryDownload = async () => {
      console.log("repoUrl:", repoUrl); // 확인용 콘솔 로그
      console.log("downloadPath:", downloadPath); // 확인용 콘솔 로그

      try {
        await window.electronAPI.downloadAndUnzip(
          repoUrl,
          downloadPath,
          extractDir
        );

        console.log("Download and unzip successful");
      } catch (err) {
        console.log("Error during download and unzip:", err);
      }
    };

    const tryImageBuild = async () => {
      await window.electronAPI.downloadAndUnzip(dockerfilePath);
    };
    tryDownload();
  };

  return (
    <>
      <div className=" mx-auto p-6">
        <div className="flex w-full">
          <div className="flex-1 mr-2">{/* <CpuStatusItem /> */}</div>
          <div className="flex-1 ml-2">
            <DockerStatusItem />
            <button
              className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
              onClick={downloadHandler}
            >
              깃 파일 zip으로 다운받고 unzip
            </button>
          </div>
        </div>
        <DashList />
      </div>
    </>
  );
};

export default DashBoard;
