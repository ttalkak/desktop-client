import React, { useState } from "react";
import ContainerList from "./ContainerList";
import ImageList from "./ImageList";

const DashList: React.FC = () => {
  const [activeView, setActiveView] = useState<"containers" | "images">(
    "containers"
  );

  return (
    <div className="col-span-2 py-6">
      <div className="flex items-center justify-between">
        <div className="flex space-x-2 bg-color-2 p-1.5 rounded-lg max-w-min w-full">
          <button
            className={`px-4 py-2 rounded-lg ${
              activeView === "containers"
                ? "bg-white text-black shadow"
                : "text-gray-500"
            }`}
            onClick={() => setActiveView("containers")}
          >
            Containers
          </button>
          <button
            className={`px-4 py-2 rounded-lg ${
              activeView === "images"
                ? "bg-white text-black shadow"
                : "text-gray-500"
            }`}
            onClick={() => setActiveView("images")}
          >
            Images
          </button>
        </div>
      </div>
      <div className="mt-4">
        {activeView === "containers" && <ContainerList />}
        {activeView === "images" && <ImageList />}
      </div>
    </div>
  );
};

export default DashList;
