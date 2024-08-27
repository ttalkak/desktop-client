import React, { useEffect, useState } from 'react';

// DockerImage와 DockerContainer 타입 정의
interface DockerImage {
  repository: string;
  tag: string;
  id: string;
  size: string;
}

interface DockerContainer {
  id: string;
  image: string;
  status: string;
}

const DockerStatus: React.FC = () => {
  const [images, setImages] = useState<DockerImage[]>([]);
  const [containers, setContainers] = useState<DockerContainer[]>([]);

  useEffect(() => {
    // Docker 이미지 데이터를 가져오는 함수
    const fetchDockerImages = async () => {
      const imageList = await window.electron.getDockerImages();
      const parsedImages = imageList.map((image) => {
        const [repositoryTag, id, size] = image.split(' ');
        const [repository, tag] = repositoryTag.split(':');
        return { repository, tag, id, size };
      });
      setImages(parsedImages);
    };

    // Docker 컨테이너 데이터를 가져오는 함수
    const fetchDockerContainers = async () => {
      const containerList = await window.electron.fetchDockerContainers();
      const parsedContainers = containerList.map((container) => {
        const [id, image, status] = container.split(' ');
        return { id, image, status };
      });
      setContainers(parsedContainers);
    };

    // 데이터 가져오기
    fetchDockerImages();
    fetchDockerContainers();
  }, []);

  return (
    <div>
      <h1>Docker Status</h1>

      <section>
        <h2>Images</h2>
        <ul>
          {images.map((image) => (
            <li key={image.id}>
              <strong>{image.repository}:{image.tag}</strong> - ID: {image.id}, Size: {image.size}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Containers</h2>
        <ul>
          {containers.map((container) => (
            <li key={container.id}>
              <strong>ID:</strong> {container.id}, <strong>Image:</strong> {container.image}, <strong>Status:</strong> {container.status}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default DockerStatus;
