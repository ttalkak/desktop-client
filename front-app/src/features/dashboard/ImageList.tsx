import React from "react";
import { useAppStore } from "../../stores/appStatusStore";

const ImageList: React.FC = () => {
  const dockerImages = useAppStore((state) => state.dockerImages);

  if (dockerImages.length === 0) {
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
        {dockerImages.map((image) => (
          <tr key={image.Id}>
            <td className="py-2 px-4 border-b">{image.RepoTags?.[0]}</td>
            <td className="py-2 px-4 border-b">{image.RepoTags?.[1]}</td>
            <td className="py-2 px-4 border-b">{image.Id}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default ImageList;
