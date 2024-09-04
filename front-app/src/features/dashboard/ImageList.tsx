import React from "react";

interface ImageListProps {
  images: DockerImage[];
}

const ImageList: React.FC<ImageListProps> = ({ images }) => {
  if (images.length === 0) {
    return (
      <div className="text-center mt-8">
        사용 가능한 Docker 이미지가 없습니다.
      </div>
    );
  }

  return (
    <div>
      <table className="min-w-full bg-white border border-gray-300 mt-2">
        <thead>
          <tr>
            <th className="py-2 px-4 border-b text-left">Name</th>
            <th className="py-2 px-4 border-b text-left">Tag</th>
            <th className="py-2 px-4 border-b text-left">Status</th>
            <th className="py-2 px-4 border-b text-left">Size</th>
          </tr>
        </thead>
        <tbody>
          {images.map((image, index) => {
            const { RepoTags, Id, Size, Container } = image;
            const name = RepoTags ? RepoTags[0].split(":")[0] : "None";
            const tag = RepoTags ? RepoTags[0].split(":")[1] : "None";

            return (
              <tr key={index} className="hover:bg-gray-100">
                <td className="py-2 px-4 border-b text-color-6">
                  <a href="#" className="hover:underline">
                    {name}
                  </a>
                  <div className="text-sm text-gray-500">
                    {Id.split(":")[1].slice(0, 12)}
                  </div>
                </td>
                <td className="py-2 px-4 border-b">{tag}</td>
                <td className="py-2 px-4 border-b text-color-6">
                  <a href="#" className="hover:underline">
                    {Container}
                  </a>
                </td>
                <td className="py-2 px-4 border-b">
                  {(Size / (1024 * 1024)).toFixed(2)} MB
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ImageList;
