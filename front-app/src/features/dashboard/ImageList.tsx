import React, { useState } from 'react';

interface ImageListProps {
  images: DockerImage[];
}

const ImageList: React.FC<ImageListProps> = ({ images }) => {
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  const handleImageSelect = (id: string) => {
    setSelectedImages((prevSelected) =>
      prevSelected.includes(id)
        ? prevSelected.filter((imageId) => imageId !== id)
        : [...prevSelected, id]
    );
  };

  if (images.length === 0) {
    return <div className="text-center mt-8">사용 가능한 Docker 이미지가 없습니다.</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Docker Images</h2>
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
          {images?.map((image, index) => {
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
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ImageList;