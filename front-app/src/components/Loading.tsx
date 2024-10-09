import { useEffect, useRef, useState } from "react";

const Loading = () => {
  const [position, setPosition] = useState(0);
  const intervalRef = useRef<number | null>(null); // ref를 사용하여 interval을 저장

  useEffect(() => {
    const animate = () => {
      setPosition((prevPosition) =>
        prevPosition >= 350 ? -350 : prevPosition + 1
      );
    };

    if (!intervalRef.current) {
      // interval이 설정되지 않았을 때만 설정
      intervalRef.current = window.setInterval(animate, 15);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  return (
    <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
      <div
        className="h-full w-20 bg-gradient-to-r from-transparent via-color-12 to-transparent"
        style={{
          transform: `translateX(${position}%)`,
          transition: "transform 0.03s linear",
        }}
      />
    </div>
  );
};

export default Loading;
