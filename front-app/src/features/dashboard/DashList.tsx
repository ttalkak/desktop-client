import React, { useState, useEffect } from 'react';
import ContainerList from './ContainerList';
import ImageList from './ImageList';

const DashList: React.FC = () => {
  const [activeView, setActiveView] = useState<'containers' | 'images'>('containers');
  const [dockerImages, setDockerImages] = useState<DockerImage[]>([]);
  const [dockerContainers, setDockerContainers] = useState<DockerContainer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDockerData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const images = await window.electronAPI.getDockerImages();
        const containers = await window.electronAPI.fetchDockerContainers();
        setDockerImages(images);
        setDockerContainers(containers);
      } catch (err) {
        setError('Failed to fetch Docker data. Please try again.');
        console.error('Error fetching Docker data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDockerData();
  }, []);

  if (isLoading) {
    return <div className="text-center mt-8">Loading Docker data...</div>;
  }

  if (error) {
    return <div className="text-center mt-8 text-red-500">{error}</div>;
  }

  return (
    <div className="mx-auto p-6 card">
      <h1 className="font-mono text-4xl text-center mb-8">Docker Dashboard</h1>
      
      <div className="flex justify-center mb-6">
        <button
          className={`px-4 py-2 mr-2 ${activeView === 'containers' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => setActiveView('containers')}
        >
          Containers
        </button>
        <button
          className={`px-4 py-2 ${activeView === 'images' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => setActiveView('images')}
        >
          Images
        </button>
      </div>

      {activeView === 'containers' ? (
        dockerContainers.length > 0 ? (
          <ContainerList containers={dockerContainers} />
        ) : (
          <div className="text-center mt-8 text-red-500">
            No containers found or failed to load containers.
          </div>
        )
      ) : activeView === 'images' ? (
        dockerImages.length > 0 ? (
          <ImageList images={dockerImages} />
        ) : (
          <div className="text-center mt-8 text-red-500">
            No images found or failed to load images.
          </div>
        )
      ) : null}
    </div>
  );
};

export default DashList;
