import React from "react";
import CpuStatusItem from "../features/home/CpuStatusItem";
import PaymentStatusItem from "../features/home/PaymentStatusItem";
import { FaSpinner } from "react-icons/fa";
import {
  DeployContainerInfo,
  useContainerStore,
} from "../stores/containerStore";
import { DeployStatus } from "../types/deploy";

const Home: React.FC = () => {
  const containers = useContainerStore((state) => state.containers);

  const getUrl = (deployment: DeployContainerInfo) => {
    let subdomain = deployment.subdomainName;
    if (deployment.serviceType === "DATABASE") {
      subdomain = deployment.containerName;
      return `database_${subdomain}`;
    }
    return `http://${subdomain}.ttalkak.com`;
  };

  const tableBody = "py-2 px-4 text-sm text-gray-900 align-middle text-center";

  return (
    <div className="h-full flex flex-col">
      <div className="flex">
        <CpuStatusItem />
        <PaymentStatusItem />
      </div>
      <div className="card w-full h-full mt-2.5 flex flex-col">
        {Object.keys(containers).length === 0 ? (
          <div className="text-center text-gray-700 py-10">
            현재 배포중인 서비스가 없습니다.
          </div>
        ) : (
          <div className="flex flex-col flex-grow overflow-hidden rounded-lg custom-scrollbar">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="sticky z-10 top-0 text-sm bg-white-gradient border-b">
                <tr>
                  <th className="p-1 text-center">ServiceId</th>
                  <th className="p-1 text-center">Name</th>
                  <th className="p-1 text-center">URL</th>
                  <th className="p-1 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white overflow-y-auto">
                {Object.entries(containers).map(([containerId, deployment]) => (
                  <tr key={containerId} className="hover:bg-gray-50">
                    <td className={`${tableBody} min-w-32`}>{deployment.id}</td>
                    <td className={`${tableBody} min-w-32`}>
                      <div className="flex items-center justify-center">
                        {deployment.status !== "RUNNING" && (
                          <FaSpinner
                            size={50}
                            style={{
                              animation: "spin 1s linear infinite",
                            }}
                          />
                        )}
                        <span>
                          {deployment.subdomainName || deployment.containerName}
                        </span>
                      </div>
                    </td>
                    <td className={`${tableBody} min-w-md break-words`}>
                      <div className="flex items-center justify-center">
                        {deployment.status !== DeployStatus.RUNNING && (
                          <FaSpinner
                            size={50}
                            style={{
                              animation: "spin 1s linear infinite",
                            }}
                          />
                        )}
                        {deployment.status === DeployStatus.RUNNING ? (
                          <a
                            href={`${getUrl(deployment)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-blue-600"
                          >
                            {getUrl(deployment)}
                          </a>
                        ) : (
                          <span>{getUrl(deployment)}</span>
                        )}
                      </div>
                    </td>
                    <td className={`${tableBody} min-w-32`}>
                      {deployment.status === DeployStatus.RUNNING ? (
                        <div>
                          <span
                            className={`inline-block w-3 h-3 rounded-full mr-1 animate-pulse bg-green-400`}
                          ></span>
                          <span>RUNNING</span>
                        </div>
                      ) : deployment.status === DeployStatus.ERROR ? (
                        <div>
                          <div
                            className={`inline-block w-3 h-3 rounded-full mr-1 bg-red-400`}
                          >
                            ERROR
                          </div>
                          <span>RUNNING</span>
                        </div>
                      ) : (
                        deployment.status
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
