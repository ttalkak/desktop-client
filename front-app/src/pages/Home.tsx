import { useState, useEffect } from "react";
import CpuStatusItem from "../features/home/CpuStatusItem";
import PaymentStatusItem from "../features/home/PaymentStatusItem";

const Home = () => {
  const [deployments, setDeployments] = useState<any[]>([]);

  const dummyData = [
    {
      deploymentId: "1",
      domainName: "Service A",
      url: "https://service-a.example.com",
      status: "Running",
      createdAt: "2024-09-20T12:00:00Z",
    },
    {
      deploymentId: "2",
      domainName: "Service B",
      url: "https://service-b.example.com",
      status: "Stopped",
      createdAt: "2024-09-19T10:00:00Z",
    },
    {
      deploymentId: "3",
      domainName: "Service C",
      url: "https://service-c.example.com",
      status: "Running",
      createdAt: "2024-09-18T08:00:00Z",
    },
  ];

  useEffect(() => {
    setDeployments(dummyData);
  }, []);

  return (
    <>
      <div className="flex">
        <CpuStatusItem />
        <PaymentStatusItem />
      </div>

      <div className="card w-full min-h-108 overflow-hidden mt-2.5">
        <div className="overflow-auto custom-scrollbar w-full">
          <table className="w-full bg-white border-gray-300 text-sm">
            <thead className="sticky z-10 top-0 text-sm bg-white-gradient">
              <tr className="border-b">
                <th className="p-1">deploymentId</th>
                <th className="p-1">Name</th>
                <th className="p-1">URL</th>
              </tr>
            </thead>
            <tbody>
              {deployments.map((deployment, index) => (
                <tr key={index} className="border-b">
                  <td className="min-w-32  py-2 px-1.5 text-center">
                    {deployment.deploymentId}
                  </td>
                  <td className="min-w-32 text-center">
                    {deployment.domainName}
                  </td>
                  <td className="max-w-md text-center">{deployment.url}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default Home;
