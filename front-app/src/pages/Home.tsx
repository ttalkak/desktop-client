import React from "react";
import CpuStatusItem from "../features/home/CpuStatusItem";
import PaymentStatusItem from "../features/home/PaymentStatusItem";
import useDeploymentStore, { Deployment } from "../stores/deploymentStore";

const Home: React.FC = () => {
  const containers = useDeploymentStore((state) => state.containers);

  const getUrl = (deployment: Deployment) => {
    let subdomain = deployment.subdomainName;
    if (!subdomain && deployment.serviceType === "BACKEND") {
      subdomain = `api_${deployment.deploymentId}`;
    } else if (!subdomain) {
      subdomain = `${deployment.deploymentId}`;
    }
    return `http://${subdomain}.ttalkak.com`;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex">
        <CpuStatusItem />
        <PaymentStatusItem />
      </div>

      <div className="card w-full h-full mt-2.5">
        {Object.keys(containers).length === 0 ? (
          <div className="text-center text-gray-500 py-10">
            현재 배포중인 서비스가 없습니다.
          </div>
        ) : (
          <table className="min-w-full table-auto bg-white border-gray-300 text-sm">
            <thead className="sticky z-10 top-0 text-sm bg-white-gradient">
              <tr className="border-b">
                <th className="p-1 text-left">Name</th>
                <th className="p-1 text-left">URL</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(containers).map(([containerId, deployment]) => (
                <tr key={containerId} className="border-b">
                  <td className="min-w-32 text-left">
                    {deployment.subdomainName || deployment.deploymentId}
                  </td>
                  <td className="min-w-md text-left break-words">
                    {getUrl(deployment)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Home;
