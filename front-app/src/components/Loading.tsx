import { useState } from "react";
import { useEffect } from "react";

const Loading = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((oldProgress) => {
        if (oldProgress === 100) {
          return 0;
        }
        return Math.min(oldProgress + 1, 100);
      });
    }, 50);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="m-x-10 w-full max-w-md mx-auto bg-gray-300 rounded">
      <div className="relative h-3 w-full">
        <div className="absolute left-0 w-8 h-full bg-black transform transition-all duration-300 ease-in-out rounded"></div>
      </div>
    </div>
  );
};

export default Loading;
