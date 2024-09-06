import React, { useEffect, useState } from "react";
import { useAppStore } from "../../stores/appStatusStore";

const ImageList: React.FC = () => {
  const [localDockerImages, setLocalDockerImages] = useState<DockerImage[]>([]);
  const setDockerImages = useAppStore((state) => state.setDockerImages);

  useEffect(() => {
    const handleStorageChange = () => {
      const storedImages = sessionStorage.getItem("images");
      if (storedImages) {
        try {
          const parsedImages = JSON.parse(storedImages);
          setLocalDockerImages(parsedImages);
          setDockerImages(parsedImages); // 전역 상태도 업데이트
        } catch (error) {
          console.error("Failed to parse stored images:", error);
        }
      }
    };

    // 초기 로드
    handleStorageChange();

    // storage 이벤트 리스너 추가
    window.addEventListener("storage", handleStorageChange);

    // 주기적으로 sessionStorage 확인 (옵션)
    const intervalId = setInterval(handleStorageChange, 1000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(intervalId);
    };
  }, [setDockerImages]);

  if (localDockerImages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center mt-8">
        <p className="text-center text-xl text-gray-500">
          현재 할당된 Docker Image가 없습니다.
        </p>
        <div className="mt-4">
          <span className="text-gray-400">새로운 이미지를 요청합니다.</span>
        </div>
      </div>
    );
  }

  return (
    <table className="min-w-full bg-white border border-gray-300 mt-2">
      <thead>
        <tr>
          <th className="py-2 px-4 border-b">Repository</th>
          <th className="py-2 px-4 border-b">Tag</th>
          <th className="py-2 px-4 border-b">ID</th>
        </tr>
      </thead>
      <tbody>
        {localDockerImages.map((image) => (
          <tr key={image.Id}>
            <td className="py-2 px-4 border-b">
              {image.RepoTags?.[0]?.split(":")[0]}
            </td>
            <td className="py-2 px-4 border-b">
              {image.RepoTags?.[0]?.split(":")[1]}
            </td>
            <td className="py-2 px-4 border-b">{image.Id.slice(7, 19)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default ImageList;
