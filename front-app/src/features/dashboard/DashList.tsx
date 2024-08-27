import { useEffect, useState } from 'react';

const DashList = () => {
  const [dockerImages, setDockerImages] = useState<string[]>([]);
  const [dockerContainers, setDockerContainers] = useState<string[]>([]);

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

      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Docker Images</h2>
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr>
              <th className="py-2 px-4 border-b">Repository:Tag</th>
              <th className="py-2 px-4 border-b">ID</th>
              <th className="py-2 px-4 border-b">Size</th>
            </tr>
          </thead>
          <tbody>
            {dockerImages.map((image, index) => {
              const [repositoryTag, id, size] = image.split(' ');
              return (
                <tr key={index}>
                  <td className="py-2 px-4 border-b">{repositoryTag}</td>
                  <td className="py-2 px-4 border-b">{id}</td>
                  <td className="py-2 px-4 border-b">{size}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">Docker Containers</h2>
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr>
              <th className="py-2 px-4 border-b">Container ID</th>
              <th className="py-2 px-4 border-b">Image</th>
              <th className="py-2 px-4 border-b">Status</th>
            </tr>
          </thead>
          <tbody>
            {dockerContainers.map((container, index) => {
              const [id, image, status] = container.split(' ');
              return (
                <tr key={index}>
                  <td className="py-2 px-4 border-b">{id}</td>
                  <td className="py-2 px-4 border-b">{image}</td>
                  <td className={`py-2 px-4 border-b ${status === 'Up' ? 'text-green-500' : 'text-red-500'}`}>
                    {status === 'Up' ? 'Running' : 'Stopped'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DashList;
