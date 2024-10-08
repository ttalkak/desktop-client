import { useEffect, useState } from "react";

const Loading = () => {
  const [position, setPosition] = useState(0);

  useEffect(() => {
    const animate = () => {
      setPosition((prevPosition) => (prevPosition + 2) % 100);
    };

    const intervalId = setInterval(animate, 20);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
      <div
        className="h-full w-12 bg-gradient-to-r from-transparent via-blue-500 to-transparent"
        style={{
          transform: `translateX(${position}%)`,
          transition: "transform 0.2s linear",
        }}
      />
    </div>
  );
};

export default Loading;
