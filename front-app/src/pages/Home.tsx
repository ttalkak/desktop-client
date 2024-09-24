import CpuStatusItem from "../features/home/CpuStatusItem";
import PaymentStatusItem from "../features/home/PaymentStatusItem";
import { useDeploymentDetailsStore } from "../stores/deploymentDetailsStore"; // 스토어 import

const Home = () => {
  const deploymentDetails = useDeploymentDetailsStore(
    (state) => state.deploymentDetails
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex">
        <CpuStatusItem />
        <PaymentStatusItem />
      </div>

      <div className="card w-full h-full mt-2.5">
        {Object.keys(deploymentDetails).length === 0 ? (
          <div className="text-center text-gray-500 py-10">
            현재 배포중인 서비스가 없습니다.
          </div>
        ) : (
          <table className="min-w-full table-auto bg-white border-gray-300 text-sm">
            <thead className="sticky z-10 top-0 text-sm bg-white-gradient">
              <tr className="border-b">
                <th className="p-1 text-left">deploymentId</th>
                <th className="p-1 text-left">Name</th>
                <th className="p-1 text-left">URL</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(deploymentDetails).map(
                ([deploymentId, details], index) => (
                  <tr key={index} className="border-b">
                    <td className="min-w-32 py-2 px-1.5 text-left">
                      {deploymentId}
                    </td>
                    <td className="min-w-32 text-left">{details.domain}</td>
                    <td className="min-w-md text-left break-words">
                      {details.url}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Home;
