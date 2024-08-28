import { useEffect, useState } from 'react';
import { FaPlay, FaStop } from "react-icons/fa";
import { HiOutlineDotsVertical } from "react-icons/hi";



const DashList = () => {
  const [dockerImages, setDockerImages] = useState<DockerImage[]>([]);
  const [dockerContainers, setDockerContainers] = useState<DockerContainer[]>([]);

  useEffect(() => {
    const fetchDockerData = async () => {
      const images = await window.electronAPI.getDockerImages();
      const containers = await window.electronAPI.fetchDockerContainers();
      setDockerImages(images);
      setDockerContainers(containers);
    };

    fetchDockerData();
  }, []);

  return (
    <div className="container mx-auto p-6">
      <p className="font-mono text-4xl text-center mb-8">Docker Dashboard</p>

      {/* Docker Containers Table */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Docker Containers</h2>
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr>
              {/* <th className="py-2 px-4 border-b">Container ID</th> */}
              <th className="py-2 px-4 border-b">Names</th>
              <th className="py-2 px-4 border-b">Image</th>
              {/* <th className="py-2 px-4 border-b">Command</th> */}
              <th className="py-2 px-4 border-b">Created</th>
              <th className="py-2 px-4 border-b">Ports</th>
              <th className="py-2 px-4 border-b">State</th>
              <th className="py-2 px-4 border-b">Status</th>
            </tr>
          </thead>
          <tbody>
            {dockerContainers && dockerContainers.length > 0 ? (
              dockerContainers.map((container, index) => {
                const {  Names, Image, Created, Ports, State, Status } = container;
                return (
                  <tr key={index}>
                    {/* <td className="py-2 px-4 border-b">{Id}</td> */}
                    <td className="py-2 px-4 border-b">{Names.join(', ')}</td>
                    <td className="py-2 px-4 border-b">{Image}</td>
                    {/* <td className="py-2 px-4 border-b">{Command}</td> */}
                    <td className="py-2 px-4 border-b">{new Date(Created * 1000).toLocaleString()}</td>
                    <td className="py-2 px-4 border-b">
                      {Ports.map((port, idx) => (
                        <span key={idx}>
                          {port.IP}:{port.PublicPort} → {port.PrivatePort} ({port.Type})
                        </span>
                      ))}
                    </td>
                    <td className="py-2 px-4 border-b">{State}</td>
                    <td className="py-2 px-4 border-b">{Status}</td>
                    <td className="py-2 px-4 border-b">
                      <button><FaPlay /></button>
                    </td>
                    <td className="py-2 px-4 border-b">
                      <button><FaStop /></button>
                    </td>
                    <td className="py-2 px-4 border-b">
                      <button><HiOutlineDotsVertical /></button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="py-2 px-4 border-b text-center">
                  실행중인 컨테이너가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Docker Images Table */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Docker Images</h2>
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr>
              <th className="py-2 px-4 border-b">Repository:Tag</th>
              {/* <th className="py-2 px-4 border-b">ID</th> */}
              <th className="py-2 px-4 border-b">Size</th>
              <th className="py-2 px-4 border-b">ParentId</th>
              <th className="py-2 px-4 border-b">Labels</th>
            </tr>
          </thead>
          <tbody>
            {dockerImages && dockerImages.length > 0 ? (
              dockerImages.map((image, index) => {
                const { RepoTags, Id, Size } = image;
                return (
                  <tr key={index}>
                    <td className="py-2 px-4 border-b">{RepoTags ? RepoTags.join(', ') : 'None'}</td>
                    {/* <td className="py-2 px-4 border-b">{Id}</td> */}
                    <td className="py-2 px-4 border-b">{(Size / (1024 * 1024)).toFixed(2)} MB</td>
                    <td className="py-2 px-4 border-b">{(Size / (1024 * 1024)).toFixed(2)} MB</td>
                    <td className="py-2 px-4 border-b">{(Size / (1024 * 1024)).toFixed(2)} MB</td>
                    <td className="py-2 px-4 border-b">
                      <button><FaPlay /></button>
                    </td>
                    <td className="py-2 px-4 border-b">
                      <button><FaStop /></button>
                    </td>
                    <td className="py-2 px-4 border-b">
                      <button><HiOutlineDotsVertical /></button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={3} className="py-2 px-4 border-b text-center">
                  사용할 수 있는 이미지가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DashList;
