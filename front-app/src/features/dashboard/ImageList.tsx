import React from "react";
import { useDockerStore } from "../../stores/dockerStore";

const ImageList: React.FC = () => {
  const dockerImages = useDockerStore((state) => state.dockerImages);

  const formatCreatedTime = (created: number) => {
    const date = new Date(created * 1000);
    return isNaN(date.getTime()) ? "Unknown" : date.toLocaleString();
  };

  const formatSize = (size: number) => {
    if (size < 1024) return `${size} B`;
    const i = Math.floor(Math.log(size) / Math.log(1024));
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    return `${(size / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  if (dockerImages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center mt-8">
        <p className="text-center text-gray-500 font-bold">
          현재 할당된 Docker Image가 없습니다.
        </p>
        <div className="mt-4">
          <span className="text-gray-400 text-sm">서비스를 실행해주세요</span>
        </div>
      </div>
    );
  }

  return (
    <table className="w-full bg-white border border-gray-300 mt-2">
      <thead>
        <tr>
          <th className="py-2 px-4 border-b">Repository</th>
          <th className="py-2 px-4 border-b">Tag</th>
          <th className="py-2 px-4 border-b">ID</th>
          <th className="py-2 px-4 border-b">Created</th>
          <th className="py-2 px-4 border-b">Size</th>
        </tr>
      </thead>
      <tbody>
        {dockerImages.map((image: DockerImage) => (
          <tr key={image.Id}>
            <td className="py-2 px-4 border-b">
              {image.RepoTags?.[0]?.split(":")[0]}
            </td>
            <td className="py-2 px-4 border-b">
              {image.RepoTags?.[0]?.split(":")[1]}
            </td>
            <td className="py-2 px-4 border-b">{image.Id.slice(7, 19)}</td>
            <td className="py-2 px-4 border-b">
              {formatCreatedTime(image.Created)}
            </td>
            <td className="py-2 px-4 border-b">{formatSize(image.Size)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default ImageList;
