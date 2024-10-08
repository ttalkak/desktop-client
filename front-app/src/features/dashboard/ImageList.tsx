import React from "react";
import { DeployImageInfo, useImageStore } from "../../stores/imageStore";
import { DeployStatus } from "../../types/deploy";
import Loading from "../../components/Loading";

const ImageList: React.FC = () => {
  const dockerImages = useImageStore((state) => state.images);

  const formatCreatedTime = (created: number | undefined) => {
    if (created === undefined) return "Unknown";
    const date = new Date(created * 1000);
    if (isNaN(date.getTime())) return "Unknown";
    const dateString = date.toLocaleDateString();
    const timeString = date.toLocaleTimeString();
    return (
      <>
        <div>{dateString}</div>
        <div>{timeString}</div>
      </>
    );
  };

  const formatSize = (size: number | undefined) => {
    if (size === undefined) return "Unknown";
    if (size < 1024) return `${size} B`;
    const i = Math.floor(Math.log(size) / Math.log(1024));
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    return `${(size / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  const tableBody = "py-2 px-4 text-sm text-gray-900 align-middle text-center";

  if (dockerImages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center mt-8">
        <p className="text-center text-gray-700">
          현재 사용중인 Docker Image가 없습니다.
        </p>
        <div className="mt-4">
          <span className="text-gray-400 text-sm">
            서비스 할당을 기다려주세요
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="overflow-hidden rounded-lg custom-scrollbar">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="sticky z-10 top-0 text-sm bg-white-gradient border-b">
            <tr>
              <th className="p-1">ServiceId</th>
              <th className="p-1">Tag</th>
              <th className="p-1">ID</th>
              <th className="p-1">Created</th>
              <th className="p-1">Size</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white overflow-y-auto">
            {dockerImages.map((image: DeployImageInfo) => (
              <React.Fragment key={image.id}>
                {/* image.status 값에 따라 다른 섹션으로 나머지 항목 렌더링 */}
                {image.status === DeployStatus.RUNNING ? (
                  <tr className="hover:bg-gray-50">
                    <td className={tableBody}>{image.id || "N/A"}</td>
                    <td className={tableBody}>
                      {image.RepoTags?.[0]?.split(":")[1] || "N/A"}
                    </td>
                    <td className={tableBody}>{image.imageId?.slice(7, 19)}</td>
                    <td className="py-2 px-4 text-xs text-gray-900 align-middle text-center">
                      {formatCreatedTime(image.Created)}
                    </td>
                    <td className={tableBody}>{formatSize(image.Size)}</td>
                  </tr>
                ) : (
                  <tr className="hover:bg-gray-50">
                    <td colSpan={1} className={tableBody}>
                      {image.id}
                    </td>
                    <td
                      colSpan={4}
                      className="py-2 px-4 text-xs text-gray-900 text-center align-middle"
                    >
                      <div className="flex justify-center items-center">
                        <Loading />
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ImageList;
