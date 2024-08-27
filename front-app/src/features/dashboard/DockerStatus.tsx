import React, { useState, useEffect } from 'react';

const DockerStatus: React.FC = () => {
  const [images, setImages] = useState<DockerImage[]>([]);
  const [containers, setContainers] = useState<DockerContainer[]>([]);

  useEffect(() => {

    const fetchDockerData = async () => {
      try {

        const dockerContainers = await window.electronAPI.getContainers();

        setContainers(dockerContainers);
      } catch (error) {
        console.log('Failed to fetch Docker data:', error);
      }
    };

    fetchDockerData();
  }, []);

  return (
    <div>      
      <h2>Images</h2>
      <div className='border-2 min-h-5'>  
      <ul>
        {images.map((image) => (
          <li key={image.Id}>
            {image.RepoTags ? image.RepoTags.join(', ') : '<none>'}
          </li>
        ))}
      </ul>
      </div>
      
      <h2>Containers</h2>

    <div className='border-2 min-h-5'>  
      <ul>
        {containers.map((container) => (
          <li key={container.Id}>
            {container.Names.join(', ')} - {container.State} ({container.Status})
          </li>
        ))}
      </ul>
      </div>
    </div>
  );
};

export default DockerStatus;
