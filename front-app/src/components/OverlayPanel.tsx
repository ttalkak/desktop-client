import { BsExclamationCircleFill } from "react-icons/bs";

const OverlayPanel = () => {
  const panel =
    "absolute top-0 left-0 right-0 z-40 flex justify-center items-center h-full";

  return (
    <div className={panel}>
      <div className="absolute top-0 left-0 right-0 bottom-0 bg-white opacity-70"></div>
      <div className="flex items-center space-x-2 z-10">
        <BsExclamationCircleFill className="text-color-4" />
        <p className="text-sm text-color-4 font-bold">
          로그인이 필요한 서비스입니다.
        </p>
      </div>
    </div>
  );
};

export default OverlayPanel;
