import { useEffect, useState } from 'react';
import { HiOutlineDotsVertical } from "react-icons/hi";

const DashList = () => {
  const [dockerImages, setDockerImages] = useState<DockerImage[]>([]);
  const [dockerContainers, setDockerContainers] = useState<DockerContainer[]>([]);
  const [selectedContainers, setSelectedContainers] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [logs, setLogs] = useState<string>(''); // 로그 상태 추가
  const [selectedContainerId, setSelectedContainerId] = useState<string>(''); // 선택된 컨테이너 ID 상태 추가

  useEffect(() => {
    const fetchDockerData = async () => {
      const images = await window.electronAPI.getDockerImages();
      const containers = await window.electronAPI.fetchDockerContainers();
      setDockerImages(images);
      setDockerContainers(containers);
    };

    fetchDockerData();
  }, []);

  // 컨테이너 선택 핸들러
  const handleContainerSelect = (id: string) => {
    setSelectedContainers((prevSelected) =>
      prevSelected.includes(id)
        ? prevSelected.filter((containerId) => containerId !== id)
        : [...prevSelected, id]
    );
  };

  // 이미지 선택 핸들러
  const handleImageSelect = (id: string) => {
    setSelectedImages((prevSelected) =>
      prevSelected.includes(id)
        ? prevSelected.filter((imageId) => imageId !== id)
        : [...prevSelected, id]
    );
  };

  // 선택된 컨테이너 로그 가져오기
  const fetchLogs = (containerId: string) => {
    setSelectedContainerId(containerId);
    setLogs(''); // 기존 로그 초기화

    window.electronAPI.startLogStream(containerId); // 로그 스트림 시작
  };

  useEffect(() => {
    // 로그 스트림 수신
    const handleLog = (log: string) => {
      setLogs((prevLogs) => prevLogs + log); // 로그 업데이트
    };

    const handleError = (error: string) => {
      console.error('Error fetching logs:', error);
    };

    const handleEnd = () => {
      console.log('Log stream ended');
    };

    window.electronAPI.onLogStream(handleLog);
    window.electronAPI.onLogError(handleError);
    window.electronAPI.onLogEnd(handleEnd);

    // 클린업 함수: 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      window.electronAPI.onLogStream(handleLog);
      window.electronAPI.onLogError(handleError);
      window.electronAPI.onLogEnd(handleEnd);
    };
  }, []);

  return (
    <div className="container mx-auto p-6">
      <p className="font-mono text-4xl text-center mb-8">Docker Dashboard</p>

      {/* Docker Containers Table */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Docker Containers</h2>
        <table className="min-w-full bg-white border border-gray-300 mt-4">
          <thead>
            <tr>
              <th className="py-2 px-4 border-b"></th>
              <th className="py-2 px-4 border-b">Names</th>
              <th className="py-2 px-4 border-b">Image</th>
              <th className="py-2 px-4 border-b">Created</th>
              <th className="py-2 px-4 border-b">Ports</th>
              <th className="py-2 px-4 border-b">State</th>
              <th className="py-2 px-4 border-b">Status</th>
              <th className="py-2 px-4 border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {dockerContainers.length > 0 ? (
              dockerContainers.map((container, index) => {
                const { Id, Names, Image, Created, Ports, State, Status } = container;
                return (
                  <tr key={index}>
                    <td className="py-2 px-4 border-b">
                      <input
                        type="checkbox"
                        checked={selectedContainers.includes(Id)}
                        onChange={() => handleContainerSelect(Id)}
                      />
                    </td>
                    <td className="py-2 px-4 border-b">{Names.join(', ')}</td>
                    <td className="py-2 px-4 border-b">{Image}</td>
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
                      <button onClick={() => fetchLogs(Id)}>
                        <HiOutlineDotsVertical />
                      </button>
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
        {/* <button onClick={handleDeleteSelectedImages} className="px-4 py-2 bg-red-500 text-white rounded mb-4">Delete Selected</button> */}
        <table className="min-w-full bg-white border border-gray-300 mt-4">
          <thead>
            <tr>
              <th className="py-2 px-4 border-b"></th>
              <th className="py-2 px-4 border-b">Repository:Tag</th>
              <th className="py-2 px-4 border-b">Size</th>
              <th className="py-2 px-4 border-b">ParentId</th>
              <th className="py-2 px-4 border-b">Labels</th>
            </tr>
          </thead>
          <tbody>
            {dockerImages.length > 0 ? (
              dockerImages.map((image, index) => {
                const { RepoTags, Id, Size, ParentId, Labels } = image;
                return (
                  <tr key={index}>
                    <td className="py-2 px-4 border-b">
                      <input
                        type="checkbox"
                        checked={selectedImages.includes(Id)}
                        onChange={() => handleImageSelect(Id)}
                      />
                    </td>
                    <td className="py-2 px-4 border-b">{RepoTags ? RepoTags.join(', ') : 'None'}</td>
                    <td className="py-2 px-4 border-b">{(Size / (1024 * 1024)).toFixed(2)} MB</td>
                    <td className="py-2 px-4 border-b">{ParentId}</td>
                    <td className="py-2 px-4 border-b">{Labels ? JSON.stringify(Labels) : 'None'}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="py-2 px-4 border-b text-center">
                  사용할 수 있는 이미지가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 컨테이너 로그 표시 */}
      {selectedContainerId && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Logs for Container: {selectedContainerId}</h2>
          <pre className="bg-gray-100 p-4 border rounded">{logs}</pre>
        </div>
      )}
    </div>
  );
};

export default DashList;
