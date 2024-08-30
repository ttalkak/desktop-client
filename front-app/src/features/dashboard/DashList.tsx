import React, { useState, useEffect } from 'react';
import ContainerList from './ContainerList';
import ImageList from './ImageList';


const DashList: React.FC = () => {
  const [activeView, setActiveView] = useState<'containers' | 'images'>('containers');
  //이미지, 도커 리스트 가져오기
  const [dockerImages, setDockerImages] = useState<DockerImage[]>([]);
  const [dockerContainers, setDockerContainers] = useState<DockerContainer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [eventState, setEventState] = useState<DockerEvent | null>(null)

  useEffect(() => {
    //최초로 불러오기
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

    //도커 이벤트 수신 연결
    //type 종류 : network,  container, images
    //이벤트 종류: die,  kill, stop, start
    const dockerEventReceiver = async () => {
      await window.electronAPI.onDockerEventResponse((data: DockerEvent) => {
        const dockerEvent =  data; // data는 이벤트와 관련된 중요한 정보
        console.log(data)
        setEventState(dockerEvent)
        if (dockerEvent.Type === 'container') {
          setDockerContainers(prevContainers => {
            const updatedContainers = [...prevContainers];
            const index = updatedContainers.findIndex(container => container.id === dockerEvent.id);

            if (dockerEvent.status === 'destroy' && index !== -1) {
              // 컨테이너가 삭제된 경우
              updatedContainers.splice(index, 1);
            } else if (dockerEvent.status === 'create' || dockerEvent.status === 'start' || dockerEvent.status === 'stop' || dockerEvent.status === 'kill') {
              // 컨테이너가 생성되거나 시작되거나 정지된 경우
              //container 정보중에서 dockerEvent를 통해 전달 받을수 있는 부분만 수정함
              
              if (index !== -1) {
                updatedContainers[index] = { ...updatedContainers[index], ...dockerEvent };
              } else {
                // updatedContainers.push({ id: dockerEvent.id, ...dockerEvent } as DockerContainer);
              }
            }
            return updatedContainers;
          });

        }


















      });
    };


    fetchDockerData();
    dockerEventReceiver();

    return()=>{
      window.electronAPI.removeAllListeners();
    }

  }, [setDockerContainers]);

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


        <p>{eventState?.status}</p> 
        <p>{eventState?.id}</p> 
        <p>{eventState?.Type}</p> 
        <p>{eventState?.scope}</p> 
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
